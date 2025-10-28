using Share.Libs;

namespace API.Services;

/// <summary>
/// Service interface for managing audit log operations
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Log an audit event with strongly-typed data
    /// </summary>
    /// <typeparam name="T">Type of audit data object</typeparam>
    /// <param name="actionType">Type of action being audited</param>
    /// <param name="auditData">Audit data object containing details of the action</param>
    /// <param name="itemId">Optional item ID associated with the action</param>
    /// <param name="userId">Optional user ID who performed the action (if null, extracted from HttpContext)</param>
    /// <returns>Task representing the asynchronous operation</returns>
    Task LogAsync<T>(LogType actionType, T auditData, Guid? itemId = null, Guid? userId = null) where T : class;

    /// <summary>
    /// Log an audit event with anonymous object data
    /// </summary>
    /// <param name="actionType">Type of action being audited</param>
    /// <param name="auditData">Audit data object containing details of the action</param>
    /// <param name="itemId">Optional item ID associated with the action</param>
    /// <param name="userId">Optional user ID who performed the action (if null, extracted from HttpContext)</param>
    /// <returns>Task representing the asynchronous operation</returns>
    Task LogAsync(LogType actionType, object auditData, Guid? itemId = null, Guid? userId = null);
}
