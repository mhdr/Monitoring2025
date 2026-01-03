using Core;
using CoreService;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

var host = Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) =>
    {
        // Register DataContext with dependency injection
        services.AddDbContext<DataContext>();
        
        services.AddHostedService<Worker>();
        services.AddHostedService<StartupWorker>();
    })
    .Build();

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