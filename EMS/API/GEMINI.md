# GEMINI Copilot Development Instructions

> **Purpose**: These instructions guide GEMINI when assisting with code development, ensuring consistency, quality, and adherence to project standards.

---

## 📋 Table of Contents
- [Server Configuration](#server-configuration)
- [Code Quality Standards](#code-quality-standards)
- [Documentation Requirements](#documentation-requirements)

---

## 🌐 Server Configuration

### HTTPS-Only Development Mode
This project operates in **strict HTTPS-only mode** for local development:

#### Security Configuration
- ✅ **HTTPS Endpoint**: `https://localhost:7136` (fixed binding)
- ❌ **HTTP Access**: Completely removed - no HTTP endpoints are exposed or supported
- ❌ **HTTP Redirection**: HTTP listener has been permanently removed from the configuration

#### SSL Certificate
- **Location**: `certificates/api-cert.pfx`
- **Loading**: Automatically loaded on startup
- **Client Setup**: Clients may need to:
  - Trust the self-signed development certificate, OR
  - Skip SSL validation for local testing purposes

---

## ✨ Code Quality Standards

### Error Handling
- Implement **comprehensive try-catch blocks** around all operations that may fail
- Return **structured error responses** with meaningful messages and appropriate HTTP status codes
- Log exceptions with sufficient context for debugging

### Logging
- Use **structured logging** throughout the application
- Include relevant context (user ID, request ID, operation name)
- Log at appropriate levels (Debug, Information, Warning, Error, Critical)
- Ensure logs are useful for debugging and monitoring

### RESTful API Design
Follow REST principles consistently:
- **GET**: Retrieve resources (read-only, idempotent)
- **POST**: Create new resources (non-idempotent)
- **PUT**: Update existing resources (idempotent)
- **DELETE**: Remove resources (idempotent)

### HTTP Status Codes
Use semantically correct status codes:
- `200 OK` - Successful GET, PUT, or DELETE request
- `201 Created` - Successful POST request creating a new resource
- `400 Bad Request` - Invalid client input or validation failure
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource does not exist
- `500 Internal Server Error` - Unexpected server-side error

### Data Models
- Create **dedicated request/response DTOs** for each endpoint
- Use proper **data types** and annotations
- Apply **validation attributes** (`[Required]`, `[Range]`, `[StringLength]`, etc.)
- Implement **custom validators** for complex business rules

### Input Validation
- Validate **all incoming data** using model validation attributes
- Implement custom validators for complex scenarios
- Return clear validation error messages to clients
- Never trust client input - validate server-side

### Error Response Format
Return a **consistent error response structure**:
```json
{
  "success": false,
  "message": "Clear, actionable error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### Naming Conventions
- **JSON Properties**: Use `camelCase` for all JSON properties in API requests and responses
- **C# Code**: Follow standard C# naming conventions (PascalCase for classes/methods, camelCase for parameters)
- **DTOs**: Suffix with `RequestDto` or `ResponseDto` for clarity

---

## 📚 Documentation Requirements

### API Testing Documentation
- **File**: `API.http`
- **Requirement**: Keep updated with **all endpoint examples** after any API changes
- **Content**: Include sample requests for every endpoint with realistic data
- **Organization**: Group related endpoints together with clear comments

### Project Documentation
- **File**: `README.md`
- **Updates Required**:
  - New features and functionality
  - Setup and installation instructions
  - Configuration requirements
  - Usage examples and common scenarios
  - Troubleshooting guidance

### Swagger/OpenAPI Documentation
> ⚠️ **CRITICAL**: `swagger.json` is essential - AI agents and automated tools depend on it for API understanding

#### Required Swagger Content
1. **Endpoint Descriptions**
   - Clear, concise summary of what each endpoint does
   - Detailed description of behavior, side effects, and requirements

2. **Request Documentation**
   - All parameters with descriptions, data types, and constraints
   - Request body schemas with example values
   - Query parameters with allowed values and defaults

3. **Response Documentation**
   - Response schemas for all status codes
   - Example responses for success and error cases
   - Clear descriptions of all response properties

4. **Schema Documentation**
   - Complete descriptions for all model properties
   - Data types, formats, and constraints
   - Example values demonstrating proper usage
   - Enum values with descriptions

5. **Error Scenarios**
   - Document all possible error responses
   - Include error codes and messages
   - Provide troubleshooting guidance

### XML Documentation Comments
Add comprehensive XML documentation to enable automatic Swagger generation:

```csharp
/// <summary>
/// Brief description of the class/method
/// </summary>
/// <param name="paramName">Description of the parameter</param>
/// <returns>Description of the return value</returns>
/// <remarks>Additional details, usage notes, or examples</remarks>
/// <response code="200">Description of success response</response>
/// <response code="400">Description of validation error</response>
```

**Required Elements**:
- `/// <summary>` for all controllers, actions, and models
- `/// <param>` for all method parameters
- `/// <returns>` for all return values
- `/// <response>` for all possible HTTP responses
- `/// <remarks>` for additional context and examples

---

## 🎯 Summary

When working on this project, always:
1. ✅ Use HTTPS-only endpoints (`https://localhost:7136`)
2. ✅ Implement comprehensive error handling and logging
3. ✅ Follow RESTful principles and use correct HTTP status codes
4. ✅ Create well-documented DTOs with validation
5. ✅ Update `API.http`, `README.md`, and Swagger documentation
6. ✅ Add XML comments to all public APIs
7. ✅ Use camelCase for JSON properties
8. ✅ Maintain consistency across the codebase

---

*Last Updated: 2025-10-01*
