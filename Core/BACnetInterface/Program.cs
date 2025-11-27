using BACnetInterface;
using Contracts;
using MassTransit;

Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) =>
    {
        
        // configure the endpoints for mass transit

        EndpointConvention.Map<ReadValuesMessage>(new Uri("queue:core-read-values"));

        services.AddMassTransit(x =>
        {
            x.UsingRabbitMq((context2, cfg) =>
            {
                cfg.Host("localhost", "/", h =>
                {
                    h.Username("pupli");
                    h.Password("7eAZvkUhviQ7ZKLSzJru");
                });
                cfg.ConfigureEndpoints(context2);
            });
        });
        
        services.AddHostedService<Worker>();
    })
    .Build()
    .Run();