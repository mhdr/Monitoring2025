using DB.User.Data;
using DB.User.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace API.Workers;

public class StartupWorker : BackgroundService, IDisposable
{
    private CancellationTokenSource _cts = new();
    private readonly IServiceProvider _serviceProvider;
    private static readonly string[] Roles = { "Admin", "Manager","BMS","EMS" };

    public StartupWorker(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CreateRoles();
        await CreateAdmin();
        await ApplyAdminPermissions();
    }

    private async Task ApplyAdminPermissions()
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var userManager = serviceScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var context = serviceScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await userManager.FindByNameAsync("admin");

        if (user != null)
        {
            var groups = await context.Groups.ToListAsync();
            List<GroupPermission> groupPermissions = new();
            foreach (var group in groups)
            {
                var match = await context.GroupPermissions
                    .FirstOrDefaultAsync(x => x.UserId == new Guid(user.Id)
                                              && x.GroupId == group.Id);

                if (match == null)
                {
                    groupPermissions.Add(new GroupPermission()
                    {
                        UserId = new Guid(user.Id),
                        GroupId = group.Id,
                    });
                }
            }

            var items = await Core.Points.ListPoints();
            List<ItemPermission> itemPermissions = new();

            foreach (var item in items)
            {
                var match = await context.ItemPermissions.FirstOrDefaultAsync(x => x.UserId == new Guid(user.Id)
                    && x.ItemId == item.Id);

                if (match == null)
                {
                    itemPermissions.Add(new ItemPermission()
                    {
                        UserId = new Guid(user.Id),
                        ItemId = item.Id,
                    });
                }
            }

            await context.GroupPermissions.AddRangeAsync(groupPermissions);
            await context.ItemPermissions.AddRangeAsync(itemPermissions);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
        }
    }

    private async Task CreateRoles()
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var roleManager = serviceScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    }

    private async Task CreateAdmin()
    {
        using var serviceScope = _serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();
        var userManager = serviceScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByNameAsync("admin");

        if (user == null)
        {
            var identity = new ApplicationUser("admin") { FirstName = "Admin", LastName = "Admin",FirstNameFa = "ادمین",LastNameFa = "ادمین"};
            var password = "12345";
            await userManager.CreateAsync(identity, password);
            await userManager.AddToRoleAsync(identity, "Admin");
        }
    }

    public void Dispose()
    {
        _cts?.Dispose();
    }
}