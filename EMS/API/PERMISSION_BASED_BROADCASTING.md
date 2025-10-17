# Permission-Based SignalR Broadcasting Implementation

## Summary

Successfully implemented per-user permission filtering for SignalR active alarm broadcasts. Now each connected user receives only the alarm count for items they have access to via `ItemPermission` records.

## Changes Made

### 1. New Service: ConnectionTrackingService.cs
**Location:** `Services/ConnectionTrackingService.cs`

**Purpose:** Tracks SignalR connections and maps UserIds to ConnectionIds.

**Features:**
- Thread-safe singleton service using `ConcurrentDictionary` and locks
- Maps users to their connection IDs (supports multiple connections per user)
- Maps connection IDs back to user IDs for quick lookups
- Provides methods to:
  - Add/remove connections
  - Get all online users
  - Get connection IDs for a specific user
  - Check if a user is online

**Key Methods:**
- `AddConnection(userId, connectionId)` - Called when client connects
- `RemoveConnection(connectionId)` - Called when client disconnects
- `GetOnlineUserIds()` - Returns list of currently connected user IDs
- `GetUserConnections(userId)` - Returns all connection IDs for a user

---

### 2. Updated: MonitoringHub.cs
**Changes:**
- Injected `ConnectionTrackingService` into constructor
- Updated `OnConnectedAsync()` to:
  - Extract UserId from JWT claims (`ClaimTypes.NameIdentifier`)
  - Register connection with ConnectionTrackingService
  - Log connection with user context
- Updated `OnDisconnectedAsync()` to:
  - Remove connection from ConnectionTrackingService
  - Log disconnection with user context

**Before:**
```csharp
public MonitoringHub(ILogger<MonitoringHub> logger)
{
    _logger = logger;
}
```

**After:**
```csharp
public MonitoringHub(
    ILogger<MonitoringHub> logger,
    ConnectionTrackingService connectionTracker)
{
    _logger = logger;
    _connectionTracker = connectionTracker;
}
```

---

### 3. Completely Rewritten: SignalRBroadcastService.cs
**Major Changes:**
- Added dependencies: `ConnectionTrackingService`, `IServiceProvider`, `ApplicationDbContext`
- Changed method signature from `BroadcastActiveAlarmsUpdateAsync(int alarmCount)` to `BroadcastActiveAlarmsUpdateAsync(List<ActiveAlarm> activeAlarms)`
- Implemented per-user filtering logic:

**New Flow:**
1. Get list of online users from `ConnectionTrackingService`
2. For each online user:
   - Query `ItemPermissions` table for user's accessible item IDs
   - Filter active alarms to only include items user has permission to see
   - Calculate personalized alarm count
   - Send to all of user's connections via `_hubContext.Clients.Client(connectionId).SendAsync()`

**Key Logic:**
```csharp
// Get user's item permissions
var userPermissions = await context.ItemPermissions
    .Where(p => p.UserId == userId)
    .Select(p => p.ItemId)
    .ToListAsync(cancellationToken);

// Filter alarms by permissions
var userAlarmCount = activeAlarms
    .Count(alarm => userPermissions.Contains(alarm.ItemId));

// Send to each user connection
foreach (var connectionId in connectionIds)
{
    await _hubContext.Clients.Client(connectionId).SendAsync(
        "ReceiveActiveAlarmsUpdate",
        new { alarmCount = userAlarmCount, timestamp = timestamp },
        cancellationToken);
}
```

**Benefits:**
- Each user sees only alarms they have access to
- Supports multiple simultaneous connections per user
- Database context created per broadcast (scoped lifetime)
- Comprehensive error handling per user (one user's failure doesn't affect others)

---

### 4. Updated: ActiveAlarmsBackgroundWorker.cs
**Changes:**
- Changed broadcast call from passing alarm count to passing full alarm list
- Updated log message to reflect new behavior

**Before:**
```csharp
await _signalRBroadcastService.BroadcastActiveAlarmsUpdateAsync(alarms.Count, stoppingToken);
```

**After:**
```csharp
await _signalRBroadcastService.BroadcastActiveAlarmsUpdateAsync(alarms, stoppingToken);
```

---

### 5. Updated: Program.cs
**Changes:**
- Registered `ConnectionTrackingService` as singleton (required for maintaining connection state)

**Code Added:**
```csharp
// Add SignalR connection tracking service (must be singleton to maintain state across hub connections)
builder.Services.AddSingleton<API.Services.ConnectionTrackingService>();
```

**Order of Registration:**
1. `AddSignalR()` - SignalR infrastructure
2. `AddSingleton<ConnectionTrackingService>()` - Connection tracking
3. `AddSingleton<SignalRBroadcastService>()` - Broadcasting service

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ActiveAlarmsBackgroundWorker                  │
│  - Polls Core.Alarms.ActiveAlarms() every 1 second             │
│  - Detects changes via SHA256 digest                           │
│  - Passes FULL alarm list to SignalRBroadcastService           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SignalRBroadcastService                       │
│  - Gets online users from ConnectionTrackingService            │
│  - Queries ItemPermissions for EACH user                       │
│  - Filters alarms based on user's ItemPermissions              │
│  - Calculates personalized alarm count per user               │
│  - Sends to ALL connections of each user                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    User A          User B          User C
  (5 alarms)      (3 alarms)      (10 alarms)
```

---

## Security & Performance Considerations

### Security
✅ **JWT Authentication:** SignalR hub requires valid JWT token  
✅ **UserId from Claims:** Extracts UserId from JWT claims (ClaimTypes.NameIdentifier)  
✅ **Database-backed Permissions:** Uses `ItemPermission` table to enforce access control  
✅ **Per-user Filtering:** Each user receives ONLY alarms for items they have access to  
✅ **No Client Trust:** Permissions checked server-side, not relying on client  

### Performance
✅ **Efficient Change Detection:** SHA256 digest comparison avoids unnecessary broadcasts  
✅ **Single DB Query per User:** One query to get user's ItemPermissions  
✅ **LINQ Filtering:** In-memory filtering after permission retrieval  
✅ **Scoped DB Context:** Database context created and disposed per broadcast  
✅ **Parallel Independent Sends:** Each user's send is independent (one failure doesn't block others)  

### Potential Optimizations (Future)
- Cache ItemPermissions per user (with invalidation on permission change)
- Batch permission queries for all online users in single query
- Use Redis for connection tracking in distributed scenarios

---

## Testing Recommendations

### Unit Testing
1. **ConnectionTrackingService**
   - Add/remove connections
   - Multiple connections per user
   - Thread-safety tests

2. **SignalRBroadcastService**
   - Permission filtering logic
   - Empty user list handling
   - User with no permissions
   - User with all permissions

### Integration Testing
1. **Multi-user Scenario:**
   - Create 3 users with different ItemPermissions
   - Connect all 3 via SignalR
   - Trigger active alarms
   - Verify each user receives correct count

2. **Permission Changes:**
   - User connected with permissions A, B, C
   - Change permissions to only A, B
   - Verify next broadcast reflects new permissions

3. **Multiple Connections per User:**
   - Same user connects from 2 browsers
   - Verify both connections receive updates
   - Disconnect one, verify other still works

---

## API Behavior

### Client Side
**No Changes Required!**

Clients still receive the same message format:
```typescript
connection.on("ReceiveActiveAlarmsUpdate", (data: { alarmCount: number, timestamp: number }) => {
    console.log(`Active alarms: ${data.alarmCount}`);
});
```

The difference is now `alarmCount` represents only the alarms the user has access to.

### Server Side
**Broadcast Logic:**
1. Background worker detects active alarm changes
2. Passes full alarm list to broadcast service
3. Broadcast service:
   - Gets online users
   - For each user:
     - Queries ItemPermissions
     - Filters alarms
     - Sends personalized count

**Logging:**
- Connection tracking logs: User connect/disconnect with UserId
- Broadcast logs: Total users notified, alarms per user (debug level)
- Error logs: Per-user errors don't stop other users

---

## Database Schema Used

### ItemPermission Table
```sql
CREATE TABLE item_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_id UUID NOT NULL
);

CREATE INDEX idx_item_permissions_user_id ON item_permissions(user_id);
CREATE INDEX idx_item_permissions_item_id ON item_permissions(item_id);
CREATE INDEX idx_item_permissions_user_item ON item_permissions(user_id, item_id);
```

**Query Used:**
```csharp
var userPermissions = await context.ItemPermissions
    .Where(p => p.UserId == userId)
    .Select(p => p.ItemId)
    .ToListAsync(cancellationToken);
```

---

## Migration Notes

### Breaking Changes
❌ **None!** The API contract remains the same for clients.

### Backwards Compatibility
✅ Existing React clients work without modification  
✅ Message format unchanged  
✅ Method name unchanged (`ReceiveActiveAlarmsUpdate`)  

### What Changed for Users
- Users now see only alarms they have access to (instead of all alarms)
- More accurate and secure alarm counts
- No behavioral changes from client perspective

---

## Troubleshooting

### Issue: User receives alarm count of 0 despite active alarms
**Possible Causes:**
1. User has no ItemPermissions configured
2. User's ItemPermissions don't match any active alarm ItemIds
3. User not properly authenticated (JWT issues)

**Solution:**
- Check `item_permissions` table for user's records
- Verify `user_id` column matches JWT claim `ClaimTypes.NameIdentifier`
- Check logs for "User no longer has active connections" messages

### Issue: User not receiving updates
**Possible Causes:**
1. SignalR connection not established
2. JWT token expired
3. User disconnected but not reconnecting

**Solution:**
- Check browser console for SignalR connection errors
- Verify JWT token is valid and passed to `accessTokenFactory`
- Check server logs for connection tracking messages
- Verify `ConnectionTrackingService` has user listed

### Issue: Broadcast performance degraded
**Possible Causes:**
1. Too many online users (100+)
2. Users have thousands of ItemPermissions
3. Database query timeout

**Solution:**
- Monitor broadcast service logs for timing
- Consider caching ItemPermissions per user
- Add database query timeout monitoring
- Optimize ItemPermissions indexes

---

## Future Enhancements

1. **Permission Caching:**
   - Cache ItemPermissions per user in memory
   - Invalidate cache when permissions change
   - Use `IMemoryCache` or distributed cache (Redis)

2. **Batch Permission Queries:**
   - Query all online users' permissions in single DB call
   - Build lookup dictionary before filtering

3. **Real-time Permission Updates:**
   - When ItemPermission changes, immediately re-broadcast to affected user
   - Avoid waiting for next scheduled broadcast

4. **Alarm Details:**
   - Send not just count but actual alarm details per user
   - Allow clients to display alarm list without additional API call

5. **Room-based Broadcasting (SignalR Groups):**
   - Group users by permission sets
   - Broadcast to groups instead of individual connections
   - Reduces per-user iteration overhead

---

## Files Modified

1. ✅ `Services/ConnectionTrackingService.cs` - **NEW**
2. ✅ `Hubs/MonitoringHub.cs` - Updated
3. ✅ `Services/SignalRBroadcastService.cs` - Completely rewritten
4. ✅ `Workers/ActiveAlarmsBackgroundWorker.cs` - Updated
5. ✅ `Program.cs` - Updated (service registration)

---

## Build Status

✅ **Build Successful** - No new errors introduced  
⚠️ **Warnings:** Only pre-existing warnings (XML documentation, X509Certificate2 obsolete)  
✅ **Compilation:** All changes compile correctly  
✅ **Dependencies:** No new NuGet packages required  

---

**Implementation Date:** October 17, 2025  
**Status:** ✅ Complete and ready for testing
