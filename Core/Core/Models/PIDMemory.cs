using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

[Table("pid_memory")]
public class PIDMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("name")] public string? Name { get; set; }

    [Column("input_item_id")] public Guid InputItemId { get; set; }
    [Column("output_item_id")] public Guid OutputItemId { get; set; }

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

    [Column("set_point")] public double? SetPoint { get; set; }
    [Column("set_point_id")] public Guid? SetPointId { get; set; }

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

    [DefaultValue(true)]
    [Column("is_auto")]
    public bool IsAuto { get; set; }

    [Column("is_auto_id")] public Guid? IsAutoId { get; set; }

    [Column("manual_value")] public double? ManualValue { get; set; }

    [Column("manual_value_id")] public Guid? ManualValueId { get; set; }
    
    
    [DefaultValue(false)]
    [Column("reverse_output")]
    public bool ReverseOutput { get; set; }
    
    [Column("reverse_output_id")]
    public Guid? ReverseOutputId { get; set; }
}