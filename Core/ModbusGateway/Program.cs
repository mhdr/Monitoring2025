using Contracts;
using MassTransit;
using ModbusGateway;

Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) =>
    {
        // Register GatewayManager as singleton
        services.AddSingleton<GatewayManager>();

        // Configure MassTransit with RabbitMQ
        services.AddMassTransit(x =>
        {
            // Register the consumer for config changes
            x.AddConsumer<GatewayConfigChangedConsumer>();

            x.UsingRabbitMq((ctx, cfg) =>
            {
                cfg.Host("localhost", "/", h =>
                {
                    h.Username("pupli");
                    h.Password("7eAZvkUhviQ7ZKLSzJru");
                });

                // Configure endpoint for gateway config changes
                cfg.ReceiveEndpoint("modbus-gateway-config", e =>
                {
                    e.ConfigureConsumer<GatewayConfigChangedConsumer>(ctx);
                });

                cfg.ConfigureEndpoints(ctx);
            });
        });

        // Register the worker service
        services.AddHostedService<Worker>();
    })
    .Build()
    .Run();
