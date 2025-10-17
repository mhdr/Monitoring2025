/**
 * useSignalR Hook
 * React hook for managing SignalR connection lifecycle and state
 */

import { useEffect, useCallback, useRef } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { signalRManager, type ActiveAlarmsUpdate } from '../services/signalrClient';
import { useMonitoring } from './useMonitoring';
import { StreamStatus } from '../contexts/MonitoringContext';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSignalR');

/**
 * Map SignalR connection state to our StreamStatus
 */
function mapConnectionState(state: HubConnectionState): StreamStatus {
  switch (state) {
    case HubConnectionState.Connected:
      return StreamStatus.CONNECTED;
    case HubConnectionState.Connecting:
    case HubConnectionState.Reconnecting:
      return StreamStatus.CONNECTING;
    case HubConnectionState.Disconnected:
      return StreamStatus.DISCONNECTED;
    case HubConnectionState.Disconnecting:
      return StreamStatus.DISCONNECTED;
    default:
      return StreamStatus.IDLE;
  }
}

/**
 * Hook to manage SignalR connection for real-time active alarms
 * Automatically connects when authenticated and disconnects on unmount
 */
export function useSignalR(isAuthenticated: boolean, isAuthLoading: boolean) {
  const {
    updateActiveAlarms,
    setActiveAlarmsStreamStatus,
    setActiveAlarmsStreamError,
  } = useMonitoring();

  const connectionAttemptedRef = useRef(false);
  const isConnectingRef = useRef(false);

  /**
   * Handle active alarms update from SignalR
   */
  const handleActiveAlarmsUpdate = useCallback(
    (update: ActiveAlarmsUpdate) => {
      logger.log('Received active alarms update:', update);
      updateActiveAlarms(update.alarmCount, update.timestamp);
    },
    [updateActiveAlarms]
  );

  /**
   * Connect to SignalR hub
   */
  const connect = useCallback(async () => {
    if (isConnectingRef.current) {
      logger.log('Connection already in progress, skipping...');
      return;
    }

    if (!isAuthenticated) {
      logger.log('Not authenticated, skipping SignalR connection');
      return;
    }

    try {
      isConnectingRef.current = true;
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTING);
      
      logger.log('Connecting to SignalR...');
      
      // Subscribe to active alarms updates before connecting
      signalRManager.onActiveAlarmsUpdate(handleActiveAlarmsUpdate);
      
      // Start the connection
      await signalRManager.start();
      
      // Update status based on actual connection state
      const state = signalRManager.getState();
      setActiveAlarmsStreamStatus(mapConnectionState(state));
      
      logger.log('SignalR connected successfully', { state });
    } catch (error) {
      logger.error('Failed to connect to SignalR:', error);
      setActiveAlarmsStreamStatus(StreamStatus.ERROR);
      setActiveAlarmsStreamError(
        error instanceof Error ? error.message : 'Failed to connect to SignalR'
      );
    } finally {
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, handleActiveAlarmsUpdate, setActiveAlarmsStreamStatus, setActiveAlarmsStreamError]);

  /**
   * Disconnect from SignalR hub
   */
  const disconnect = useCallback(async () => {
    try {
      logger.log('Disconnecting from SignalR...');
      
      // Unsubscribe from updates
      signalRManager.offActiveAlarmsUpdate();
      
      // Stop the connection
      await signalRManager.stop();
      
      setActiveAlarmsStreamStatus(StreamStatus.DISCONNECTED);
      logger.log('SignalR disconnected');
    } catch (error) {
      logger.error('Error disconnecting from SignalR:', error);
    }
  }, [setActiveAlarmsStreamStatus]);

  /**
   * Reconnect to SignalR hub
   */
  const reconnect = useCallback(async () => {
    logger.log('Reconnecting to SignalR...');
    try {
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTING);
      await signalRManager.reconnect();
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTED);
      logger.log('SignalR reconnected successfully');
    } catch (error) {
      logger.error('Failed to reconnect to SignalR:', error);
      setActiveAlarmsStreamStatus(StreamStatus.ERROR);
      setActiveAlarmsStreamError(
        error instanceof Error ? error.message : 'Failed to reconnect to SignalR'
      );
    }
  }, [setActiveAlarmsStreamStatus, setActiveAlarmsStreamError]);

  /**
   * Auto-connect when authenticated
   */
  useEffect(() => {
    // Don't connect if:
    // 1. Auth is still loading
    // 2. Not authenticated
    // 3. Already attempted connection
    if (isAuthLoading || !isAuthenticated || connectionAttemptedRef.current) {
      return;
    }

    logger.log('Auth ready, initiating SignalR connection...', {
      isAuthenticated,
      isAuthLoading,
    });

    connectionAttemptedRef.current = true;
    connect();
  }, [isAuthenticated, isAuthLoading, connect]);

  /**
   * Cleanup on unmount or when authentication changes
   */
  useEffect(() => {
    return () => {
      if (connectionAttemptedRef.current) {
        logger.log('Component unmounting, disconnecting SignalR...');
        disconnect();
        connectionAttemptedRef.current = false;
      }
    };
  }, [disconnect]);

  /**
   * Disconnect when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated && connectionAttemptedRef.current) {
      logger.log('User logged out, disconnecting SignalR...');
      disconnect();
      connectionAttemptedRef.current = false;
    }
  }, [isAuthenticated, disconnect]);

  return {
    connect,
    disconnect,
    reconnect,
  };
}
