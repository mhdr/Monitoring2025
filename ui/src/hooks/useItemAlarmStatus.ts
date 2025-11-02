/**
 * Custom hook to check if an item has active alarms
 * CRITICAL: This hook does NOT make continuous API calls - it ONLY refreshes when SignalR triggers an update
 * API calls are centralized in useActiveAlarmPolling and MonitoringContext
 * 
 * This hook checks alarm status when:
 * 1. Component mounts
 * 2. SignalR triggers an alarm refresh (via alarmRefreshTrigger from context)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getActiveAlarms } from '../services/monitoringApi';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import { useMonitoring } from './useMonitoring';
import type { ActiveAlarm, AlarmDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('useItemAlarmStatus');

export interface AlarmDetail {
  /**
   * Unique alarm ID
   */
  alarmId: string;
  
  /**
   * Alarm priority (1=Warning, 2=Alarm)
   */
  priority: 1 | 2;
  
  /**
   * Alarm message in English
   */
  message?: string | null;
  
  /**
   * Alarm message in Persian
   */
  messageFa?: string | null;
  
  /**
   * Unix timestamp when alarm was activated
   */
  activatedAt: number;
  
  /**
   * ISO 8601 formatted date-time string
   */
  dateTime?: string;
}

interface UseItemAlarmStatusOptions {
  /**
   * Item ID to check for active alarms
   */
  itemId: string;
  
  /**
   * DEPRECATED: Polling is no longer supported - alarm updates are pushed via SignalR
   * This parameter is kept for backwards compatibility but has no effect
   */
  enablePolling?: boolean;
  
  /**
   * DEPRECATED: Polling is no longer supported - alarm updates are pushed via SignalR
   * This parameter is kept for backwards compatibility but has no effect
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
   * Array of all active alarms for this item with full details
   */
  alarms: AlarmDetail[];
  
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
 * CRITICAL: This hook does NOT poll or make continuous API calls
 * It checks alarm status ONLY when triggered by SignalR updates
 * 
 * @param options - Configuration options
 * @returns ItemAlarmStatus object with alarm state and refresh function
 * 
 * @example
 * const { hasAlarm, alarmPriority, isChecking, refresh } = useItemAlarmStatus({ 
 *   itemId: 'item-123'
 * });
 */
export function useItemAlarmStatus(options: UseItemAlarmStatusOptions): ItemAlarmStatus {
  const { itemId } = options;
  
  const [hasAlarm, setHasAlarm] = useState<boolean>(false);
  const [alarmPriority, setAlarmPriority] = useState<1 | 2 | null>(null);
  const [alarms, setAlarms] = useState<AlarmDetail[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef<boolean>(true);
  
  // Get monitoring context for alarm refresh trigger (SignalR updates)
  const { state } = useMonitoring();
  const { alarmRefreshTrigger } = state;

  /**
   * Check if item has active alarms
   * CRITICAL: This function makes an API call to fetch the LATEST active alarms
   * It is ONLY called when:
   * 1. Component mounts (initial check)
   * 2. SignalR triggers a refresh (alarmRefreshTrigger changes)
   * 3. User manually calls refresh()
   * 
   * It does NOT poll on an interval - that would cause excessive API calls
   */
  const checkAlarmStatus = useCallback(async () => {
    if (!itemId || !isMountedRef.current) {
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      logger.log(`Checking alarm status for item: ${itemId} (triggered by SignalR or manual refresh)`);

      // Get items from Zustand store to build the request
      const storedItems = await monitoringStorageHelpers.getStoredItems();
      
      if (!storedItems || storedItems.length === 0) {
        logger.warn('No items in Zustand store, cannot check alarm status');
        setHasAlarm(false);
        setAlarmPriority(null);
        setAlarms([]);
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
        setAlarms([]);
        return;
      }

      // Fetch active alarms from API
      const response = await getActiveAlarms({ itemIds });
      
      // Handle nested response structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeAlarms: ActiveAlarm[] = (response as any).data?.data || [];
      
      logger.log(`Fetched ${activeAlarms.length} active alarms from API`);

      // Find ALL active alarms for this itemId (there can be multiple)
      const itemAlarms = activeAlarms.filter(alarm => alarm.itemId === itemId);
      
      if (!isMountedRef.current) return;

      if (itemAlarms.length > 0) {
        // Fetch alarm configurations from Zustand store to get messages and priorities
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
        
        // Build array of alarm details with messages
        const alarmDetails: AlarmDetail[] = itemAlarms
          .map((activeAlarm) => {
            const alarmConfig = alarmsArray.find((alarm: AlarmDto) => alarm.id === activeAlarm.alarmId);
            
            if (!alarmConfig || !activeAlarm.alarmId) {
              return null;
            }
            
            return {
              alarmId: activeAlarm.alarmId,
              priority: alarmConfig.alarmPriority || 1,
              message: alarmConfig.message,
              messageFa: alarmConfig.messageFa,
              activatedAt: activeAlarm.time,
              dateTime: activeAlarm.dateTime,
            } as AlarmDetail;
          })
          .filter((detail): detail is AlarmDetail => detail !== null);
        
        // Determine highest priority (2 = Alarm is higher than 1 = Warning)
        const highestPriority = alarmDetails.reduce<1 | 2>((highest, alarm) => {
          return alarm.priority === 2 ? 2 : highest;
        }, 1);
        
        logger.log(`Item ${itemId} HAS ${alarmDetails.length} active alarm(s)`, { 
          alarmCount: alarmDetails.length,
          highestPriority: highestPriority,
          alarmIds: alarmDetails.map(a => a.alarmId),
        });
        
        setHasAlarm(true);
        setAlarmPriority(highestPriority);
        setAlarms(alarmDetails);
      } else {
        logger.log(`Item ${itemId} has NO active alarm`);
        setHasAlarm(false);
        setAlarmPriority(null);
        setAlarms([]);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to check alarm status';
      logger.error(`Error checking alarm status for item ${itemId}:`, err);
      setError(errorMessage);
      setHasAlarm(false);
      setAlarmPriority(null);
      setAlarms([]);
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [itemId]);

  /**
   * Initial check on mount
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial check when component mounts
    checkAlarmStatus();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [checkAlarmStatus]);

  /**
   * Listen to SignalR alarm refresh trigger for real-time updates
   * CRITICAL: This is the ONLY way alarms are refreshed after initial check
   * No polling - updates are pushed via SignalR
   */
  useEffect(() => {
    if (alarmRefreshTrigger > 0) {
      logger.log(`Alarm refresh triggered via SignalR for item ${itemId}`, { 
        trigger: alarmRefreshTrigger 
      });
      checkAlarmStatus();
    }
  }, [alarmRefreshTrigger, checkAlarmStatus, itemId]);

  return {
    hasAlarm,
    alarmPriority,
    alarms,
    isChecking,
    error,
    refresh: checkAlarmStatus,
  };
}
