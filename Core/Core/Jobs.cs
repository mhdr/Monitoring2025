using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class Jobs
{
    public static async Task<List<Trigger>?> GetTriggers()
    {
        var response = new List<Trigger>();

        try
        {
            var context = new DataContext();
            response = await context.Triggers.ToListAsync();
            await context.DisposeAsync();
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }

        return response;
    }

    public static async Task<List<JobDetail>?> GetJobDetails(Guid triggerId)
    {
        var response = new List<JobDetail>();

        try
        {
            var context = new DataContext();
            response = await context.JobDetails.Where(x => x.TriggerId == triggerId)
                .ToListAsync();
            await context.DisposeAsync();
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }

        return response;
    }

    public static async Task<bool> EditJobDetails(JobDetail jobDetail)
    {
        var result = false;

        try
        {
            var context = new DataContext();
            context.JobDetails.Update(jobDetail);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }
        
        return result;
    }
    
    public static async Task<bool> EditTrigger(Trigger trigger)
    {
        var result = false;

        try
        {
            var context = new DataContext();
            context.Triggers.Update(trigger);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }
        
        return result;
    }
}