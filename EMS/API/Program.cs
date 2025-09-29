using System.Text;
using System.Net;
using API.Libs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using API.Models;
using API.Services;
using Contracts;
using DB.User.Data;
using DB.User.Models;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel for LAN access (0.0.0.0) with development certificate if available
builder.WebHost.ConfigureKestrel(options =>
{
    // Resolve certificate (dev self-signed) if present
    var potentialPaths = new List<string>
    {
        Path.Combine(AppContext.BaseDirectory, "certificates", "api-cert.pfx"),
        Path.Combine(builder.Environment.ContentRootPath, "certificates", "api-cert.pfx"),
        Path.Combine(Directory.GetCurrentDirectory(), "certificates", "api-cert.pfx")
    };
    var certPassword = "password123"; // Dev only; matches script
    string? selectedCertPath = potentialPaths.FirstOrDefault(File.Exists);
    System.Security.Cryptography.X509Certificates.X509Certificate2? devCert = null;
    if (selectedCertPath != null)
    {
        try
        {
            devCert = new System.Security.Cryptography.X509Certificates.X509Certificate2(selectedCertPath, certPassword, System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.Exportable);
            Console.WriteLine($"[DEV CERT] Using development certificate: {selectedCertPath}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WARN] Failed to load development certificate from {selectedCertPath}: {ex.Message}. Will use ephemeral HTTPS certificate.");
        }
    }
    else
    {
        Console.WriteLine("[INFO] Development certificate not found. Will use ephemeral HTTPS certificate.");
    }

    // Fixed bindings (no dynamic or env override logic)
    options.Listen(IPAddress.Any, 5030);
    options.Listen(IPAddress.Any, 7136, listenOptions =>
    {
        if (devCert != null) listenOptions.UseHttps(devCert); else listenOptions.UseHttps();
    });
    Console.WriteLine("[BIND] HTTP  port 5030");
    Console.WriteLine("[BIND] HTTPS port 7136");
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure CORS for React client
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactClientPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000", "https://localhost:3000", // React Create App
                "http://localhost:5173", "https://localhost:5173"  // Vite dev server
              )
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
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment(); // Only require HTTPS in production
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

    // Handle JWT events
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine("Token validated successfully");
            return Task.CompletedTask;
        }
    };
});

// Add Authorization
builder.Services.AddAuthorization();

// Add JWT Token Service
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// Add SignalR services
builder.Services.AddSignalR();

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

    // Add servers for both HTTP and HTTPS
    c.AddServer(new Microsoft.OpenApi.Models.OpenApiServer
    {
        Url = "https://localhost:7136",
        Description = "HTTPS Development Server (Preferred)"
    });
    
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}

// Enable CORS
app.UseCors("ReactClientPolicy");

// Use HTTPS redirection - this will redirect HTTP requests to HTTPS
// Can be disabled in development by setting Development:DisableHttpsRedirection to true
var disableHttpsRedirection = builder.Configuration.GetValue<bool>("Development:DisableHttpsRedirection", false);
if (!disableHttpsRedirection)
{
    app.UseHttpsRedirection();
}

// Add HSTS (HTTP Strict Transport Security) for production
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// Authentication & Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

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

app.MapHub<MyHub>("hub");

app.Run();