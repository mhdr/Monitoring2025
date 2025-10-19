using API.Hubs;
using API.Models.Dto;
using Core.Models;
using DB.User.Data;
using DB.User.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

/// <summary>
/// Service for broadcasting real-time updates to SignalR clients with permission-based filtering
/// </summary>
public class SignalRBroadcastService
{
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ILogger<SignalRBroadcastService> _logger;
    private readonly ConnectionTrackingService _connectionTracker;
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the SignalRBroadcastService
    /// </summary>
    /// <param name="hubContext">SignalR hub context for MonitoringHub</param>
    /// <param name="logger">Logger instance for structured logging</param>
    /// <param name="connectionTracker">Connection tracking service for getting online users</param>
    /// <param name="serviceProvider">Service provider for creating scoped database contexts and UserManager</param>
    public SignalRBroadcastService(
        IHubContext<MonitoringHub> hubContext,
        ILogger<SignalRBroadcastService> logger,
        ConnectionTrackingService connectionTracker,
        IServiceProvider serviceProvider)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _connectionTracker = connectionTracker ?? throw new ArgumentNullException(nameof(connectionTracker));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    }

    /// <summary>
    /// Broadcasts active alarms update to connected SignalR clients with permission-based filtering.
    /// Admin users (username = "admin") receive all alarm counts.
    /// Non-admin users receive only the count of alarms they have access to based on ItemPermissions.
    /// </summary>
    /// <param name="activeAlarms">List of all active alarms</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Response indicating success and number of users notified</returns>
    /// <exception cref="ArgumentNullException">Thrown when activeAlarms is null</exception>
    public async Task<BroadcastActiveAlarmsResponseDto> BroadcastActiveAlarmsUpdateAsync(
        List<ActiveAlarm> activeAlarms,
        CancellationToken cancellationToken = default)
    {
        const string operation = nameof(BroadcastActiveAlarmsUpdateAsync);

        if (activeAlarms == null)
        {
            throw new ArgumentNullException(nameof(activeAlarms));
        }

        try
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var onlineUserIds = _connectionTracker.GetOnlineUserIds();

            if (onlineUserIds.Count == 0)
            {
                _logger.LogDebug("{Operation}: No online users to broadcast to", operation);
                return new BroadcastActiveAlarmsResponseDto
                {
                    Success = true,
                    ClientCount = 0,
                    ErrorMessage = null
                };
            }

            _logger.LogInformation(
                "{Operation}: Broadcasting active alarms to {UserCount} online users. Total alarms: {TotalAlarmCount}",
                operation, onlineUserIds.Count, activeAlarms.Count);

            // Create a scoped service provider to access UserManager and DbContext
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            var usersNotified = 0;

            // Broadcast to each online user with their personalized alarm count
            foreach (var userIdString in onlineUserIds)
            {
                try
                {
                    if (!Guid.TryParse(userIdString, out var userId))
                    {
                        _logger.LogWarning("{Operation}: Invalid UserId format: {UserId}", operation, userIdString);
                        continue;
                    }

                    // Get the user to check if they are admin
                    var user = await userManager.FindByIdAsync(userIdString);
                    
                    if (user == null)
                    {
                        _logger.LogWarning("{Operation}: User not found: {UserId}", operation, userIdString);
                        continue;
                    }

                    int userAlarmCount;

                    // Admin users get access to all alarms
                    if (user.UserName?.ToLower() == "admin")
                    {
                        userAlarmCount = activeAlarms.Count;
                        
                        _logger.LogDebug(
                            "{Operation}: Admin user {UserId} ({UserName}) - showing all {AlarmCount} alarms",
                            operation, userIdString, user.UserName, userAlarmCount);
                    }
                    else
                    {
                        // Non-admin users: filter by ItemPermissions AND GroupPermissions
                        // Get direct item permissions
                        var directItemIds = await context.ItemPermissions
                            .Where(p => p.UserId == userId)
                            .Select(p => p.ItemId)
                            .ToListAsync(cancellationToken);

                        // Get group permissions and find all items in those groups
                        var groupIds = await context.GroupPermissions
                            .Where(p => p.UserId == userId)
                            .Select(p => p.GroupId)
                            .ToListAsync(cancellationToken);

                        var groupItemIds = await context.GroupItems
                            .Where(gi => groupIds.Contains(gi.GroupId))
                            .Select(gi => gi.ItemId)
                            .ToListAsync(cancellationToken);

                        // Combine both direct and group-based permissions
                        var allAccessibleItemIds = directItemIds.Concat(groupItemIds).Distinct().ToHashSet();

                        // Filter active alarms to only those the user has permission to see
                        userAlarmCount = activeAlarms.Count(alarm => allAccessibleItemIds.Contains(alarm.ItemId));

                        _logger.LogDebug(
                            "{Operation}: User {UserId} ({UserName}) has {DirectPermissionCount} direct permissions, {GroupCount} group permissions ({GroupItemCount} items via groups), showing {AlarmCount} alarms",
                            operation, userIdString, user.UserName, directItemIds.Count, groupIds.Count, groupItemIds.Count, userAlarmCount);
                    }

                    // Get all connections for this user
                    var connectionIds = _connectionTracker.GetUserConnections(userIdString);

                    // Send personalized alarm count to each of the user's connections
                    foreach (var connectionId in connectionIds)
                    {
                        await _hubContext.Clients.Client(connectionId).SendAsync(
                            "ReceiveActiveAlarmsUpdate",
                            new
                            {
                                alarmCount = userAlarmCount,
                                timestamp = timestamp
                            },
                            cancellationToken);
                    }

                    usersNotified++;

                    _logger.LogDebug(
                        "{Operation}: Sent {AlarmCount} alarms to user {UserId} ({ConnectionCount} connections)",
                        operation, userAlarmCount, userIdString, connectionIds.Count);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, 
                        "{Operation}: Error broadcasting to user {UserId}",
                        operation, userIdString);
                    // Continue broadcasting to other users even if one fails
                }
            }

            _logger.LogInformation(
                "{Operation}: Successfully broadcasted to {UsersNotified}/{TotalUsers} users",
                operation, usersNotified, onlineUserIds.Count);

            return new BroadcastActiveAlarmsResponseDto
            {
                Success = true,
                ClientCount = usersNotified,
                ErrorMessage = null
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("{Operation}: Broadcast cancelled", operation);
            
            return new BroadcastActiveAlarmsResponseDto
            {
                Success = false,
                ClientCount = 0,
                ErrorMessage = "Broadcast cancelled"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Operation}: Error broadcasting active alarms update", operation);
            
            return new BroadcastActiveAlarmsResponseDto
            {
                Success = false,
                ClientCount = 0,
                ErrorMessage = ex.Message
            };
        }
    }
}
