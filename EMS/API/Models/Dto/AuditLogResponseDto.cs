using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing audit log entries for system activities
/// </summary>
public class AuditLogResponseDto
{
    /// <summary>
    /// List of audit log entries matching the request criteria
    /// </summary>
    public List<DataDto> Data { get; set; }

    /// <summary>
    /// Initializes a new instance of the AuditLogResponseDto with an empty data list
    /// </summary>
    public AuditLogResponseDto()
    {
        Data = new();
    }

    /// <summary>
    /// Individual audit log entry with user action details
    /// </summary>
    public class DataDto
    {
        /// <summary>
        /// Unique identifier for this audit log entry
        /// </summary>
        /// <example>3fa85f64-5717-4562-b3fc-2c963f66afa6</example>
        public Guid Id { get; set; }
        
        /// <summary>
        /// Indicates whether the action was performed by a user (true) or by the system (false)
        /// </summary>
        /// <example>true</example>
        public bool IsUser { get; set; }
        
        /// <summary>
        /// User ID who performed the action (null for system actions)
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public Guid? UserId { get; set; }
        
        /// <summary>
        /// Username of the user who performed the action
        /// </summary>
        /// <example>johndoe</example>
        public string? UserName { get; set; }
        
        /// <summary>
        /// Monitoring item ID that was affected by this action (null for non-item actions)
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        public Guid? ItemId { get; set; }
        
        /// <summary>
        /// Type of action performed (e.g., EditPoint, EditAlarm, AddUser, DeleteController)
        /// </summary>
        /// <example>EditPoint</example>
        public LogType ActionType { get; set; }
        
        /// <summary>
        /// IP address from which the action was performed
        /// </summary>
        /// <example>192.168.1.100</example>
        public string? IpAddress { get; set; }
        
        /// <summary>
        /// JSON-serialized details of the action showing old and new values
        /// </summary>
        /// <example>{"ItemNameOld": "Temp Sensor 1", "ItemNameNew": "Temperature Sensor 1"}</example>
        public string? LogValue { get; set; }
        
        /// <summary>
        /// Unix timestamp (seconds since epoch) when the action occurred
        /// </summary>
        /// <example>1697587200</example>
        public long Time { get; set; }

        /// <summary>
        /// Converted local DateTime representation of the Time property
        /// </summary>
        public DateTime DateTime
        {
            get
            {
                DateTimeOffset dateTimeOffset = DateTimeOffset.FromUnixTimeSeconds(Time);
                DateTime localDateTime = dateTimeOffset.LocalDateTime;
                return localDateTime;
            }
        }
    }
}