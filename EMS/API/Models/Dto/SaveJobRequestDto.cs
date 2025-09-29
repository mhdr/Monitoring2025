namespace API.Models.Dto;

/// <summary>
/// Request DTO for saving/creating scheduled job configurations
/// </summary>
public class SaveJobRequestDto
{
    /// <summary>
    /// Optional trigger ID for updating existing jobs. Null for creating new jobs.
    /// </summary>
    public Guid? TriggerId { get; set; }

    /// <summary>
    /// Name of the scheduled job trigger
    /// </summary>
    public string TriggerName { get; set; }

    /// <summary>
    /// Whether the scheduled job is disabled
    /// </summary>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Start time for job execution (time string format)
    /// </summary>
    public string StartTime { get; set; }

    /// <summary>
    /// End time for job execution (time string format)
    /// </summary>
    public string EndTime { get; set; }

    /// <summary>
    /// List of existing job details that have been modified
    /// </summary>
    public List<JobDetail> Changed { get; set; } = [];

    /// <summary>
    /// List of new job details to be added
    /// </summary>
    public List<JobDetail> Added { get; set; } = [];

    /// <summary>
    /// List of job details to be removed
    /// </summary>
    public List<JobDetail> Removed { get; set; } = [];

    /// <summary>
    /// Represents a single action within a scheduled job
    /// </summary>
    public class JobDetail
    {
        /// <summary>
        /// Unique identifier for the job detail
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// ID of the monitoring item to act upon
        /// </summary>
        public Guid ItemId { get; set; }

        /// <summary>
        /// Value to set when the job executes
        /// </summary>
        public string Value { get; set; }
    }
}