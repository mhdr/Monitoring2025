namespace API.Models;

/// <summary>
/// Represents a weather forecast for a specific date
/// </summary>
/// <param name="Date">The date of the forecast</param>
/// <param name="TemperatureC">Temperature in Celsius</param>
/// <param name="Summary">Weather summary description</param>
public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    /// <summary>
    /// Temperature in Fahrenheit (calculated from Celsius)
    /// </summary>
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}