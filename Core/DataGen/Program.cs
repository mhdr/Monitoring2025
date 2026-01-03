using Core;
using DataGen;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSystemd();

// Register DataContext with dependency injection
builder.Services.AddDbContext<DataContext>();

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("pupli");
            h.Password("7eAZvkUhviQ7ZKLSzJru");
        });
    });
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();

// Apply pending migrations automatically on startup
using (var scope = host.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var context = scope.ServiceProvider.GetRequiredService<DataContext>();
    
    try
    {
        logger.LogInformation("Checking for pending database migrations...");
        await context.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to apply database migrations: {Message}", ex.Message);
        throw; // Fail startup if migrations cannot be applied
    }
}

await host.RunAsync();
