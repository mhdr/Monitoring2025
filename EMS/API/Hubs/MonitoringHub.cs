using System.Security.Claims;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

/// <summary>
/// SignalR hub for real-time monitoring updates.
/// Provides real-time notifications to connected clients about active alarms and system changes.
/// </summary>
/// <remarks>
/// <para><strong>Connection Information:</strong></para>
/// <list type="bullet">
/// <item>Hub URL: http://localhost:5030/monitoringhub</item>
/// <item>Authentication: JWT Bearer token required</item>
/// <item>Transport: WebSockets (preferred), Server-Sent Events (fallback), Long Polling (fallback)</item>
/// </list>
/// 
/// <para><strong>Server Methods (callable from client):</strong></para>
/// <list type="bullet">
/// <item>
/// <term>SubscribeToActiveAlarms()</term>
/// <description>Subscribe to receive real-time active alarm count updates. This is optional as server broadcasts to all connected clients automatically.</description>
/// </item>
/// </list>
/// 
/// <para><strong>Client Methods (invoked by server):</strong></para>
/// <list type="bullet">
/// <item>
/// <term>ReceiveActiveAlarmsUpdate(int activeAlarmsCount)</term>
/// <description>Receives active alarm count updates from the server when alarms change state. Called automatically by the server's background worker.</description>
/// </item>
/// <item>
/// <term>ReceiveSettingsUpdate()</term>
/// <description>Receives notification that system settings have been updated and clients should refresh their local data. Triggered when an admin calls the PushUpdate endpoint.</description>
/// </item>
/// </list>
/// 
/// <para><strong>Connection Lifecycle:</strong></para>
/// <list type="number">
/// <item>Client establishes connection with JWT token</item>
/// <item>OnConnectedAsync is called - connection is tracked</item>
/// <item>Client can optionally call SubscribeToActiveAlarms() for explicit subscription</item>
/// <item>Server automatically broadcasts ReceiveActiveAlarmsUpdate when alarms change</item>
/// <item>OnDisconnectedAsync is called when client disconnects - connection is removed from tracking</item>
/// </list>
/// 
/// <para><strong>JavaScript Client Example:</strong></para>
/// <code>
/// // Import SignalR
/// import * as signalR from "@microsoft/signalr";
/// 
/// // Create connection with JWT token
/// const connection = new signalR.HubConnectionBuilder()
///     .withUrl("http://localhost:5030/monitoringhub", {
///         accessTokenFactory: () => localStorage.getItem("jwt_token")
///     })
///     .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
///     .configureLogging(signalR.LogLevel.Information)
///     .build();
/// 
/// // Register client method to receive updates from server
/// connection.on("ReceiveActiveAlarmsUpdate", (activeAlarmsCount) => {
///     console.log(`Active alarms: ${activeAlarmsCount}`);
///     document.getElementById("alarmCount").textContent = activeAlarmsCount;
/// });
/// 
/// // Register client method to receive settings update notifications
/// connection.on("ReceiveSettingsUpdate", () => {
///     console.log("Settings updated - refreshing data...");
///     // Trigger your application's data refresh logic here
///     refreshApplicationData();
/// });
/// 
/// // Start connection
/// await connection.start();
/// console.log("SignalR Connected");
/// 
/// // Optional: Explicitly subscribe to active alarms
/// await connection.invoke("SubscribeToActiveAlarms");
/// </code>
/// 
/// <para><strong>C# Client Example:</strong></para>
/// <code>
/// using Microsoft.AspNetCore.SignalR.Client;
/// 
/// // Create connection with JWT token
/// var connection = new HubConnectionBuilder()
///     .WithUrl("http://localhost:5030/monitoringhub", options =>
///     {
///         options.AccessTokenProvider = () => Task.FromResult(jwtToken);
///     })
///     .WithAutomaticReconnect()
///     .Build();
/// 
/// // Register client method to receive updates from server
/// connection.On&lt;int&gt;("ReceiveActiveAlarmsUpdate", (activeAlarmsCount) =>
/// {
///     Console.WriteLine($"Active alarms: {activeAlarmsCount}");
/// });
/// 
/// // Register client method to receive settings update notifications
/// connection.On("ReceiveSettingsUpdate", () =>
/// {
///     Console.WriteLine("Settings updated - refreshing data...");
///     // Trigger your application's data refresh logic here
///     RefreshApplicationData();
/// });
/// 
/// // Start connection
/// await connection.StartAsync();
/// Console.WriteLine("SignalR Connected");
/// 
/// // Optional: Explicitly subscribe to active alarms
/// await connection.InvokeAsync("SubscribeToActiveAlarms");
/// </code>
/// 
/// <para><strong>Error Handling:</strong></para>
/// <code>
/// connection.onclose((error) => {
///     if (error) {
///         console.error("Connection closed with error:", error);
///     } else {
///         console.log("Connection closed");
///     }
/// });
/// 
/// connection.onreconnecting((error) => {
///     console.warn("Connection lost, reconnecting...", error);
/// });
/// 
/// connection.onreconnected((connectionId) => {
///     console.log("Reconnected successfully:", connectionId);
/// });
/// </code>
/// </remarks>
[Authorize]
public class MonitoringHub : Hub
{
    private readonly ILogger<MonitoringHub> _logger;
    private readonly ConnectionTrackingService _connectionTracker;

    /// <summary>
    /// Initializes a new instance of the MonitoringHub
    /// </summary>
    /// <param name="logger">Logger instance for structured logging</param>
    /// <param name="connectionTracker">Connection tracking service for managing user connections</param>
    public MonitoringHub(
        ILogger<MonitoringHub> logger,
        ConnectionTrackingService connectionTracker)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionTracker = connectionTracker ?? throw new ArgumentNullException(nameof(connectionTracker));
    }

    /// <summary>
    /// Called when a client connects to the hub
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = Context.User?.Identity?.Name ?? "Unknown";

        if (!string.IsNullOrEmpty(userId))
        {
            _connectionTracker.AddConnection(userId, connectionId);
            _logger.LogInformation("Client connected to MonitoringHub. ConnectionId: {ConnectionId}, UserId: {UserId}, UserName: {UserName}", 
                connectionId, userId, userName);
        }
        else
        {
            _logger.LogWarning("Client connected without valid UserId. ConnectionId: {ConnectionId}, UserName: {UserName}", 
                connectionId, userName);
        }

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub
    /// </summary>
    /// <param name="exception">Exception that caused the disconnect, if any</param>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = Context.User?.Identity?.Name ?? "Unknown";

        _connectionTracker.RemoveConnection(connectionId);

        if (exception != null)
        {
            _logger.LogWarning(exception, 
                "Client disconnected from MonitoringHub with error. ConnectionId: {ConnectionId}, UserId: {UserId}, UserName: {UserName}", 
                connectionId, userId, userName);
        }
        else
        {
            _logger.LogInformation("Client disconnected from MonitoringHub. ConnectionId: {ConnectionId}, UserId: {UserId}, UserName: {UserName}", 
                connectionId, userId, userName);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client method to subscribe to active alarms updates.
    /// </summary>
    /// <remarks>
    /// This method is optional - the server automatically broadcasts active alarm updates to all connected clients
    /// through the ReceiveActiveAlarmsUpdate client method. Calling this method provides an explicit subscription
    /// mechanism and confirms the connection is working.
    /// 
    /// <para><strong>Usage:</strong></para>
    /// <code>
    /// // JavaScript
    /// await connection.invoke("SubscribeToActiveAlarms");
    /// 
    /// // C#
    /// await connection.InvokeAsync("SubscribeToActiveAlarms");
    /// </code>
    /// </remarks>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task SubscribeToActiveAlarms()
    {
        var userId = Context.User?.Identity?.Name ?? "Unknown";
        var connectionId = Context.ConnectionId;
        
        _logger.LogInformation("Client subscribed to active alarms. ConnectionId: {ConnectionId}, User: {UserId}", 
            connectionId, userId);

        await Task.CompletedTask;
    }
}
