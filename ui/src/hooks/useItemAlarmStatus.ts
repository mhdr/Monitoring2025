/**
 * Custom hook to check if an item has active alarms
 * Fetches active alarms from API and checks if itemId is in the list
 * Automatically re-checks on data fetch events
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getActiveAlarms } from '../services/monitoringApi';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import { useMonitoring } from './useMonitoring';
import { StreamStatus } from '../contexts/MonitoringContext';
import type { ActiveAlarm, AlarmDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('useItemAlarmStatus');

interface UseItemAlarmStatusOptions {
  /**
   * Item ID to check for active alarms
   */
  itemId: string;
  
  /**
   * Whether to enable automatic polling (default: false)
   */
  enablePolling?: boolean;
  
  /**
   * Polling interval in milliseconds (default: 30000 = 30 seconds)
   */
  pollingInterval?: number;
}

interface ItemAlarmStatus {
  /**
   * Whether the item has an active alarm
   */
  hasAlarm: boolean;
  
  /**
   * Alarm priority if alarm exists (1=Warning, 2=Alarm)
   */
  alarmPriority: 1 | 2 | null;
  
  /**
   * Whether the check is in progress
   */
  isChecking: boolean;
  
  /**
   * Error message if check failed
   */
  error: string | null;
  
  /**
   * Manually trigger a re-check
   */
  refresh: () => Promise<void>;
}

/**
 * Hook to check if an item has active alarms
 * 
 * @param options - Configuration options
 * @returns ItemAlarmStatus object with alarm state and refresh function
 * 
 * @example
 * const { hasAlarm, alarmPriority, isChecking, refresh } = useItemAlarmStatus({ 
 *   itemId: 'item-123',
 *   enablePolling: true,
 *   pollingInterval: 30000
 * });
 */
export function useItemAlarmStatus(options: UseItemAlarmStatusOptions): ItemAlarmStatus {
  const { itemId, enablePolling = false, pollingInterval = 30000 } = options;
  
  const [hasAlarm, setHasAlarm] = useState<boolean>(false);
  const [alarmPriority, setAlarmPriority] = useState<1 | 2 | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Get monitoring context for SignalR status and refresh trigger
  const { state } = useMonitoring();
  const { alarmRefreshTrigger, activeAlarms: { streamStatus } } = state;

  /**
   * Check if item has active alarms
   */
  const checkAlarmStatus = useCallback(async () => {
    if (!itemId || !isMountedRef.current) {
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      logger.log(`Checking alarm status for item: ${itemId}`);

      // Get items from IndexedDB to build the request
      const storedItems = await monitoringStorageHelpers.getStoredItems();
      
      if (!storedItems || storedItems.length === 0) {
        logger.warn('No items in IndexedDB, cannot check alarm status');
        setHasAlarm(false);
        setAlarmPriority(null);
        return;
      }

      // Extract all itemIds for API call
      const itemIds = storedItems
        .map(item => item.id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (itemIds.length === 0) {
        logger.warn('No valid itemIds found');
        setHasAlarm(false);
        setAlarmPriority(null);
        return;
      }

      // Fetch active alarms from API
      const response = await getActiveAlarms({ itemIds });
      
      // Handle nested response structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeAlarms: ActiveAlarm[] = (response as any).data?.data || [];
      
      logger.log(`Fetched ${activeAlarms.length} active alarms`);

      // Check if our itemId is in the active alarms
      const itemAlarm = activeAlarms.find(alarm => alarm.itemId === itemId);
      
      if (!isMountedRef.current) return;

      if (itemAlarm) {
        // ActiveAlarm response doesn't include alarmPriority
        // We need to fetch it from the alarm configuration stored in IndexedDB
        const storedAlarms = await monitoringStorageHelpers.getStoredAlarms();
        
        // Handle the nested structure: {data: AlarmDto[]} or AlarmDto[]
        let alarmsArray: AlarmDto[] = [];
        if (storedAlarms) {
          if (Array.isArray(storedAlarms)) {
            alarmsArray = storedAlarms;
          } else if (typeof storedAlarms === 'object' && 'data' in storedAlarms) {
            const alarmsResponse = storedAlarms as { data: AlarmDto[] };
            if (Array.isArray(alarmsResponse.data)) {
              alarmsArray = alarmsResponse.data;
            }
          }
        }
        
        // Find the alarm configuration by alarmId
        const alarmConfig = alarmsArray.find((alarm: AlarmDto) => alarm.id === itemAlarm.alarmId);
        const priority = alarmConfig?.alarmPriority || null;
        
        logger.log(`Item ${itemId} HAS active alarm`, { 
          alarmId: itemAlarm.alarmId,
          priority: priority,
          foundConfig: !!alarmConfig
        });
        setHasAlarm(true);
        setAlarmPriority(priority);
      } else {
        logger.log(`Item ${itemId} has NO active alarm`);
        setHasAlarm(false);
        setAlarmPriority(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to check alarm status';
      logger.error(`Error checking alarm status for item ${itemId}:`, err);
      setError(errorMessage);
      setHasAlarm(false);
      setAlarmPriority(null);
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [itemId]);

  /**
   * Start polling with adaptive interval based on SignalR connection
   */
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    if (enablePolling) {
      // Use different polling intervals based on SignalR connection status
      let actualInterval: number;
      if (streamStatus === StreamStatus.CONNECTED) {
        // SignalR is connected - poll every 1 minute as requested
        actualInterval = 60000; // 1 minute
      } else {
        // SignalR is not connected - use provided interval (default 30s)
        actualInterval = pollingInterval;
      }

      if (actualInterval > 0) {
        logger.log(`Starting alarm status polling for item ${itemId}`, { 
          interval: actualInterval,
          signalRStatus: streamStatus,
          reason: streamStatus === StreamStatus.CONNECTED ? 'SignalR connected (1min)' : 'SignalR disconnected (fallback)'
        });
        
        pollingTimerRef.current = setInterval(() => {
          checkAlarmStatus();
        }, actualInterval);
      }
    }
  }, [enablePolling, pollingInterval, checkAlarmStatus, itemId, streamStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      logger.log(`Stopping alarm status polling for item ${itemId}`);
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, [itemId]);

  /**
   * Initial check and polling setup
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial check
    checkAlarmStatus();
    
    // Start polling if enabled
    startPolling();
    
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [checkAlarmStatus, startPolling, stopPolling]);

  /**
   * Listen to SignalR alarm refresh trigger for real-time updates
   */
  useEffect(() => {
    if (alarmRefreshTrigger > 0) {
      logger.log(`Alarm refresh triggered via SignalR for item ${itemId}`, { 
        trigger: alarmRefreshTrigger 
      });
      checkAlarmStatus();
    }
  }, [alarmRefreshTrigger, checkAlarmStatus, itemId]);

  /**
   * Refresh polling when options change or SignalR status changes
   */
  useEffect(() => {
    if (enablePolling) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [enablePolling, pollingInterval, streamStatus, startPolling, stopPolling]);

  return {
    hasAlarm,
    alarmPriority,
    isChecking,
    error,
    refresh: checkAlarmStatus,
  };
}
