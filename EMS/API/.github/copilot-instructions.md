# AI Agent Instructions - EMS Monitoring API

## 🎯 Project Overview

**Technology Stack:**
- ASP.NET Core 9.0 Web API
- PostgreSQL with Entity Framework Core
- JWT Authentication (ASP.NET Core Identity)
- SignalR for real-time updates
- MassTransit for message queuing (RabbitMQ transport)
- Background Workers for scheduled tasks

**Key Patterns:**
- Repository pattern with Core library
- DTO-based request/response models
- Structured logging with context
- Real-time notifications via SignalR hub
- Background service workers
- Domain-Driven Design (DDD) with separate projects for DB, Contracts, and Core

**Project Structure:**
- `API` - Web API project (this project)
- `Core` - Business logic and repository implementations
- `DB.User` - User database context and models
- `Contracts` - Shared contracts for messaging
- `Share` - Shared utilities and helpers

---

## 🔒 Server Configuration

### HTTPS & Security
- **HTTPS Only**: `https://localhost:7136` (no HTTP fallback)
- **Certificate**: `certificates/api-cert.pfx` (password: `password123` - dev only)
- **CORS**: Configured for detected public IP + localhost
- **JWT**: Token-based authentication with refresh tokens

### Environment
- **Development**: Self-signed cert with auto-migration
- **Production**: Update JWT key, use proper SSL cert, secure connection strings

---

## 📐 Code Standards

### 1. Error Handling & Logging

**Pattern:**
```csharp
try
{
    _logger.LogInformation("Operation started: {Operation}, User: {UserId}", operation, userId);
    
    if (!ModelState.IsValid)
    {
        return BadRequest(new { success = false, message = "Invalid input data" });
    }
    
    // operation code
    return Ok(new { success = true, data = result });
}
catch (ArgumentException ex)
{
    _logger.LogWarning(ex, "Validation failed: {Operation}", operation);
    return BadRequest(new { success = false, message = ex.Message });
}
catch (KeyNotFoundException ex)
{
    _logger.LogWarning(ex, "Resource not found: {Operation}", operation);
    return NotFound(new { success = false, message = ex.Message });
}
catch (UnauthorizedAccessException ex)
{
    _logger.LogWarning(ex, "Unauthorized access: {Operation}", operation);
    return Forbid();
}
catch (Exception ex)
{
    _logger.LogError(ex, "Error in {Operation}: {Message}", operation, ex.Message);
    return StatusCode(500, new { success = false, message = "Internal server error" });
}
```

**Requirements:**
- Wrap ALL controller actions and service methods in try-catch
- ALWAYS check `ModelState.IsValid` for endpoints with request DTOs
- Use structured logging with context (operation, userId, requestId)
- Log at appropriate levels: 
  - `LogInformation`: Successful operations, key actions
  - `LogWarning`: Validation failures, expected errors, not found
  - `LogError`: Unexpected exceptions, system errors
  - `LogDebug`: Detailed tracing (dev only)
- Return structured errors: `{success: false, message: "..."}`
- NEVER expose stack traces, inner exception messages, or sensitive data to clients
- Use specific exception types for better error handling (ArgumentException, KeyNotFoundException, etc.)

---

### 2. REST API Design

**HTTP Methods & Status Codes:**
- **GET**: Read-only, idempotent → 200 (OK), 404 (Not Found)
- **POST**: Create new resource → 201 (Created) with Location header
- **PUT**: Full update → 200 (OK) or 204 (No Content)
- **PATCH**: Partial update → 200 (OK)
- **DELETE**: Remove resource → 200 (OK) or 204 (No Content)

**Status Code Guide:**
- `200`: Success
- `201`: Resource created (include Location header)
- `204`: Success with no content
- `400`: Validation error / bad request
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `409`: Conflict (duplicate resource)
- `500`: Internal server error

**Response Format:**
```csharp
// Success (with data)
{ "success": true, "data": {...}, "message": "Operation completed" }

// Success (without data)
{ "success": true, "message": "Operation completed successfully" }

// Error
{ "success": false, "message": "Validation failed" }
{ "success": false, "errorMessage": "Invalid credentials" }

// Error with details (use sparingly, avoid exposing internals)
{ "success": false, "message": "Validation failed", "errors": ["Field X is required"] }
```

**Important Response Guidelines:**
- Use consistent property names across the API (e.g., `errorMessage` vs `message`)
- Include `success` boolean flag in all responses for easy client-side handling
- Return appropriate HTTP status codes (don't return 200 with `success: false`)
- For lists/collections, wrap in a data object: `{ "success": true, "data": [...], "totalCount": 100 }`
- For pagination, include metadata: `{ "success": true, "data": [...], "page": 1, "pageSize": 20, "totalCount": 100 }`

---

### 3. Data Transfer Objects (DTOs)

**Naming Convention:**
- Request DTOs: `{Action}{Resource}RequestDto` (e.g., `AddUserRequestDto`)
- Response DTOs: `{Action}{Resource}ResponseDto` (e.g., `AddUserResponseDto`)
- Place in `Models/Dto/` directory

**Validation Attributes:**
```csharp
public class AddUserRequestDto
{
    [Required(ErrorMessage = "Username is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be 3-50 characters")]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "GroupId must be positive")]
    public int GroupId { get; set; }

    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string? Email { get; set; }
}
```

**Rules:**
- Create dedicated DTOs for each endpoint (no sharing)
- Apply validation attributes to all inputs
- Validate server-side (never trust client input)
- Use nullable reference types appropriately
- Initialize strings with `string.Empty` (not null)

---

### 4. Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| C# Classes/Methods | PascalCase | `UserController`, `GetActiveUsers()` |
| C# Parameters/Fields | camelCase | `userId`, `_logger` |
| C# Private Fields | _camelCase | `_hubContext`, `_activeAlarms` |
| JSON Properties | camelCase | `{ "userId": 123, "userName": "john" }` |
| Database Tables | PascalCase | `Users`, `ActiveAlarms` |
| API Routes | lowercase | `/api/auth/login`, `/api/monitoring/alarms` |

---

## 🏗️ Architecture Patterns

### Background Workers

**Pattern:**
```csharp
public class MyBackgroundWorker : BackgroundService
{
    private readonly ILogger<MyBackgroundWorker> _logger;

    public MyBackgroundWorker(ILogger<MyBackgroundWorker> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("{Worker} starting", nameof(MyBackgroundWorker));

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoWorkAsync(stoppingToken);
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    _logger.LogDebug("{Worker} cancellation requested", nameof(MyBackgroundWorker));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in {Worker}", nameof(MyBackgroundWorker));
                }
            }
        }
        finally
        {
            _logger.LogInformation("{Worker} stopping", nameof(MyBackgroundWorker));
        }
    }

    private async Task DoWorkAsync(CancellationToken cancellationToken)
    {
        // Work implementation
    }
}
```

**Register in Program.cs:**
```csharp
builder.Services.AddHostedService<MyBackgroundWorker>();
```

---

### SignalR Real-Time Updates

**Hub Configuration:**
```csharp
// Hub is located at /monitoringhub endpoint
// Requires JWT Bearer token authentication
// Supports WebSockets, Server-Sent Events, and Long Polling transports
```

**Broadcasting from Services/Workers:**
```csharp
private readonly IHubContext<MonitoringHub> _hubContext;

public MyService(IHubContext<MonitoringHub> hubContext)
{
    _hubContext = hubContext;
}

// Broadcast to all connected clients
await _hubContext.Clients.All.SendAsync("ReceiveActiveAlarmsUpdate", alarmCount, cancellationToken);

// Broadcast to specific user
await _hubContext.Clients.User(userId).SendAsync("ReceiveActiveAlarmsUpdate", alarmCount, cancellationToken);

// Broadcast to specific connection
await _hubContext.Clients.Client(connectionId).SendAsync("ReceiveActiveAlarmsUpdate", alarmCount, cancellationToken);
```

**Client Connection (JavaScript/TypeScript):**
```javascript
import * as signalR from "@microsoft/signalr";

// Create connection with JWT token
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7136/monitoringhub", {
        accessTokenFactory: () => localStorage.getItem("jwt_token")
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

// Register client method to receive updates from server
connection.on("ReceiveActiveAlarmsUpdate", (activeAlarmsCount) => {
    console.log(`Active alarms: ${activeAlarmsCount}`);
});

// Start connection
await connection.start();

// Optional: Call server method
await connection.invoke("SubscribeToActiveAlarms");
```

**Client Connection (C#):**
```csharp
using Microsoft.AspNetCore.SignalR.Client;

var connection = new HubConnectionBuilder()
    .WithUrl("https://localhost:7136/monitoringhub", options =>
    {
        options.AccessTokenProvider = () => Task.FromResult(jwtToken);
    })
    .WithAutomaticReconnect()
    .Build();

// Register client method to receive updates from server
connection.On<int>("ReceiveActiveAlarmsUpdate", (activeAlarmsCount) =>
{
    Console.WriteLine($"Active alarms: {activeAlarmsCount}");
});

await connection.StartAsync();
```

**⚠️ IMPORTANT: SignalR Method Changes**
When adding or modifying SignalR hub methods, you MUST update:
1. The hub class (`Hubs/MonitoringHub.cs`) with XML documentation
2. The `/api/Monitoring/SignalRHubInfo` endpoint (`Controllers/MonitoringController.cs`) - update the `ServerMethods` and `ClientMethods` lists to reflect current hub implementation
3. The `SignalRHubInfoResponseDto` if new data structures are needed

This ensures API consumers always have accurate, up-to-date SignalR integration documentation.

---

### JWT Authentication

**Controller Authorization:**
```csharp
[Authorize] // Requires valid JWT token
[Authorize(Roles = "Admin")] // Requires specific role
public class SecureController : ControllerBase
{
    [AllowAnonymous] // Public endpoint
    public IActionResult PublicEndpoint() { }

    [Authorize]
    public IActionResult ProtectedEndpoint()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = User.Identity?.Name;
        return Ok(new { userId, userName });
    }
}
```

---

### MassTransit Message Publishing

**Publishing Messages:**
```csharp
private readonly IPublishEndpoint _publishEndpoint;

public MyService(IPublishEndpoint publishEndpoint)
{
    _publishEndpoint = publishEndpoint;
}

// Publish an event
await _publishEndpoint.Publish(new MyEvent
{
    Id = eventId,
    Timestamp = DateTime.UtcNow,
    Data = eventData
});
```

**Consuming Messages:**
```csharp
public class MyEventConsumer : IConsumer<MyEvent>
{
    private readonly ILogger<MyEventConsumer> _logger;

    public MyEventConsumer(ILogger<MyEventConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<MyEvent> context)
    {
        try
        {
            _logger.LogInformation("Processing event: {EventId}", context.Message.Id);
            
            // Process the message
            await ProcessEventAsync(context.Message);
            
            _logger.LogInformation("Event processed successfully: {EventId}", context.Message.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing event: {EventId}", context.Message.Id);
            throw; // Let MassTransit handle retries
        }
    }
}
```

**Register in Program.cs:**
```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<MyEventConsumer>();
    
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
        
        cfg.ConfigureEndpoints(context);
    });
});
```

---

## 📚 Documentation Requirements (CRITICAL)

### XML Documentation for Swagger

**Required for ALL public members (controllers, DTOs, services):**
```csharp
/// <summary>
/// Adds a new user to the system with specified permissions.
/// </summary>
/// <param name="request">User registration details including username and group assignment.</param>
/// <returns>Response containing the created user ID and confirmation message.</returns>
/// <remarks>
/// Sample request:
/// 
///     POST /api/users/add
///     {
///        "userName": "johndoe",
///        "password": "SecurePass123!",
///        "groupId": 1,
///        "email": "john@example.com"
///     }
///     
/// </remarks>
/// <response code="201">User created successfully</response>
/// <response code="400">Validation error - invalid username format or duplicate entry</response>
/// <response code="401">Unauthorized - valid JWT token required</response>
/// <response code="403">Forbidden - Admin role required</response>
[HttpPost("add")]
[Authorize(Roles = "Admin")]
[ProducesResponseType(typeof(AddUserResponseDto), StatusCodes.Status201Created)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> AddUser([FromBody] AddUserRequestDto request)
{
    // implementation
}
```

**DTO Documentation Example:**
```csharp
/// <summary>
/// Request model for adding a new user to the system
/// </summary>
public class AddUserRequestDto
{
    /// <summary>
    /// Unique username for the user (3-50 characters, alphanumeric)
    /// </summary>
    /// <example>johndoe</example>
    [Required(ErrorMessage = "Username is required")]
    [StringLength(50, MinimumLength = 3)]
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// User's email address for notifications
    /// </summary>
    /// <example>john@example.com</example>
    [EmailAddress]
    public string? Email { get; set; }
}
```

**Swagger Configuration Elements:**
- Controller-level documentation with `[Produces("application/json")]`
- Endpoint summary (brief description)
- Detailed description with `<remarks>` tag (include sample requests/responses)
- All parameters with types, constraints, examples using `<example>` tag
- Return types with status codes using `[ProducesResponseType]`
- Error scenarios with status codes and reasons
- Authorization requirements with `[Authorize]` attributes
- Document all DTOs with XML comments for properties

---

### API.http Examples

**Required for every new endpoint:**
```http
### Add User
POST {{API_HostAddress}}/api/users/add
Content-Type: application/json
Authorization: Bearer {{access_token}}

{
  "userName": "testuser",
  "password": "SecurePass123!",
  "groupId": 1,
  "email": "test@example.com"
}

###
```

**Guidelines:**
- Add example requests immediately after creating endpoints
- Include authentication headers where required
- Provide realistic example data
- Show both success and error scenarios
- Group related endpoints together

---

### README.md Updates

**Update after significant changes:**
- New features added
- API endpoint changes
- Configuration requirements
- Setup/installation steps
- Troubleshooting section
- Dependencies updated

---

## ✅ Implementation Checklist

When implementing new features, verify:

**Security & Configuration:**
- [ ] HTTPS endpoint used (no HTTP fallback)
- [ ] JWT authorization applied to protected endpoints
- [ ] Input validation with data annotations
- [ ] SQL injection prevention (parameterized queries/EF Core)
- [ ] CORS configured appropriately

**Code Quality:**
- [ ] Try-catch blocks on all operations
- [ ] Structured logging with context
- [ ] DTOs created with validation attributes
- [ ] Proper HTTP methods and status codes
- [ ] Null reference handling
- [ ] Async/await used correctly (no `.Result` or `.Wait()`)

**Documentation:**
- [ ] XML comments on all public members
- [ ] Swagger response types defined
- [ ] API.http examples added
- [ ] README.md updated if needed
- [ ] Error scenarios documented

**Data & Naming:**
- [ ] camelCase for JSON
- [ ] PascalCase for C# public members
- [ ] Proper DTO naming (`*RequestDto`/`*ResponseDto`)
- [ ] Database migrations created if schema changed

**Testing:**
- [ ] Endpoint tested via API.http
- [ ] Error cases validated (400, 401, 403, 404, 500)
- [ ] Authorization tested (with/without token, different roles)
- [ ] Input validation tested (missing fields, invalid formats, edge cases)
- [ ] SignalR hub methods verified (if applicable)
- [ ] Real-time updates tested with connected clients (if applicable)
- [ ] Background worker behavior verified (if applicable)
- [ ] Database operations verified (create, read, update, delete)
- [ ] Concurrent request handling tested (if stateful)
- [ ] `/api/Monitoring/SignalRHubInfo` endpoint updated (if SignalR methods changed)

---

## 🚀 Performance Guidelines

- Use async/await throughout (avoid blocking calls)
- Implement pagination for large datasets
- Use `IAsyncEnumerable<T>` for streaming large results
- Add appropriate database indexes
- Cache frequently accessed, rarely changed data
- Use `CancellationToken` in async methods
- Dispose resources properly (implement `IDisposable` when needed)
- Avoid N+1 query problems (use `.Include()` for related data)

---

## 🔍 Common Patterns

### Database Access via Core Library
```csharp
// Assuming Core.Users.GetUser(int id) exists
var user = await Core.Users.GetUser(userId);
if (user == null)
{
    return NotFound(new { success = false, message = "User not found" });
}
```

### Change Detection (for workers)
```csharp
// Use SHA256 digest for efficient change detection
private static byte[] ComputeDigest(List<T> items)
{
    if (items == null || items.Count == 0)
        return Array.Empty<byte>();

    var sb = new StringBuilder(items.Count * 16);
    foreach (var item in items)
    {
        sb.Append(item.Id);
        sb.Append('|');
    }

    using var sha = SHA256.Create();
    return sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
}
```

### Dependency Injection
```csharp
// Constructor injection (preferred)
private readonly ILogger<MyClass> _logger;
private readonly IHubContext<MyHub> _hubContext;

public MyClass(ILogger<MyClass> logger, IHubContext<MyHub> hubContext)
{
    _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
}
```

### Model Validation Pattern
```csharp
[HttpPost("endpoint")]
public async Task<IActionResult> Endpoint([FromBody] RequestDto request)
{
    try
    {
        // ALWAYS check ModelState first
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            
            return BadRequest(new 
            { 
                success = false, 
                message = "Validation failed", 
                errors = errors 
            });
        }
        
        // Business logic here
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in endpoint");
        return StatusCode(500, new { success = false, message = "Internal server error" });
    }
}
```

### User Claims Access Pattern
```csharp
// Extract user information from JWT claims
var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
var userName = User.Identity?.Name;
var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

// Validate user ID
if (string.IsNullOrEmpty(userId))
{
    return Unauthorized(new { success = false, message = "Invalid token" });
}
```

---

## 📋 Quick Reference

**Frequently Used Paths:**
- Controllers: `Controllers/`
- DTOs: `Models/Dto/`
- Background Workers: `Workers/`
- SignalR Hub: `Hubs/`
- Services: `Services/`
- Configuration: `appsettings.json`, `appsettings.Development.json`

**Key URLs:**
- API Base: `https://localhost:7136`
- Swagger UI: `https://localhost:7136/swagger`
- SignalR Hub: `https://localhost:7136/monitoringhub`

**Database:**
- Connection: PostgreSQL on localhost
- Database: `monitoring_users`
- Migrations: Auto-applied on startup in development

---

---

## 🚨 Common Pitfalls to Avoid

### Security Issues
- ❌ **DON'T** return detailed exception messages to clients
- ❌ **DON'T** expose internal error details or stack traces
- ❌ **DON'T** log sensitive information (passwords, tokens, PII)
- ❌ **DON'T** use string concatenation for SQL queries
- ❌ **DON'T** skip input validation on any user-supplied data
- ✅ **DO** validate and sanitize all inputs
- ✅ **DO** use parameterized queries or EF Core
- ✅ **DO** apply `[Authorize]` attributes to protected endpoints

### Performance Issues
- ❌ **DON'T** use `.Result` or `.Wait()` on async methods (causes deadlocks)
- ❌ **DON'T** make synchronous calls in async methods
- ❌ **DON'T** forget to use `.ConfigureAwait(false)` in library code
- ❌ **DON'T** load entire collections when you only need a few items
- ✅ **DO** use async/await consistently
- ✅ **DO** implement pagination for large datasets
- ✅ **DO** use `.Include()` for eager loading related data
- ✅ **DO** add database indexes for frequently queried columns

### Code Quality Issues
- ❌ **DON'T** catch exceptions without logging them
- ❌ **DON'T** return success=true with an error status code
- ❌ **DON'T** skip ModelState validation
- ❌ **DON'T** use magic strings or numbers (use constants/enums)
- ✅ **DO** use structured logging with context
- ✅ **DO** follow naming conventions consistently
- ✅ **DO** document all public APIs with XML comments
- ✅ **DO** write descriptive commit messages

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

**Issue: Certificate errors on startup**
- Solution: Run `create-certificates.ps1` to generate development certificate
- Verify certificate exists at `certificates/api-cert.pfx`

**Issue: Database connection fails**
- Solution: Check PostgreSQL is running
- Verify connection string in `appsettings.json`
- Check if database `monitoring_users` exists

**Issue: JWT token validation fails**
- Solution: Verify JWT configuration in `appsettings.json`
- Check token expiration time
- Ensure `Issuer` and `Audience` match between generation and validation

**Issue: CORS errors from frontend**
- Solution: Check frontend URL is in allowed origins list in `Program.cs`
- Verify CORS policy is applied correctly
- Check if request includes credentials/headers

**Issue: SignalR connection fails**
- Solution: Verify SignalR is configured in `Program.cs`
- Check JWT token is being provided correctly
- Ensure client is using correct hub URL (`/monitoringhub`)
- Check browser console for connection errors
- Verify WebSocket support or fallback transports are enabled

**Issue: Background worker not executing**
- Solution: Verify worker is registered with `AddHostedService<T>()`
- Check worker logs for exceptions
- Ensure `CancellationToken` is handled correctly

---

## 📝 Git Workflow

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add refresh token endpoint

Implements JWT refresh token flow for seamless authentication
- Add RefreshToken endpoint to AuthController
- Update JwtTokenService with refresh logic
- Add refresh token validation

Closes #123
```

```
fix(monitoring): resolve memory leak in background worker

The active alarms worker was not disposing database contexts properly
- Add proper disposal in finally block
- Implement IDisposable pattern
- Add cancellation token checks
```

### Branch Naming
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent production fixes
- `refactor/description` - Code refactoring

---

## 🎓 Learning Resources

### Official Documentation
- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [SignalR in .NET](https://docs.microsoft.com/aspnet/core/signalr)
- [MassTransit Documentation](https://masstransit.io/documentation)

### Best Practices
- [REST API Design Guidelines](https://docs.microsoft.com/azure/architecture/best-practices/api-design)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Structured Logging Best Practices](https://stackify.com/structured-logging-best-practices/)

---

**Last Updated:** October 2025