using MassTransit;
using RabbitInterface;
using RabbitInterface.Consumers;

Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) =>
    {
        services.AddMassTransit(x =>
        {
            x.AddConsumer<ReadValuesConsumer>();

            x.UsingRabbitMq((context2, cfg) =>
            {
                cfg.Host("localhost", "/", h =>
                {
                    h.Username("pupli");
                    h.Password("7eAZvkUhviQ7ZKLSzJru");
                });

                cfg.ReceiveEndpoint("core-read-values", e => { e.ConfigureConsumer<ReadValuesConsumer>(context2); });

                //cfg.ConfigureEndpoints(context);
            });
        });

        services.AddHostedService<Worker>();
    })
    .Build()
    .Run();