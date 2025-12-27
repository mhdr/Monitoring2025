using System.Linq.Expressions;
using System.Transactions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public static class Controllers
{
    public static async Task<Guid> AddController(ControllerSharp7 controllerSharp7)
    {
        var context = new DataContext();
        await context.ControllerSharp7s.AddAsync(controllerSharp7);
        await context.SaveChangesAsync();
        await context.DisposeAsync();

        var id = controllerSharp7.Id;
        return id;
    }

    public static async Task<bool> EditController(ControllerSharp7 controllerSharp7)
    {
        if (controllerSharp7.Id == Guid.Empty)
        {
            return false;
        }

        var context = new DataContext();
        var matched = await context.ControllerSharp7s.FirstOrDefaultAsync(x => x.Id == controllerSharp7.Id);

        if (matched == null)
        {
            return false;
        }

        matched.IPAddress = controllerSharp7.IPAddress;
        matched.DBAddress = controllerSharp7.DBAddress;
        matched.DBStartData = controllerSharp7.DBStartData;
        matched.DBSizeData = controllerSharp7.DBSizeData;
        matched.Name = controllerSharp7.Name;
        matched.DataType = controllerSharp7.DataType;
        matched.Username = controllerSharp7.Username;
        matched.EncryptedPassword = controllerSharp7.EncryptedPassword;

        context.ControllerSharp7s.Update(matched);
        var result = await context.SaveChangesAsync();
        await context.DisposeAsync();

        if (result > 0)
        {
            return true;
        }

        return false;
    }

    public static async Task<List<ControllerSharp7>> GetSharp7Controllers(
        Expression<Func<ControllerSharp7, bool>>? predicate = null)
    {
        List<ControllerSharp7> result;

        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.ControllerSharp7s.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.ControllerSharp7s.ToListAsync();
        }

        await context.DisposeAsync();

        return result;
    }
    
    public static async Task<List<ControllerModbus>> GetModbusControllers(
        Expression<Func<ControllerModbus, bool>>? predicate = null)
    {
        List<ControllerModbus> result;
    
        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.ControllerModbuses.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.ControllerModbuses.ToListAsync();
        }
    
        await context.DisposeAsync();
    
        return result;
    }

    public static async Task<List<ControllerBACnet>> GetBACnetControllers(
        Expression<Func<ControllerBACnet, bool>>? predicate = null)
    {
        List<ControllerBACnet> result;

        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.ControllerBACnets.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.ControllerBACnets.ToListAsync();
        }

        await context.DisposeAsync();

        return result;
    }

    public static async Task<ControllerSharp7?> GetController(Expression<Func<ControllerSharp7, bool>> predicate)
    {
        var context = new DataContext();
        var result = await context.ControllerSharp7s.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return result;
    }

    public static async Task<List<MapSharp7>> GetSharp7Maps(Expression<Func<MapSharp7, bool>>? predicate = null)
    {
        List<MapSharp7> result = [];
        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.MapSharp7s.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.MapSharp7s.ToListAsync();
        }

        await context.DisposeAsync();
        return result;
    }
    
    public static async Task<List<MapModbus>> GetModbusMaps(Expression<Func<MapModbus, bool>>? predicate = null)
    {
        List<MapModbus> result = [];
        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.MapModbuses.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.MapModbuses.ToListAsync();
        }

        await context.DisposeAsync();
        return result;
    }

    public static async Task<List<MapBACnet>> GetBACnetMaps(Expression<Func<MapBACnet, bool>>? predicate = null)
    {
        List<MapBACnet> result = [];
        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.MapBACnets.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.MapBACnets.ToListAsync();
        }

        await context.DisposeAsync();
        return result;
    }

    public static async Task<bool> DeleteController(Expression<Func<ControllerSharp7, bool>> predicate)
    {
        var context = new DataContext();
        var controller = await context.ControllerSharp7s.FirstOrDefaultAsync(predicate);

        if (controller != null)
        {
            var anyMap = await context.MapSharp7s.AnyAsync(x => x.ControllerId == controller.Id);

            if (anyMap)
            {
                await context.DisposeAsync();
                return false;
            }

            context.ControllerSharp7s.Remove(controller);
            await context.SaveChangesAsync();
            await context.DisposeAsync();

            return true;
        }

        await context.DisposeAsync();
        return false;
    }

    public static async Task<bool> BatchEditMappings(List<MapSharp7> added, List<MapSharp7> updated,
        List<MapSharp7> removed)
    {
        await using (var context = new DataContext())
        {
            await using (var transaction = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    await context.MapSharp7s.AddRangeAsync(added);
                    context.MapSharp7s.UpdateRange(updated);
                    context.MapSharp7s.RemoveRange(removed);

                    await context.SaveChangesAsync();
                    // Commit transaction
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Rollback transaction
                    await transaction.RollbackAsync();
                    MyLog.LogJson(ex);
                }
            }
        }

        return false;
    }

    // ==================== Modbus Controller CRUD ====================

    public static async Task<Guid> AddModbusController(ControllerModbus controller)
    {
        var context = new DataContext();
        await context.ControllerModbuses.AddAsync(controller);
        await context.SaveChangesAsync();
        await context.DisposeAsync();

        return controller.Id;
    }

    public static async Task<bool> EditModbusController(ControllerModbus controller)
    {
        if (controller.Id == Guid.Empty)
        {
            return false;
        }

        var context = new DataContext();
        var matched = await context.ControllerModbuses.FirstOrDefaultAsync(x => x.Id == controller.Id);

        if (matched == null)
        {
            await context.DisposeAsync();
            return false;
        }

        matched.Name = controller.Name;
        matched.IPAddress = controller.IPAddress;
        matched.Port = controller.Port;
        matched.StartAddress = controller.StartAddress;
        matched.DataLength = controller.DataLength;
        matched.DataType = controller.DataType;
        matched.Endianness = controller.Endianness;
        matched.ConnectionType = controller.ConnectionType;
        matched.ModbusType = controller.ModbusType;
        matched.UnitIdentifier = controller.UnitIdentifier;
        matched.AddressBase = controller.AddressBase;
        matched.IsDisabled = controller.IsDisabled;

        context.ControllerModbuses.Update(matched);
        var result = await context.SaveChangesAsync();
        await context.DisposeAsync();

        return result > 0;
    }

    public static async Task<(bool success, bool hasMappings)> DeleteModbusController(Guid controllerId)
    {
        var context = new DataContext();
        var controller = await context.ControllerModbuses.FirstOrDefaultAsync(x => x.Id == controllerId);

        if (controller == null)
        {
            await context.DisposeAsync();
            return (false, false);
        }

        var anyMap = await context.MapModbuses.AnyAsync(x => x.ControllerId == controllerId);

        if (anyMap)
        {
            await context.DisposeAsync();
            return (false, true);
        }

        context.ControllerModbuses.Remove(controller);
        await context.SaveChangesAsync();
        await context.DisposeAsync();

        return (true, false);
    }

    public static async Task<bool> BatchEditModbusMaps(List<MapModbus> added, List<MapModbus> updated,
        List<MapModbus> removed)
    {
        await using (var context = new DataContext())
        {
            await using (var transaction = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    if (added.Count > 0)
                    {
                        await context.MapModbuses.AddRangeAsync(added);
                    }

                    if (updated.Count > 0)
                    {
                        context.MapModbuses.UpdateRange(updated);
                    }

                    if (removed.Count > 0)
                    {
                        context.MapModbuses.RemoveRange(removed);
                    }

                    await context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    MyLog.LogJson(ex);
                }
            }
        }

        return false;
    }

    // ==================== Modbus Gateway CRUD ====================

    /// <summary>
    /// Retrieves all Modbus gateway configurations.
    /// </summary>
    public static async Task<List<ModbusGatewayConfig>> GetModbusGatewayConfigs(
        Expression<Func<ModbusGatewayConfig, bool>>? predicate = null)
    {
        List<ModbusGatewayConfig> result;

        var context = new DataContext();
        if (predicate != null)
        {
            result = await context.ModbusGatewayConfigs.Where(predicate).ToListAsync();
        }
        else
        {
            result = await context.ModbusGatewayConfigs.ToListAsync();
        }

        await context.DisposeAsync();
        return result;
    }

    /// <summary>
    /// Gets a single Modbus gateway configuration by ID.
    /// </summary>
    public static async Task<ModbusGatewayConfig?> GetModbusGatewayConfig(Guid id)
    {
        var context = new DataContext();
        var result = await context.ModbusGatewayConfigs.FirstOrDefaultAsync(x => x.Id == id);
        await context.DisposeAsync();
        return result;
    }

    /// <summary>
    /// Adds a new Modbus gateway configuration.
    /// </summary>
    public static async Task<Guid> AddModbusGatewayConfig(ModbusGatewayConfig config)
    {
        var context = new DataContext();
        await context.ModbusGatewayConfigs.AddAsync(config);
        await context.SaveChangesAsync();
        await context.DisposeAsync();
        return config.Id;
    }

    /// <summary>
    /// Updates an existing Modbus gateway configuration.
    /// </summary>
    public static async Task<bool> EditModbusGatewayConfig(ModbusGatewayConfig config)
    {
        if (config.Id == Guid.Empty)
        {
            return false;
        }

        var context = new DataContext();
        var matched = await context.ModbusGatewayConfigs.FirstOrDefaultAsync(x => x.Id == config.Id);

        if (matched == null)
        {
            await context.DisposeAsync();
            return false;
        }

        matched.Name = config.Name;
        matched.ListenIP = config.ListenIP;
        matched.Port = config.Port;
        matched.UnitId = config.UnitId;
        matched.IsEnabled = config.IsEnabled;

        context.ModbusGatewayConfigs.Update(matched);
        var result = await context.SaveChangesAsync();
        await context.DisposeAsync();

        return result > 0;
    }

    /// <summary>
    /// Deletes a Modbus gateway configuration and all its mappings.
    /// </summary>
    public static async Task<bool> DeleteModbusGatewayConfig(Guid gatewayId)
    {
        var context = new DataContext();
        var gateway = await context.ModbusGatewayConfigs
            .Include(g => g.Mappings)
            .FirstOrDefaultAsync(x => x.Id == gatewayId);

        if (gateway == null)
        {
            await context.DisposeAsync();
            return false;
        }

        // Cascading delete will handle mappings due to FK constraint
        context.ModbusGatewayConfigs.Remove(gateway);
        await context.SaveChangesAsync();
        await context.DisposeAsync();

        return true;
    }

    /// <summary>
    /// Retrieves all mappings for a specific gateway.
    /// </summary>
    public static async Task<List<ModbusGatewayMapping>> GetModbusGatewayMappings(Guid gatewayId)
    {
        var context = new DataContext();
        var result = await context.ModbusGatewayMappings
            .Where(m => m.GatewayId == gatewayId)
            .ToListAsync();
        await context.DisposeAsync();
        return result;
    }

    /// <summary>
    /// Retrieves all mappings for a specific gateway with MonitoringItem details included.
    /// </summary>
    public static async Task<List<ModbusGatewayMapping>> GetGatewayMappingsWithItems(Guid gatewayId)
    {
        var context = new DataContext();
        var result = await context.ModbusGatewayMappings
            .Include(m => m.Item)
            .Where(m => m.GatewayId == gatewayId)
            .ToListAsync();
        await context.DisposeAsync();
        return result;
    }

    /// <summary>
    /// Batch edit gateway mappings (add, update, remove in a single transaction).
    /// </summary>
    public static async Task<bool> BatchEditModbusGatewayMappings(
        List<ModbusGatewayMapping> added, 
        List<ModbusGatewayMapping> updated,
        List<ModbusGatewayMapping> removed)
    {
        await using (var context = new DataContext())
        {
            await using (var transaction = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    if (added.Count > 0)
                    {
                        await context.ModbusGatewayMappings.AddRangeAsync(added);
                    }

                    if (updated.Count > 0)
                    {
                        context.ModbusGatewayMappings.UpdateRange(updated);
                    }

                    if (removed.Count > 0)
                    {
                        context.ModbusGatewayMappings.RemoveRange(removed);
                    }

                    await context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    MyLog.LogJson(ex);
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Updates the gateway status (connected clients and timestamps).
    /// </summary>
    public static async Task<bool> UpdateGatewayStatus(
        Guid gatewayId, 
        int connectedClients, 
        DateTime? lastReadTime = null, 
        DateTime? lastWriteTime = null)
    {
        var context = new DataContext();
        var gateway = await context.ModbusGatewayConfigs.FirstOrDefaultAsync(x => x.Id == gatewayId);

        if (gateway == null)
        {
            await context.DisposeAsync();
            return false;
        }

        gateway.ConnectedClients = connectedClients;
        
        if (lastReadTime.HasValue)
        {
            gateway.LastReadTime = lastReadTime.Value;
        }
        
        if (lastWriteTime.HasValue)
        {
            gateway.LastWriteTime = lastWriteTime.Value;
        }

        var result = await context.SaveChangesAsync();
        await context.DisposeAsync();

        return result > 0;
    }

    /// <summary>
    /// Checks if a port is already in use by another gateway in the database.
    /// </summary>
    public static async Task<bool> IsPortAvailableInDb(int port, Guid? excludeGatewayId = null)
    {
        var context = new DataContext();
        
        bool exists;
        if (excludeGatewayId.HasValue)
        {
            exists = await context.ModbusGatewayConfigs
                .AnyAsync(g => g.Port == port && g.Id != excludeGatewayId.Value);
        }
        else
        {
            exists = await context.ModbusGatewayConfigs.AnyAsync(g => g.Port == port);
        }

        await context.DisposeAsync();
        return !exists;
    }

    /// <summary>
    /// Gets all enabled gateways for the worker service to start.
    /// </summary>
    public static async Task<List<ModbusGatewayConfig>> GetEnabledGateways()
    {
        var context = new DataContext();
        var result = await context.ModbusGatewayConfigs
            .Where(g => g.IsEnabled)
            .Include(g => g.Mappings)
            .ToListAsync();
        await context.DisposeAsync();
        return result;
    }
}