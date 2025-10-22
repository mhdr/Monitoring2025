using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace API.Services
{
    /// <summary>
    /// Service for detecting the machine's public and local network IP addresses
    /// </summary>
    public static class IpDetectionService
    {
        /// <summary>
        /// Detects both the machine's public IP and local network IP address
        /// </summary>
        /// <returns>A tuple containing (publicIp, localNetworkIp)</returns>
        public static async Task<(IPAddress publicIp, IPAddress localNetworkIp)> DetectIpAddressesAsync()
        {
            IPAddress? publicIp = null;
            IPAddress? localNetworkIp = null;

            // First, try to get public IP from external services
            try
            {
                publicIp = await GetPublicIpFromExternalServiceAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[IP DETECTION] Failed to get public IP from external service: {ex.Message}");
            }

            // Get local network IP
            localNetworkIp = GetLocalNetworkIp();

            // Use fallbacks if needed
            publicIp ??= localNetworkIp ?? IPAddress.Any;
            localNetworkIp ??= IPAddress.Loopback;

            return (publicIp, localNetworkIp);
        }

        /// <summary>
        /// Detects the machine's public IP address with fallback strategies
        /// </summary>
        /// <returns>The detected IP address</returns>
        public static async Task<IPAddress> DetectPublicIpAsync()
        {
            var (publicIp, _) = await DetectIpAddressesAsync();
            return publicIp;
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
        /// Gets the local network IP address, prioritizing 192.168.x.x range
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

                List<IPAddress> candidateIps = new();

                foreach (var networkInterface in networkInterfaces)
                {
                    var ipProperties = networkInterface.GetIPProperties();
                    var unicastAddresses = ipProperties.UnicastAddresses
                        .Where(ua => ua.Address.AddressFamily == AddressFamily.InterNetwork &&
                                    !IPAddress.IsLoopback(ua.Address))
                        .ToList();

                    foreach (var ua in unicastAddresses)
                    {
                        candidateIps.Add(ua.Address);
                    }
                }

                // Prioritize 192.168.x.x addresses (most common local network)
                var localNetworkIp = candidateIps.FirstOrDefault(ip =>
                {
                    var bytes = ip.GetAddressBytes();
                    return bytes[0] == 192 && bytes[1] == 168;
                });

                if (localNetworkIp != null)
                {
                    return localNetworkIp;
                }

                // Then try 10.x.x.x (common in corporate networks)
                var privateNetworkIp = candidateIps.FirstOrDefault(ip =>
                {
                    var bytes = ip.GetAddressBytes();
                    return bytes[0] == 10;
                });

                if (privateNetworkIp != null)
                {
                    return privateNetworkIp;
                }

                // Finally, return any private IP
                return candidateIps.FirstOrDefault(IsPrivateIp);
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