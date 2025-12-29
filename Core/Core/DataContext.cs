using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class DataContext : DbContext
{
    public DataContext()
    {
    }

    public DataContext(DbContextOptions<DataContext> options)
        : base(options)
    {
    }

    private const string DatabaseName = "monitoring_core";
    private const string Host = "localhost";
    private const string UserName = "monitoring";
    private const string Password = "dbpassword";

    public DbSet<MonitoringItem> MonitoringItems { get; set; }
    public DbSet<RawItem> RawItems { get; set; }
    public DbSet<FinalItem> FinalItems { get; set; }
    public DbSet<ItemHistory> ItemHistories { get; set; }

    public DbSet<Alarm> Alarms { get; set; }

    public DbSet<AlarmHistory> AlarmHistories { get; set; }

    public DbSet<ActiveAlarm> ActiveAlarms { get; set; }

    public DbSet<ControllerSharp7> ControllerSharp7s { get; set; }

    public DbSet<Dictionary> Dictionary { get; set; }
    public DbSet<MapSharp7> MapSharp7s { get; set; }

    public DbSet<WriteItem> WriteItems { get; set; }

    public DbSet<ExternalAlarm> ExternalAlarms { get; set; }

    public DbSet<ControllerBACnet> ControllerBACnets { get; set; }
    public DbSet<MapBACnet> MapBACnets { get; set; }
    public DbSet<TimeoutMemory> TimeoutMemories { get; set; }

    public DbSet<PIDMemory> PIDMemories { get; set; }
    public DbSet<PIDTuningSession> PIDTuningSessions { get; set; }
    
    public DbSet<AverageMemory> AverageMemories { get; set; }
    
    public DbSet<JobDetail> JobDetails { get; set; }
    public DbSet<Trigger> Triggers { get; set; }
    
    public DbSet<ControllerModbus> ControllerModbuses { get; set; }
    public DbSet<MapModbus> MapModbuses { get; set; }
    
    public DbSet<ModbusGatewayConfig> ModbusGatewayConfigs { get; set; }
    public DbSet<ModbusGatewayMapping> ModbusGatewayMappings { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql(
            $"Host={Host};Database={DatabaseName};Username={UserName};Password={Password};Pooling=true;Minimum Pool Size=5;Maximum Pool Size=50;Connection Idle Lifetime=300;Connection Pruning Interval=10",
            options => options.CommandTimeout(30)); // Reduced from 300s to 30s for monitoring operations
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ensure automatic uuid generation
        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<RawItem>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<FinalItem>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<ControllerSharp7>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<Alarm>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<ItemHistory>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<AlarmHistory>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<ActiveAlarm>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<MapSharp7>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<WriteItem>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<ExternalAlarm>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<ControllerBACnet>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<MapBACnet>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<TimeoutMemory>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<JobDetail>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<Trigger>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<MapModbus>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<ModbusGatewayConfig>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");
        
        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // set default values

        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<ControllerSharp7>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<ControllerBACnet>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<Alarm>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<ExternalAlarm>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<Alarm>()
            .Property(e => e.HasExternalAlarm)
            .HasDefaultValue(false);

        modelBuilder.Entity<Alarm>()
            .Property(e => e.IsDeleted)
            .HasDefaultValue(false);

        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.IsCalibrationEnabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.CalibrationA)
            .HasDefaultValue(1.0f);

        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.CalibrationB)
            .HasDefaultValue(0.0f);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.Interval)
            .HasDefaultValue(10);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.Kp)
            .HasDefaultValue(1.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.Ki)
            .HasDefaultValue(0.1);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.Kd)
            .HasDefaultValue(0.05);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.OutputMin)
            .HasDefaultValue(0.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.OutputMax)
            .HasDefaultValue(100.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.DerivativeFilterAlpha)
            .HasDefaultValue(1.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.MaxOutputSlewRate)
            .HasDefaultValue(100.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.DeadZone)
            .HasDefaultValue(0.0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.FeedForward)
            .HasDefaultValue(0.0);

        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.ShouldScale)
            .HasDefaultValue(ShouldScaleType.Off)
            .HasSentinel((ShouldScaleType)0);

        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.IsAuto)
            .HasDefaultValue(true);
        
        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.InterfaceType)
            .HasDefaultValue(InterfaceType.None);
        
        modelBuilder.Entity<MonitoringItem>()
            .Property(e => e.IsEditable)
            .HasDefaultValue(false);
        
        modelBuilder.Entity<Trigger>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);
        
        modelBuilder.Entity<PIDMemory>()
            .Property(e => e.ReverseOutput)
            .HasDefaultValue(false);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.Interval)
            .HasDefaultValue(10);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.IgnoreStale)
            .HasDefaultValue(true);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.StaleTimeout)
            .HasDefaultValue(60L);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.EnableOutlierDetection)
            .HasDefaultValue(false);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.OutlierMethod)
            .HasDefaultValue(OutlierMethod.IQR);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.OutlierThreshold)
            .HasDefaultValue(1.5);
        
        modelBuilder.Entity<AverageMemory>()
            .Property(e => e.MinimumInputs)
            .HasDefaultValue(1);
        
        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.Endianness)
            .HasDefaultValue(Endianness.None);

        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.ConnectionType)
            .HasDefaultValue(ModbusConnectionType.TCP);

        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.ModbusType)
            .HasDefaultValue(MyModbusType.None);

        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.UnitIdentifier)
            .HasDefaultValue((byte)1);

        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.AddressBase)
            .HasDefaultValue(ModbusAddressBase.Base0);

        modelBuilder.Entity<ControllerModbus>()
            .Property(e => e.IsDisabled)
            .HasDefaultValue(false);

        // ModbusGatewayConfig defaults
        modelBuilder.Entity<ModbusGatewayConfig>()
            .Property(e => e.IsEnabled)
            .HasDefaultValue(true);

        modelBuilder.Entity<ModbusGatewayConfig>()
            .Property(e => e.ConnectedClients)
            .HasDefaultValue(0);

        modelBuilder.Entity<ModbusGatewayConfig>()
            .Property(e => e.UnitId)
            .HasDefaultValue((byte)1);

        modelBuilder.Entity<ModbusGatewayConfig>()
            .Property(e => e.ListenIP)
            .HasDefaultValue("0.0.0.0");

        // ModbusGatewayMapping defaults
        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(e => e.DataRepresentation)
            .HasDefaultValue(ModbusDataRepresentation.Float32);

        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(e => e.Endianness)
            .HasDefaultValue(Endianness.BigEndian);

        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(e => e.RegisterCount)
            .HasDefaultValue(1);


        // ensure the enum is stored as an integer in the database. 
        modelBuilder.Entity<MonitoringItem>()
            .Property(u => u.ItemType)
            .HasConversion<int>();

        modelBuilder.Entity<MonitoringItem>()
            .Property(u => u.CalculationMethod)
            .HasConversion<int>();

        modelBuilder.Entity<MonitoringItem>()
            .Property(u => u.SaveOnChange)
            .HasConversion<int>();

        modelBuilder.Entity<MonitoringItem>()
            .Property(u => u.ShouldScale)
            .HasConversion<int>();

        modelBuilder.Entity<ControllerSharp7>()
            .Property(u => u.DataType)
            .HasConversion<int>();

        modelBuilder.Entity<MapSharp7>()
            .Property(u => u.OperationType)
            .HasConversion<int>();

        modelBuilder.Entity<Alarm>()
            .Property(u => u.AlarmType)
            .HasConversion<int>();

        modelBuilder.Entity<Alarm>()
            .Property(u => u.AlarmPriority)
            .HasConversion<int>();

        modelBuilder.Entity<Alarm>()
            .Property(u => u.CompareType)
            .HasConversion<int>();

        modelBuilder.Entity<MapBACnet>()
            .Property(u => u.ObjectType)
            .HasConversion<int>();

        modelBuilder.Entity<MapBACnet>()
            .Property(u => u.OperationType)
            .HasConversion<int>();

        // ModbusGatewayMapping enum conversions
        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(u => u.RegisterType)
            .HasConversion<int>();

        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(u => u.DataRepresentation)
            .HasConversion<int>();

        modelBuilder.Entity<ModbusGatewayMapping>()
            .Property(u => u.Endianness)
            .HasConversion<int>();
        
        modelBuilder.Entity<AverageMemory>()
            .Property(u => u.OutlierMethod)
            .HasConversion<int>();

        // keys

        modelBuilder.Entity<ItemHistory>()
            .HasKey(ih => new { ih.Id, ih.Time });

        modelBuilder.Entity<AlarmHistory>()
            .HasKey(ih => new { ih.Id, ih.Time });

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
                        CREATE TABLE IF NOT EXISTS items_history_{year}{month:D2} PARTITION OF items_history
                        FOR VALUES FROM ({startTimestamp}) TO ({endTimestamp});
            ";
                    await command.ExecuteNonQueryAsync();
                }

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = $@"
                        CREATE TABLE IF NOT EXISTS alarm_history_{year}{month:D2} PARTITION OF alarm_history
                        FOR VALUES FROM ({startTimestamp}) TO ({endTimestamp});
            ";
                    await command.ExecuteNonQueryAsync();
                }
            }
        }

        await connection.CloseAsync();
    }
}