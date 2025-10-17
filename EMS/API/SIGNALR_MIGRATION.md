# SignalR Migration Summary

## Overview
Successfully migrated from gRPC to SignalR for real-time active alarms notifications in the EMS Monitoring API.

## Changes Made

### 1. Package Updates (API.csproj)
**Removed:**
- `Google.Protobuf` (v3.33.0-rc1)
- `Grpc.AspNetCore` (v2.71.0)
- `Grpc.AspNetCore.Web` (v2.71.0)
- `Grpc.Tools` (v2.72.0)

**Added:**
- `Microsoft.AspNetCore.SignalR` (v1.1.0)

### 2. New Files Created

#### Hubs/MonitoringHub.cs
- SignalR hub with JWT authentication (`[Authorize]` attribute)
- Handles client connections and disconnections
- Logs connection events with user information
- Provides optional `SubscribeToActiveAlarms()` method

### 3. Files Modified

#### Workers/ActiveAlarmsBackgroundWorker.cs
**Before:** Used `GrpcBroadcastService` to broadcast via gRPC streaming
**After:** Uses `SignalRBroadcastService` to broadcast via SignalR

**Key Changes:**
- Replaced `GrpcBroadcastService` injection with `SignalRBroadcastService`
- Changed broadcast method to: `await _signalRBroadcastService.BroadcastActiveAlarmsUpdateAsync(alarmCount, cancellationToken)`
- Broadcast service encapsulates SignalR hub context and provides reusable method

#### Services/SignalRBroadcastService.cs (New)
**Purpose:** Centralized service for broadcasting SignalR updates with proper DTOs

**Features:**
- Encapsulates `IHubContext<MonitoringHub>` for reusability
- Uses structured DTOs (`BroadcastActiveAlarmsRequestDto`, `BroadcastActiveAlarmsResponseDto`)
- Provides two overloads: full DTO version and simplified version
- Includes comprehensive error handling and logging
- Returns response indicating success/failure
- Can be injected and used from any part of the application

#### Models/Dto/ActiveAlarmsUpdateDto.cs (New)
**DTOs Created:**
- `BroadcastActiveAlarmsRequestDto`: Request with alarm count and timestamp
- `BroadcastActiveAlarmsResponseDto`: Response with success status and client count

#### Program.cs
**Configuration Changes:**
1. **Removed gRPC Services:**
   - `builder.Services.AddGrpc()`
   - `builder.Services.AddSingleton<GrpcBroadcastService>()`
   - `app.UseGrpcWeb()`
   - `app.MapGrpcService<MonitoringGrpcService>().EnableGrpcWeb()`

2. **Added SignalR:**
   - `builder.Services.AddSignalR()`
   - `builder.Services.AddSingleton<SignalRBroadcastService>()`
   - `app.MapHub<MonitoringHub>("/hubs/monitoring")`

3. **JWT Configuration Enhancement:**
   - Added `OnMessageReceived` event handler to JWT Bearer authentication
   - Supports JWT token from query string for SignalR WebSocket connections
   - Checks for `access_token` query parameter on `/hubs/*` paths

4. **CORS Updates:**
   - Removed gRPC-specific exposed headers (Grpc-Status, Grpc-Message, etc.)
   - Maintained `.AllowCredentials()` for SignalR authentication

### 4. Files Deleted
- `Protos/monitoring.proto` (gRPC service definition)
- `Services/Grpc/MonitoringGrpcService.cs` (gRPC service implementation)
- `Services/Grpc/GrpcBroadcastService.cs` (gRPC broadcast utility)
- `obj/Debug/net9.0/Protos/` (generated gRPC code)

### 5. Documentation Created

#### SIGNALR_REACT_CLIENT.md
Comprehensive React client documentation including:
- Installation instructions (`@microsoft/signalr`)
- Complete custom hook implementation (`useMonitoringHub`)
- Component usage examples
- Context provider pattern for global access
- Manual connection control
- Error handling and retry logic
- TypeScript type definitions
- Environment configuration
- Troubleshooting guide
- Security best practices
- Complete working examples

## API Changes

### SignalR Endpoint
- **URL:** `https://localhost:7136/hubs/monitoring`
- **Authentication:** JWT token via `accessTokenFactory` or query string (`?access_token=xxx`)
- **Protocol:** WebSockets (with fallback to LongPolling)

### Client Method
- **Method Name:** `ReceiveActiveAlarmsUpdate`
- **Payload:**
  ```typescript
  {
    alarmCount: number;
    timestamp: number;
  }
  ```

### Broadcast Frequency
- Every 1 second when active alarms change (based on SHA256 digest comparison)

## Advantages of SignalR over gRPC

1. **Better Browser Support:** SignalR has native WebSocket support with automatic fallbacks
2. **Simpler React Integration:** Official `@microsoft/signalr` package with excellent TypeScript support
3. **Automatic Reconnection:** Built-in reconnection logic with exponential backoff
4. **Authentication:** Seamless JWT integration via query string or headers
5. **CORS Friendly:** Works better with browser CORS policies
6. **Debugging:** Easier to debug in browser dev tools
7. **Bidirectional:** Easier to add client-to-server calls if needed in the future

## Migration Checklist

✅ Remove gRPC NuGet packages
✅ Add SignalR NuGet package  
✅ Create SignalR hub with JWT authentication
✅ Update background worker to use SignalR
✅ Configure SignalR in Program.cs
✅ Remove gRPC files and services
✅ Create React client documentation
✅ Verify no compilation errors

## Testing

### Server-Side Verification
1. Build succeeds without errors (only pre-existing X509Certificate2 warning)
2. SignalR hub endpoint mapped to `/hubs/monitoring`
3. JWT authentication configured with query string support
4. Background worker broadcasts on alarm changes

### Client-Side Testing (React)
1. Install: `npm install @microsoft/signalr`
2. Use provided `useMonitoringHub` hook
3. Pass JWT access token
4. Listen for `ReceiveActiveAlarmsUpdate` messages
5. Verify automatic reconnection on connection loss

## Example React Usage

```typescript
import { useMonitoringHub } from './hooks/useMonitoringHub';

function App() {
  const { accessToken } = useAuth(); // Your auth context
  
  const { alarmCount, isConnected } = useMonitoringHub({
    accessToken,
    autoConnect: true,
    onError: (error) => console.error('SignalR error:', error),
  });

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Active Alarms: {alarmCount}</div>
    </div>
  );
}
```

## Using SignalRBroadcastService in Your Code

The `SignalRBroadcastService` is registered as a singleton and can be injected into any service, controller, or background worker.

### Example 1: From a Controller

```csharp
using API.Models.Dto;
using API.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly SignalRBroadcastService _broadcastService;

    public AdminController(SignalRBroadcastService broadcastService)
    {
        _broadcastService = broadcastService;
    }

    [HttpPost("trigger-alarm-update")]
    public async Task<IActionResult> TriggerAlarmUpdate([FromBody] int alarmCount)
    {
        var response = await _broadcastService.BroadcastActiveAlarmsUpdateAsync(
            alarmCount, 
            HttpContext.RequestAborted);

        if (response.Success)
        {
            return Ok(new { success = true, message = "Update broadcasted successfully" });
        }

        return StatusCode(500, new { success = false, message = response.ErrorMessage });
    }
}
```

### Example 2: From a Service

```csharp
using API.Models.Dto;
using API.Services;

public class AlarmProcessingService
{
    private readonly SignalRBroadcastService _broadcastService;
    private readonly ILogger<AlarmProcessingService> _logger;

    public AlarmProcessingService(
        SignalRBroadcastService broadcastService,
        ILogger<AlarmProcessingService> logger)
    {
        _broadcastService = broadcastService;
        _logger = logger;
    }

    public async Task ProcessAlarmChangedAsync(int newAlarmCount)
    {
        try
        {
            // Using the detailed DTO approach
            var request = new BroadcastActiveAlarmsRequestDto
            {
                AlarmCount = newAlarmCount,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            var response = await _broadcastService.BroadcastActiveAlarmsUpdateAsync(request);
            
            if (response.Success)
            {
                _logger.LogInformation("Successfully broadcasted alarm update: {Count}", newAlarmCount);
            }
            else
            {
                _logger.LogError("Failed to broadcast alarm update: {Error}", response.ErrorMessage);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting alarm update");
        }
    }
}
```

### Example 3: From a Background Worker

```csharp
public class MyCustomWorker : BackgroundService
{
    private readonly SignalRBroadcastService _broadcastService;

    public MyCustomWorker(SignalRBroadcastService broadcastService)
    {
        _broadcastService = broadcastService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Your logic here
            int alarmCount = GetCurrentAlarmCount();

            // Simple broadcast (timestamp auto-generated)
            await _broadcastService.BroadcastActiveAlarmsUpdateAsync(
                alarmCount, 
                stoppingToken);

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
```

## Security Notes

- JWT authentication required (via `[Authorize]` attribute on hub)
- Token passed via `accessTokenFactory` (preferred) or query string (fallback)
- CORS configured to allow credentials
- HTTPS enforced in production
- Connection logs include user information for auditing

## Performance Considerations

- Broadcasts only on changes (SHA256 digest comparison)
- Single hub connection per client (use context pattern)
- Automatic connection cleanup on component unmount
- Exponential backoff on reconnection attempts

## Future Enhancements

Potential additions:
- Room-based filtering (subscribe to specific alarm types)
- Client acknowledgment of received updates
- Historical alarm data on initial connection
- Alarm detail broadcasts (not just count)
- Admin-only hub methods for triggering updates

## Support

For issues or questions:
- Server Documentation: See `Program.cs` and `Hubs/MonitoringHub.cs`
- Client Documentation: See `SIGNALR_REACT_CLIENT.md`
- Swagger UI: `https://localhost:7136/swagger`
- SignalR Docs: https://learn.microsoft.com/aspnet/core/signalr/introduction
