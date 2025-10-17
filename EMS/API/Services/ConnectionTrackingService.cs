using System.Collections.Concurrent;

namespace API.Services;

/// <summary>
/// Singleton service for tracking SignalR hub connections and mapping users to their connection IDs.
/// Thread-safe using ConcurrentDictionary for handling concurrent connect/disconnect operations.
/// </summary>
public class ConnectionTrackingService
{
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    private readonly ConcurrentDictionary<string, string> _connectionUsers = new();
    private readonly ILogger<ConnectionTrackingService> _logger;
    private readonly object _lock = new();

    /// <summary>
    /// Initializes a new instance of the ConnectionTrackingService
    /// </summary>
    /// <param name="logger">Logger instance for structured logging</param>
    public ConnectionTrackingService(ILogger<ConnectionTrackingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Adds a connection for a user
    /// </summary>
    /// <param name="userId">User ID (from JWT claims)</param>
    /// <param name="connectionId">SignalR connection ID</param>
    public void AddConnection(string userId, string connectionId)
    {
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(connectionId))
        {
            _logger.LogWarning("Attempted to add connection with null/empty userId or connectionId");
            return;
        }

        lock (_lock)
        {
            // Track connection -> user mapping
            _connectionUsers[connectionId] = userId;

            // Track user -> connections mapping
            if (!_userConnections.TryGetValue(userId, out var connections))
            {
                connections = new HashSet<string>();
                _userConnections[userId] = connections;
            }
            connections.Add(connectionId);
        }

        _logger.LogInformation("Added connection tracking: UserId={UserId}, ConnectionId={ConnectionId}", 
            userId, connectionId);
    }

    /// <summary>
    /// Removes a connection
    /// </summary>
    /// <param name="connectionId">SignalR connection ID</param>
    public void RemoveConnection(string connectionId)
    {
        if (string.IsNullOrEmpty(connectionId))
        {
            _logger.LogWarning("Attempted to remove connection with null/empty connectionId");
            return;
        }

        lock (_lock)
        {
            // Find the user for this connection
            if (_connectionUsers.TryRemove(connectionId, out var userId))
            {
                // Remove connection from user's connection list
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    connections.Remove(connectionId);

                    // If user has no more connections, remove the user entry
                    if (connections.Count == 0)
                    {
                        _userConnections.TryRemove(userId, out _);
                        _logger.LogInformation("User no longer has active connections: UserId={UserId}", userId);
                    }
                }

                _logger.LogInformation("Removed connection tracking: ConnectionId={ConnectionId}, UserId={UserId}", 
                    connectionId, userId);
            }
            else
            {
                _logger.LogWarning("Attempted to remove unknown connection: ConnectionId={ConnectionId}", connectionId);
            }
        }
    }

    /// <summary>
    /// Gets all connection IDs for a specific user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>List of connection IDs for the user</returns>
    public List<string> GetUserConnections(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return new List<string>();
        }

        lock (_lock)
        {
            if (_userConnections.TryGetValue(userId, out var connections))
            {
                return connections.ToList();
            }
        }

        return new List<string>();
    }

    /// <summary>
    /// Gets all currently connected user IDs
    /// </summary>
    /// <returns>List of connected user IDs</returns>
    public List<string> GetOnlineUserIds()
    {
        lock (_lock)
        {
            return _userConnections.Keys.ToList();
        }
    }

    /// <summary>
    /// Gets the user ID for a specific connection
    /// </summary>
    /// <param name="connectionId">SignalR connection ID</param>
    /// <returns>User ID or null if not found</returns>
    public string? GetUserIdByConnection(string connectionId)
    {
        if (string.IsNullOrEmpty(connectionId))
        {
            return null;
        }

        lock (_lock)
        {
            if (_connectionUsers.TryGetValue(connectionId, out var userId))
            {
                return userId;
            }
        }

        return null;
    }

    /// <summary>
    /// Gets the total number of online users
    /// </summary>
    /// <returns>Count of unique users with active connections</returns>
    public int GetOnlineUserCount()
    {
        lock (_lock)
        {
            return _userConnections.Count;
        }
    }

    /// <summary>
    /// Gets the total number of active connections
    /// </summary>
    /// <returns>Total count of all connections</returns>
    public int GetTotalConnectionCount()
    {
        lock (_lock)
        {
            return _connectionUsers.Count;
        }
    }

    /// <summary>
    /// Checks if a user is currently online
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>True if user has at least one active connection</returns>
    public bool IsUserOnline(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return false;
        }

        lock (_lock)
        {
            return _userConnections.ContainsKey(userId);
        }
    }
}
