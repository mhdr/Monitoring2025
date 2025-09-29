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

## Development Environment

This project exposes two fixed development endpoints:
- HTTP: `http://localhost:5030`
- HTTPS (preferred): `https://localhost:7136`

The HTTPS endpoint uses a self-signed development certificate (located in `certificates/api-cert.pfx`). When using curl or other tools that enforce certificate trust, add `-k` (curl) or trust the certificate manually for local testing.

A single launch profile (`EMS.API`) includes both URLs, with HTTPS first. Always prefer HTTPS when integrating clients.

## Running the Application

### Using dotnet CLI
```bash
# Run with HTTPS (default)
dotnet run

# Or run with specific profile
dotnet run --launch-profile https
dotnet run --launch-profile http
```

### Using the run script
```bash
# Make the script executable and run
chmod +x run-api.sh
./run-api.sh
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token  
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/logout` - Logout user
- `PUT /api/auth/update-user/{userId?}` - Update user information (requires auth)
- `POST /api/auth/disable-user` - Disable/enable user account (admin functionality)

### Protected Endpoints

This API currently focuses on authentication. Protected endpoints will be added as needed.

## Usage Examples

### 1. Register a new user

**HTTP:**
```bash
curl -X POST "http://localhost:5030/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "firstNameFa": "جان",
    "lastNameFa": "دو",
    "userName": "johndoe",
    "password": "123",
    "confirmPassword": "123"
  }'
```

**HTTPS:**
```bash
curl -X POST "https://localhost:7136/api/auth/register" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "firstNameFa": "جین",
    "lastNameFa": "اسمیت",
    "userName": "janesmith",
    "password": "456",
    "confirmPassword": "456"
  }'
```

### 2. Login and get JWT token

**HTTP:**
```bash
curl -X POST "http://localhost:5030/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "johndoe",
    "password": "123",
    "rememberMe": false
  }'
```

**HTTPS:**
```bash
curl -X POST "https://localhost:7136/api/auth/login" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "userName": "janesmith",
    "password": "456",
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
    "firstNameFa": "جان",
    "lastNameFa": "دو",
    "roles": [],
    "isDisabled": false
  }
}
```

### 3. Update user information

Update current user's information (HTTP):
```bash
curl -X PUT "http://localhost:5030/api/auth/update-user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "firstNameFa": "جان بروزرسانی شده",
    "lastNameFa": "دو بروزرسانی شده"
  }'
```

Update current user's information (HTTPS):
```bash
curl -X PUT "https://localhost:7136/api/auth/update-user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "firstName": "Jane Updated",
    "lastName": "Smith Updated",
    "firstNameFa": "جین بروزرسانی شده",
    "lastNameFa": "اسمیت بروزرسانی شده"
  }'
```

### 5. Disable/Enable user accounts

Disable a user account:
```bash
curl -X POST "http://localhost:5030/api/auth/disable-user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_TO_DISABLE",
    "disable": true,
    "reason": "User violated terms of service"
  }'
```

Enable a user account:
```bash
curl -X POST "http://localhost:5030/api/auth/disable-user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_TO_ENABLE",
    "disable": false,
    "reason": "User issue has been resolved"
  }'
```

## React Client Integration

For your React client, you can use the JWT tokens with both HTTP and HTTPS endpoints:

```javascript
// Configuration for both HTTP and HTTPS
const API_CONFIG = {
  HTTP_BASE_URL: 'http://localhost:5030',
  HTTPS_BASE_URL: 'https://localhost:7136',
  USE_HTTPS: true // Set to false for HTTP only
};

const getBaseUrl = () => API_CONFIG.USE_HTTPS ? API_CONFIG.HTTPS_BASE_URL : API_CONFIG.HTTP_BASE_URL;

// Login function
const login = async (credentials) => {
  const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
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
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');
  const url = `${getBaseUrl()}${endpoint}`;
  
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
    return makeAuthenticatedRequest(endpoint, options);
  }
  
  return response;
};

// Refresh token function
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(`${getBaseUrl()}/api/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      refreshToken
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }
  
  // Refresh failed, redirect to login
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  throw new Error('Refresh token failed');
};
```

## Testing with Swagger UI

1. Start the API: `dotnet run`
2. Open Swagger UI: 
   - HTTP: `http://localhost:5030/swagger`
   - HTTPS: `https://localhost:7136/swagger` (preferred)
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
│   └── AuthController.cs          # Authentication endpoints
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