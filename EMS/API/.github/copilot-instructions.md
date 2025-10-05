# AI Agent Instructions

## Server Configuration
- **HTTPS Only**: `https://localhost:7136` (no HTTP support)
- **Certificate**: `certificates/api-cert.pfx` (auto-loaded)

## Code Standards

### Error Handling & Logging
- Wrap all operations in try-catch blocks
- Use structured logging with context (userId, requestId, operation)
- Return structured errors: `{success: false, message: "...", errors: [...]}`

### REST API Rules
- **GET**: Read-only, idempotent
- **POST**: Create (201 Created)
- **PUT**: Update (200 OK)
- **DELETE**: Remove (200 OK)
- **Status Codes**: 200 (success), 201 (created), 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (error)

### Data Models
- Create dedicated DTOs per endpoint (suffix: `RequestDto`/`ResponseDto`)
- Apply validation attributes: `[Required]`, `[Range]`, `[StringLength]`
- Validate all input server-side
- Never trust client input

### Naming
- **JSON**: camelCase
- **C#**: PascalCase (classes/methods), camelCase (parameters)

## Documentation (CRITICAL)

### Required Updates After Code Changes
1. **API.http**: Add example requests for all endpoints
2. **README.md**: Update features, setup, usage, troubleshooting
3. **Swagger/OpenAPI**: Essential for AI agents

### XML Documentation (Required for Swagger)
```csharp
/// <summary>Brief description</summary>
/// <param name="name">Parameter description</param>
/// <returns>Return value description</returns>
/// <response code="200">Success description</response>
/// <response code="400">Error description</response>
```

### Swagger Requirements
- Endpoint summaries and detailed descriptions
- All parameters with types, constraints, examples
- Response schemas for all status codes
- Error scenarios with codes and messages

## Checklist
- [ ] HTTPS endpoint used
- [ ] Try-catch blocks added
- [ ] Structured logging implemented
- [ ] DTOs created with validation
- [ ] Correct HTTP methods and status codes
- [ ] XML comments added
- [ ] API.http updated
- [ ] Swagger documentation complete
- [ ] camelCase for JSON