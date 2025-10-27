using System;
using System.Collections.Generic;
using DB.User.Data;
using DB.User.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace API.Workers;

/// <summary>
/// Background worker that runs on startup to ensure initial roles, admin user, and permissions exist.
/// </summary>
public class StartupWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StartupWorker> _logger;
    private static readonly string[] Roles = { "Admin", "Manager", "BMS", "EMS" };

    /// <summary>
    /// Creates a new instance of <see cref="StartupWorker"/>.
    /// </summary>
    /// <param name="serviceProvider">Application service provider used to create scoped services.</param>
    /// <param name="logger">Logger instance for structured logging.</param>
    public StartupWorker(IServiceProvider serviceProvider, ILogger<StartupWorker> logger)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Executes startup initialization tasks. This method is called by the <see cref="BackgroundService"/>
    /// infrastructure and should respect the provided <paramref name="stoppingToken"/>.
    /// </summary>
    /// <param name="stoppingToken">Cancellation token provided by the host.</param>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("StartupWorker starting initialization tasks");

        try
        {
            await CreateRoles(stoppingToken);
            await CreateAdmin(stoppingToken);
            await ApplyAdminPermissions(stoppingToken);
            _logger.LogInformation("StartupWorker finished initialization tasks");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("StartupWorker was canceled during initialization");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while running startup initialization");
        }
    }

    private async Task ApplyAdminPermissions(CancellationToken cancellationToken)
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var userManager = serviceScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var context = serviceScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await userManager.FindByNameAsync("admin");

        if (user == null)
        {
            _logger.LogInformation("No admin user found; skipping permission application.");
            return;
        }

        _logger.LogInformation("Applying item permissions for admin user {UserId}", user.Id);

        var items = await Core.Points.ListPoints();
        List<ItemPermission> itemPermissions = new();

        foreach (var item in items)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var match = await context.ItemPermissions.FirstOrDefaultAsync(x => x.UserId == new Guid(user.Id)
                && x.ItemId == item.Id, cancellationToken);

            if (match == null)
            {
                itemPermissions.Add(new ItemPermission()
                {
                    UserId = new Guid(user.Id),
                    ItemId = item.Id,
                });
            }
        }

        if (itemPermissions.Count > 0)
        {
            await context.ItemPermissions.AddRangeAsync(itemPermissions, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Added {ItemCount} item permissions for admin", itemPermissions.Count);
        }
        else
        {
            _logger.LogInformation("No new item permissions required for admin user {UserId}", user.Id);
        }
    }

    private async Task CreateRoles(CancellationToken cancellationToken)
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var roleManager = serviceScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in Roles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!await roleManager.RoleExistsAsync(role))
            {
                var result = await roleManager.CreateAsync(new IdentityRole(role));
                if (!result.Succeeded)
                {
                    _logger.LogWarning("Failed to create role {Role}: {Errors}", role, string.Join(';', result.Errors.Select(e => e.Description)));
                }
                else
                {
                    _logger.LogInformation("Created role {Role}", role);
                }
            }
        }
    }

    private async Task CreateAdmin(CancellationToken cancellationToken)
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var userManager = serviceScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByNameAsync("admin");

        if (user == null)
        {
            var identity = new ApplicationUser("admin") { FirstName = "Admin", LastName = "Admin", FirstNameFa = "ادمین", LastNameFa = "ادمین" };
            // NOTE: In a production scenario choose a strong password or provision via secret management.
            var password = "12345";
            var createResult = await userManager.CreateAsync(identity, password);
            if (!createResult.Succeeded)
            {
                _logger.LogError("Failed to create admin user: {Errors}", string.Join(';', createResult.Errors.Select(e => e.Description)));
                return;
            }

            var addRoleResult = await userManager.AddToRoleAsync(identity, "Admin");
            if (!addRoleResult.Succeeded)
            {
                _logger.LogWarning("Failed to add admin user to Admin role: {Errors}", string.Join(';', addRoleResult.Errors.Select(e => e.Description)));
            }
            else
            {
                _logger.LogInformation("Created admin user and assigned Admin role");
            }
        }
    }

    // BackgroundService already implements Dispose; no additional disposal required here.
}