## Development Instructions

### Server Configuration
This project operates in **HTTPS-first mode** (single protocol for local development):
- **HTTPS ONLY**: `https://localhost:7136` (fixed binding)
- **HTTP Access Removed**: Do not expose or document raw HTTP endpoints unless explicitly reintroduced.
- **Redirection**: If an HTTP listener is ever re-enabled, it MUST immediately redirect to HTTPS.
- **Certificate**: A self-signed development certificate (`certificates/api-cert.pfx`) is loaded automatically; clients may need to trust it or skip validation for local testing.


### Code Quality Standards
- **Error Handling**: Implement comprehensive try-catch blocks and structured error responses
- **Logging**: Use structured logging for debugging and monitoring
- **RESTful Design**: Follow REST principles (GET for retrieval, POST for creation, PUT for updates, DELETE for removal)
- **HTTP Status Codes**: Use semantically correct status codes (200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Server Error)
- **Models**: Create dedicated request/response models with proper data types and validation attributes
- **Input Validation**: Validate all incoming data using model validation attributes and custom validators
- **Error Responses**: Return consistent error response format with meaningful messages
- **Naming Conventions**: Use camelCase for all JSON properties in API responses

### Documentation Requirements
- **API Testing**: Keep `API.http` file updated with all endpoint examples after any API changes
- **Project Documentation**: Update `README.md` with new features, setup instructions, and usage examples
- **Swagger Integration**: `swagger.json` is **critical** - AI agents depend on it for API understanding
- **Swagger Content**: Include comprehensive descriptions, request/response examples, and parameter details
- **Complete Documentation**: Document every endpoint, all request/response models, and possible error scenarios
- **Schema Documentation**: All parameters, request schemas, and response schemas must have clear descriptions, data types, and example values in Swagger
- **Code Comments**: Add XML documentation comments (`/// <summary>`) to all controllers and models for automatic Swagger generation