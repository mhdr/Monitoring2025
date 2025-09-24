using DB.User.Libs;
using DB.User.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DB.User.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    private const string DatabaseName = "monitoring_users";
    private const string Host = "localhost";
    private const string UserName = "monitoring";
    private const string Password = "dbpassword";

    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupItem> GroupItems { get; set; }
    public DbSet<GroupPermission> GroupPermissions { get; set; }
    public DbSet<ItemPermission> ItemPermissions { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<UserVersion> UserVersions { get; set; }
    public DbSet<SvgLayout> SvgLayouts { get; set; }
    public DbSet<SvgLayoutPoint> SvgLayoutPoints { get; set; }

    public ApplicationDbContext()
    {
    }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql(
            $"Host={Host};Database={DatabaseName};Username={UserName};Password={Password}",
            options => options.CommandTimeout(300));
    }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<GroupItem>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<GroupPermission>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");


        modelBuilder.Entity<ItemPermission>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");


        modelBuilder.Entity<AuditLog>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<SvgLayout>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<AuditLog>()
            .Property(e => e.LogValue)
            .HasColumnType("jsonb");

        modelBuilder.Entity<UserVersion>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<SvgLayoutPoint>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // keys

        modelBuilder.Entity<AuditLog>()
            .HasKey(ih => new { ih.Id, ih.Time });
        
        // set default values

        modelBuilder.Entity<SvgLayout>()
            .Property(e => e.Order)
            .HasDefaultValue(0);

        // call to create Identity keys
        base.OnModelCreating(modelBuilder);
    }

    public async Task EnsurePartitioning()
    {
        var connection = Database.GetDbConnection();
        await connection.OpenAsync();

        var now = DateTime.UtcNow;
        var startYear = now.Year;
        var endYear = now.Year + 1;

        for (int year = startYear; year <= endYear; year++)
        {
            for (int month = 1; month <= 12; month++)
            {
                var startTimestamp = new DateTime(year, month, 1).ToUnixTimeSeconds();
                var endTimestamp = new DateTime(year, month, DateTime.DaysInMonth(year, month)).AddDays(1)
                    .ToUnixTimeSeconds();

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = $@"
                        CREATE TABLE IF NOT EXISTS audit_log_{year}{month:D2} PARTITION OF audit_log
                        FOR VALUES FROM ({startTimestamp}) TO ({endTimestamp});
            ";
                    await command.ExecuteNonQueryAsync();
                }
            }
        }

        await connection.CloseAsync();
    }
}