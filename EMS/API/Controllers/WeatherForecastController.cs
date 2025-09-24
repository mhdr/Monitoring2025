using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Weather forecast controller providing sample weather data
/// </summary>
[ApiController]
[Route("[controller]")]
public class WeatherForecastController : ControllerBase
{
    private static readonly string[] Summaries = new[]
    {
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    };

    /// <summary>
    /// Get weather forecast for the next 5 days (requires authentication)
    /// </summary>
    /// <returns>A collection of weather forecasts</returns>
    /// <response code="200">Returns the weather forecasts</response>
    /// <response code="401">If the user is not authenticated</response>
    [HttpGet(Name = "GetWeatherForecast")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IEnumerable<WeatherForecast> Get()
    {
        return Enumerable.Range(1, 5).Select(index => new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            Summaries[Random.Shared.Next(Summaries.Length)]
        ))
        .ToArray();
    }

    /// <summary>
    /// Get public weather forecast for the next 3 days (no authentication required)
    /// </summary>
    /// <returns>A collection of public weather forecasts</returns>
    /// <response code="200">Returns the weather forecasts</response>
    [HttpGet("public")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IEnumerable<WeatherForecast> GetPublic()
    {
        return Enumerable.Range(1, 3).Select(index => new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            Summaries[Random.Shared.Next(Summaries.Length)]
        ))
        .ToArray();
    }
}