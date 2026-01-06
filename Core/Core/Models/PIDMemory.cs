using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Specifies the source type for PID memory inputs and outputs
/// </summary>
public enum PIDSourceType
{
    /// <summary>
    /// Reference is a Point (MonitoringItem) GUID
    /// </summary>
    Point = 0,
    
    /// <summary>
    /// Reference is a Global Variable name
    /// </summary>
    GlobalVariable = 1
}

[Table("pid_memory")]
public class PIDMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("name")] public string? Name { get; set; }

    // Input (Process Variable)
    [Column("input_type")] 
    public PIDSourceType InputType { get; set; } = PIDSourceType.Point;
    
    [Column("input_reference")] 
    public string InputReference { get; set; } = string.Empty;
    
    // Output (Control Variable)
    [Column("output_type")] 
    public PIDSourceType OutputType { get; set; } = PIDSourceType.Point;
    
    [Column("output_reference")] 
    public string OutputReference { get; set; } = string.Empty;

    [DefaultValue(1.0)] [Column("kp")] public double Kp { get; set; }

    [DefaultValue(0.1)] [Column("ki")] public double Ki { get; set; }

    [DefaultValue(0.05)] [Column("kd")] public double Kd { get; set; }

    [DefaultValue(0.0)]
    [Column("output_min")]
    public double OutputMin { get; set; }

    [DefaultValue(100.0)]
    [Column("output_max")]
    public double OutputMax { get; set; }

    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; }

    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; }

    // SetPoint
    [Column("set_point_type")] 
    public PIDSourceType SetPointType { get; set; } = PIDSourceType.Point;
    
    [Column("set_point_reference")] 
    public string SetPointReference { get; set; } = string.Empty;

    [DefaultValue(1.0)]
    [Column("derivative_filter_alpha")]
    public double DerivativeFilterAlpha { get; set; }

    [DefaultValue(100.0)]
    [Column("max_output_slew_rate")]
    public double MaxOutputSlewRate { get; set; }

    [DefaultValue(0.0)]
    [Column("dead_zone")]
    public double DeadZone { get; set; }

    [DefaultValue(0.0)]
    [Column("feed_forward")]
    public double FeedForward { get; set; }

    // Auto/Manual Mode
    [Column("is_auto_type")] 
    public PIDSourceType IsAutoType { get; set; } = PIDSourceType.Point;
    
    [Column("is_auto_reference")] 
    public string IsAutoReference { get; set; } = string.Empty;

    // Manual Value
    [Column("manual_value_type")] 
    public PIDSourceType ManualValueType { get; set; } = PIDSourceType.Point;
    
    [Column("manual_value_reference")] 
    public string ManualValueReference { get; set; } = string.Empty;
    
    // Reverse Output Flag
    [Column("reverse_output_type")] 
    public PIDSourceType ReverseOutputType { get; set; } = PIDSourceType.Point;
    
    [Column("reverse_output_reference")] 
    public string ReverseOutputReference { get; set; } = string.Empty;
    
    // Hysteresis Control for Digital Output
    [Column("digital_output_type")] 
    public PIDSourceType? DigitalOutputType { get; set; }
    
    [Column("digital_output_reference")] 
    public string? DigitalOutputReference { get; set; }
    
    [DefaultValue(75.0)]
    [Column("hysteresis_high_threshold")]
    public double HysteresisHighThreshold { get; set; }
    
    [DefaultValue(25.0)]
    [Column("hysteresis_low_threshold")]
    public double HysteresisLowThreshold { get; set; }
    
    // Cascaded PID Control
    /// <summary>
    /// Reference to parent PID controller in a cascade configuration.
    /// Outer PID's CVId should match inner PID's SetPointId.
    /// </summary>
    [Column("parent_pid_id")]
    public Guid? ParentPIDId { get; set; }
    
    /// <summary>
    /// Cascade level: 0 = standalone/outer, 1 = outer in cascade, 2 = inner in cascade.
    /// Used for execution ordering (level 0 first, then 1, then 2).
    /// </summary>
    [DefaultValue(0)]
    [Column("cascade_level")]
    public int CascadeLevel { get; set; }
    
    // Backward compatibility helpers (NotMapped - for code compatibility during transition)
    /// <summary>
    /// Backward compatibility: Gets the Input Item ID if InputType is Point
    /// </summary>
    [NotMapped]
    public Guid InputItemId
    {
        get => InputType == PIDSourceType.Point && Guid.TryParse(InputReference, out var id) ? id : Guid.Empty;
        set
        {
            InputType = PIDSourceType.Point;
            InputReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the Output Item ID if OutputType is Point
    /// </summary>
    [NotMapped]
    public Guid OutputItemId
    {
        get => OutputType == PIDSourceType.Point && Guid.TryParse(OutputReference, out var id) ? id : Guid.Empty;
        set
        {
            OutputType = PIDSourceType.Point;
            OutputReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the SetPoint Item ID if SetPointType is Point
    /// </summary>
    [NotMapped]
    public Guid SetPointId
    {
        get => SetPointType == PIDSourceType.Point && Guid.TryParse(SetPointReference, out var id) ? id : Guid.Empty;
        set
        {
            SetPointType = PIDSourceType.Point;
            SetPointReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the IsAuto Item ID if IsAutoType is Point
    /// </summary>
    [NotMapped]
    public Guid IsAutoId
    {
        get => IsAutoType == PIDSourceType.Point && Guid.TryParse(IsAutoReference, out var id) ? id : Guid.Empty;
        set
        {
            IsAutoType = PIDSourceType.Point;
            IsAutoReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the ManualValue Item ID if ManualValueType is Point
    /// </summary>
    [NotMapped]
    public Guid ManualValueId
    {
        get => ManualValueType == PIDSourceType.Point && Guid.TryParse(ManualValueReference, out var id) ? id : Guid.Empty;
        set
        {
            ManualValueType = PIDSourceType.Point;
            ManualValueReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the ReverseOutput Item ID if ReverseOutputType is Point
    /// </summary>
    [NotMapped]
    public Guid ReverseOutputId
    {
        get => ReverseOutputType == PIDSourceType.Point && Guid.TryParse(ReverseOutputReference, out var id) ? id : Guid.Empty;
        set
        {
            ReverseOutputType = PIDSourceType.Point;
            ReverseOutputReference = value.ToString();
        }
    }
    
    /// <summary>
    /// Backward compatibility: Gets the DigitalOutput Item ID if DigitalOutputType is Point
    /// </summary>
    [NotMapped]
    public Guid? DigitalOutputItemId
    {
        get => DigitalOutputType == PIDSourceType.Point && Guid.TryParse(DigitalOutputReference ?? string.Empty, out var id) ? id : null;
        set
        {
            if (value.HasValue && value.Value != Guid.Empty)
            {
                DigitalOutputType = PIDSourceType.Point;
                DigitalOutputReference = value.Value.ToString();
            }
            else
            {
                DigitalOutputType = null;
                DigitalOutputReference = null;
            }
        }
    }
}
