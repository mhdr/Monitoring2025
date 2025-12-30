using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for HolidayCalendar CRUD operations
/// </summary>
public class HolidayCalendars
{
    /// <summary>
    /// Get all holiday calendars with their dates
    /// </summary>
    public static async Task<List<HolidayCalendar>?> GetHolidayCalendars()
    {
        var context = new DataContext();
        var found = await context.HolidayCalendars
            .Include(c => c.Dates)
            .ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific holiday calendar by predicate with dates
    /// </summary>
    public static async Task<HolidayCalendar?> GetHolidayCalendar(Expression<Func<HolidayCalendar, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.HolidayCalendars
            .Include(c => c.Dates)
            .FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new holiday calendar with dates
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddHolidayCalendar(HolidayCalendar calendar)
    {
        try
        {
            var context = new DataContext();
            
            // Validate name is not empty
            if (string.IsNullOrWhiteSpace(calendar.Name))
            {
                await context.DisposeAsync();
                return (false, null, "Calendar name is required");
            }

            // Check for duplicate name
            var existingCalendar = await context.HolidayCalendars
                .FirstOrDefaultAsync(c => c.Name.ToLower() == calendar.Name.ToLower());
            if (existingCalendar != null)
            {
                await context.DisposeAsync();
                return (false, null, "A calendar with this name already exists");
            }

            // Validate dates if provided
            if (calendar.Dates != null && calendar.Dates.Count > 0)
            {
                var dateValidation = ValidateHolidayDates(calendar.Dates.ToList());
                if (!dateValidation.Success)
                {
                    await context.DisposeAsync();
                    return (false, null, dateValidation.ErrorMessage);
                }
            }

            context.HolidayCalendars.Add(calendar);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, calendar.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add holiday calendar", ex, new Dictionary<string, object?>
            {
                ["HolidayCalendar"] = calendar
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing holiday calendar
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditHolidayCalendar(HolidayCalendar calendar)
    {
        try
        {
            var context = new DataContext();

            // Check if calendar exists
            var existingCalendar = await context.HolidayCalendars
                .Include(c => c.Dates)
                .FirstOrDefaultAsync(c => c.Id == calendar.Id);
            if (existingCalendar == null)
            {
                await context.DisposeAsync();
                return (false, "Holiday calendar not found");
            }
            
            // Validate name is not empty
            if (string.IsNullOrWhiteSpace(calendar.Name))
            {
                await context.DisposeAsync();
                return (false, "Calendar name is required");
            }

            // Check for duplicate name (excluding self)
            var duplicateCalendar = await context.HolidayCalendars
                .FirstOrDefaultAsync(c => c.Name.ToLower() == calendar.Name.ToLower() && c.Id != calendar.Id);
            if (duplicateCalendar != null)
            {
                await context.DisposeAsync();
                return (false, "A calendar with this name already exists");
            }

            // Validate dates if provided
            if (calendar.Dates != null && calendar.Dates.Count > 0)
            {
                var dateValidation = ValidateHolidayDates(calendar.Dates.ToList());
                if (!dateValidation.Success)
                {
                    await context.DisposeAsync();
                    return (false, dateValidation.ErrorMessage);
                }
            }

            // Remove existing dates and add new ones
            if (existingCalendar.Dates != null)
            {
                context.HolidayDates.RemoveRange(existingCalendar.Dates);
            }

            // Update properties
            existingCalendar.Name = calendar.Name;
            existingCalendar.Description = calendar.Description;

            // Add new dates
            if (calendar.Dates != null)
            {
                foreach (var date in calendar.Dates)
                {
                    date.HolidayCalendarId = existingCalendar.Id;
                    context.HolidayDates.Add(date);
                }
            }

            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit holiday calendar", ex, new Dictionary<string, object?>
            {
                ["HolidayCalendar"] = calendar
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a holiday calendar (cascade deletes dates)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteHolidayCalendar(Guid id)
    {
        try
        {
            var context = new DataContext();
            
            // Check if calendar is in use by any schedule
            var schedulesUsingCalendar = await context.ScheduleMemories
                .Where(s => s.HolidayCalendarId == id)
                .CountAsync();
            if (schedulesUsingCalendar > 0)
            {
                await context.DisposeAsync();
                return (false, $"Cannot delete calendar: it is used by {schedulesUsingCalendar} schedule(s)");
            }

            var calendar = await context.HolidayCalendars.FindAsync(id);
            if (calendar == null)
            {
                await context.DisposeAsync();
                return (false, "Holiday calendar not found");
            }

            context.HolidayCalendars.Remove(calendar);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete holiday calendar", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Check if a specific date is a holiday in the given calendar
    /// </summary>
    public static async Task<(bool IsHoliday, HolidayDate? HolidayDate)> IsHoliday(Guid calendarId, DateTime date)
    {
        var context = new DataContext();
        var dateOnly = date.Date;
        var holidayDate = await context.HolidayDates
            .FirstOrDefaultAsync(d => d.HolidayCalendarId == calendarId && d.Date.Date == dateOnly);
        await context.DisposeAsync();
        return (holidayDate != null, holidayDate);
    }

    /// <summary>
    /// Validate holiday dates for duplicates
    /// </summary>
    private static (bool Success, string? ErrorMessage) ValidateHolidayDates(List<HolidayDate> dates)
    {
        // Check for duplicate dates
        var duplicateDates = dates
            .GroupBy(d => d.Date.Date)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateDates.Count > 0)
        {
            return (false, $"Duplicate dates found: {string.Join(", ", duplicateDates.Select(d => d.ToShortDateString()))}");
        }

        return (true, null);
    }
}
