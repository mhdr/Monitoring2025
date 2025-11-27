using Contracts;
using Core;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using MassTransit;

namespace RabbitInterface.Consumers;

public class ReadValuesConsumer : IConsumer<ReadValuesMessage>
{
    private readonly ILogger<ReadValuesConsumer> _logger;

    public ReadValuesConsumer(ILogger<ReadValuesConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReadValuesMessage> context)
    {
        try
        {
            var message = context.Message;

            foreach (var value in message.Values)
            {
                try
                {
                    var rawItem = await Points.GetRawItem(value.ItemId.ToString());
                    
                    if (rawItem == null)
                    {
                        rawItem = new RawItemRedis();
                        rawItem.ItemId = value.ItemId;
                        rawItem.Value = value.Value;
                        rawItem.Time = value.Time;
                    }
                    else
                    {
                        rawItem.Value = value.Value;
                        rawItem.Time = value.Time;
                    }
                    
                    await Points.SetRawItem(rawItem);
                    
                    var output =
                        $"PointNumber: {value.ItemId}, Value: {value.Value}, Time: {value.Time}";

                    _logger.LogInformation(output);
                }
                catch (Exception e)
                {
                    MyLog.LogJson(e);
                }
            }
        }
        catch (Exception e)
        {
            _logger.LogError(e.Message);
        }
    }
}