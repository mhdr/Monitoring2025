using Newtonsoft.Json;

namespace ModbusInterface;

public static class MyLog
{
    public static void LogJson(string name, object? obj)
    {
        if (obj != null)
        {
            var json = JsonConvert.SerializeObject(obj, Formatting.Indented);
            var output = $"{name}: {json}";
            Console.WriteLine(output);
        }
    }

    public static void LogJson(object? obj)
    {
        if (obj != null)
        {
            var json = JsonConvert.SerializeObject(obj, Formatting.Indented);
            Console.WriteLine(json);
        }
    }

    public static void Log(string msg)
    {
        Console.WriteLine(msg);
    }
    
}