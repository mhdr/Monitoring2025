# Copilot Instructions

## Project Overview
This is an Environmental Monitoring System (EMS) API built with ASP.NET Core, serving as the backend for a monitoring system.

## Development Environment
This project should use both HTTP and HTTPS:
- HTTP: `http://localhost:5030`
- HTTPS: `https://localhost:7136` (use HTTPS by default)
- The SSL certificate is self-signed
- Always test endpoints on both protocols when applicable

## Data Storage
- **Database**: PostgreSQL (relational data, transactions, user management)

## Code Standards
- Follow C# and ASP.NET Core best practices
- Use dependency injection for services
- Implement proper error handling and logging
- Use async/await patterns for database operations
- Write unit tests for new functionality

## API Design
- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement proper request/response models
- Add input validation and sanitization
- Include comprehensive error responses
- Use consistent naming conventions (camelCase for JSON)

## Security
- Implement proper authentication and authorization
- Validate all inputs
- Use HTTPS in production
- Sanitize data before database operations

## API Documentation
- **Always update API.http and README.md files after updating the API**
- **swagger.json is critical** - my AI agent in React reads it, so always keep it updated and explanatory
- Include detailed descriptions, examples, and parameter information in Swagger
- Document all endpoints, request/response models, and error codes
- Add XML comments to controllers and models for automatic Swagger generation

## Testing
- Write unit tests for business logic
- Include integration tests for API endpoints
- Test both success and error scenarios
- Verify database operations and data integrity