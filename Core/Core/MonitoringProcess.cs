using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using Core.RedisModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Core
{
    public class MonitoringProcess
    {
        // Singleton instance
        private static MonitoringProcess? _instance;
        private static readonly object _lock = new object();
        private static Task? _runTask;

        private List<MonitoringItem>? _items;
        private long _itemsUpdateTime;
        private DataContext? _context;
        private ConcurrentDictionary<Guid, ConcurrentQueue<MonitoringValue>> _monitoringQueue;
        private ConcurrentDictionary<Guid, long> _itemsHistorySavedTime;
        private List<ItemHistory>? _itemHistoriesResult;
        private MongoClient? _mongoClient;
        private IMongoDatabase? _mongoDatabase;
        private List<string> _indexedCollections = [];
        private long _lastNoRawItemsWarning = 0;

        private void InitMongo()
        {
            _mongoClient = new MongoClient("mongodb://localhost:27017");
            _mongoDatabase = _mongoClient.GetDatabase("monitoring_core");
        }

        private MonitoringProcess()
        {
            _monitoringQueue = new ConcurrentDictionary<Guid, ConcurrentQueue<MonitoringValue>>();
            _itemsHistorySavedTime = new ConcurrentDictionary<Guid, long>();
            InitMongo();
        }

        // Singleton instance access
        public static MonitoringProcess Instance
        {
            get
            {
                lock (_lock) // Ensure thread-safe access to the instance
                {
                    if (_instance == null)
                    {
                        _instance = new MonitoringProcess();
                    }
                }

                return _instance;
            }
        }

        // The Run method (ensures it's executed once)
        public async Task Run()
        {
            lock (_lock)
            {
                if (_runTask == null)
                {
                    _runTask = Task.Run(async () =>
                    {
                        // Wait for database to be ready at startup
                        await WaitForDatabaseConnection();
                        
                        await ApplyPartitioning();
                        // await Settings.Init();

                        while (true)
                        {
                            var correlationId = MyLog.NewCorrelationId();
                            try
                            {
                                MyLog.Debug("Starting monitoring cycle", new Dictionary<string, object?>
                                {
                                    ["CorrelationId"] = correlationId
                                });

                                _context = new DataContext();
                                await EnsureMongoConnection();
                                await FetchItems();
                                // await FetchFinalItems();
                                // await FetchRawItems();

                                _itemHistoriesResult = new List<ItemHistory>();

                                var rawItems = await Points.GetRawItems();
                                
                                MyLog.Debug("Processing raw items", new Dictionary<string, object?>
                                {
                                    ["RawItemCount"] = rawItems.Count,
                                    ["MonitoredItemCount"] = _items?.Count ?? 0
                                });

                                // Diagnostic: Warn if we have monitored items but no raw data (rate-limited to once per minute)
                                if (_items != null && _items.Count > 0 && rawItems.Count == 0)
                                {
                                    long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                                    if (now - _lastNoRawItemsWarning > 60) // Only warn once per minute
                                    {
                                        MyLog.Warning("No raw items available despite having monitored items configured. Check that interface services (Sharp7/Modbus/BACnet/Rabbit) are running.", new Dictionary<string, object?>
                                        {
                                            ["MonitoredItemCount"] = _items.Count,
                                            ["Suggestion"] = "Run 'systemctl status monitoring_interface_*' to check interface services"
                                        });
                                        _lastNoRawItemsWarning = now;
                                    }
                                }

                                int processedCount = 0;
                                int errorCount = 0;

                                foreach (var rawItem in rawItems)
                                {
                                    try
                                    {
                                        var item = _items?.FirstOrDefault(x => x.Id == rawItem.ItemId);
                                        if (item == null)
                                        {
                                            MyLog.Warning("Raw item has no corresponding monitoring item", new Dictionary<string, object?>
                                            {
                                                ["RawItemId"] = rawItem.ItemId
                                            });
                                            continue;
                                        }

                                        var value1 = GetNormalizedValue(item, new MonitoringValue(rawItem));
                                        AddToQueue(item, value1);
                                        var value2 = GetValueFromQueue(item);
                                        var value3 = GetCalibrationValue(item, value2);
                                        await AddToFinalItems(item, value3);
                                        await AddToItemsHistory(item, value3);
                                        
                                        processedCount++;
                                    }
                                    catch (Exception ex)
                                    {
                                        errorCount++;
                                        MyLog.Error("Error processing raw item", ex, new Dictionary<string, object?>
                                        {
                                            ["RawItemId"] = rawItem.ItemId,
                                            ["RawValue"] = rawItem.Value,
                                            ["RawTime"] = rawItem.Time
                                        });
                                    }
                                }

                                if (_itemHistoriesResult.Count > 0)
                                {
                                    await _context.ItemHistories.AddRangeAsync(_itemHistoriesResult);
                                }

                                await _context.SaveChangesAsync();
                                await _context.DisposeAsync();
                                
                                MyLog.Debug("Completed monitoring cycle", new Dictionary<string, object?>
                                {
                                    ["ProcessedCount"] = processedCount,
                                    ["ErrorCount"] = errorCount,
                                    ["HistorySavedCount"] = _itemHistoriesResult.Count
                                });
                                
                                // TODO: Make monitoring cycle delay configurable via Settings
                                await Task.Delay(1000); // Wait 1 second before the next iteration
                            }
                            catch (Exception ex)
                            {
                                MyLog.Critical("Fatal error in monitoring cycle", ex, new Dictionary<string, object?>
                                {
                                    ["CorrelationId"] = correlationId
                                });
                            }
                        }
                    });
                }
            }

            await _runTask;
        }

        private async Task WaitForDatabaseConnection()
        {
            int maxRetries = 30;
            int retryDelay = 2000; // 2 seconds

            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    using var testContext = new DataContext();
                    await testContext.Database.CanConnectAsync();
                    MyLog.LogJson("MonitoringProcess", "Database connection established");
                    return;
                }
                catch (Exception ex)
                {
                    MyLog.LogJson("MonitoringProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                    if (i == maxRetries - 1)
                    {
                        MyLog.LogJson(ex);
                        throw;
                    }
                    await Task.Delay(retryDelay);
                }
            }
        }

        private async Task FetchItems()
        {
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            if (_items == null || epochTime - _itemsUpdateTime > 60)
            {
                _items = await _context!.MonitoringItems.Where(x => x.IsDisabled == false).ToListAsync();
                _itemsUpdateTime = epochTime;
            }
        }

        // private async Task FetchRawItems()
        // {
        //     // _rawItems = await _context.RawItems.ToListAsync();
        //     _rawItems = await Points.GetRawItems();
        // }

        private async Task ApplyPartitioning()
        {
            var context = new DataContext();
            await context.EnsurePartitioning();
            await context.SaveChangesAsync();
        }
        
        private async Task EnsureMongoConnection()
        {
            try
            {
                await _mongoDatabase!.RunCommandAsync((Command<BsonDocument>)"{ping:1}");
            }
            catch (Exception e)
            {
                MyLog.Error("MongoDB connection lost, reinitializing", e);
                // Reinitialize if connection is lost
                await Task.Delay(2000);
                InitMongo();
                MyLog.Info("MongoDB connection reinitialized");
            }
        }

        private async Task AddToItemsHistory(MonitoringItem item, MonitoringValue value)
        {
            try
            {
                // Validate MonitoringValue before processing
                if (value.ItemId == Guid.Empty || string.IsNullOrEmpty(value.Value))
                {
                    MyLog.Warning("Attempted to save item history with invalid MonitoringValue", new Dictionary<string, object?>
                    {
                        ["ItemId"] = item.Id,
                        ["ItemName"] = item.ItemName,
                        ["ValueItemId"] = value.ItemId,
                        ["Value"] = value.Value,
                        ["Time"] = value.Time
                    });
                    return;
                }

                bool shouldSave = false;
                DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                if (!_itemsHistorySavedTime.TryGetValue(item.Id, out var lastSaved) ||
                    epochTime - lastSaved > item.SaveHistoricalInterval)
                {
                    shouldSave = true;
                }

                if (shouldSave)
                {
                    var collectionName = MongoHelper.GetCollectionName(item.Id, value.Time);
                    var collection = _mongoDatabase!.GetCollection<BsonDocument>(collectionName);

                    // Create an index on the Time field if it doesn't exist
                    if (!_indexedCollections.Contains(collectionName))
                    {
                        MyLog.Debug("Creating index for collection", new Dictionary<string, object?>
                        {
                            ["CollectionName"] = collectionName,
                            ["ItemId"] = item.Id
                        });

                        var indexKeysDefinition = Builders<BsonDocument>.IndexKeys.Ascending("Time");
                        var indexOptions = new CreateIndexOptions { Unique = true, Background = true };
                        await collection.Indexes.CreateOneAsync(
                            new CreateIndexModel<BsonDocument>(indexKeysDefinition, indexOptions));
                        _indexedCollections.Add(collectionName);
                    }

                    // Use try/catch on insert instead of pre-checking for duplicates (2x performance)
                    try
                    {
                        var itemHistory = new BsonDocument
                        {
                            { "Value", value.Value },
                            { "Time", value.Time }
                        };
                    
                        await collection.InsertOneAsync(itemHistory);
                        _itemsHistorySavedTime[item.Id] = value.Time;
                        
                        MyLog.Debug("Saved item to history", new Dictionary<string, object?>
                        {
                            ["ItemId"] = item.Id,
                            ["Collection"] = collectionName,
                            ["Time"] = value.Time
                        });
                    }
                    catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
                    {
                        // Duplicate entry - this is expected, just skip
                        MyLog.Debug("Duplicate history entry detected, skipping", new Dictionary<string, object?>
                        {
                            ["ItemId"] = item.Id,
                            ["Time"] = value.Time
                        });
                    }
                    
                    // var itemHistory = new BsonDocument
                    // {
                    //     { "Value", value.Value },
                    //     { "Time", value.Time }
                    // };
                    //
                    // await collection.InsertOneAsync(itemHistory);
                    // _itemsHistorySavedTime[item.Id] = value.Time;
                }
            }
            catch (Exception e)
            {
                MyLog.Error("Failed to add item to history", e, new Dictionary<string, object?>
                {
                    ["ItemId"] = item.Id,
                    ["Value"] = value.Value,
                    ["Time"] = value.Time
                });
            }
        }

        // private async Task AddToItemsHistory2(MonitoringItem item, MonitoringValue value)
        // {
        //     bool shouldSave = false;
        //     DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
        //     long epochTime = currentTimeUtc.ToUnixTimeSeconds();
        //
        //     if (!_itemsHistorySavedTime.TryGetValue(item.Id, out var lastSaved) ||
        //         epochTime - lastSaved > item.SaveHistoricalInterval)
        //     {
        //         shouldSave = true;
        //     }
        //
        //     if (shouldSave)
        //     {
        //         var itemHistory = new ItemHistory()
        //         {
        //             ItemId = item.Id,
        //             Value = value.Value,
        //             Time = value.Time,
        //         };
        //
        //         _itemHistoriesResult.Add(itemHistory);
        //         _itemsHistorySavedTime[item.Id] = value.Time;
        //     }
        // }

        private async Task AddToFinalItems(MonitoringItem item, MonitoringValue value)
        {
            // Validate the MonitoringValue before processing
            if (value.ItemId == Guid.Empty)
            {
                MyLog.Warning("Attempted to save FinalItem with empty ItemId", new Dictionary<string, object?>
                {
                    ["ItemName"] = item.ItemName,
                    ["ExpectedItemId"] = item.Id,
                    ["Value"] = value.Value
                });
                return;
            }

            if (string.IsNullOrEmpty(value.Value))
            {
                MyLog.Warning("Attempted to save FinalItem with null/empty Value", new Dictionary<string, object?>
                {
                    ["ItemId"] = value.ItemId,
                    ["ItemName"] = item.ItemName,
                    ["Time"] = value.Time
                });
                return;
            }

            bool shouldSave = false;
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            // var finalItem = _finalItems.FirstOrDefault(x => x.ItemId == value.ItemId);
            var finalItem = await Points.GetFinalItem(value.ItemId.ToString());
            
            if (finalItem == null)
            {
                finalItem = new FinalItemRedis()
                {
                    ItemId = value.ItemId,
                    Value = value.Value,
                    Time = value.Time,
                };

                // await _context.FinalItems.AddAsync(finalItem);
                
                shouldSave = true;
            }
            else if (epochTime - finalItem.Time > item.SaveInterval)
            {
                finalItem.Value = value.Value;
                finalItem.Time = value.Time;
                shouldSave = true;
            }

            if (shouldSave)
            {
                await Points.SetFinalItem(finalItem);
            }
        }

        private MonitoringValue GetNormalizedValue(MonitoringItem item, MonitoringValue value)
        {
            if (item.ShouldScale == ShouldScaleType.On)
            {
                float normalizedValue = MinMaxNormalizer.Normalize(
                    Convert.ToSingle(value.Value), item.NormMin, item.NormMax, item.ScaleMin, item.ScaleMax);
                value.Value = normalizedValue.ToString("F2");
            }

            return value;
        }

        private MonitoringValue GetCalibrationValue(MonitoringItem item, MonitoringValue value)
        {
            if (item.IsCalibrationEnabled.HasValue && item.IsCalibrationEnabled.Value)
            {
                float fValue = Convert.ToSingle(value.Value);
                float newValue = item.CalibrationA!.Value * fValue + item.CalibrationB!.Value;
                value.Value = newValue.ToString("F2");
            }

            return value;
        }

        private void AddToQueue(MonitoringItem item, MonitoringValue value)
        {
            var queue = _monitoringQueue.GetOrAdd(item.Id, new ConcurrentQueue<MonitoringValue>());
            queue.Enqueue(value);

            if (queue.Count > item.NumberOfSamples)
            {
                queue.TryDequeue(out _);
            }
        }

        private MonitoringValue GetValueFromQueue(MonitoringItem item)
        {
            var result = new MonitoringValue();
            
            // Check if queue exists for this item
            if (!_monitoringQueue.TryGetValue(item.Id, out var queue))
            {
                MyLog.Error("Queue not found for item", null, new Dictionary<string, object?>
                {
                    ["ItemId"] = item.Id,
                    ["ItemName"] = item.ItemName
                });
                return result;
            }

            // Check if queue has any items
            if (queue.IsEmpty)
            {
                MyLog.Warning("Queue is empty for item", new Dictionary<string, object?>
                {
                    ["ItemId"] = item.Id,
                    ["ItemName"] = item.ItemName
                });
                return result;
            }

            if (item.CalculationMethod == ValueCalculationMethod.Mean)
            {
                result.ItemId = item.Id;
                float sum = queue.Sum(rawItem => Convert.ToSingle(rawItem.Value));
                result.Value = (sum / queue.Count).ToString("F2");
                result.Time = queue.Last().Time;
            }
            else if (item.CalculationMethod == ValueCalculationMethod.Default)
            {
                var value = queue.First();
                result.ItemId = item.Id;
                result.Value = value.Value;
                result.Time = value.Time;
            }
            else
            {
                // Handle unknown calculation methods by treating them as Default
                MyLog.Warning("Unknown calculation method for item, using Default behavior", new Dictionary<string, object?>
                {
                    ["ItemId"] = item.Id,
                    ["ItemName"] = item.ItemName,
                    ["CalculationMethod"] = item.CalculationMethod,
                    ["ExpectedValues"] = "Default=0, Mean=1"
                });
                
                var value = queue.First();
                result.ItemId = item.Id;
                result.Value = value.Value;
                result.Time = value.Time;
            }

            return result;
        }
    }
}