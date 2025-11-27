using CoreService;

Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) =>
    {
        services.AddHostedService<Worker>();
        services.AddHostedService<StartupWorker>();
    })
    .Build()
    .Run();