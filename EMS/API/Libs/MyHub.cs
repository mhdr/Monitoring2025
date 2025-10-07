using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace API.Libs;

/// <summary>
/// SignalR hub for real-time notifications and messaging.
/// </summary>
[Authorize]
public class MyHub : Hub
{
    private readonly ILogger<MyHub> _logger;

    /// <summary>
    /// Creates a new instance of <see cref="MyHub"/>.
    /// </summary>
    /// <param name="logger">Logger used for structured logging in the hub.</param>
    public MyHub(ILogger<MyHub> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Sends a message to all connected clients.
    /// </summary>
    /// <param name="user">Sender user identifier or name.</param>
    /// <param name="message">Message payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task SendMessage(string user, string message, CancellationToken cancellationToken = default)
    {
        const string operation = nameof(SendMessage);
        _logger.LogInformation("Operation {Operation} started. Sender: {User}", operation, user);

        try
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message, cancellationToken);
            _logger.LogInformation("Operation {Operation} completed. Sender: {User}", operation, user);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug("Operation {Operation} canceled by client. Sender: {User}", operation, user);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {Operation}: {Message}", operation, ex.Message);
            // Do not expose internal exception details to clients
            throw new HubException("An error occurred while sending the message.");
        }
    }

    /// <summary>
    /// Called when a new connection is established.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var user = Context.User?.Identity?.Name ?? "anonymous";
        _logger.LogInformation("Connection established. ConnectionId: {ConnectionId}, User: {User}", connectionId, user);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a connection is disconnected.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        var user = Context.User?.Identity?.Name ?? "anonymous";

        if (exception != null)
        {
            _logger.LogWarning(exception, "Connection {ConnectionId} disconnected with error for user {User}", connectionId, user);
        }
        else
        {
            _logger.LogInformation("Connection {ConnectionId} disconnected. User: {User}", connectionId, user);
        }

        await base.OnDisconnectedAsync(exception);
    }
}