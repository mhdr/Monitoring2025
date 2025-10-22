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

### HTTP Configuration
- **HTTP Only**: `http://localhost:5030` (HTTPS disabled for simplified development)
- **Port**: 5030 (HTTP)
- **CORS**: Configured for detected public IP + localhost
- **JWT**: Token-based authentication with refresh tokens (RequireHttpsMetadata = false)

### Environment
- **Development**: HTTP-only mode with auto-migration
- **Production**: Consider enabling HTTPS with proper SSL certificates and update JWT configuration accordingly

### Important Notes
- HTTPS redirection is **disabled** - all requests use HTTP
- HSTS (HTTP Strict Transport Security) is **disabled**
- JWT authentication does **not** require HTTPS metadata (`RequireHttpsMetadata = false`)
- SSL certificates are **not** required for development

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
    .withUrl("http://localhost:5030/monitoringhub", {
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
    .WithUrl("http://localhost:5030/monitoringhub", options =>
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
- [ ] HTTP endpoint configured correctly
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
- API Base: `http://localhost:5030`
- Swagger UI: `http://localhost:5030/swagger`
- SignalR Hub: `http://localhost:5030/monitoringhub`

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
- Ensure client is using correct hub URL (`/hubs/monitoring`)
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

## 🔍 Debugging & Troubleshooting Strategies

### Advanced Debugging Techniques

**Enable detailed logging in development:**
```json
// appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore": "Information",
      "Microsoft.AspNetCore.SignalR": "Debug",
      "Microsoft.AspNetCore.Http.Connections": "Debug"
    }
  }
}
```

**Debug SignalR issues:**
```csharp
// Enable detailed SignalR logging
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 102400; // 100 KB
    options.StreamBufferCapacity = 10;
});
```

**Debug Entity Framework queries:**
```csharp
// Log SQL queries to console
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString)
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
        .EnableDetailedErrors(builder.Environment.IsDevelopment())
        .LogTo(Console.WriteLine, LogLevel.Information);
});
```

### Common Issues & Solutions

**Issue: EF Core tracking conflicts**
```csharp
// Solution: Detach entity before re-attaching
_context.Entry(existingEntity).State = EntityState.Detached;
var updated = await _context.Users.FindAsync(userId);
```

**Issue: SignalR connection drops**
```csharp
// Solution: Configure keep-alive and timeout
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});
```

**Issue: Circular reference in JSON serialization**
```csharp
// Solution: Configure JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
```

**Issue: Database connection pool exhaustion**
```csharp
// Solution: Configure connection pool limits
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=monitoring;Username=user;Password=pass;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=100;Connection Idle Lifetime=300"
}
```

---

## 🌐 Deployment & DevOps

### Docker Support

**Dockerfile example:**
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5030

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["API/API.csproj", "API/"]
COPY ["Core/Core.csproj", "Core/"]
COPY ["DB.User/DB.User.csproj", "DB.User/"]
COPY ["Contracts/Contracts.csproj", "Contracts/"]
COPY ["Share/Share.csproj", "Share/"]
RUN dotnet restore "API/API.csproj"
COPY . .
WORKDIR "/src/API"
RUN dotnet build "API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "API.dll"]
```

**docker-compose.yml example:**
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: API/Dockerfile
    ports:
      - "5030:5030"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=monitoring_users;Username=postgres;Password=postgres
      - ConnectionStrings__RabbitMQ=amqp://guest:guest@rabbitmq:5672
    depends_on:
      - postgres
      - rabbitmq
    networks:
      - monitoring-network

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: monitoring_users
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - monitoring-network

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    networks:
      - monitoring-network

volumes:
  postgres-data:

networks:
  monitoring-network:
    driver: bridge
```

### CI/CD Pipeline (GitHub Actions)

**.github/workflows/dotnet.yml:**
```yaml
name: .NET CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 9.0.x
    
    - name: Restore dependencies
      run: dotnet restore
    
    - name: Build
      run: dotnet build --no-restore --configuration Release
    
    - name: Test
      run: dotnet test --no-build --configuration Release --verbosity normal --collect:"XPlat Code Coverage"
    
    - name: Code Coverage Report
      uses: codecov/codecov-action@v3
      with:
        files: '**/coverage.cobertura.xml'
        flags: unittests
        name: codecov-umbrella
    
    - name: Publish
      run: dotnet publish --no-build --configuration Release --output ./publish
    
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: api-publish
        path: ./publish
```

### Environment Configuration

**Use environment-specific settings:**
```json
// appsettings.Production.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "yourdomain.com",
  "JwtConfig": {
    "Issuer": "https://api.yourdomain.com",
    "Audience": "https://yourdomain.com"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Use environment variable or Azure Key Vault"
  }
}
```

**Read from environment variables:**
```csharp
// In Program.cs
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
    ?? throw new InvalidOperationException("Database connection string not configured");
```

---

## 📋 Code Review Checklist

### Pre-Commit Checklist

**Code Quality:**
- [ ] No commented-out code (remove or document why it's needed)
- [ ] No hardcoded values (use configuration or constants)
- [ ] No `TODO` comments without tracking ticket reference
- [ ] No console.WriteLine (use ILogger)
- [ ] No empty catch blocks
- [ ] All public members have XML documentation
- [ ] Method names are descriptive and follow conventions
- [ ] No magic numbers (use named constants)

**Security:**
- [ ] No sensitive data in logs or error messages
- [ ] All user inputs are validated
- [ ] SQL queries use parameterization
- [ ] Authentication/authorization applied to protected endpoints
- [ ] No secrets in code (use configuration/secrets manager)
- [ ] HTTP configured correctly (HTTPS optional for production)
- [ ] CORS configured appropriately

**Performance:**
- [ ] Async/await used correctly (no blocking calls)
- [ ] Database queries are efficient (no N+1 problems)
- [ ] Large datasets use pagination or streaming
- [ ] Proper use of caching where appropriate
- [ ] Dispose pattern implemented for IDisposable resources

**Testing:**
- [ ] Unit tests written for new functionality
- [ ] Integration tests for API endpoints
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] All tests pass locally

**Documentation:**
- [ ] XML comments on all public members
- [ ] API.http examples added for new endpoints
- [ ] README.md updated if needed
- [ ] Swagger documentation complete

---

## 🎓 Learning Resources

### Official Documentation
- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [SignalR in .NET](https://docs.microsoft.com/aspnet/core/signalr)
- [MassTransit Documentation](https://masstransit.io/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

### Best Practices
- [REST API Design Guidelines](https://docs.microsoft.com/azure/architecture/best-practices/api-design)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Structured Logging Best Practices](https://stackify.com/structured-logging-best-practices/)
- [Clean Code Principles](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- [SOLID Principles in C#](https://www.c-sharpcorner.com/UploadFile/damubetha/solid-principles-in-C-Sharp/)

### Advanced Topics
- [Microservices Architecture](https://docs.microsoft.com/azure/architecture/microservices/)
- [Event-Driven Architecture](https://docs.microsoft.com/azure/architecture/guide/architecture-styles/event-driven)
- [Domain-Driven Design](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
- [CQRS Pattern](https://docs.microsoft.com/azure/architecture/patterns/cqrs)
- [API Gateway Pattern](https://docs.microsoft.com/azure/architecture/microservices/design/gateway)

---

## 🏥 Health Checks & Observability

### Health Check Endpoints

**Implement health checks for production monitoring:**

```csharp
// In Program.cs - Add health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection"), name: "database")
    .AddRabbitMQ(builder.Configuration.GetConnectionString("RabbitMQ"), name: "rabbitmq")
    .AddCheck<SignalRHealthCheck>("signalr");

// After app.UseAuthorization();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false, // Just check if API is running
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

**Custom Health Check Example:**
```csharp
public class SignalRHealthCheck : IHealthCheck
{
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ILogger<SignalRHealthCheck> _logger;

    public SignalRHealthCheck(IHubContext<MonitoringHub> hubContext, ILogger<SignalRHealthCheck> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Verify hub context is available
            if (_hubContext == null)
            {
                return HealthCheckResult.Unhealthy("SignalR hub context is null");
            }

            return HealthCheckResult.Healthy("SignalR hub is operational");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SignalR health check failed");
            return HealthCheckResult.Unhealthy("SignalR hub check failed", ex);
        }
    }
}
```

### Structured Logging Best Practices

**Use log scopes for correlation:**
```csharp
using (_logger.BeginScope(new Dictionary<string, object>
{
    ["UserId"] = userId,
    ["Operation"] = "AddUser",
    ["CorrelationId"] = correlationId
}))
{
    _logger.LogInformation("Starting user creation");
    // operation code
    _logger.LogInformation("User created successfully");
}
```

**Performance Logging:**
```csharp
var stopwatch = System.Diagnostics.Stopwatch.StartNew();
try
{
    var result = await PerformOperationAsync();
    stopwatch.Stop();
    _logger.LogInformation("Operation completed in {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
    
    if (stopwatch.ElapsedMilliseconds > 1000)
    {
        _logger.LogWarning("Slow operation detected: {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
    }
    
    return result;
}
catch (Exception ex)
{
    stopwatch.Stop();
    _logger.LogError(ex, "Operation failed after {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
    throw;
}
```

---

## 🧪 Testing Strategy

### Unit Testing

**Controller Unit Test Example:**
```csharp
public class AuthControllerTests
{
    private readonly Mock<ILogger<AuthController>> _loggerMock;
    private readonly Mock<JwtTokenService> _tokenServiceMock;
    private readonly Mock<UserManager<AppUser>> _userManagerMock;
    
    public AuthControllerTests()
    {
        _loggerMock = new Mock<ILogger<AuthController>>();
        _tokenServiceMock = new Mock<JwtTokenService>();
        _userManagerMock = MockUserManager();
    }
    
    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOkWithToken()
    {
        // Arrange
        var controller = new AuthController(_loggerMock.Object, _tokenServiceMock.Object, _userManagerMock.Object);
        var request = new LoginRequestDto { UserName = "testuser", Password = "Test123!" };
        
        _userManagerMock.Setup(x => x.FindByNameAsync(request.UserName))
            .ReturnsAsync(new AppUser { UserName = request.UserName });
        _userManagerMock.Setup(x => x.CheckPasswordAsync(It.IsAny<AppUser>(), request.Password))
            .ReturnsAsync(true);
        _tokenServiceMock.Setup(x => x.GenerateToken(It.IsAny<AppUser>()))
            .Returns("fake-jwt-token");
        
        // Act
        var result = await controller.Login(request);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsAssignableFrom<AuthResponseDto>(okResult.Value);
        Assert.True(response.Success);
        Assert.NotNull(response.Token);
    }
    
    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsBadRequest()
    {
        // Arrange
        var controller = new AuthController(_loggerMock.Object, _tokenServiceMock.Object, _userManagerMock.Object);
        var request = new LoginRequestDto { UserName = "testuser", Password = "WrongPassword" };
        
        _userManagerMock.Setup(x => x.FindByNameAsync(request.UserName))
            .ReturnsAsync(new AppUser { UserName = request.UserName });
        _userManagerMock.Setup(x => x.CheckPasswordAsync(It.IsAny<AppUser>(), request.Password))
            .ReturnsAsync(false);
        
        // Act
        var result = await controller.Login(request);
        
        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }
    
    private Mock<UserManager<AppUser>> MockUserManager()
    {
        var store = new Mock<IUserStore<AppUser>>();
        return new Mock<UserManager<AppUser>>(
            store.Object, null, null, null, null, null, null, null, null);
    }
}
```

### Integration Testing

**API Integration Test Example:**
```csharp
public class MonitoringControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    
    public MonitoringControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }
    
    [Fact]
    public async Task GetGroups_WithAuthentication_ReturnsGroups()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        
        // Act
        var response = await _client.PostAsync("/api/Monitoring/Groups", new StringContent("{}", Encoding.UTF8, "application/json"));
        
        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonConvert.DeserializeObject<GroupsResponseDto>(content);
        Assert.NotNull(result);
        Assert.NotNull(result.Data);
    }
    
    [Fact]
    public async Task GetGroups_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsync("/api/Monitoring/Groups", new StringContent("{}", Encoding.UTF8, "application/json"));
        
        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
    
    private async Task<string> GetAuthTokenAsync()
    {
        var loginRequest = new LoginRequestDto { UserName = "testuser", Password = "Test123!" };
        var content = new StringContent(JsonConvert.SerializeObject(loginRequest), Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/Auth/Login", content);
        var result = await response.Content.ReadAsStringAsync();
        var authResponse = JsonConvert.DeserializeObject<AuthResponseDto>(result);
        return authResponse.Token;
    }
}
```

### SignalR Hub Testing

**Hub Method Test Example:**
```csharp
public class MonitoringHubTests
{
    private readonly Mock<ILogger<MonitoringHub>> _loggerMock;
    private readonly Mock<ConnectionTrackingService> _connectionServiceMock;
    
    [Fact]
    public async Task SubscribeToActiveAlarms_LogsSubscription()
    {
        // Arrange
        _loggerMock = new Mock<ILogger<MonitoringHub>>();
        _connectionServiceMock = new Mock<ConnectionTrackingService>();
        var hub = new MonitoringHub(_loggerMock.Object, _connectionServiceMock.Object);
        
        var mockContext = new Mock<HubCallerContext>();
        mockContext.Setup(c => c.ConnectionId).Returns("test-connection-id");
        hub.Context = mockContext.Object;
        
        // Act
        await hub.SubscribeToActiveAlarms();
        
        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("test-connection-id")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }
}
```

### Background Worker Testing

**Worker Test Example:**
```csharp
public class ActiveAlarmsBackgroundWorkerTests
{
    [Fact]
    public async Task ExecuteAsync_BroadcastsActiveAlarmCount()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<ActiveAlarmsBackgroundWorker>>();
        var hubContextMock = new Mock<IHubContext<MonitoringHub>>();
        var clientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        
        hubContextMock.Setup(h => h.Clients).Returns(clientsMock.Object);
        clientsMock.Setup(c => c.All).Returns(clientProxyMock.Object);
        
        var worker = new ActiveAlarmsBackgroundWorker(loggerMock.Object, hubContextMock.Object);
        var cts = new CancellationTokenSource();
        
        // Act
        var task = worker.StartAsync(cts.Token);
        await Task.Delay(2000); // Let it run for 2 seconds
        cts.Cancel();
        await task;
        
        // Assert
        clientProxyMock.Verify(
            x => x.SendCoreAsync(
                "ReceiveActiveAlarmsUpdate",
                It.IsAny<object[]>(),
                It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }
}
```

### Test Naming Convention

Use descriptive test names that follow the pattern:
```
MethodName_Scenario_ExpectedResult
```

Examples:
- `Login_WithValidCredentials_ReturnsOkWithToken`
- `GetGroups_WithoutAuthentication_ReturnsUnauthorized`
- `AddUser_WithDuplicateUsername_ReturnsBadRequest`
- `SubscribeToActiveAlarms_WithValidConnection_LogsSubscription`

---

## 🔐 Advanced Security Patterns

### Rate Limiting

**Implement rate limiting to prevent abuse:**
```csharp
// In Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", options =>
    {
        options.PermitLimit = 100;
        options.Window = TimeSpan.FromMinutes(1);
        options.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        options.QueueLimit = 0;
    });
    
    options.AddTokenBucketLimiter("token", options =>
    {
        options.TokenLimit = 1000;
        options.ReplenishmentPeriod = TimeSpan.FromMinutes(1);
        options.TokensPerPeriod = 100;
        options.AutoReplenishment = true;
    });
});

// After app.UseAuthorization();
app.UseRateLimiter();
```

**Apply to controllers:**
```csharp
[EnableRateLimiting("fixed")]
[HttpPost("Login")]
public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
{
    // implementation
}
```

### Input Sanitization

**Sanitize user input to prevent XSS:**
```csharp
public static class InputSanitizer
{
    public static string SanitizeHtml(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        
        // Remove HTML tags
        var sanitized = System.Text.RegularExpressions.Regex.Replace(input, "<.*?>", string.Empty);
        
        // Encode special characters
        sanitized = System.Web.HttpUtility.HtmlEncode(sanitized);
        
        return sanitized;
    }
    
    public static string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrEmpty(fileName)) return fileName;
        
        // Remove path traversal attempts
        fileName = Path.GetFileName(fileName);
        
        // Remove invalid characters
        var invalidChars = Path.GetInvalidFileNameChars();
        return string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));
    }
}
```

### Secure Configuration Management

**Use Azure Key Vault or User Secrets:**
```csharp
// Development - use User Secrets
// dotnet user-secrets init
// dotnet user-secrets set "JwtConfig:SecretKey" "your-secret-key"

// Production - use Azure Key Vault
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

**Validate configuration on startup:**
```csharp
public static class ConfigurationValidator
{
    public static void ValidateJwtConfig(JwtConfig config)
    {
        if (string.IsNullOrEmpty(config.SecretKey))
            throw new InvalidOperationException("JWT SecretKey is not configured");
        
        if (config.SecretKey.Length < 32)
            throw new InvalidOperationException("JWT SecretKey must be at least 32 characters");
        
        if (string.IsNullOrEmpty(config.Issuer))
            throw new InvalidOperationException("JWT Issuer is not configured");
        
        if (string.IsNullOrEmpty(config.Audience))
            throw new InvalidOperationException("JWT Audience is not configured");
    }
}
```

---

## 🚀 Advanced Performance Patterns

### Response Caching

**Implement response caching for expensive operations:**
```csharp
// In Program.cs
builder.Services.AddResponseCaching();
builder.Services.AddMemoryCache();

// After app.UseCors();
app.UseResponseCaching();
```

**Apply to controllers:**
```csharp
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
[HttpGet("SettingsVersion")]
public async Task<IActionResult> SettingsVersion()
{
    // implementation
}
```

**Custom caching with IMemoryCache:**
```csharp
private readonly IMemoryCache _cache;
private const string GROUPS_CACHE_KEY = "monitoring_groups_{0}";
private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

public async Task<List<Group>> GetGroupsAsync(string userId)
{
    var cacheKey = string.Format(GROUPS_CACHE_KEY, userId);
    
    if (!_cache.TryGetValue(cacheKey, out List<Group> groups))
    {
        groups = await _dbContext.Groups
            .Where(g => g.Users.Any(u => u.Id == userId))
            .ToListAsync();
        
        var cacheEntryOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(CacheDuration)
            .SetAbsoluteExpiration(TimeSpan.FromHours(1))
            .RegisterPostEvictionCallback((key, value, reason, state) =>
            {
                _logger.LogDebug("Cache entry {Key} evicted due to {Reason}", key, reason);
            });
        
        _cache.Set(cacheKey, groups, cacheEntryOptions);
        _logger.LogDebug("Cached groups for user {UserId}", userId);
    }
    
    return groups;
}

public void InvalidateGroupsCache(string userId)
{
    var cacheKey = string.Format(GROUPS_CACHE_KEY, userId);
    _cache.Remove(cacheKey);
    _logger.LogDebug("Invalidated groups cache for user {UserId}", userId);
}
```

### Database Query Optimization

**Use compiled queries for frequently executed queries:**
```csharp
private static readonly Func<ApplicationDbContext, int, Task<User>> GetUserByIdCompiled =
    EF.CompileAsyncQuery((ApplicationDbContext context, int userId) =>
        context.Users
            .Include(u => u.Groups)
            .FirstOrDefault(u => u.Id == userId));

public async Task<User> GetUserAsync(int userId)
{
    return await GetUserByIdCompiled(_dbContext, userId);
}
```

**Use AsNoTracking for read-only queries:**
```csharp
public async Task<List<Group>> GetGroupsReadOnlyAsync()
{
    return await _dbContext.Groups
        .AsNoTracking() // Don't track changes
        .Include(g => g.Items)
        .ToListAsync();
}
```

**Batch operations:**
```csharp
public async Task UpdateMultipleItemsAsync(List<Item> items)
{
    // Use ExecuteUpdateAsync for bulk updates (EF Core 7+)
    await _dbContext.Items
        .Where(i => items.Select(x => x.Id).Contains(i.Id))
        .ExecuteUpdateAsync(s => s
            .SetProperty(i => i.UpdatedAt, DateTime.UtcNow)
            .SetProperty(i => i.IsActive, true));
}
```

### Async Stream for Large Datasets

**Use IAsyncEnumerable for streaming large results:**
```csharp
/// <summary>
/// Stream alarm history data to avoid loading entire dataset into memory
/// </summary>
[HttpPost("AlarmHistoryStream")]
public async IAsyncEnumerable<AlarmHistoryDto> GetAlarmHistoryStream(
    [FromBody] AlarmHistoryRequestDto request,
    [EnumeratorCancellation] CancellationToken cancellationToken)
{
    var query = _dbContext.AlarmHistory
        .Where(a => a.ItemId == request.ItemId)
        .Where(a => a.Timestamp >= request.StartDate && a.Timestamp <= request.EndDate)
        .OrderBy(a => a.Timestamp)
        .AsAsyncEnumerable();
    
    await foreach (var alarm in query.WithCancellation(cancellationToken))
    {
        yield return new AlarmHistoryDto
        {
            Id = alarm.Id,
            ItemId = alarm.ItemId,
            Timestamp = alarm.Timestamp,
            Value = alarm.Value,
            AlarmType = alarm.AlarmType
        };
    }
}
```

---

## 📊 Monitoring & Metrics

### Application Insights Integration

**Add telemetry to track performance:**
```csharp
// In Program.cs
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    options.EnableAdaptiveSampling = true;
    options.EnableQuickPulseMetricStream = true;
});
```

**Track custom metrics:**
```csharp
private readonly TelemetryClient _telemetryClient;

public async Task<IActionResult> PerformOperation()
{
    using var operation = _telemetryClient.StartOperation<RequestTelemetry>("CustomOperation");
    try
    {
        var stopwatch = Stopwatch.StartNew();
        var result = await DoWorkAsync();
        stopwatch.Stop();
        
        _telemetryClient.TrackMetric("OperationDuration", stopwatch.ElapsedMilliseconds);
        _telemetryClient.TrackEvent("OperationCompleted", new Dictionary<string, string>
        {
            ["UserId"] = userId,
            ["Result"] = "Success"
        });
        
        return Ok(result);
    }
    catch (Exception ex)
    {
        operation.Telemetry.Success = false;
        _telemetryClient.TrackException(ex);
        throw;
    }
}
```

### Custom Middleware for Request Logging

**Log all requests with timing:**
```csharp
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = Guid.NewGuid().ToString();
        context.Items["CorrelationId"] = correlationId;
        
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation(
                "Request started: {Method} {Path} | CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                correlationId);
            
            await _next(context);
            
            stopwatch.Stop();
            
            _logger.LogInformation(
                "Request completed: {Method} {Path} | Status: {StatusCode} | Duration: {ElapsedMs}ms | CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                correlationId);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            _logger.LogError(ex,
                "Request failed: {Method} {Path} | Duration: {ElapsedMs}ms | CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds,
                correlationId);
            
            throw;
        }
    }
}

// Register in Program.cs after app.UseCors();
app.UseMiddleware<RequestLoggingMiddleware>();
```

---

## 🔄 Resilience & Fault Tolerance

### Polly for Retry Logic

**Install Polly:**
```xml
<PackageReference Include="Polly" Version="8.0.0" />
<PackageReference Include="Polly.Extensions.Http" Version="3.0.0" />
```

**Configure retry policies:**
```csharp
// In Program.cs
builder.Services.AddHttpClient("ExternalApi")
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryAttempt, context) =>
            {
                var logger = context.GetLogger();
                logger?.LogWarning(
                    "Retry {RetryAttempt} after {Delay}s due to {Result}",
                    retryAttempt,
                    timespan.TotalSeconds,
                    outcome.Result?.StatusCode);
            });
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak: (outcome, breakDelay) =>
            {
                Console.WriteLine($"Circuit breaker opened for {breakDelay.TotalSeconds}s");
            },
            onReset: () =>
            {
                Console.WriteLine("Circuit breaker reset");
            });
}
```

### Database Connection Resilience

**Configure retry on failure:**
```csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
            npgsqlOptions.CommandTimeout(30);
        });
});
```

---

## 🎯 API Versioning

### Implement API Versioning

**Install package:**
```xml
<PackageReference Include="Asp.Versioning.Mvc" Version="8.0.0" />
<PackageReference Include="Asp.Versioning.Mvc.ApiExplorer" Version="8.0.0" />
```

**Configure versioning:**
```csharp
// In Program.cs
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version"));
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});
```

**Apply versioning to controllers:**
```csharp
[ApiVersion("1.0")]
[ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiController]
public class MonitoringController : ControllerBase
{
    [HttpGet("Groups")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetGroupsV1()
    {
        // V1 implementation
    }
    
    [HttpGet("Groups")]
    [MapToApiVersion("2.0")]
    public async Task<IActionResult> GetGroupsV2()
    {
        // V2 implementation with breaking changes
    }
}
```

---

## 📖 Additional Resources

### Code Analysis Tools
- **SonarQube**: Continuous code quality inspection
- **ReSharper**: Code analysis and refactoring
- **StyleCop**: C# style and consistency checker
- **Security Code Scan**: Security vulnerability analyzer

### Recommended NuGet Packages
- **FluentValidation**: Advanced model validation
- **AutoMapper**: Object-to-object mapping
- **Serilog**: Structured logging framework
- **Bogus**: Fake data generation for testing
- **Moq**: Mocking framework for unit tests
- **xUnit/NUnit**: Testing frameworks
- **Polly**: Resilience and fault-handling library

### Performance Tools
- **BenchmarkDotNet**: Benchmarking library
- **MiniProfiler**: Profiling tool for ASP.NET
- **Application Insights**: Azure monitoring service

---

**Last Updated:** October 2025 (v2.1 - HTTP-Only Configuration)

**Recent Changes:**
- **v2.1 (Oct 2025)**: Removed HTTPS requirement, configured HTTP-only mode on port 5030
  - Removed SSL certificate dependencies
  - Disabled HTTPS redirection and HSTS
  - Updated all documentation and examples to use HTTP URLs
  - Simplified development setup (no certificate generation needed)