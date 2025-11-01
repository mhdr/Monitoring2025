namespace API.Models.Dto;

/// <summary>
/// Request model for batch editing external alarm configurations
/// </summary>
public class BatchEditExternalAlarmsRequestDto
{
    /// <summary>
    /// The parent alarm ID for which external alarms are being edited
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid AlarmId { get; set; }

    /// <summary>
    /// List of external alarms that have been modified
    /// </summary>
    public List<ExternalAlarmEdit> Changed { get; set; } = [];
    
    /// <summary>
    /// List of new external alarms to add
    /// </summary>
    public List<ExternalAlarmEdit> Added { get; set; } = [];
    
    /// <summary>
    /// List of external alarms to remove
    /// </summary>
    public List<ExternalAlarmEdit> Removed { get; set; } = [];

    /// <summary>
    /// Represents an external alarm for batch edit operations
    /// </summary>
    public class ExternalAlarmEdit
    {
        /// <summary>
        /// Unique identifier for the external alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public Guid Id { get; set; }
        
        /// <summary>
        /// The monitoring item ID to write to when alarm triggers
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        public Guid ItemId { get; set; }
        
        /// <summary>
        /// The value to write when this external alarm is triggered
        /// </summary>
        /// <example>true</example>
        public bool Value { get; set; }
        
        /// <summary>
        /// Whether this external alarm is disabled
        /// </summary>
        /// <example>false</example>
        public bool IsDisabled { get; set; }
    }
}