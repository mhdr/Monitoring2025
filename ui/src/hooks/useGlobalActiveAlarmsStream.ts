/**
 * useGlobalActiveAlarmsStream Hook
 * Manages a global gRPC subscription to active alarms that persists across the app
 * Automatically updates Redux store with real-time alarm count data
 * Should be mounted once at the app level for authenticated users
 */

import { useEffect, useRef, useCallback } from 'react';
import { create } from '@bufbuild/protobuf';
import { ConnectError } from '@connectrpc/connect';
import { monitoringClient } from '../services/grpcClient';
import { ActiveAlarmsRequestSchema } from '../gen/monitoring_pb';
import { useAppDispatch } from './useRedux';
import { 
  updateActiveAlarms, 
  setActiveAlarmsStreamStatus, 
  setActiveAlarmsStreamError,
  StreamStatus 
} from '../store/slices/monitoringSlice';

/**
 * Hook return type for manual control
 */
export interface UseGlobalActiveAlarmsStreamResult {
  /** Manually reconnect the stream */
  reconnect: () => void;
  /** Manually disconnect the stream */
  disconnect: () => void;
}

/**
 * Custom hook to manage a global active alarms subscription
 * This hook should be used once at the app level (e.g., in App component or AuthContext)
 * to maintain a persistent connection to the active alarms stream
 * 
 * @param isAuthenticated - Whether the user is authenticated (stream only runs when true)
 * @param clientId - Unique client identifier for the stream (default: 'web-client-global')
 * @returns Control functions for manual reconnection/disconnection
 * 
 * @example
 * ```tsx
 * // In App component or AuthContext
 * function App() {
 *   const { isAuthenticated } = useAuth();
 *   const { reconnect } = useGlobalActiveAlarmsStream(isAuthenticated);
 *   
 *   // Stream automatically starts when authenticated
 *   // Access data anywhere in the app with:
 *   // const { alarmCount, lastUpdate } = useSelector(state => state.monitoring.activeAlarms);
 * }
 * ```
 */
export function useGlobalActiveAlarmsStream(
  isAuthenticated: boolean,
  clientId: string = 'web-client-global'
): UseGlobalActiveAlarmsStreamResult {
  const dispatch = useAppDispatch();
  
  // Use ref to store the abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Establishes the gRPC streaming connection
   */
  const connect = useCallback(async () => {
    // Only connect if authenticated
    if (!isAuthenticated) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // Disconnect any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = true;
    dispatch(setActiveAlarmsStreamStatus(StreamStatus.CONNECTING));

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

      dispatch(setActiveAlarmsStreamStatus(StreamStatus.CONNECTED));
      isConnectingRef.current = false;

      // Iterate over the async stream
      for await (const update of stream) {
        // Check if we've been aborted
        if (abortController.signal.aborted) {
          break;
        }

        // Update Redux store with the new data
        dispatch(updateActiveAlarms({
          alarmCount: update.alarmCount,
          timestamp: Number(update.timestamp),
        }));
      }

      // Stream ended normally
      if (!abortController.signal.aborted) {
        dispatch(setActiveAlarmsStreamStatus(StreamStatus.DISCONNECTED));
        // Auto-reconnect after stream ends (server might have closed connection)
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000); // Retry after 5 seconds
        }
      }

    } catch (err) {
      // Only handle error if not aborted
      if (!abortController.signal.aborted) {
        isConnectingRef.current = false;

        let errorMessage = 'Unknown error occurred';
        
        if (err instanceof ConnectError) {
          errorMessage = `gRPC Error: ${err.message} (Code: ${err.code})`;
        } else if (err instanceof Error) {
          errorMessage = `Connection Error: ${err.message}`;
        }

        dispatch(setActiveAlarmsStreamError(errorMessage));
        console.error('Global active alarms stream error:', err);

        // Auto-reconnect on error with exponential backoff
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 10000); // Retry after 10 seconds on error
        }
      }
    }
  }, [isAuthenticated, clientId, dispatch]);

  /**
   * Disconnects the current stream
   */
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any pending reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    dispatch(setActiveAlarmsStreamStatus(StreamStatus.DISCONNECTED));
  }, [dispatch]);

  /**
   * Manually reconnect the stream
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100); // Small delay to ensure clean disconnect
  }, [connect, disconnect]);

  // Auto-connect when authenticated, auto-disconnect when not authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  return {
    reconnect,
    disconnect,
  };
}
