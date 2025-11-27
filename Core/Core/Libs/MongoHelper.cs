namespace Core.Libs;

public class MongoHelper
{
    public static string GetCollectionName(Guid id, long epoch)
    {
        DateTime utcDateTime = DateTimeOffset.FromUnixTimeSeconds(epoch).UtcDateTime;
        string formattedDate = utcDateTime.ToString("yyyyMM");

        return $"items_history_{id.ToString()}_{formattedDate}";
    }

    public static List<string> FindCollections(Guid id, long epochStart, long epochEnd)
    {
        List<string> collections = new List<string>();

        DateTime utcDateTimeStart = DateTimeOffset.FromUnixTimeSeconds(epochStart).UtcDateTime;
        DateTime utcDateTimeEnd = DateTimeOffset.FromUnixTimeSeconds(epochEnd).UtcDateTime;

        int yearStart = utcDateTimeStart.Year;
        int yearEnd = utcDateTimeEnd.Year;
        int monthStart = utcDateTimeStart.Month;
        int monthEnd = utcDateTimeEnd.Month;

        int currentYear = yearStart;
        int currentMonth = monthStart;

        do
        {
            collections.Add($"items_history_{id.ToString()}_{currentYear:D4}{currentMonth:D2}");

            if (currentYear == yearEnd && currentMonth == monthEnd)
            {
                break;
            }

            if (currentMonth == 12)
            {
                currentYear++;
                currentMonth = 1;
            }
            else
            {
                currentMonth++;
            }
        } while (true);

        return collections;
    }
}