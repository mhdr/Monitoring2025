using System.Diagnostics;
using System.Runtime.CompilerServices;
using Newtonsoft.Json;

namespace Core.Libs;

/// <summary>
/// Enhanced logging utility with structured logging, correlation tracking, and contextual information.
/// </summary>
public static class MyLog
{
    private static readonly object _lockObj = new object();
    
    // Thread-local storage for correlation IDs
    private static readonly AsyncLocal<string?> _correlationId = new AsyncLocal<string?>();
    
    public static string? CorrelationId
    {
        get => _correlationId.Value;
        set => _correlationId.Value = value;
    }

    public enum LogLevel
    {
        Debug = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
        Critical = 4
    }

    #region Legacy Methods (maintained for compatibility)
    
    public static void LogJson(string name, object? obj)
    {
        if (obj != null)
        {
            var json = JsonConvert.SerializeObject(obj, Formatting.Indented);
            var output = $"{name}: {json}";
            WriteLog(LogLevel.Info, output, null, null, null, null);
        }
    }

    public static void LogJson(object? obj)
    {
        if (obj != null)
        {
            var json = JsonConvert.SerializeObject(obj, Formatting.Indented);
            WriteLog(LogLevel.Info, json, null, null, null, null);
        }
    }

    public static void Log(string msg)
    {
        WriteLog(LogLevel.Info, msg, null, null, null, null);
    }
    
    #endregion

    #region Enhanced Logging Methods

    /// <summary>
    /// Logs a debug message with optional context.
    /// </summary>
    public static void Debug(
        string message,
        Dictionary<string, object?>? context = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        WriteLog(LogLevel.Debug, message, context, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs an informational message with optional context.
    /// </summary>
    public static void Info(
        string message,
        Dictionary<string, object?>? context = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        WriteLog(LogLevel.Info, message, context, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs a warning message with optional context.
    /// </summary>
    public static void Warning(
        string message,
        Dictionary<string, object?>? context = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        WriteLog(LogLevel.Warning, message, context, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs an error message with optional exception and context.
    /// </summary>
    public static void Error(
        string message,
        Exception? exception = null,
        Dictionary<string, object?>? context = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        var extendedContext = context ?? new Dictionary<string, object?>();
        
        if (exception != null)
        {
            extendedContext["Exception"] = new
            {
                Type = exception.GetType().Name,
                Message = exception.Message,
                StackTrace = exception.StackTrace,
                InnerException = exception.InnerException?.Message,
                Data = exception.Data.Count > 0 ? exception.Data : null
            };
        }

        WriteLog(LogLevel.Error, message, extendedContext, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs a critical error that requires immediate attention.
    /// </summary>
    public static void Critical(
        string message,
        Exception? exception = null,
        Dictionary<string, object?>? context = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        var extendedContext = context ?? new Dictionary<string, object?>();
        
        if (exception != null)
        {
            extendedContext["Exception"] = new
            {
                Type = exception.GetType().Name,
                Message = exception.Message,
                StackTrace = exception.StackTrace,
                InnerException = exception.InnerException?.Message,
                Data = exception.Data.Count > 0 ? exception.Data : null
            };
        }

        WriteLog(LogLevel.Critical, message, extendedContext, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs method entry with parameters for tracing execution flow.
    /// </summary>
    public static void MethodEntry(
        Dictionary<string, object?>? parameters = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        var context = new Dictionary<string, object?>
        {
            ["Event"] = "MethodEntry",
            ["Parameters"] = parameters
        };
        WriteLog(LogLevel.Debug, $"Entering method: {memberName}", context, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Logs method exit with optional return value for tracing execution flow.
    /// </summary>
    public static void MethodExit(
        object? returnValue = null,
        [CallerMemberName] string? memberName = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0)
    {
        var context = new Dictionary<string, object?>
        {
            ["Event"] = "MethodExit",
            ["ReturnValue"] = returnValue
        };
        WriteLog(LogLevel.Debug, $"Exiting method: {memberName}", context, memberName, filePath, lineNumber);
    }

    /// <summary>
    /// Creates a new correlation ID for tracking related operations.
    /// </summary>
    public static string NewCorrelationId()
    {
        var id = Guid.NewGuid().ToString("N").Substring(0, 8);
        CorrelationId = id;
        return id;
    }

    #endregion

    #region Core Logging Implementation

    private static void WriteLog(
        LogLevel level,
        string message,
        Dictionary<string, object?>? context,
        string? memberName,
        string? filePath,
        int? lineNumber)
    {
        try
        {
            var timestamp = DateTimeOffset.UtcNow;
            var fileName = filePath != null ? Path.GetFileName(filePath) : null;
            
            var logEntry = new
            {
                Timestamp = timestamp.ToString("yyyy-MM-dd HH:mm:ss.fff"),
                Level = level.ToString().ToUpper(),
                CorrelationId = CorrelationId,
                Message = message,
                Location = new
                {
                    File = fileName,
                    Method = memberName,
                    Line = lineNumber
                },
                Context = context,
                ThreadId = Environment.CurrentManagedThreadId
            };

            var json = JsonConvert.SerializeObject(logEntry, Formatting.None);
            
            lock (_lockObj)
            {
                // Color coding for different log levels in console
                var originalColor = Console.ForegroundColor;
                Console.ForegroundColor = level switch
                {
                    LogLevel.Debug => ConsoleColor.Gray,
                    LogLevel.Info => ConsoleColor.White,
                    LogLevel.Warning => ConsoleColor.Yellow,
                    LogLevel.Error => ConsoleColor.Red,
                    LogLevel.Critical => ConsoleColor.DarkRed,
                    _ => ConsoleColor.White
                };
                
                Console.WriteLine(json);
                Console.ForegroundColor = originalColor;
            }
        }
        catch (Exception ex)
        {
            // Fallback to simple console logging if structured logging fails
            Console.WriteLine($"LOGGING ERROR: {ex.Message} | Original message: {message}");
        }
    }

    #endregion
}