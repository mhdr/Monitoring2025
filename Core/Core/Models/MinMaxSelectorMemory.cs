using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Selection mode for Min/Max Selector Memory
/// </summary>
public enum MinMaxSelectionMode
{
    /// <summary>
    /// Select the minimum value from all valid inputs
    /// Use cases: Safety floor selection, lowest temperature monitoring
    /// </summary>
    Minimum = 1,
    
    /// <summary>
    /// Select the maximum value from all valid inputs
    /// Use cases: Peak tracking, highest load detection
    /// </summary>
    Maximum = 2
}

/// <summary>
/// Failover behavior when inputs are detected as bad/invalid
/// </summary>
public enum MinMaxFailoverMode
{
    /// <summary>
    /// Ignore bad inputs and continue selection with remaining valid inputs.
    /// If all inputs are bad, output will not be updated.
    /// Use case: General monitoring where partial data is acceptable
    /// </summary>
    IgnoreBad = 1,
    
    /// <summary>
    /// When the selected input goes bad, fall back to opposite selection criteria.
    /// If Min mode and selected goes bad, try Max; and vice versa.
    /// Use case: Redundant sensor systems where any valid reading is preferred
    /// </summary>
    FallbackToOpposite = 2,
    
    /// <summary>
    /// Hold the last known good value when all inputs become invalid.
    /// The output retains its previous value until valid inputs return.
    /// Use case: Critical control systems requiring continuous output
    /// </summary>
    HoldLastGood = 3
}

/// <summary>
/// Min/Max Selector Memory for selecting the minimum or maximum value from multiple analog inputs.
/// Supports 2-16 inputs with configurable selection mode and failover strategies.
/// </summary>
/// <remarks>
/// Use Cases:
/// - Lead-lag pump control (select least loaded pump)
/// - Temperature zone control (warmest/coolest sensor)
/// - Redundant sensor selection (TMR - triple modular redundancy)
/// - Load balancing (distribute based on current loads)
/// - Safety selection (worst-case scenario monitoring)
/// - Peak demand tracking (maximum values for billing)
/// 
/// Features:
/// - 2-16 analog inputs for comparison
/// - Min or Max selection mode
/// - Three failover strategies for bad input handling
/// - Optional index output (1-16) indicating which input is selected
/// - Bad input detection using quality flags and value validity
/// - Configurable processing interval
/// </remarks>
[Table("minmax_selector_memory")]
public class MinMaxSelectorMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this min/max selector configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of input item IDs to compare.
    /// Must contain between 2 and 16 valid AnalogInput or AnalogOutput item GUIDs.
    /// Format: ["guid1", "guid2", ..., "guidN"]
    /// </summary>
    [Column("input_item_ids", TypeName = "jsonb")]
    public string InputItemIds { get; set; } = "[]";

    /// <summary>
    /// The output item where the selected min/max value will be written.
    /// Must be an AnalogOutput type.
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Optional output item for the selected input index (1-16).
    /// When configured, writes which input (by position 1-based) was selected.
    /// Must be an AnalogOutput type if specified.
    /// Use case: Trending which sensor is being used, HMI display
    /// </summary>
    [Column("selected_index_output_item_id")]
    public Guid? SelectedIndexOutputItemId { get; set; }

    /// <summary>
    /// Selection mode: Minimum or Maximum value selection.
    /// Default: Minimum (select lowest value)
    /// </summary>
    [DefaultValue(MinMaxSelectionMode.Minimum)]
    [Column("selection_mode")]
    public MinMaxSelectionMode SelectionMode { get; set; } = MinMaxSelectionMode.Minimum;

    /// <summary>
    /// Failover behavior when inputs are invalid.
    /// Default: IgnoreBad (skip bad inputs, use remaining valid ones)
    /// </summary>
    [DefaultValue(MinMaxFailoverMode.IgnoreBad)]
    [Column("failover_mode")]
    public MinMaxFailoverMode FailoverMode { get; set; } = MinMaxFailoverMode.IgnoreBad;

    /// <summary>
    /// Processing interval in seconds.
    /// Default: 10 seconds.
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// If true, this min/max selector is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    #region Runtime State (for HoldLastGood failover mode)

    /// <summary>
    /// Last selected input index (1-based) for tracking and failover purposes.
    /// Used when FailoverMode is HoldLastGood.
    /// </summary>
    [Column("last_selected_index")]
    public int? LastSelectedIndex { get; set; }

    /// <summary>
    /// Last known good output value for HoldLastGood failover mode.
    /// When all inputs become invalid, this value is retained at the output.
    /// </summary>
    [Column("last_selected_value")]
    public double? LastSelectedValue { get; set; }

    #endregion

    #region Constants

    /// <summary>
    /// Minimum number of inputs required for min/max selection.
    /// </summary>
    public const int MinInputCount = 2;

    /// <summary>
    /// Maximum number of inputs allowed for min/max selection.
    /// Practical limit for TMR/voting and display scenarios.
    /// </summary>
    public const int MaxInputCount = 16;

    #endregion
}
