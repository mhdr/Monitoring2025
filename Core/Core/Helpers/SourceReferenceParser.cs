using Core.Models;

namespace Core.Helpers;

/// <summary>
/// Helper class for parsing and formatting source references that can be either Points or Global Variables.
/// Uses prefix-based format: "P:guid" for Points, "GV:name" for Global Variables.
/// </summary>
public static class SourceReferenceParser
{
    private const string PointPrefix = "P:";
    private const string GlobalVariablePrefix = "GV:";

    /// <summary>
    /// Parses a prefixed source reference string into its type and reference components.
    /// </summary>
    /// <param name="source">Source reference string ("P:guid" or "GV:name")</param>
    /// <returns>Tuple of (Type, Reference) where Reference is the GUID or name without prefix</returns>
    /// <remarks>
    /// For backward compatibility, strings without a prefix are assumed to be Point GUIDs.
    /// </remarks>
    public static (TimeoutSourceType Type, string Reference) Parse(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return (TimeoutSourceType.Point, string.Empty);
        }

        if (source.StartsWith(PointPrefix, StringComparison.Ordinal))
        {
            return (TimeoutSourceType.Point, source.Substring(PointPrefix.Length));
        }

        if (source.StartsWith(GlobalVariablePrefix, StringComparison.Ordinal))
        {
            return (TimeoutSourceType.GlobalVariable, source.Substring(GlobalVariablePrefix.Length));
        }

        // Backward compatibility: no prefix = assume Point GUID
        // This handles legacy data that was stored as raw GUIDs
        return (TimeoutSourceType.Point, source);
    }

    /// <summary>
    /// Formats a type and reference into a prefixed source reference string.
    /// </summary>
    /// <param name="type">Source type (Point or GlobalVariable)</param>
    /// <param name="reference">Reference string (GUID for Point, name for GlobalVariable)</param>
    /// <returns>Prefixed source reference string ("P:guid" or "GV:name")</returns>
    public static string Format(TimeoutSourceType type, string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
        {
            return string.Empty;
        }

        return type == TimeoutSourceType.Point
            ? $"{PointPrefix}{reference}"
            : $"{GlobalVariablePrefix}{reference}";
    }

    /// <summary>
    /// Checks if a source reference string is a Global Variable (has "GV:" prefix).
    /// </summary>
    /// <param name="source">Source reference string</param>
    /// <returns>True if the source is a Global Variable, false otherwise</returns>
    public static bool IsGlobalVariable(string source)
    {
        return !string.IsNullOrWhiteSpace(source) &&
               source.StartsWith(GlobalVariablePrefix, StringComparison.Ordinal);
    }

    /// <summary>
    /// Checks if a source reference string is a Point (has "P:" prefix or no prefix).
    /// </summary>
    /// <param name="source">Source reference string</param>
    /// <returns>True if the source is a Point, false otherwise</returns>
    public static bool IsPoint(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return false;
        }

        return source.StartsWith(PointPrefix, StringComparison.Ordinal) ||
               (!source.StartsWith(GlobalVariablePrefix, StringComparison.Ordinal));
    }
}
