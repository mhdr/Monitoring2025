/**
 * useMonitoringStream Hook
 * Manages server-streaming gRPC connection for real-time active alarms updates
 * Handles connection lifecycle, error management, and automatic cleanup
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { create } from '@bufbuild/protobuf';
import { ConnectError } from '@connectrpc/connect';
import { monitoringClient } from '../services/grpcClient';
import { ActiveAlarmsRequestSchema } from '../gen/monitoring_pb';
import { createLogger } from '../utils/logger';

const logger = createLogger('MonitoringStream');

/**
 * Connection states for the gRPC stream
 */
export const StreamStatus = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  DISCONNECTED: 'disconnected'
} as const;

export type StreamStatus = typeof StreamStatus[keyof typeof StreamStatus];

/**
 * Hook return type
 */
export interface UseMonitoringStreamResult {
  /** Current active alarms count */
  alarmCount: number;
  /** Timestamp of the last update (Unix timestamp in milliseconds) */
  lastUpdate: number | null;
  /** Current connection status */
  status: StreamStatus;
  /** Error message if status is ERROR */
  error: string | null;
  /** Manually reconnect the stream */
  reconnect: () => void;
  /** Manually disconnect the stream */
  disconnect: () => void;
}

/**
 * Custom hook to manage the monitoring service stream
 * 
 * @param clientId - Unique client identifier for the stream
 * @param autoConnect - Whether to automatically connect on mount (default: true)
 * @returns Stream state and control functions
 * 
 * @example
 * ```tsx
 * const { alarmCount, status, error, reconnect } = useMonitoringStream('dashboard-client');
 * 
 * if (status === StreamStatus.ERROR) {
 *   return <div>Error: {error} <button onClick={reconnect}>Retry</button></div>;
 * }
 * 
 * return <div>Active Alarms: {alarmCount}</div>;
 * ```
 */
export function useMonitoringStream(
  clientId: string = 'web-client',
  autoConnect: boolean = true
): UseMonitoringStreamResult {
  const [alarmCount, setAlarmCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [status, setStatus] = useState<StreamStatus>(StreamStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  // Use ref to store the abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  /**
   * Establishes the gRPC streaming connection
   */
  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // CRITICAL: Ensure token cache is populated before attempting gRPC connection
    // The grpcClient uses synchronous token access, so we need to ensure the cache is ready
    const { authStorageHelpers } = await import('../utils/authStorage');
    const token = await authStorageHelpers.getStoredToken();
    if (!token) {
      logger.warn('Token not available - cannot establish monitoring stream');
      setStatus(StreamStatus.ERROR);
      setError('Authentication token not available');
      return;
    }

    // Disconnect any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isConnectingRef.current = true;
    setStatus(StreamStatus.CONNECTING);
    setError(null);

    // Create new abort controller for this connection
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Create the request message
      const request = create(ActiveAlarmsRequestSchema, {
        clientId: clientId,
      });

      // Start the server streaming RPC
      const stream = monitoringClient.streamActiveAlarms(
        request,
        { signal: abortController.signal }
      );

      setStatus(StreamStatus.CONNECTED);
      isConnectingRef.current = false;

      // Iterate over the async stream
      for await (const update of stream) {
        // Check if we've been aborted
        if (abortController.signal.aborted) {
          break;
        }

        // Update state with the new data
        setAlarmCount(update.alarmCount);
        setLastUpdate(Number(update.timestamp));
      }

      // Stream ended normally
      if (!abortController.signal.aborted) {
        setStatus(StreamStatus.DISCONNECTED);
      }

    } catch (err) {
      // Only handle error if not aborted
      if (!abortController.signal.aborted) {
        isConnectingRef.current = false;
        setStatus(StreamStatus.ERROR);

        if (err instanceof ConnectError) {
          setError(`gRPC Error: ${err.message} (Code: ${err.code})`);
        } else if (err instanceof Error) {
          setError(`Connection Error: ${err.message}`);
        } else {
          setError('Unknown error occurred');
        }

        logger.error('Monitoring stream error:', err);
      }
    }
  }, [clientId]);

  /**
   * Disconnects the current stream
   */
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isConnectingRef.current = false;
    setStatus(StreamStatus.DISCONNECTED);
  }, []);

  /**
   * Reconnects the stream (disconnect then connect)
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    alarmCount,
    lastUpdate,
    status,
    error,
    reconnect,
    disconnect,
  };
}

