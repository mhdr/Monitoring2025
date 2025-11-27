namespace Core.Libs;

/// <summary>
/// Provides methods for normalizing and denormalizing values within a specified range.
/// </summary>
public class MinMaxNormalizer
{
    /// <summary>
    /// Normalizes a value from a given range to a new range.
    /// </summary>
    /// <param name="value">The value to normalize.</param>
    /// <param name="min">The minimum value of the original range.</param>
    /// <param name="max">The maximum value of the original range.</param>
    /// <param name="newMin">The minimum value of the new range. Default is 0.</param>
    /// <param name="newMax">The maximum value of the new range. Default is 1.</param>
    /// <returns>The normalized value.</returns>
    /// <exception cref="ArgumentException">Thrown when min and max are the same value.</exception>
    public static float Normalize(float value, float min, float max, float newMin = 0, float newMax = 1)
    {
        if (min == max)
        {
            throw new ArgumentException("Min and max cannot be the same value.");
        }
        
        float normalizedValue = newMin + ((value - min) / (max - min)) * (newMax - newMin);
        return normalizedValue;
    }
    
    /// <summary>
    /// Denormalizes a value from a normalized range back to its original range.
    /// </summary>
    /// <param name="normalizedValue">The normalized value to denormalize.</param>
    /// <param name="min">The minimum value of the original range.</param>
    /// <param name="max">The maximum value of the original range.</param>
    /// <param name="newMin">The minimum value of the normalized range. Default is 0.</param>
    /// <param name="newMax">The maximum value of the normalized range. Default is 1.</param>
    /// <returns>The denormalized value.</returns>
    /// <exception cref="ArgumentException">Thrown when newMin and newMax are the same value.</exception>
    public static float Denormalize(float normalizedValue, float min, float max, float newMin = 0, float newMax = 1)
    {
        if (newMin == newMax)
        {
            throw new ArgumentException("newMin and newMax cannot be the same value.");
        }

        float originalValue = min + ((normalizedValue - newMin) / (newMax - newMin)) * (max - min);
        return originalValue;
    }
}
