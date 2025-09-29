using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace API.Services
{
    /// <summary>
    /// Service for detecting the machine's public IP address
    /// </summary>
    public static class IpDetectionService
    {
        /// <summary>
        /// Detects the machine's public IP address with fallback strategies
        /// </summary>
        /// <returns>The detected IP address</returns>
        public static async Task<IPAddress> DetectPublicIpAsync()
        {
            try
            {
                // First, try to get public IP from external services
                var publicIp = await GetPublicIpFromExternalServiceAsync();
                if (publicIp != null && !IsPrivateIp(publicIp))
                {
                    Console.WriteLine($"[IP DETECTION] Detected public IP: {publicIp}");
                    return publicIp;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[IP DETECTION] Failed to get public IP from external service: {ex.Message}");
            }

            // Fallback to local network IP
            var localIp = GetLocalNetworkIp();
            if (localIp != null)
            {
                Console.WriteLine($"[IP DETECTION] Using local network IP: {localIp}");
                return localIp;
            }

            // Final fallback to any available IP
            Console.WriteLine("[IP DETECTION] Using fallback IP: 0.0.0.0");
            return IPAddress.Any;
        }

        /// <summary>
        /// Gets public IP from external service
        /// </summary>
        private static async Task<IPAddress?> GetPublicIpFromExternalServiceAsync()
        {
            var services = new[]
            {
                "https://api.ipify.org",
                "https://icanhazip.com",
                "https://checkip.amazonaws.com"
            };

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(5);

            foreach (var service in services)
            {
                try
                {
                    var response = await httpClient.GetStringAsync(service);
                    var ipString = response.Trim();
                    
                    if (IPAddress.TryParse(ipString, out var ipAddress))
                    {
                        return ipAddress;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[IP DETECTION] Failed to get IP from {service}: {ex.Message}");
                }
            }

            return null;
        }

        /// <summary>
        /// Gets the local network IP address
        /// </summary>
        private static IPAddress? GetLocalNetworkIp()
        {
            try
            {
                // Get the first operational network interface with a valid IP
                var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(ni => ni.OperationalStatus == OperationalStatus.Up &&
                                ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    .ToList();

                foreach (var networkInterface in networkInterfaces)
                {
                    var ipProperties = networkInterface.GetIPProperties();
                    var unicastAddresses = ipProperties.UnicastAddresses
                        .Where(ua => ua.Address.AddressFamily == AddressFamily.InterNetwork &&
                                    !IPAddress.IsLoopback(ua.Address))
                        .ToList();

                    // Prefer non-private IPs first
                    var nonPrivateIp = unicastAddresses
                        .FirstOrDefault(ua => !IsPrivateIp(ua.Address))?.Address;
                    
                    if (nonPrivateIp != null)
                    {
                        return nonPrivateIp;
                    }

                    // Then try private IPs
                    var privateIp = unicastAddresses
                        .FirstOrDefault(ua => IsPrivateIp(ua.Address))?.Address;
                    
                    if (privateIp != null)
                    {
                        return privateIp;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[IP DETECTION] Failed to get local network IP: {ex.Message}");
            }

            return null;
        }

        /// <summary>
        /// Checks if an IP address is in a private range
        /// </summary>
        private static bool IsPrivateIp(IPAddress ipAddress)
        {
            if (ipAddress.AddressFamily != AddressFamily.InterNetwork)
                return false;

            var bytes = ipAddress.GetAddressBytes();
            
            // 10.0.0.0 - 10.255.255.255
            if (bytes[0] == 10)
                return true;
            
            // 172.16.0.0 - 172.31.255.255
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                return true;
            
            // 192.168.0.0 - 192.168.255.255
            if (bytes[0] == 192 && bytes[1] == 168)
                return true;
            
            // 127.0.0.0 - 127.255.255.255 (loopback)
            if (bytes[0] == 127)
                return true;

            return false;
        }
    }
}