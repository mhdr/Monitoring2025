namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting min/max selector memories
/// </summary>
public class GetMinMaxSelectorMemoriesResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// List of min/max selector memory items
    /// </summary>
    public List<MinMaxSelectorMemoryItemDto>? MinMaxSelectorMemories { get; set; }
}

/// <summary>
/// Individual min/max selector memory item DTO
/// </summary>
public class MinMaxSelectorMemoryItemDto
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of input item IDs
    /// </summary>
    public string InputItemIds { get; set; } = "[]";

    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int OutputType { get; set; }

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// (Legacy) Output item ID for selected value
    /// DEPRECATED: Use OutputType and OutputReference instead
    /// </summary>
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Type of the selected index output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int? SelectedIndexOutputType { get; set; }

    /// <summary>
    /// Reference to the selected index output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string? SelectedIndexOutputReference { get; set; }

    /// <summary>
    /// (Legacy) Optional output item ID for selected input index (1-16)
    /// DEPRECATED: Use SelectedIndexOutputType and SelectedIndexOutputReference instead
    /// </summary>
    public Guid? SelectedIndexOutputItemId { get; set; }

    /// <summary>
    /// Selection mode: 1 = Minimum, 2 = Maximum
    /// </summary>
    public int SelectionMode { get; set; }

    /// <summary>
    /// Failover mode: 1 = IgnoreBad, 2 = FallbackToOpposite, 3 = HoldLastGood
    /// </summary>
    public int FailoverMode { get; set; }

    /// <summary>
    /// Execution interval in seconds
    /// </summary>
    public int Interval { get; set; }

    /// <summary>
    /// Whether the memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Last selected input index (1-based), null if not yet selected
    /// </summary>
    public int? LastSelectedIndex { get; set; }

    /// <summary>
    /// Last selected value, null if not yet selected
    /// </summary>
    public double? LastSelectedValue { get; set; }

    /// <summary>
    /// Write duration in seconds for controller writes. Default: 10
    /// </summary>
    public long Duration { get; set; }
}
