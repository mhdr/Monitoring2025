using JobsService;

Host.CreateDefaultBuilder(args)
    .UseSystemd()
    .ConfigureServices((context, services) => { services.AddHostedService<Worker>(); })
    .Build()
    .Run();