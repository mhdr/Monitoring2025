using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public static class Settings
{
    public static async Task Init()
    {
        var context = new DataContext();
        var match = await context.Dictionary.FirstOrDefaultAsync(x => x.Key == "version");
        if (match == null)
        {
            match = new Dictionary();
            match.Key = "version";
            match.Value = Guid.NewGuid().ToString();
            await context.Dictionary.AddAsync(match);
        }
        else
        {
            match.Value = Guid.NewGuid().ToString();
        }
        
        await context.SaveChangesAsync();
        await context.DisposeAsync();
    }

    public static async Task<Guid> GetVersion()
    {
        var context = new DataContext();
        var match = await context.Dictionary.FirstOrDefaultAsync(x => x.Key == "version");
        
        await context.SaveChangesAsync();
        await context.DisposeAsync();
        
        if (match != null)
        {
            if (!string.IsNullOrEmpty(match.Value))
            {
                var guid = Guid.Parse(match.Value);
                return guid;
            }
        }

        return Guid.Empty;
    }
}