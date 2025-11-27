using MongoDB.Bson;

namespace Core.Libs;

public static class DateTimeExtensions
{
    public static long ToUnixTimeSeconds(this DateTime dateTime)
    {
        return ((DateTimeOffset)dateTime).ToUnixTimeSeconds();
    }
}

public static class ObjectIdExtensions
{
    public static Guid ToGuid(this ObjectId objectId)
    {
        var bytes = objectId.ToByteArray();
        Array.Resize(ref bytes, 16); // Ensure the byte array is 16 bytes long
        return new Guid(bytes);
    }
}