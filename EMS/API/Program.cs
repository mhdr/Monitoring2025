using System.Text;
using System.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using API.Models;
using API.Services;
using API.Workers;
using Contracts;
using DB.User.Data;
using DB.User.Models;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

// Configure systemd integration for Linux hosting
builder.Host.UseSystemd();

// Detect both public and local network IP addresses for CORS
var (publicIp, localIp) = await IpDetectionService.DetectIpAddressesAsync();
Console.WriteLine($"[IP DETECTION] Detected public IP: {publicIp}");
Console.WriteLine($"[IP DETECTION] Detected local network IP: {localIp}");
Console.WriteLine($"[NETWORK] Binding to all interfaces (0.0.0.0)");
Console.WriteLine($"[CORS] Will allow origins from both public IP ({publicIp}) and local network IP ({localIp})");

// Configure Kestrel to bind to all interfaces
builder.WebHost.ConfigureKestrel(options =>
{
    // Bind to all interfaces (0.0.0.0) for compatibility - HTTP ONLY
    options.Listen(IPAddress.Any, 5030);
    Console.WriteLine($"[BIND] HTTP port 5030 on all interfaces");
    Console.WriteLine($"[BIND] Accessible via http://{localIp}:5030 (local network)");
    Console.WriteLine($"[BIND] Accessible via http://{publicIp}:5030 (public, if port forwarded)");
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Load CORS configuration
var corsConfig = new CorsConfig();
builder.Configuration.GetSection("CORS").Bind(corsConfig);

// Configure CORS for React client
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactClientPolicy", policy =>
    {
        var publicIpString = publicIp.ToString();
        var localIpString = localIp.ToString();
        var allowedOrigins = new List<string>();

        Console.WriteLine($"[CORS] Configuration loaded from appsettings.json");
        Console.WriteLine($"[CORS]   Allowed Domains: {string.Join(", ", corsConfig.AllowedDomains)}");
        Console.WriteLine($"[CORS]   Allowed Ports: {string.Join(", ", corsConfig.AllowedPorts)}");
        Console.WriteLine($"[CORS]   Allow Localhost: {corsConfig.AllowLocalhost}");
        Console.WriteLine($"[CORS]   Allow Local Network: {corsConfig.AllowLocalNetwork}");
        Console.WriteLine($"[CORS]   Allow Detected IPs: {corsConfig.AllowDetectedIPs}");

        // Build origins list from configuration
        if (corsConfig.AllowDetectedIPs)
        {
            var ips = new List<string> { publicIpString, localIpString };
            if (corsConfig.AllowLocalhost)
            {
                ips.AddRange(new[] { "localhost", "127.0.0.1", "0.0.0.0", "::1" });
            }

            foreach (var protocol in corsConfig.AllowedProtocols)
            {
                foreach (var ip in ips)
                {
                    foreach (var port in corsConfig.AllowedPorts)
                    {
                        allowedOrigins.Add($"{protocol}://{ip}:{port}");
                    }
                    // Add without port
                    allowedOrigins.Add($"{protocol}://{ip}");
                }
            }
        }

        Console.WriteLine($"[CORS] Total explicit origins: {allowedOrigins.Count}");
        Console.WriteLine($"[CORS]   Public IP: {publicIpString}");
        Console.WriteLine($"[CORS]   Local Network IP: {localIpString}");

        policy.SetIsOriginAllowed(origin =>
        {
            // Check explicit allowed list
            if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            {
                return true;
            }

            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            {
                return false;
            }

            var host = uri.Host;
            var port = uri.Port;

            // Check configured domain patterns (e.g., *.sobhanonco.ir)
            foreach (var domainPattern in corsConfig.AllowedDomains)
            {
                if (domainPattern.StartsWith("*."))
                {
                    // Wildcard subdomain pattern
                    var baseDomain = domainPattern.Substring(2);
                    if (host.EndsWith("." + baseDomain, StringComparison.OrdinalIgnoreCase) ||
                        host.Equals(baseDomain, StringComparison.OrdinalIgnoreCase))
                    {
                        Console.WriteLine($"[CORS] ✓ Allowing domain pattern '{domainPattern}': {origin}");
                        return true;
                    }
                }
                else if (host.Equals(domainPattern, StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine($"[CORS] ✓ Allowing exact domain '{domainPattern}': {origin}");
                    return true;
                }
            }

            // Check port is allowed
            if (!corsConfig.AllowedPorts.Contains(port))
            {
                return false;
            }

            // Check localhost
            if (corsConfig.AllowLocalhost &&
                (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                 host.Equals("127.0.0.1") ||
                 host.Equals("0.0.0.0") ||
                 host.Equals("::1")))
            {
                return true;
            }

            // Check local network patterns
            if (corsConfig.AllowLocalNetwork)
            {
                if (host.StartsWith("192.168.") ||
                    host.StartsWith("10.") ||
                    host.StartsWith("172.20."))
                {
                    return true;
                }
            }

            return false;
        })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure JWT settings
var jwtConfig = new JwtConfig();
builder.Configuration.GetSection("JWT").Bind(jwtConfig);
builder.Services.AddSingleton(jwtConfig);

// Add database context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
});

// Configure Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Password settings - remove all restrictions
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 1;
    options.Password.RequiredUniqueChars = 0;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = false;

    // Sign in settings
    options.SignIn.RequireConfirmedEmail = false;
    options.SignIn.RequireConfirmedPhoneNumber = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false; // HTTP only - no HTTPS requirement
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtConfig.Issuer,
        ValidAudience = jwtConfig.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtConfig.Key)),
        ClockSkew = TimeSpan.Zero // Remove delay of token when expire
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            // Console.WriteLine("Token validated successfully");
            return Task.CompletedTask;
        },
        OnMessageReceived = context =>
        {
            // Support JWT token from query string for SignalR connections
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            
            return Task.CompletedTask;
        }
    };
});

// Add Authorization
builder.Services.AddAuthorization();

// Add JWT Token Service
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// Add Audit Service
builder.Services.AddScoped<IAuditService, AuditService>();

// Add SignalR services
builder.Services.AddSignalR();

// Add SignalR connection tracking service (must be singleton to maintain state across hub connections)
builder.Services.AddSingleton<API.Services.ConnectionTrackingService>();

// Add SignalR Broadcast Service (singleton for consistent broadcasting)
builder.Services.AddSingleton<API.Services.SignalRBroadcastService>();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Version = "v1",
        Title = "EMS Monitoring API",
        Description = "Environmental Monitoring System API with JWT Authentication",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "EMS Development Team",
            Email = "support@ems-monitoring.com",
            Url = new Uri("https://github.com/mhdr/Monitoring2025")
        },
        License = new Microsoft.OpenApi.Models.OpenApiLicense
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);

    // Add SignalR hub documentation generation
    c.AddSignalRSwaggerGen(ssgOptions =>
    {
        // Scan the API assembly for SignalR hubs
        ssgOptions.ScanAssembly(System.Reflection.Assembly.GetExecutingAssembly());
        
        // Use XML comments for SignalR hub documentation
        ssgOptions.UseXmlComments(xmlPath);
        
        // Display SignalR hubs in the v1 document
        ssgOptions.DisplayInDocument("v1");
        
        // Use hub XML comments summary as tag
        ssgOptions.UseHubXmlCommentsSummaryAsTag = true;
        
        // Configure the hub path template (default is fine: /hubs/{hubName})
        // We override it in the attribute per hub, so this is a fallback
        ssgOptions.HubPathFunc = hubName => $"/hubs/{hubName.ToLowerInvariant()}";
    });

    // Configure Swagger to use JWT Bearer token
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Add HTTP server only
    c.AddServer(new Microsoft.OpenApi.Models.OpenApiServer
    {
        Url = "http://localhost:5030",
        Description = "HTTP Development Server"
    });
});
builder.Services.AddOpenApi();

// configure the endpoints for mass transit

EndpointConvention.Map<ReadValuesMessage>(new Uri("queue:core-read-values"));

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context2, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("pupli");
            h.Password("7eAZvkUhviQ7ZKLSzJru");
        });
        cfg.ConfigureEndpoints(context2);
    });
});

builder.Services.AddHostedService<ActiveAlarmsBackgroundWorker>();
builder.Services.AddHostedService<StartupWorker>();

var app = builder.Build();

// Configure the HTTP request pipeline.
// Read Swagger configuration from appsettings
var enableSwaggerInProduction = builder.Configuration.GetValue<bool>("Swagger:EnableInProduction", false);

if (app.Environment.IsDevelopment() || (app.Environment.IsProduction() && enableSwaggerInProduction))
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
    
    if (app.Environment.IsProduction())
    {
        Console.WriteLine("[SWAGGER] Swagger UI enabled in Production mode (Swagger:EnableInProduction = true)");
    }
}
else if (app.Environment.IsProduction())
{
    Console.WriteLine("[SWAGGER] Swagger UI disabled in Production mode (Swagger:EnableInProduction = false)");
}

// Enable CORS
app.UseCors("ReactClientPolicy");

// HTTP only - HTTPS redirection and HSTS removed

// Authentication & Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR hub endpoints
app.MapHub<API.Hubs.MonitoringHub>("/hubs/monitoring");

Console.WriteLine("[SignalR] MonitoringHub mapped to /hubs/monitoring and ready for real-time updates");

// Ensure database is created and migrated
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        await context.Database.MigrateAsync();
        Console.WriteLine("Database migrated successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database migration failed: {ex.Message}");
    }
}

app.Run();