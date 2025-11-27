namespace Core.Libs;

using StackExchange.Redis;
using System;

/// <summary>
/// Thread-safe singleton for managing Redis connections with enhanced error handling,
/// connection monitoring, and automatic reconnection capabilities.
/// </summary>
public sealed class RedisConnection
{
    private static readonly Lazy<RedisConnection> _lazy = new Lazy<RedisConnection>(() => new RedisConnection());
    private readonly ConnectionMultiplexer _connectionMultiplexer;
    private readonly object _reconnectLock = new object();
    private DateTime _lastReconnectAttempt = DateTime.MinValue;
    private bool _isReconnecting = false;
    
    private const int MaxRetryCount = 100;
    private const int RetryDelayMs = 2000;
    private const int ReconnectMinIntervalMs = 5000; // Minimum 5 seconds between reconnect attempts

    // Private constructor to prevent external instantiation
    private RedisConnection()
    {
        MyLog.Info("Initializing Redis connection");
        
        try
        {
            var configurationOptions = new ConfigurationOptions
            {
                EndPoints = { "localhost:6379" },
                AbortOnConnectFail = false, // Allow the multiplexer to retry connecting
                ConnectTimeout = 5000,
                SyncTimeout = 5000,
                AsyncTimeout = 5000,
                ConnectRetry = 3,
                ReconnectRetryPolicy = new ExponentialRetry(1000), // Exponential backoff for retries
                KeepAlive = 60, // Send keepalive packets every 60 seconds
                AllowAdmin = true // Required for GetServer operations
            };

            _connectionMultiplexer = ConnectWithRetry(configurationOptions);
            
            // Subscribe to connection events
            _connectionMultiplexer.ConnectionFailed += OnConnectionFailed;
            _connectionMultiplexer.ConnectionRestored += OnConnectionRestored;
            _connectionMultiplexer.ErrorMessage += OnErrorMessage;
            _connectionMultiplexer.InternalError += OnInternalError;
            
            MyLog.Info("Redis connection established successfully", new Dictionary<string, object?>
            {
                ["Endpoints"] = string.Join(", ", _connectionMultiplexer.GetEndPoints().Select(e => e.ToString())),
                ["IsConnected"] = _connectionMultiplexer.IsConnected
            });
        }
        catch (Exception ex)
        {
            MyLog.Critical("Failed to initialize Redis connection", ex);
            throw;
        }
    }

    /// <summary>
    /// Attempts to connect to Redis with retry logic
    /// </summary>
    private ConnectionMultiplexer ConnectWithRetry(ConfigurationOptions options)
    {
        int retryCount = MaxRetryCount;
        Exception? lastException = null;
        
        while (retryCount > 0)
        {
            try
            {
                MyLog.Debug("Attempting to connect to Redis", new Dictionary<string, object?>
                {
                    ["Attempt"] = MaxRetryCount - retryCount + 1,
                    ["MaxAttempts"] = MaxRetryCount,
                    ["Endpoints"] = string.Join(", ", options.EndPoints.Select(e => e.ToString()))
                });
                
                var connection = ConnectionMultiplexer.Connect(options);
                
                MyLog.Info("Redis connection attempt successful", new Dictionary<string, object?>
                {
                    ["AttemptNumber"] = MaxRetryCount - retryCount + 1,
                    ["IsConnected"] = connection.IsConnected
                });
                
                return connection;
            }
            catch (RedisConnectionException ex)
            {
                lastException = ex;
                retryCount--;
                
                MyLog.Warning("Redis connection attempt failed", new Dictionary<string, object?>
                {
                    ["RetriesLeft"] = retryCount,
                    ["Error"] = ex.Message,
                    ["FailureType"] = ex.FailureType.ToString()
                });
                
                if (retryCount == 0)
                {
                    break;
                }
                
                Thread.Sleep(RetryDelayMs);
            }
            catch (Exception ex)
            {
                lastException = ex;
                retryCount--;
                
                MyLog.Error("Unexpected error during Redis connection", ex, new Dictionary<string, object?>
                {
                    ["RetriesLeft"] = retryCount
                });
                
                if (retryCount == 0)
                {
                    break;
                }
                
                Thread.Sleep(RetryDelayMs);
            }
        }
        
        throw new Exception($"Could not connect to Redis after {MaxRetryCount} attempts.", lastException);
    }

    // Public property to access the singleton instance
    public static RedisConnection Instance => _lazy.Value;

    /// <summary>
    /// Gets the Redis database. Checks connection health before returning.
    /// </summary>
    /// <param name="dbNumber">Database number (-1 for default)</param>
    /// <returns>IDatabase instance</returns>
    public IDatabase GetDatabase(int dbNumber = -1)
    {
        try
        {
            EnsureConnected();
            return _connectionMultiplexer.GetDatabase(dbNumber);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get Redis database", ex, new Dictionary<string, object?>
            {
                ["DatabaseNumber"] = dbNumber,
                ["IsConnected"] = _connectionMultiplexer?.IsConnected ?? false
            });
            throw;
        }
    }

    /// <summary>
    /// Gets the Redis server for advanced operations
    /// </summary>
    /// <param name="host">Redis host (default: localhost)</param>
    /// <param name="port">Redis port (default: 6379)</param>
    /// <returns>IServer instance</returns>
    public IServer GetServer(string host = "localhost", int port = 6379)
    {
        try
        {
            EnsureConnected();
            return _connectionMultiplexer.GetServer(host, port);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get Redis server", ex, new Dictionary<string, object?>
            {
                ["Host"] = host,
                ["Port"] = port,
                ["IsConnected"] = _connectionMultiplexer?.IsConnected ?? false
            });
            throw;
        }
    }

    /// <summary>
    /// Checks if the connection is healthy and attempts reconnection if needed
    /// </summary>
    private void EnsureConnected()
    {
        if (_connectionMultiplexer == null)
        {
            MyLog.Critical("Redis connection multiplexer is null");
            throw new InvalidOperationException("Redis connection multiplexer is not initialized");
        }

        if (!_connectionMultiplexer.IsConnected)
        {
            MyLog.Warning("Redis connection is not active, attempting to reconnect");
            TryReconnect();
        }
    }

    /// <summary>
    /// Attempts to reconnect to Redis with throttling to prevent rapid reconnection attempts
    /// </summary>
    private void TryReconnect()
    {
        lock (_reconnectLock)
        {
            // Check if we're already reconnecting
            if (_isReconnecting)
            {
                MyLog.Debug("Reconnection already in progress, skipping duplicate attempt");
                return;
            }

            // Throttle reconnection attempts
            var timeSinceLastAttempt = (DateTime.UtcNow - _lastReconnectAttempt).TotalMilliseconds;
            if (timeSinceLastAttempt < ReconnectMinIntervalMs)
            {
                MyLog.Debug("Reconnection throttled", new Dictionary<string, object?>
                {
                    ["TimeSinceLastAttempt"] = timeSinceLastAttempt,
                    ["MinInterval"] = ReconnectMinIntervalMs
                });
                return;
            }

            try
            {
                _isReconnecting = true;
                _lastReconnectAttempt = DateTime.UtcNow;

                MyLog.Info("Starting Redis reconnection attempt");

                // The ConnectionMultiplexer handles reconnection automatically
                // We just need to wait a bit for it to complete
                Thread.Sleep(1000);

                if (_connectionMultiplexer.IsConnected)
                {
                    MyLog.Info("Redis reconnection successful");
                }
                else
                {
                    MyLog.Warning("Redis reconnection did not complete immediately, multiplexer will continue trying in background");
                }
            }
            catch (Exception ex)
            {
                MyLog.Error("Error during reconnection attempt", ex);
            }
            finally
            {
                _isReconnecting = false;
            }
        }
    }

    /// <summary>
    /// Gets connection statistics for monitoring
    /// </summary>
    public Dictionary<string, object?> GetConnectionStats()
    {
        try
        {
            var endpoints = _connectionMultiplexer.GetEndPoints();
            var stats = new Dictionary<string, object?>
            {
                ["IsConnected"] = _connectionMultiplexer.IsConnected,
                ["Endpoints"] = string.Join(", ", endpoints.Select(e => e.ToString())),
                ["OperationCount"] = _connectionMultiplexer.OperationCount,
                ["LastReconnectAttempt"] = _lastReconnectAttempt,
                ["IsReconnecting"] = _isReconnecting
            };

            // Get server-specific stats if connected
            if (_connectionMultiplexer.IsConnected && endpoints.Length > 0)
            {
                try
                {
                    var server = _connectionMultiplexer.GetServer(endpoints[0]);
                    stats["ServerType"] = server.ServerType;
                    stats["Version"] = server.Version?.ToString();
                    stats["IsConnectedToServer"] = server.IsConnected;
                }
                catch (Exception ex)
                {
                    MyLog.Debug("Could not retrieve server stats", new Dictionary<string, object?>
                    {
                        ["Error"] = ex.Message
                    });
                }
            }

            return stats;
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get connection stats", ex);
            return new Dictionary<string, object?>
            {
                ["Error"] = ex.Message,
                ["IsConnected"] = false
            };
        }
    }

    #region Event Handlers

    private void OnConnectionFailed(object? sender, ConnectionFailedEventArgs e)
    {
        MyLog.Error("Redis connection failed", e.Exception, new Dictionary<string, object?>
        {
            ["Endpoint"] = e.EndPoint?.ToString(),
            ["FailureType"] = e.FailureType.ToString(),
            ["ConnectionType"] = e.ConnectionType.ToString()
        });
    }

    private void OnConnectionRestored(object? sender, ConnectionFailedEventArgs e)
    {
        MyLog.Info("Redis connection restored", new Dictionary<string, object?>
        {
            ["Endpoint"] = e.EndPoint?.ToString(),
            ["ConnectionType"] = e.ConnectionType.ToString()
        });
    }

    private void OnErrorMessage(object? sender, RedisErrorEventArgs e)
    {
        MyLog.Warning("Redis error message", new Dictionary<string, object?>
        {
            ["Message"] = e.Message,
            ["Endpoint"] = e.EndPoint?.ToString()
        });
    }

    private void OnInternalError(object? sender, InternalErrorEventArgs e)
    {
        MyLog.Error("Redis internal error", e.Exception, new Dictionary<string, object?>
        {
            ["Origin"] = e.Origin,
            ["Endpoint"] = e.EndPoint?.ToString(),
            ["ConnectionType"] = e.ConnectionType.ToString()
        });
    }

    #endregion

    /// <summary>
    /// Disposes the Redis connection. Should only be called during application shutdown.
    /// </summary>
    public void Dispose()
    {
        try
        {
            MyLog.Info("Disposing Redis connection");
            
            if (_connectionMultiplexer != null)
            {
                _connectionMultiplexer.ConnectionFailed -= OnConnectionFailed;
                _connectionMultiplexer.ConnectionRestored -= OnConnectionRestored;
                _connectionMultiplexer.ErrorMessage -= OnErrorMessage;
                _connectionMultiplexer.InternalError -= OnInternalError;
                
                _connectionMultiplexer.Dispose();
            }
            
            MyLog.Info("Redis connection disposed successfully");
        }
        catch (Exception ex)
        {
            MyLog.Error("Error disposing Redis connection", ex);
        }
    }
}