import { useState, useEffect, useCallback } from 'react';
import { signalRManager } from '../services/signalrClient';
import type { GatewayStatusUpdate } from '../types/api';
import { createLogger } from '../utils/logger';
import * as signalR from '@microsoft/signalr';

const logger = createLogger('useGatewayStatus');

/**
 * Gateway status state indexed by gateway ID
 */
export interface GatewayStatusState {
  [gatewayId: string]: GatewayStatusUpdate;
}

/**
 * Hook return type
 */
export interface UseGatewayStatusReturn {
  /** Current status for all gateways */
  gatewayStatuses: GatewayStatusState;
  /** Whether SignalR is connected */
  isConnected: boolean;
  /** Get status for a specific gateway */
  getGatewayStatus: (gatewayId: string) => GatewayStatusUpdate | undefined;
  /** Clear all cached statuses */
  clearStatuses: () => void;
}

/**
 * Hook to subscribe to real-time gateway status updates via SignalR
 * 
 * @returns Object containing gateway statuses and connection state
 * 
 * @example
 * const { gatewayStatuses, isConnected, getGatewayStatus } = useGatewayStatus();
 * 
 * // Get status for specific gateway
 * const status = getGatewayStatus('gateway-id');
 * if (status) {
 *   console.log(`Connected clients: ${status.connectedClients}`);
 * }
 */
export const useGatewayStatus = (): UseGatewayStatusReturn => {
  const [gatewayStatuses, setGatewayStatuses] = useState<GatewayStatusState>({});
  const [isConnected, setIsConnected] = useState(false);

  // Handle incoming status updates
  const handleStatusUpdate = useCallback((update: GatewayStatusUpdate) => {
    logger.log('Processing gateway status update', { 
      gatewayId: update.gatewayId, 
      connectedClients: update.connectedClients 
    });
    
    setGatewayStatuses(prev => ({
      ...prev,
      [update.gatewayId]: update,
    }));
  }, []);

  // Get status for a specific gateway
  const getGatewayStatus = useCallback((gatewayId: string): GatewayStatusUpdate | undefined => {
    return gatewayStatuses[gatewayId];
  }, [gatewayStatuses]);

  // Clear all cached statuses
  const clearStatuses = useCallback(() => {
    setGatewayStatuses({});
  }, []);

  // Subscribe to SignalR updates
  useEffect(() => {
    // Subscribe to gateway status updates
    signalRManager.onGatewayStatusUpdate(handleStatusUpdate);

    // Check initial connection state
    const checkConnection = () => {
      const state = signalRManager.getState();
      setIsConnected(state === signalR.HubConnectionState.Connected);
    };
    
    checkConnection();

    // Poll connection state periodically (since SignalR events are handled internally)
    const connectionCheckInterval = setInterval(checkConnection, 2000);

    logger.log('Subscribed to gateway status updates');

    // Cleanup on unmount
    return () => {
      signalRManager.offGatewayStatusUpdate();
      clearInterval(connectionCheckInterval);
      logger.log('Unsubscribed from gateway status updates');
    };
  }, [handleStatusUpdate]);

  return {
    gatewayStatuses,
    isConnected,
    getGatewayStatus,
    clearStatuses,
  };
};

export default useGatewayStatus;
