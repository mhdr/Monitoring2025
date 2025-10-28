using System.Security.Claims;
using DB.User.Data;
using DB.User.Models;
using Newtonsoft.Json;
using Share.Libs;

namespace API.Services;

/// <summary>
/// Service for managing audit log operations with centralized logic
/// </summary>
public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AuditService> _logger;

    /// <summary>
    /// Initializes a new instance of the AuditService
    /// </summary>
    /// <param name="context">Database context for audit log persistence</param>
    /// <param name="httpContextAccessor">HTTP context accessor for extracting request information</param>
    /// <param name="logger">Logger for audit service operations</param>
    public AuditService(
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AuditService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Log an audit event with strongly-typed data
    /// </summary>
    /// <typeparam name="T">Type of audit data object</typeparam>
    /// <param name="actionType">Type of action being audited</param>
    /// <param name="auditData">Audit data object containing details of the action</param>
    /// <param name="itemId">Optional item ID associated with the action</param>
    /// <param name="userId">Optional user ID who performed the action (if null, extracted from HttpContext)</param>
    /// <returns>Task representing the asynchronous operation</returns>
    public async Task LogAsync<T>(LogType actionType, T auditData, Guid? itemId = null, Guid? userId = null) where T : class
    {
        try
        {
            // Extract user ID from HttpContext if not provided
            if (!userId.HasValue)
            {
                var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedUserId))
                {
                    userId = parsedUserId;
                }
            }

            // Extract IP address from HttpContext
            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

            // Serialize audit data to JSON
            var logValueJson = JsonConvert.SerializeObject(auditData, Formatting.Indented);

            // Get current Unix timestamp
            var epochTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Create audit log entry
            var auditLog = new AuditLog
            {
                IsUser = userId.HasValue,
                UserId = userId,
                ItemId = itemId,
                ActionType = actionType,
                IpAddress = ipAddress,
                LogValue = logValueJson,
                Time = epochTime
            };

            // Save to database
            await _context.AuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            _logger.LogDebug(
                "Audit log created: Action={ActionType}, UserId={UserId}, ItemId={ItemId}", 
                actionType, 
                userId, 
                itemId);
        }
        catch (Exception ex)
        {
            // Log the error but don't throw - audit failure shouldn't break main operation
            _logger.LogError(ex, 
                "Failed to write audit log: ActionType={ActionType}, ItemId={ItemId}, UserId={UserId}", 
                actionType, 
                itemId, 
                userId);
            
            // Note: We swallow the exception to prevent audit failures from breaking business operations
            // This is a deliberate design decision - audit is important but not critical enough to fail the request
        }
    }

    /// <summary>
    /// Log an audit event with anonymous object data
    /// </summary>
    /// <param name="actionType">Type of action being audited</param>
    /// <param name="auditData">Audit data object containing details of the action</param>
    /// <param name="itemId">Optional item ID associated with the action</param>
    /// <param name="userId">Optional user ID who performed the action (if null, extracted from HttpContext)</param>
    /// <returns>Task representing the asynchronous operation</returns>
    public Task LogAsync(LogType actionType, object auditData, Guid? itemId = null, Guid? userId = null)
    {
        // Cast to object and call the generic version
        return LogAsync<object>(actionType, auditData, itemId, userId);
    }
}
