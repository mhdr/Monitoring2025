
using System.ComponentModel.DataAnnotations;
using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing monitoring items accessible to the user
/// </summary>
public class ItemsResponseDto
{
    /// <summary>
    /// List of monitoring items
    /// </summary>
    public List<Item> Items { get; set; }

    /// <summary>
    /// Initializes a new instance of the ItemsResponseDto
    /// </summary>
    public ItemsResponseDto()
    {
        Items = new();
    }

    /// <summary>
    /// Represents a monitoring item (sensor, actuator, etc.)
    /// </summary>
    public class Item
    {
        /// <summary>
        /// Unique identifier for the item
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public string Id { get; set; }

        /// <summary>
        /// Group ID that this item belongs to
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public string? GroupId { get; set; }

        /// <summary>
        /// Type of the monitoring item (Input, Output, etc.)
        /// </summary>
        public ItemType ItemType { get; set; }

        /// <summary>
        /// Display name of the item
        /// </summary>
        /// <example>Temperature Sensor 1</example>
        public string? Name { get; set; }
        
        /// <summary>
        /// Display name of the item in Farsi
        /// </summary>
        /// <example>دمای سنسور 1</example>
        public string? NameFa { get; set; }

        /// <summary>
        /// Hardware point number for communication
        /// </summary>
        /// <example>1</example>
        public int PointNumber { get; set; }

        /// <summary>
        /// Whether the value should be scaled from raw to engineering units
        /// </summary>
        public ShouldScaleType ShouldScale { get; set; }

        /// <summary>
        /// Minimum raw value from the hardware
        /// </summary>
        /// <example>0</example>
        public float NormMin { get; set; }

        /// <summary>
        /// Maximum raw value from the hardware
        /// </summary>
        /// <example>4095</example>
        public float NormMax { get; set; }

        /// <summary>
        /// Minimum scaled engineering value
        /// </summary>
        /// <example>0</example>
        public float ScaleMin { get; set; }

        /// <summary>
        /// Maximum scaled engineering value
        /// </summary>
        /// <example>100</example>
        public float ScaleMax { get; set; }

        /// <summary>
        /// Interval in seconds for saving current values
        /// </summary>
        /// <example>60</example>
        public int SaveInterval { get; set; }

        /// <summary>
        /// Interval in seconds for saving historical values
        /// </summary>
        /// <example>3600</example>
        public int SaveHistoricalInterval { get; set; }

        /// <summary>
        /// Method used to calculate aggregated values
        /// </summary>
        public ValueCalculationMethod CalculationMethod { get; set; }

        /// <summary>
        /// Number of samples used for calculation
        /// </summary>
        /// <example>10</example>
        public int NumberOfSamples { get; set; }

        /// <summary>
        /// Text to display when boolean value is true
        /// </summary>
        /// <example>ON</example>
        public string? OnText { get; set; }

        /// <summary>
        /// Text to display when boolean value is false
        /// </summary>
        /// <example>OFF</example>
        public string? OffText { get; set; }

        /// <summary>
        /// Engineering unit for the value (°C, bar, etc.)
        /// </summary>
        /// <example>°C</example>
        public string? Unit { get; set; }

        /// <summary>
        /// Whether the item is disabled from data collection
        /// </summary>
        /// <example>false</example>
        public bool? IsDisabled { get; set; } 

        /// <summary>
        /// Communication interface type (Modbus, TCP, etc.)
        /// </summary>
        public InterfaceType InterfaceType { get; set; }

        /// <summary>
        /// Whether the current user can edit this item
        /// </summary>
        /// <example>true</example>
        public bool IsEditable { get; set; } = false;
    }
}