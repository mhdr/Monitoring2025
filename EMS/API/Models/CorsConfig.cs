namespace API.Models;

/// <summary>
/// CORS configuration settings for the API
/// </summary>
public class CorsConfig
{
    /// <summary>
    /// List of allowed domain patterns (e.g., "*.sobhanonco.ir", "example.com")
    /// </summary>
    public List<string> AllowedDomains { get; set; } = new();

    /// <summary>
    /// List of allowed ports for development (e.g., 3000, 5173, 8443)
    /// </summary>
    public List<int> AllowedPorts { get; set; } = new();

    /// <summary>
    /// Allow localhost origins
    /// </summary>
    public bool AllowLocalhost { get; set; } = true;

    /// <summary>
    /// Allow local network IPs (192.168.x.x, 10.x.x.x, 172.20.x.x)
    /// </summary>
    public bool AllowLocalNetwork { get; set; } = true;

    /// <summary>
    /// Allow detected public and local IPs
    /// </summary>
    public bool AllowDetectedIPs { get; set; } = true;

    /// <summary>
    /// Allowed protocols (http, https)
    /// </summary>
    public List<string> AllowedProtocols { get; set; } = new() { "http", "https" };
}
