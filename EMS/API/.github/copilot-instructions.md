## Development Instructions

### Server Configuration
This project should use both HTTP and HTTPS:
- HTTP: `http://localhost:5030`
- HTTPS: `https://localhost:7136` (use HTTPS by default)
- The SSL certificate is self-signed

### Code Quality Standards
- Implement proper error handling and logging
- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement proper request/response models
- Add input validation and sanitization
- Include comprehensive error responses
- Use consistent naming conventions (camelCase for JSON)

### Documentation Requirements
- Always update API.http and README.md files after updating the API
- swagger.json is critical - my AI agent in React reads it, so always keep it updated and explanatory
- Include detailed descriptions, examples, and parameter information in Swagger
- Document all endpoints, request/response models, and error codes
- Add XML comments to controllers and models for automatic Swagger generation