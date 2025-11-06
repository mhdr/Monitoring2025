/**
 * Custom hook to check if an item has active alarms
 * 
 * OPTIMIZED: Reads active alarms from centralized Zustand store instead of making individual API calls
 * This eliminates the N+1 query problem where each ItemCard was fetching the same data independently
 */

import { useMemo } from 'react';
import { useMonitoring } from './useMonitoring';
import type { AlarmDto } from '../types/api';
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
 * OPTIMIZED: Reads active alarms from centralized Zustand store (no individual API calls)
 * This eliminates the N+1 query problem
 * 
 * @param options - Configuration options
 * @returns ItemAlarmStatus object with alarm state
 * 
 * @example
 * const { hasAlarm, alarmPriority, alarms } = useItemAlarmStatus({ 
 *   itemId: 'item-123'
 * });
 */
export function useItemAlarmStatus(options: UseItemAlarmStatusOptions): ItemAlarmStatus {
  const { itemId } = options;
  
  // Get monitoring context
  const { state } = useMonitoring();
  
  // Read active alarms from centralized Zustand store (no API call)
  const activeAlarmsList = state.activeAlarms.list;
  const isChecking = state.activeAlarms.isFetching;
  const storedAlarms = state.alarms;

  // Calculate alarm status from store data (memoized)
  const alarmStatus = useMemo(() => {
    logger.log(`Calculating alarm status for item: ${itemId} from Zustand store`);

    // Find ALL active alarms for this itemId (there can be multiple)
    const itemAlarms = activeAlarmsList.filter(alarm => alarm.itemId === itemId);
    
    if (itemAlarms.length > 0) {
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
      
      return {
        hasAlarm: true,
        alarmPriority: highestPriority,
        alarms: alarmDetails,
        isChecking,
        error: null,
        refresh: async () => {
          logger.log('Refresh called - data is automatically updated via Zustand store');
        },
      };
    } else {
      logger.log(`Item ${itemId} has NO active alarm`);
      
      return {
        hasAlarm: false,
        alarmPriority: null,
        alarms: [],
        isChecking,
        error: null,
        refresh: async () => {
          logger.log('Refresh called - data is automatically updated via Zustand store');
        },
      };
    }
  }, [itemId, activeAlarmsList, storedAlarms, isChecking]);

  return alarmStatus;
}
