# AI Agent Instructions - EMS Monitoring API

## 🎯 Project Overview

**Technology Stack:**
- ASP.NET Core 9.0 Web API
- PostgreSQL with Entity Framework Core
- JWT Authentication (ASP.NET Core Identity)
- SignalR for real-time updates
- MassTransit for message queuing
- Background Workers for scheduled tasks

**Key Patterns:**
- Repository pattern with Core library
- DTO-based request/response models
- Structured logging with context
- Real-time notifications via SignalR
- Background service workers

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
    // operation code
    return Ok(new { success = true, data = result });
}
catch (ArgumentException ex)
{
    _logger.LogWarning(ex, "Validation failed: {Operation}", operation);
    return BadRequest(new { success = false, message = ex.Message });
}
catch (Exception ex)
{
    _logger.LogError(ex, "Error in {Operation}: {Message}", operation, ex.Message);
    return StatusCode(500, new { success = false, message = "Internal server error", errors = new[] { ex.Message } });
}
```

**Requirements:**
- Wrap ALL controller actions and service methods in try-catch
- Use structured logging with context (operation, userId, requestId)
- Log at appropriate levels: Info (success), Warning (validation), Error (exceptions)
- Return structured errors: `{success: false, message: "...", errors: [...]}`
- Never expose stack traces or sensitive data to clients

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
// Success
{ "success": true, "data": {...}, "message": "Operation completed" }

// Error
{ "success": false, "message": "Validation failed", "errors": ["Field X is required", "Field Y is invalid"] }
```

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

**Hub Definition:**
```csharp
public class MyHub : Hub
{
    // Optional: Override methods for connection management
}
```

**Broadcasting from Services/Workers:**
```csharp
private readonly IHubContext<MyHub> _hubContext;

// Send to all clients
await _hubContext.Clients.All.SendAsync("EventName", data, cancellationToken);

// Send to specific user
await _hubContext.Clients.User(userId).SendAsync("EventName", data, cancellationToken);

// Send to group
await _hubContext.Clients.Group(groupName).SendAsync("EventName", data, cancellationToken);
```

**Client Connection:**
```javascript
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7136/myHub")
    .build();

connection.on("EventName", (data) => {
    console.log("Received:", data);
});
```

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

## 📚 Documentation Requirements (CRITICAL)

### XML Documentation for Swagger

**Required for ALL public members:**
```csharp
/// <summary>
/// Adds a new user to the system with specified permissions.
/// </summary>
/// <param name="request">User registration details including username and group assignment.</param>
/// <returns>Response containing the created user ID and confirmation message.</returns>
/// <response code="201">User created successfully</response>
/// <response code="400">Validation error - invalid username format or duplicate entry</response>
/// <response code="401">Unauthorized - valid JWT token required</response>
/// <response code="403">Forbidden - Admin role required</response>
[HttpPost("add")]
[Authorize(Roles = "Admin")]
[ProducesResponseType(typeof(AddUserResponseDto), StatusCodes.Status201Created)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
public async Task<IActionResult> AddUser([FromBody] AddUserRequestDto request)
{
    // implementation
}
```

**Swagger Configuration Elements:**
- Endpoint summary (brief description)
- Detailed description (if complex)
- All parameters with types, constraints, examples
- Return types with status codes
- Error scenarios with status codes and reasons
- Authorization requirements

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
- [ ] Error cases validated
- [ ] Authorization tested
- [ ] SignalR notifications verified (if applicable)
- [ ] Background worker behavior verified (if applicable)

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

---

## 📋 Quick Reference

**Frequently Used Paths:**
- Controllers: `Controllers/`
- DTOs: `Models/Dto/`
- Background Workers: `Workers/`
- SignalR Hubs: `Libs/`
- Services: `Services/`
- Configuration: `appsettings.json`, `appsettings.Development.json`

**Key URLs:**
- API Base: `https://localhost:7136`
- Swagger UI: `https://localhost:7136/swagger`
- SignalR Hub: `https://localhost:7136/myHub`

**Database:**
- Connection: PostgreSQL on localhost
- Database: `monitoring_users`
- Migrations: Auto-applied on startup in development

---

**Last Updated:** October 2025