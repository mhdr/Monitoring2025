using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class PIDs
{
    public static async Task<List<PIDMemory>?> GetControllers()
    {
        var context = new DataContext();
        var found = await context.PIDMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    public static async Task<bool> EditController(PIDMemory pidMemory)
    {
        try
        {
            var context = new DataContext();
            context.PIDMemories.Update(pidMemory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return true;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }

        return false;
    }
    
    public static async Task<PIDMemory?> GetController(Expression<Func<PIDMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.PIDMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }
}