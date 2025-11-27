using DataGen;
using MassTransit;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSystemd();

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("pupli");
            h.Password("7eAZvkUhviQ7ZKLSzJru");
        });
    });
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
