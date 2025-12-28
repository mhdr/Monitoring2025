using System.Globalization;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class PIDMemoryProcess
{
    // Singleton instance
    private static PIDMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;
    private List<PIDMemory> _memories = [];
    private long? _memoriesEpoch;
    private DataContext? _context;

    private List<PIDDto> _pids = [];

    // Private constructor to enforce Singleton
    private PIDMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static PIDMemoryProcess Instance
    {
        get
        {
            lock (_lock) // Ensure thread-safe access to the instance
            {
                if (_instance == null)
                {
                    _instance = new PIDMemoryProcess();
                }
            }

            return _instance;
        }
    }

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
                    
                    while (true)
                    {
                        try
                        {
                            await using (_context = new DataContext())
                            {
                                await Process();
                            }
                        }
                        catch (Exception ex2)
                        {
                            MyLog.LogJson(ex2);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Delay to prevent rapid loops
                        }
                    }
                });
            }
        }

        await _runTask; // Await the task if it has already started
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
                MyLog.LogJson("PIDMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("PIDMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    private async Task FetchPidMemories()
    {
        DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
        long epochTime = currentTimeUtc.ToUnixTimeSeconds();

        if (!_memoriesEpoch.HasValue)
        {
            _memories = await _context!.PIDMemories.ToListAsync();
            _memoriesEpoch = epochTime;
        }
        else
        {
            if (epochTime - _memoriesEpoch.Value > 60)
            {
                _memories = await _context!.PIDMemories.ToListAsync();
                _memoriesEpoch = epochTime;
            }
        }
    }

    public async Task Process()
    {
        await FetchPidMemories();

        // Process all PID controllers in parallel with error isolation
        var tasks = _memories
            .Where(m => !m.IsDisabled)
            .Select(memory => ProcessSinglePID(memory))
            .ToList();

        // Execute all PID processing tasks concurrently
        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Process a single PID controller with full error isolation
    /// </summary>
    private async Task ProcessSinglePID(PIDMemory memory)
    {
        try
        {
            // var input = await _context.FinalItems.FirstOrDefaultAsync(x => x.ItemId == memory.InputItemId);

            var input = await Points.GetFinalItem(memory.InputItemId.ToString());
            var output = await Points.GetRawItem(memory.OutputItemId.ToString());

            if (input == null)
            {
                return;
            }

            // SetPoint

            FinalItemRedis? setPointItem = null;
            double? setPoint = null;

            if (memory.SetPointId.HasValue)
            {
                if (memory.SetPointId.Value != Guid.Empty)
                {
                    setPointItem = await Points.GetFinalItem(memory.SetPointId.Value.ToString());
                }
            }

            if (setPointItem != null)
            {
                setPoint = double.Parse(setPointItem.Value);
            }
            else
            {
                setPoint = memory.SetPoint;
            }

            // IsAuto

            FinalItemRedis? isAutoItem = null;
            bool? isAuto = null;

            if (memory.IsAutoId.HasValue)
            {
                if (memory.IsAutoId.Value != Guid.Empty)
                {
                    isAutoItem = await Points.GetFinalItem(memory.IsAutoId.Value.ToString());
                }
            }

            if (isAutoItem != null)
            {
                bool auto = isAutoItem.Value == "1";
                isAuto = auto;
            }
            else
            {
                isAuto = memory.IsAuto;
            }

            // ManualValue

            FinalItemRedis? manualValueItem = null;
            double? manualValue = null;

            if (memory.ManualValueId.HasValue)
            {
                if (memory.ManualValueId.Value != Guid.Empty)
                {
                    manualValueItem = await Points.GetFinalItem(memory.ManualValueId.Value.ToString());
                }
            }

            if (manualValueItem != null)
            {
                manualValue = double.Parse(manualValueItem.Value);
            }
            else
            {
                manualValue = memory.ManualValue;
            }
            
            // ReverseOutput

            FinalItemRedis? reverseOutputItem = null;
            bool? reverseOutput = null;

            if (memory.ReverseOutputId.HasValue)
            {
                if (memory.ReverseOutputId.Value != Guid.Empty)
                {
                    reverseOutputItem = await Points.GetFinalItem(memory.ReverseOutputId.Value.ToString());
                }
            }

            if (reverseOutputItem != null)
            {
                bool r = reverseOutputItem.Value == "1";
                reverseOutput = r;
            }
            else
            {
                reverseOutput = memory.ReverseOutput;
            }

            double processVariable = Convert.ToDouble(input.Value);

            if (output == null)
            {
                // just create a new raw item and continue

                output = new RawItemRedis()
                {
                    ItemId = memory.OutputItemId,
                };

                // addFlag = true;
            }

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            double deltaTime = 0;
            
            // Thread-safe access to shared _pids collection
            PIDDto? matched;
            lock (_lock)
            {
                matched = _pids.FirstOrDefault(x => x.Id == memory.Id);
            }

            if (matched == null)
            {
                matched = new PIDDto()
                {
                    Id = memory.Id,
                    Timestamp = epochTime,
                    PidController = new PIDController(memory.Kp, memory.Ki, memory.Kd, memory.OutputMin,
                        memory.OutputMax,reverseOutput.Value)
                    {
                        DerivativeFilterAlpha = memory.DerivativeFilterAlpha,
                        MaxOutputSlewRate = memory.MaxOutputSlewRate,
                        DeadZone = memory.DeadZone,
                        FeedForward = memory.FeedForward,
                    },
                };

                lock (_lock)
                {
                    _pids.Add(matched);
                }

                deltaTime = 1;
            }
            else
            {
                deltaTime = epochTime - matched.Timestamp;

                if (deltaTime < memory.Interval)
                {
                    return;
                }

                matched.Timestamp = epochTime;

                int changes = 0;

                if (Math.Abs(matched.PidController.Kp - memory.Kp) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.Ki - memory.Ki) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.Kd - memory.Kd) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.OutputMin - memory.OutputMin) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.OutputMax - memory.OutputMax) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.DerivativeFilterAlpha - memory.DerivativeFilterAlpha) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.MaxOutputSlewRate - memory.MaxOutputSlewRate) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.DeadZone - memory.DeadZone) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.FeedForward - memory.FeedForward) > 0)
                {
                    changes++;
                }

                if (matched.PidController.ReverseOutput != reverseOutput.Value)
                {
                    changes++;
                }

                if (changes > 0)
                {
                    matched.PidController.Reset();
                    matched.PidController = new PIDController(memory.Kp, memory.Ki, memory.Kd, memory.OutputMin,
                        memory.OutputMax,reverseOutput.Value)
                    {
                        DerivativeFilterAlpha = memory.DerivativeFilterAlpha,
                        MaxOutputSlewRate = memory.MaxOutputSlewRate,
                        DeadZone = memory.DeadZone,
                        FeedForward = memory.FeedForward,
                    };

                    matched.PidController.InitializeForBumplessTransfer(Convert.ToDouble(output.Value),
                        processVariable, setPoint!.Value);
                }
            }

            double result;

            if (isAuto!.Value)
            {
                result = matched.PidController.Compute(setPoint!.Value, processVariable, deltaTime);
            }
            else
            {
                result = manualValue!.Value;
            }

            // Hysteresis logic for digital output
            if (memory.DigitalOutputItemId.HasValue && memory.DigitalOutputItemId.Value != Guid.Empty)
            {
                bool newDigitalState = matched.DigitalOutputState; // Current state
                
                // State transitions with hysteresis
                if (!matched.DigitalOutputState) // Currently OFF (0)
                {
                    // Turn ON when output rises above HIGH threshold
                    if (result >= memory.HysteresisHighThreshold)
                    {
                        newDigitalState = true;
                    }
                }
                else // Currently ON (1)
                {
                    // Turn OFF when output falls below LOW threshold
                    if (result <= memory.HysteresisLowThreshold)
                    {
                        newDigitalState = false;
                    }
                }
                
                // Update state and write digital output only if state changed
                if (newDigitalState != matched.DigitalOutputState)
                {
                    matched.DigitalOutputState = newDigitalState;
                    
                    // Apply ReverseOutput by inverting the digital bit
                    bool finalDigitalState = reverseOutput!.Value ? !newDigitalState : newDigitalState;
                    
                    // Write digital output value
                    await Points.WriteOrAddValue(
                        memory.DigitalOutputItemId.Value,
                        finalDigitalState ? "1" : "0",
                        epochTime
                    );
                }
            }

            // Write analog output as normal
            await Points.WriteOrAddValue(output.ItemId,
                result.ToString("F2", CultureInfo.InvariantCulture), epochTime);
        }
        catch (Exception e)
        {
            MyLog.LogJson(new 
            { 
                Error = "PID Processing Error", 
                MemoryId = memory.Id, 
                MemoryName = memory.Name,
                Exception = e 
            });
        }
    }

    public class PIDDto
    {
        public Guid Id { get; set; }
        public PIDController PidController { get; set; } = null!;

        public long Timestamp { get; set; }
        
        // Digital output state for hysteresis control
        public bool DigitalOutputState { get; set; }
    }
}