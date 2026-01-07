using Core.Models;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting formula memories
/// </summary>
public class GetFormulaMemoriesResponseDto
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
    /// List of formula memory items
    /// </summary>
    public List<FormulaMemoryItemDto>? FormulaMemories { get; set; }
}

/// <summary>
/// Individual formula memory item DTO
/// </summary>
public class FormulaMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string Expression { get; set; } = "";
    public string VariableAliases { get; set; } = "{}";
    public TimeoutSourceType OutputType { get; set; }
    public string OutputReference { get; set; } = string.Empty;
    public Guid? OutputItemId { get; set; } // Deprecated, for backward compatibility
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    public int DecimalPlaces { get; set; }
    public string? Units { get; set; }
    public string? Description { get; set; }
    public string? ExpressionHash { get; set; }
    public long? LastEvaluationTime { get; set; }
    public string? LastError { get; set; }
    
    // Resolved item names for display
    public string? OutputItemName { get; set; }
    public string? OutputItemNameFa { get; set; }
}

/// <summary>
/// Variable alias mapping for display
/// </summary>
public class VariableAliasDto
{
    public string Alias { get; set; } = "";
    public Guid ItemId { get; set; }
    public string? ItemName { get; set; }
    public string? ItemNameFa { get; set; }
}
