/**
 * SignalR Client Service
 * Manages SignalR connection for real-time monitoring updates
 */

import * as signalR from '@microsoft/signalr';
import { authStorageHelpers } from '../utils/authStorage';
import { createLogger } from '../utils/logger';

const logger = createLogger('SignalRClient');

// Base URL for the SignalR server - matches the backend API
const SIGNALR_BASE_URL = 'https://localhost:7136';
const HUB_PATH = '/hubs/monitoring';

/**
 * Active alarms update message from SignalR hub
 */
export interface ActiveAlarmsUpdate {
  alarmCount: number;
  timestamp: number;
}

/**
 * SignalR connection manager
 */
class SignalRConnectionManager {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff

  /**
   * Create a new SignalR connection with authentication
   */
  createConnection(): signalR.HubConnection {
    logger.log('Creating SignalR connection...', { url: `${SIGNALR_BASE_URL}${HUB_PATH}` });

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_BASE_URL}${HUB_PATH}`, {
        accessTokenFactory: () => {
          const token = authStorageHelpers.getStoredTokenSync();
          if (token) {
            logger.log('SignalR request with token:', { hasToken: true });
          } else {
            logger.warn('SignalR request WITHOUT token - auth may not be initialized yet!');
          }
          return token || '';
        },
        // Add headers for debugging
        headers: {
          'X-SignalR-Client': 'monitoring-ui',
        },
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Custom reconnection logic with exponential backoff
          const delay = this.reconnectDelays[Math.min(retryContext.previousRetryCount, this.reconnectDelays.length - 1)];
          logger.log('SignalR automatic reconnect', {
            attempt: retryContext.previousRetryCount + 1,
            delayMs: delay,
          });
          return delay;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection lifecycle events
    connection.onclose((error) => {
      if (error) {
        logger.error('SignalR connection closed with error:', error);
      } else {
        logger.log('SignalR connection closed gracefully');
      }
    });

    connection.onreconnecting((error) => {
      logger.warn('SignalR connection lost, attempting to reconnect...', { error });
    });

    connection.onreconnected((connectionId) => {
      logger.log('SignalR reconnected successfully', { connectionId });
      this.reconnectAttempts = 0;
    });

    this.connection = connection;
    return connection;
  }

  /**
   * Get the current connection or create a new one
   */
  getConnection(): signalR.HubConnection {
    if (!this.connection) {
      return this.createConnection();
    }
    return this.connection;
  }

  /**
   * Start the SignalR connection
   */
  async start(): Promise<void> {
    const connection = this.getConnection();

    if (connection.state === signalR.HubConnectionState.Connected) {
      logger.log('SignalR already connected');
      return;
    }

    if (connection.state === signalR.HubConnectionState.Connecting) {
      logger.log('SignalR connection already in progress');
      return;
    }

    try {
      logger.log('Starting SignalR connection...');
      await connection.start();
      logger.log('SignalR connected successfully', {
        connectionId: connection.connectionId,
        state: connection.state,
      });
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Failed to start SignalR connection:', error);
      throw error;
    }
  }

  /**
   * Stop the SignalR connection
   */
  async stop(): Promise<void> {
    if (!this.connection) {
      logger.log('No SignalR connection to stop');
      return;
    }

    try {
      logger.log('Stopping SignalR connection...');
      await this.connection.stop();
      logger.log('SignalR connection stopped');
      this.connection = null;
    } catch (error) {
      logger.error('Error stopping SignalR connection:', error);
      throw error;
    }
  }

  /**
   * Get the current connection state
   */
  getState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  /**
   * Subscribe to active alarms updates
   */
  onActiveAlarmsUpdate(callback: (update: ActiveAlarmsUpdate) => void): void {
    const connection = this.getConnection();
    
    connection.on('ReceiveActiveAlarmsUpdate', (data: ActiveAlarmsUpdate) => {
      logger.log('Received active alarms update:', data);
      callback(data);
    });
  }

  /**
   * Unsubscribe from active alarms updates
   */
  offActiveAlarmsUpdate(): void {
    if (this.connection) {
      this.connection.off('ReceiveActiveAlarmsUpdate');
      logger.log('Unsubscribed from active alarms updates');
    }
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    logger.log('Manual reconnection requested');
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    
    try {
      await this.stop();
      await this.start();
      logger.log('Manual reconnection successful');
    } catch (error) {
      logger.error('Manual reconnection failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const signalRManager = new SignalRConnectionManager();
