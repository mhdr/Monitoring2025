# EMS API - JWT Authentication Guide

This API project includes JWT-based authentication using ASP.NET Core Identity with PostgreSQL database.

## Features

- User registration and login (username-based, no email required)
- JWT access token generation
- Refresh token support
- Role-based authentication
- CORS configured for React client
- Swagger UI with JWT Bearer token support
- Database migrations with Entity Framework Core

## Prerequisites

1. .NET 9.0 SDK
2. PostgreSQL database running on localhost
3. Database connection configured in `appsettings.json`

## Database Setup

The application will automatically run migrations on startup. Make sure your PostgreSQL server is running and accessible with the credentials specified in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=monitoring_users;Username=monitoring;Password=dbpassword"
  }
}
```

## JWT Configuration

JWT settings are configured in `appsettings.json`:

```json
{
  "JWT": {
    "Key": "ThisIsASecretKeyForJWTTokenGeneration123456789!@#",
    "Issuer": "EMSMonitoringAPI",
    "Audience": "EMSMonitoringClient",
    "ExpiryInMinutes": 60,
    "RefreshTokenExpiryInDays": 7
  }
}
```

**⚠️ Important**: Change the JWT key in production to a secure, randomly generated key.

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/logout` - Logout user

### Protected Endpoints

- `GET /weatherforecast` - Get weather forecast (requires JWT token)
- `GET /weatherforecast/public` - Get public weather forecast (no auth required)

## Usage Examples

### 1. Register a new user

```bash
curl -X POST "http://localhost:5030/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "userName": "johndoe",
    "password": "123",
    "confirmPassword": "123"
  }'
```

### 2. Login and get JWT token

```bash
curl -X POST "http://localhost:5030/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "johndoe",
    "password": "123",
    "rememberMe": false
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "xyz123...",
  "expires": "2025-09-24T12:00:00Z",
  "success": true,
  "user": {
    "id": "user-id",
    "userName": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "roles": []
  }
}
```

### 3. Access protected endpoints

```bash
curl -X GET "http://localhost:5030/weatherforecast" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## React Client Integration

For your React client, you can use the JWT tokens as follows:

```javascript
// Login function
const login = async (credentials) => {
  const response = await fetch('http://localhost:5030/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (response.ok) {
    const data = await response.json();
    // Store tokens in localStorage or secure storage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }
  
  throw new Error('Login failed');
};

// API call with JWT token
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshToken();
    // Retry the request
    return makeAuthenticatedRequest(url, options);
  }
  
  return response;
};
```

## Testing with Swagger UI

1. Start the API: `dotnet run`
2. Open Swagger UI: `http://localhost:5030/swagger`
3. Register or login to get a JWT token
4. Click "Authorize" button in Swagger UI
5. Enter: `Bearer YOUR_JWT_TOKEN_HERE`
6. Now you can test protected endpoints

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated key in production
2. **HTTPS**: Enable HTTPS in production (`RequireHttpsMetadata = true`)
3. **Token Storage**: Store tokens securely on the client side
4. **Refresh Tokens**: Implement refresh token storage and revocation in database
5. **Rate Limiting**: Consider implementing rate limiting for auth endpoints
6. **Password Policy**: Adjust password requirements in `Program.cs` as needed

## Development vs Production

- Development: HTTPS requirement is disabled, CORS allows localhost origins
- Production: Enable HTTPS, configure proper CORS origins, use secure JWT keys

## Troubleshooting

1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **JWT Token**: Check token format and expiry time
3. **CORS**: Verify React client origin is allowed in CORS policy
4. **Migrations**: Run `dotnet ef database update` if needed

## Files Structure

```
API/
├── Controllers/
│   ├── AuthController.cs          # Authentication endpoints
│   └── WeatherForecastController.cs
├── Models/
│   ├── JwtConfig.cs              # JWT configuration
│   └── Dto/
│       └── AuthDto.cs            # Authentication DTOs
├── Services/
│   └── JwtTokenService.cs        # JWT token generation/validation
├── Program.cs                    # App configuration
├── appsettings.json             # Configuration including JWT settings
└── API.http                     # Test requests
```