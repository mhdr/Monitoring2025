# SignalRSwaggerGen Implementation Guide

## Overview

This project uses [SignalRSwaggerGen](https://github.com/essencebit/SignalRSwaggerGen) to automatically generate Swagger/OpenAPI documentation for SignalR hubs. This enables developers to see SignalR hub methods, parameters, and return types directly in the Swagger UI alongside REST API endpoints.

## What Was Implemented

### 1. Hub Decoration with Attributes

The `MonitoringHub` class has been decorated with the `[SignalRHub]` attribute:

```csharp
[SignalRHub(
    path: "/hubs/monitoring",
    autoDiscover: AutoDiscover.MethodsAndParams,
    documentNames: new[] { "v1" },
    tag: "SignalR - Monitoring Hub"
)]
public class MonitoringHub : Hub
```

**Attribute Parameters:**
- `path`: Specifies the hub endpoint path (matches the actual SignalR mapping)
- `autoDiscover`: Automatically discovers methods and parameters without requiring individual attributes
- `documentNames`: Specifies which Swagger document(s) to include this hub in (we use "v1")
- `tag`: The tag name under which hub methods appear in Swagger UI

### 2. Method Documentation

Hub methods are decorated with `[SignalRMethod]` for detailed documentation:

```csharp
[SignalRMethod(
    summary: "Subscribe to active alarms updates",
    description: "Explicitly subscribe to receive real-time active alarm count updates...",
    autoDiscover: AutoDiscover.Params
)]
public async Task SubscribeToActiveAlarms()
```

**Method Attribute Parameters:**
- `summary`: Brief description shown in Swagger UI
- `description`: Detailed explanation of the method's purpose
- `autoDiscover`: Controls whether parameters are auto-discovered

### 3. Program.cs Configuration

Enhanced Swagger configuration with SignalRSwaggerGen options:

```csharp
c.AddSignalRSwaggerGen(ssgOptions =>
{
    // Scan the API assembly for SignalR hubs
    ssgOptions.ScanAssembly(System.Reflection.Assembly.GetExecutingAssembly());
    
    // Use XML comments for SignalR hub documentation
    ssgOptions.UseXmlComments(xmlPath);
    
    // Display SignalR hubs in the v1 document
    ssgOptions.DisplayInDocument("v1");
    
    // Use hub XML comments summary as tag
    ssgOptions.UseHubXmlCommentsSummaryAsTag = true;
    
    // Configure the hub path template (fallback)
    ssgOptions.HubPathFunc = hubName => $"/hubs/{hubName.ToLowerInvariant()}";
});
```

**Configuration Options:**
- `ScanAssembly`: Tells SignalRSwaggerGen which assembly to scan for hubs
- `UseXmlComments`: Enables XML documentation comments for richer documentation
- `DisplayInDocument`: Specifies which Swagger document the hubs appear in
- `UseHubXmlCommentsSummaryAsTag`: Uses XML summary as the Swagger tag
- `HubPathFunc`: Fallback function for generating hub paths (when not specified in attribute)

## Available Attributes

### SignalRHub Attribute

Applied to hub classes to enable Swagger documentation:

```csharp
[SignalRHub(
    path: "/hubs/myhub",                    // Hub URL path
    autoDiscover: AutoDiscover.MethodsAndParams, // Auto-discovery level
    documentNames: new[] { "v1" },          // Swagger documents to include
    tag: "My Hub",                          // Swagger UI tag name
    xmlCommentsDisabled: false              // Enable/disable XML comments
)]
```

**AutoDiscover Options:**
- `AutoDiscover.None`: Only explicitly attributed methods
- `AutoDiscover.Methods`: All public methods
- `AutoDiscover.Params`: Only explicitly attributed parameters
- `AutoDiscover.MethodsAndParams`: All methods and parameters (recommended)

### SignalRMethod Attribute

Applied to hub methods for detailed documentation:

```csharp
[SignalRMethod(
    name: "MethodName",                     // Method name (default: actual method name)
    summary: "Method summary",              // Brief description
    description: "Detailed description",    // Full explanation
    autoDiscover: AutoDiscover.Inherit      // Parameter discovery behavior
)]
```

### SignalRParam Attribute

Applied to method parameters for custom documentation:

```csharp
public async Task MyMethod(
    [SignalRParam(description: "User ID")] string userId,
    [SignalRParam(description: "Message content")] string message
)
```

### SignalRHidden Attribute

Hides specific components from Swagger documentation:

```csharp
[SignalRHidden]
public async Task InternalMethod()

public async Task MyMethod(
    [SignalRHidden] CancellationToken cancellationToken
)
```

### SignalRReturn Attribute

Documents return types:

```csharp
[return: SignalRReturn(typeof(Task<MyResponse>), 200, "Success")]
[return: SignalRReturn(typeof(Task), 400, "Bad Request")]
public async Task<MyResponse> GetData()
```

## Viewing in Swagger UI

1. Start the API: `dotnet run`
2. Navigate to: `https://localhost:7136/swagger`
3. Look for the "SignalR - Monitoring Hub" tag in Swagger UI
4. Expand to see available hub methods with full documentation

## Best Practices

### 1. XML Documentation Comments

Always add XML comments to hubs and methods:

```csharp
/// <summary>
/// SignalR hub for real-time monitoring updates.
/// </summary>
[SignalRHub(...)]
public class MonitoringHub : Hub
{
    /// <summary>
    /// Subscribe to active alarms updates.
    /// </summary>
    /// <remarks>
    /// Additional details about the method.
    /// </remarks>
    [SignalRMethod(...)]
    public async Task SubscribeToActiveAlarms()
    {
        // Implementation
    }
}
```

### 2. Use Descriptive Tags

Group related hubs under clear, descriptive tags:

```csharp
tag: "SignalR - Monitoring Hub"  // Good: Clear category
tag: "Monitoring"                 // Less clear: Could be REST or SignalR
```

### 3. Document Path Explicitly

Always specify the hub path explicitly to avoid confusion:

```csharp
[SignalRHub(path: "/hubs/monitoring", ...)]  // Matches actual SignalR mapping
```

### 4. Hide Internal Parameters

Use `[SignalRHidden]` for framework-specific parameters:

```csharp
public async Task SendMessage(
    string message,
    [SignalRHidden] CancellationToken cancellationToken = default
)
```

### 5. Consistent Naming

Use consistent naming between hub path, class name, and Swagger tag:

- Hub Path: `/hubs/monitoring`
- Class: `MonitoringHub`
- Tag: `SignalR - Monitoring Hub`

## Troubleshooting

### Hub Not Appearing in Swagger

**Check:**
1. Hub class has `[SignalRHub]` attribute
2. Assembly is scanned in `AddSignalRSwaggerGen`
3. `documentNames` matches Swagger document name
4. Build is successful (XML file generated)

### Methods Not Appearing

**Check:**
1. Methods are `public`
2. `autoDiscover` is set to include methods
3. Methods are not marked with `[SignalRHidden]`
4. XML documentation file is generated and loaded

### XML Comments Not Showing

**Check:**
1. `GenerateDocumentationFile` is `true` in `.csproj`
2. XML file path is correct in `UseXmlComments`
3. XML comments use proper format (`///`)
4. Build is successful

## Additional Resources

- [SignalRSwaggerGen GitHub](https://github.com/essencebit/SignalRSwaggerGen)
- [SignalRSwaggerGen Wiki](https://github.com/essencebit/SignalRSwaggerGen/wiki)
- [SignalR Documentation](https://docs.microsoft.com/aspnet/core/signalr)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)

## Integration Testing

To test SignalR hub documentation in Swagger:

1. **Build the project:**
   ```bash
   dotnet build
   ```

2. **Run the API:**
   ```bash
   dotnet run
   ```

3. **Open Swagger UI:**
   Navigate to `https://localhost:7136/swagger`

4. **Verify SignalR endpoints:**
   - Look for "SignalR - Monitoring Hub" tag
   - Expand to see `SubscribeToActiveAlarms` method
   - Check parameter documentation
   - Verify XML comments appear

## Future Enhancements

Consider adding:

1. **More Hub Methods:** Document additional client-callable methods
2. **Client Methods:** Document server-to-client methods (using interfaces for strongly-typed hubs)
3. **Custom Types:** Add SignalR-specific DTOs with proper documentation
4. **Return Types:** Specify return types with `[SignalRReturn]` attribute
5. **Request Bodies:** Use `[SignalRRequestBody]` for complex parameters

## Example: Adding a New Hub

```csharp
using Microsoft.AspNetCore.SignalR;
using SignalRSwaggerGen.Attributes;
using SignalRSwaggerGen.Enums;

namespace API.Hubs;

/// <summary>
/// SignalR hub for chat functionality
/// </summary>
[Authorize]
[SignalRHub(
    path: "/hubs/chat",
    autoDiscover: AutoDiscover.MethodsAndParams,
    documentNames: new[] { "v1" },
    tag: "SignalR - Chat Hub"
)]
public class ChatHub : Hub
{
    /// <summary>
    /// Send a message to all connected clients
    /// </summary>
    /// <param name="user">Username of sender</param>
    /// <param name="message">Message content</param>
    [SignalRMethod(
        summary: "Send chat message",
        description: "Broadcasts a message to all connected clients in the chat room"
    )]
    public async Task SendMessage(
        [SignalRParam(description: "Username")] string user,
        [SignalRParam(description: "Message text")] string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}
```

Don't forget to map the hub in `Program.cs`:
```csharp
app.MapHub<ChatHub>("/hubs/chat");
```
