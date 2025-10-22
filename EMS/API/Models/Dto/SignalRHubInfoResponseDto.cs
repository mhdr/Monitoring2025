namespace API.Models.Dto;

/// <summary>
/// Response model containing SignalR hub metadata and connection information
/// </summary>
public class SignalRHubInfoResponseDto
{
    /// <summary>
    /// Indicates if the request was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Hub metadata and connection details
    /// </summary>
    public SignalRHubData? Data { get; set; }
}

/// <summary>
/// SignalR hub metadata
/// </summary>
public class SignalRHubData
{
    /// <summary>
    /// Name of the SignalR hub
    /// </summary>
    /// <example>MonitoringHub</example>
    public string HubName { get; set; } = string.Empty;

    /// <summary>
    /// Relative endpoint path for the hub
    /// </summary>
    /// <example>/monitoringhub</example>
    public string HubEndpoint { get; set; } = string.Empty;

    /// <summary>
    /// Full connection URL for the hub
    /// </summary>
    /// <example>http://localhost:5030/monitoringhub</example>
    public string ConnectionUrl { get; set; } = string.Empty;

    /// <summary>
    /// Authentication requirements
    /// </summary>
    /// <example>JWT Bearer token required in Authorization header or accessTokenFactory</example>
    public string Authentication { get; set; } = string.Empty;

    /// <summary>
    /// Supported transport protocols in order of preference
    /// </summary>
    /// <example>["WebSockets", "ServerSentEvents", "LongPolling"]</example>
    public List<string> SupportedTransports { get; set; } = new();

    /// <summary>
    /// List of server methods that can be invoked by clients
    /// </summary>
    public List<SignalRMethodInfo> ServerMethods { get; set; } = new();

    /// <summary>
    /// List of client methods that the server can invoke
    /// </summary>
    public List<SignalRMethodInfo> ClientMethods { get; set; } = new();

    /// <summary>
    /// Connection examples for different platforms
    /// </summary>
    public SignalRConnectionExamples ConnectionExamples { get; set; } = new();
}

/// <summary>
/// Information about a SignalR method
/// </summary>
public class SignalRMethodInfo
{
    /// <summary>
    /// Name of the method
    /// </summary>
    /// <example>SubscribeToActiveAlarms</example>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description of what the method does
    /// </summary>
    /// <example>Subscribe to receive real-time active alarms updates</example>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// List of method parameters
    /// </summary>
    public List<SignalRParameterInfo> Parameters { get; set; } = new();

    /// <summary>
    /// Return type of the method
    /// </summary>
    /// <example>Task</example>
    public string Returns { get; set; } = string.Empty;
}

/// <summary>
/// Information about a method parameter
/// </summary>
public class SignalRParameterInfo
{
    /// <summary>
    /// Name of the parameter
    /// </summary>
    /// <example>activeAlarmsCount</example>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of the parameter
    /// </summary>
    /// <example>int</example>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Description of the parameter
    /// </summary>
    /// <example>Current count of active alarms in the system</example>
    public string Description { get; set; } = string.Empty;
}

/// <summary>
/// Connection examples for different platforms
/// </summary>
public class SignalRConnectionExamples
{
    /// <summary>
    /// JavaScript/TypeScript connection example
    /// </summary>
    public string JavaScript { get; set; } = string.Empty;

    /// <summary>
    /// C# client connection example
    /// </summary>
    public string CSharp { get; set; } = string.Empty;

    /// <summary>
    /// Python client connection example (using signalrcore)
    /// </summary>
    public string Python { get; set; } = string.Empty;
}
