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
            await MoveUngroupedItemsToNewFolder(stoppingToken);
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

    /// <summary>
    /// Ensures the admin user has permissions for all existing monitoring items.
    /// </summary>
    /// <param name="cancellationToken">Token to observe while performing initialization; used to cancel the operation.</param>
    /// <remarks>
    /// This method:
    /// - Resolves scoped services (UserManager and ApplicationDbContext) from the service provider.
    /// - Finds the user with username "admin" and if present enumerates points from <c>Core.Points.ListPoints()</c>.
    /// - Creates missing <see cref="ItemPermission"/> entries for the admin user and persists them.
    /// 
    /// The method honours <paramref name="cancellationToken"/> and logs progress and outcomes using the injected logger.
    /// </remarks>
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

    /// <summary>
    /// Ensures required identity roles exist and creates any missing roles.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token to observe while creating roles.</param>
    /// <remarks>
    /// Resolves a scoped <see cref="RoleManager{IdentityRole}"/> from the service provider and iterates
    /// the predefined <c>Roles</c> array. For each missing role it attempts creation and logs success
    /// or details of any failure. The operation respects the provided cancellation token.
    /// </remarks>
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

    /// <summary>
    /// Ensures an administrator account exists. If no user with username "admin" is found,
    /// this method creates a new <see cref="ApplicationUser"/> with a development placeholder password
    /// and assigns the "Admin" role.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token to observe while performing user creation and role assignment.</param>
    /// <remarks>
    /// This method logs success, warnings or errors. In production you should replace the placeholder
    /// password with a securely provisioned secret and enforce stronger password policies.
    /// </remarks>
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

    /// <summary>
    /// Ensures all items/points are assigned to a group. Any ungrouped items are moved to a folder named "New".
    /// If the "New" folder does not exist, it is created first.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token to observe while performing the operation.</param>
    /// <remarks>
    /// This method:
    /// - Resolves scoped services (ApplicationDbContext) from the service provider
    /// - Checks if a group named "New" exists at the root level (ParentId == null)
    /// - Creates the "New" group if it doesn't exist
    /// - Retrieves all items/points from Core.Points.ListPoints()
    /// - Identifies items that don't have a GroupItem entry
    /// - Assigns those items to the "New" group
    /// 
    /// The method honors <paramref name="cancellationToken"/> and logs progress and outcomes using the injected logger.
    /// </remarks>
    private async Task MoveUngroupedItemsToNewFolder(CancellationToken cancellationToken)
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var context = serviceScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        _logger.LogInformation("Checking for ungrouped items to move to 'New' folder");

        // Step 1: Find or create the "New" folder
        var newFolder = await context.Groups.FirstOrDefaultAsync(g => g.Name == "New" && g.ParentId == null, cancellationToken);

        if (newFolder == null)
        {
            _logger.LogInformation("Creating 'New' folder for ungrouped items");
            newFolder = new Group()
            {
                Name = "New",
                NameFa = "جدید",
                ParentId = null
            };

            await context.Groups.AddAsync(newFolder, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Created 'New' folder with ID {FolderId}", newFolder.Id);
        }
        else
        {
            _logger.LogInformation("'New' folder already exists with ID {FolderId}", newFolder.Id);
        }

        // Step 2: Get all items/points from Core
        var allItems = await Core.Points.ListPoints();
        _logger.LogInformation("Found {ItemCount} total items in Core", allItems.Count);

        // Step 3: Get all currently grouped items
        var groupedItemIds = await context.GroupItems
            .Select(gi => gi.ItemId)
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Found {GroupedCount} items already assigned to groups", groupedItemIds.Count);

        // Step 4: Identify ungrouped items
        var ungroupedItems = allItems.Where(item => !groupedItemIds.Contains(item.Id)).ToList();

        if (ungroupedItems.Count == 0)
        {
            _logger.LogInformation("No ungrouped items found - all items are already assigned to groups");
            return;
        }

        _logger.LogInformation("Found {UngroupedCount} ungrouped items to move to 'New' folder", ungroupedItems.Count);

        // Step 5: Create GroupItem entries for ungrouped items
        List<GroupItem> newGroupItems = new();

        foreach (var item in ungroupedItems)
        {
            cancellationToken.ThrowIfCancellationRequested();

            newGroupItems.Add(new GroupItem()
            {
                ItemId = item.Id,
                GroupId = newFolder.Id
            });

            _logger.LogDebug("Assigning item {ItemId} ({ItemName}) to 'New' folder", item.Id, item.ItemName);
        }

        // Step 6: Save all new group assignments
        await context.GroupItems.AddRangeAsync(newGroupItems, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Successfully moved {ItemCount} ungrouped items to 'New' folder", newGroupItems.Count);
    }

    // BackgroundService already implements Dispose; no additional disposal required here.
}