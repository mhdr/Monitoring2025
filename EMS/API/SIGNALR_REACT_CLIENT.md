# SignalR Real-Time Monitoring with React

This guide shows how to connect a React application to the EMS Monitoring API's SignalR hub to receive real-time active alarms updates.

## Overview

The API exposes a SignalR hub at `/hubs/monitoring` that broadcasts active alarm count updates to all connected clients. Authentication is handled via JWT tokens.

## Installation

Install the SignalR client library:

```bash
npm install @microsoft/signalr
```

Or with yarn:

```bash
yarn add @microsoft/signalr
```

## Basic Usage

### 1. Simple Hook Implementation

Create a custom React hook to manage the SignalR connection:

```typescript
// hooks/useMonitoringHub.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

interface ActiveAlarmsUpdate {
  alarmCount: number;
  timestamp: number;
}

interface UseMonitoringHubOptions {
  accessToken: string;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
}

export const useMonitoringHub = ({ 
  accessToken, 
  autoConnect = true,
  onError 
}: UseMonitoringHubOptions) => {
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const connect = useCallback(async () => {
    if (!accessToken) {
      console.error('No access token provided');
      return;
    }

    if (connectionRef.current) {
      console.log('Connection already exists');
      return;
    }

    setIsConnecting(true);

    try {
      // Build the connection with JWT token
      const connection = new signalR.HubConnectionBuilder()
        .withUrl('https://localhost:7136/hubs/monitoring', {
          accessTokenFactory: () => accessToken,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
            return Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Handle connection events
      connection.onclose((error) => {
        console.log('SignalR connection closed', error);
        setIsConnected(false);
        if (error && onError) {
          onError(error);
        }
      });

      connection.onreconnecting((error) => {
        console.log('SignalR reconnecting...', error);
        setIsConnected(false);
      });

      connection.onreconnected((connectionId) => {
        console.log('SignalR reconnected', connectionId);
        setIsConnected(true);
      });

      // Register handler for active alarms updates
      connection.on('ReceiveActiveAlarmsUpdate', (update: ActiveAlarmsUpdate) => {
        console.log('Received active alarms update:', update);
        setAlarmCount(update.alarmCount);
      });

      // Start the connection
      await connection.start();
      console.log('SignalR connected successfully');
      connectionRef.current = connection;
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting to SignalR:', error);
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [accessToken, onError]);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
        console.log('SignalR disconnected');
      } catch (error) {
        console.error('Error disconnecting SignalR:', error);
      } finally {
        connectionRef.current = null;
        setIsConnected(false);
      }
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && accessToken) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, accessToken, connect, disconnect]);

  return {
    alarmCount,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
};
```

### 2. Using the Hook in a Component

```typescript
// components/ActiveAlarmsMonitor.tsx
import React from 'react';
import { useMonitoringHub } from '../hooks/useMonitoringHub';

interface ActiveAlarmsMonitorProps {
  accessToken: string;
}

export const ActiveAlarmsMonitor: React.FC<ActiveAlarmsMonitorProps> = ({ accessToken }) => {
  const { alarmCount, isConnected, isConnecting } = useMonitoringHub({
    accessToken,
    autoConnect: true,
    onError: (error) => {
      console.error('SignalR error:', error);
      // Handle error (show notification, etc.)
    },
  });

  return (
    <div className="alarm-monitor">
      <div className="connection-status">
        {isConnecting && <span className="badge badge-warning">Connecting...</span>}
        {isConnected && <span className="badge badge-success">Connected</span>}
        {!isConnected && !isConnecting && <span className="badge badge-danger">Disconnected</span>}
      </div>
      
      <div className="alarm-count">
        <h2>Active Alarms</h2>
        <div className={`count ${alarmCount > 0 ? 'has-alarms' : ''}`}>
          {alarmCount}
        </div>
      </div>
    </div>
  );
};
```

### 3. Integration with Authentication

If you're using a global auth context or Redux store:

```typescript
// App.tsx or main component
import React from 'react';
import { ActiveAlarmsMonitor } from './components/ActiveAlarmsMonitor';
import { useAuth } from './contexts/AuthContext'; // Your auth context

function App() {
  const { accessToken, isAuthenticated } = useAuth();

  return (
    <div className="App">
      {isAuthenticated && accessToken && (
        <ActiveAlarmsMonitor accessToken={accessToken} />
      )}
      {/* Other components */}
    </div>
  );
}

export default App;
```

## Advanced Usage

### Context Provider Pattern

For global access across your app:

```typescript
// contexts/MonitoringContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useMonitoringHub } from '../hooks/useMonitoringHub';

interface MonitoringContextType {
  alarmCount: number;
  isConnected: boolean;
  isConnecting: boolean;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

interface MonitoringProviderProps {
  accessToken: string;
  children: ReactNode;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ 
  accessToken, 
  children 
}) => {
  const monitoringState = useMonitoringHub({ 
    accessToken,
    autoConnect: true,
  });

  return (
    <MonitoringContext.Provider value={monitoringState}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
```

Then wrap your app:

```typescript
// App.tsx
import { MonitoringProvider } from './contexts/MonitoringContext';

function App() {
  const { accessToken } = useAuth();

  return (
    <MonitoringProvider accessToken={accessToken}>
      {/* Your app components */}
    </MonitoringProvider>
  );
}
```

And use it anywhere:

```typescript
// AnyComponent.tsx
import { useMonitoring } from '../contexts/MonitoringContext';

function AnyComponent() {
  const { alarmCount, isConnected } = useMonitoring();
  
  return (
    <div>
      <span>Alarms: {alarmCount}</span>
    </div>
  );
}
```

## Manual Connection Control

If you need manual control over the connection:

```typescript
// components/ManualMonitor.tsx
import React, { useState } from 'react';
import { useMonitoringHub } from '../hooks/useMonitoringHub';

export const ManualMonitor: React.FC = () => {
  const [token, setToken] = useState('');
  
  const { alarmCount, isConnected, connect, disconnect } = useMonitoringHub({
    accessToken: token,
    autoConnect: false, // Disable auto-connect
  });

  return (
    <div>
      <input 
        type="text" 
        value={token} 
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter JWT token"
      />
      
      {!isConnected ? (
        <button onClick={connect}>Connect</button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}
      
      <div>Active Alarms: {alarmCount}</div>
    </div>
  );
};
```

## Error Handling and Notifications

Example with toast notifications:

```typescript
import { toast } from 'react-toastify'; // or your preferred notification library

const { alarmCount, isConnected } = useMonitoringHub({
  accessToken,
  autoConnect: true,
  onError: (error) => {
    if (error.message.includes('401')) {
      toast.error('Authentication failed. Please log in again.');
    } else if (error.message.includes('network')) {
      toast.warning('Connection lost. Attempting to reconnect...');
    } else {
      toast.error(`Connection error: ${error.message}`);
    }
  },
});
```

## TypeScript Types

For better type safety:

```typescript
// types/monitoring.ts
export interface ActiveAlarmsUpdate {
  alarmCount: number;
  timestamp: number;
}

export interface MonitoringHubConnection {
  alarmCount: number;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
REACT_APP_API_BASE_URL=https://localhost:7136
REACT_APP_SIGNALR_HUB_PATH=/hubs/monitoring
```

Update the hook:

```typescript
const hubUrl = `${process.env.REACT_APP_API_BASE_URL}${process.env.REACT_APP_SIGNALR_HUB_PATH}`;

const connection = new signalR.HubConnectionBuilder()
  .withUrl(hubUrl, {
    accessTokenFactory: () => accessToken,
  })
  // ... rest of config
```

## Troubleshooting

### Connection Issues

1. **401 Unauthorized**: Check that your JWT token is valid and not expired
2. **CORS errors**: Ensure the API CORS policy includes your React app's origin
3. **WebSocket connection failed**: Check if the server supports WebSockets, fallback to LongPolling:

```typescript
.withUrl(hubUrl, {
  accessTokenFactory: () => accessToken,
  transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
})
```

### Development SSL Certificate Issues

If using self-signed certificates in development, you may need to:

1. Trust the certificate in your browser
2. Or use `skipNegotiation` for development (NOT for production):

```typescript
.withUrl(hubUrl, {
  accessTokenFactory: () => accessToken,
  skipNegotiation: true, // DEVELOPMENT ONLY
  transport: signalR.HttpTransportType.WebSockets,
})
```

### Debugging

Enable detailed logging:

```typescript
.configureLogging(signalR.LogLevel.Debug) // Or LogLevel.Trace for more detail
```

Check the browser console for connection events and errors.

## Best Practices

1. **Token Refresh**: Implement token refresh logic and reconnect with new token:

```typescript
useEffect(() => {
  if (connectionRef.current && isConnected) {
    // Disconnect and reconnect with new token when it changes
    disconnect().then(() => connect());
  }
}, [accessToken]);
```

2. **Cleanup**: Always disconnect when component unmounts (handled in the hook)

3. **Error Boundaries**: Wrap components using SignalR in error boundaries

4. **Retry Logic**: Use automatic reconnect with exponential backoff (shown in hook)

5. **Connection State Management**: Display connection status to users

6. **Performance**: Don't create multiple connections - use context or global state

## API Endpoint

- **Hub URL**: `https://localhost:7136/hubs/monitoring` (development)
- **Authentication**: JWT token via `accessTokenFactory` or query string
- **Method**: `ReceiveActiveAlarmsUpdate`
- **Payload**: `{ alarmCount: number, timestamp: number }`

## Security Notes

- JWT tokens are passed via the `accessTokenFactory` function (preferred for WebSockets)
- Tokens can also be passed via query string (fallback for older browsers)
- Always use HTTPS in production
- Never expose tokens in logs or error messages
- Implement proper token expiration and refresh logic

## Example Project Structure

```
src/
├── hooks/
│   └── useMonitoringHub.ts
├── contexts/
│   └── MonitoringContext.tsx
├── components/
│   └── ActiveAlarmsMonitor.tsx
├── types/
│   └── monitoring.ts
└── App.tsx
```

## Complete Example

See the hook implementation above for a complete, production-ready example with:
- Automatic reconnection with exponential backoff
- Connection state management
- Error handling
- TypeScript type safety
- Clean component unmounting
- Logging

## Support

For issues or questions, refer to:
- [SignalR JavaScript Client Documentation](https://learn.microsoft.com/aspnet/core/signalr/javascript-client)
- API Documentation: `https://localhost:7136/swagger`
