/**
 * Custom hook to check if a group (folder) or any of its descendants have active alarms
 * Recursively checks all subgroups and items within the group hierarchy
 * Returns counts of unique items in alarm (priority 2) and warning (priority 1) states
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMonitoring } from './useMonitoring';
import { getActiveAlarms } from '../services/monitoringApi';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import { StreamStatus } from '../stores/monitoringStore';
import type { Group, Item, ActiveAlarm, AlarmDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGroupAlarmStatus');

interface GroupAlarmStatus {
  /**
   * Number of unique items with active alarms (priority 2)
   */
  alarmCount: number;
  
  /**
   * Number of unique items with active warnings (priority 1)
   */
  warningCount: number;
  
  /**
   * Total number of unique items with any active alarm or warning
   */
  totalAffectedItems: number;
  
  /**
   * Whether the group or any descendant has active alarms
   */
  hasAlarms: boolean;
  
  /**
   * Whether the group or any descendant has active warnings
   */
  hasWarnings: boolean;
  
  /**
   * Whether data is being loaded
   */
  isLoading: boolean;
}

/**
 * Hook to get alarm/warning status for a group and all its descendants
 * 
 * @param groupId - The ID of the group to check
 * @returns GroupAlarmStatus object with alarm and warning counts
 * 
 * @example
 * const { alarmCount, warningCount, totalAffectedItems } = useGroupAlarmStatus(groupId);
 */
export function useGroupAlarmStatus(groupId: string): GroupAlarmStatus {
  const { state } = useMonitoring();
  const { groups, items, alarms, alarmRefreshTrigger, activeAlarms: { streamStatus } } = state;
  
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch active alarms function
  const fetchActiveAlarms = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get items from Zustand store to build the request
      const storedItems = await monitoringStorageHelpers.getStoredItems();
      
      if (!storedItems || storedItems.length === 0) {
        logger.warn('No items in Zustand store, cannot fetch active alarms');
        setActiveAlarms([]);
        return;
      }

      // Extract all itemIds for API call
      const itemIds = storedItems
        .map(item => item.id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (itemIds.length === 0) {
        logger.warn('No valid itemIds found');
        setActiveAlarms([]);
        return;
      }

      // Fetch active alarms from API
      const response = await getActiveAlarms({ itemIds });
      
      // Handle nested response structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeAlarmsData: ActiveAlarm[] = (response as any).data?.data || [];
      
      logger.log(`Fetched ${activeAlarmsData.length} active alarms for group alarm status`);
      setActiveAlarms(activeAlarmsData);
    } catch (err) {
      logger.error('Error fetching active alarms for group status:', err);
      setActiveAlarms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch active alarms when component mounts or when dependencies change
  useEffect(() => {
    fetchActiveAlarms();
  }, [groupId, fetchActiveAlarms]); // Refetch when groupId changes

  // Listen to SignalR alarm refresh trigger for real-time updates
  useEffect(() => {
    if (alarmRefreshTrigger > 0) {
      logger.log(`Group alarm refresh triggered via SignalR for group ${groupId}`, { 
        trigger: alarmRefreshTrigger 
      });
      fetchActiveAlarms();
    }
  }, [alarmRefreshTrigger, fetchActiveAlarms, groupId]);

  // Add periodic polling based on SignalR connection status
  useEffect(() => {
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    // Determine polling interval based on SignalR status
    let interval: number;
    if (streamStatus === StreamStatus.CONNECTED) {
      // SignalR is connected - poll every 1 minute
      interval = 60000; // 1 minute
    } else {
      // SignalR is not connected - poll every 30 seconds as fallback
      interval = 30000; // 30 seconds
    }

    logger.log(`Starting group alarm status polling for group ${groupId}`, { 
      interval,
      signalRStatus: streamStatus,
      reason: streamStatus === StreamStatus.CONNECTED ? 'SignalR connected (1min)' : 'SignalR disconnected (fallback)'
    });

    pollingInterval = setInterval(() => {
      fetchActiveAlarms();
    }, interval);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [streamStatus, fetchActiveAlarms, groupId]);

  const status = useMemo(() => {
    // Default status
    const defaultStatus: GroupAlarmStatus = {
      alarmCount: 0,
      warningCount: 0,
      totalAffectedItems: 0,
      hasAlarms: false,
      hasWarnings: false,
      isLoading,
    };

    if (!groups || !items || !alarms || activeAlarms.length === 0) {
      return { ...defaultStatus, isLoading };
    }

    logger.log(`Calculating alarm status for group: ${groupId}`, {
      totalGroups: groups.length,
      totalItems: items.length,
      totalActiveAlarms: activeAlarms.length,
      totalAlarmConfigs: alarms.length,
    });

    // Get all descendant group IDs (including the group itself)
    const getDescendantGroupIds = (gId: string): string[] => {
      const descendants: string[] = [gId];
      const children = groups.filter((g: Group) => g.parentId === gId);
      
      children.forEach((child: Group) => {
        descendants.push(...getDescendantGroupIds(child.id));
      });
      
      return descendants;
    };

    const descendantGroupIds = getDescendantGroupIds(groupId);
    logger.log(`Found ${descendantGroupIds.length} descendant groups for ${groupId}`);

    // Get all items in descendant groups
    const descendantItems = items.filter((item: Item) => 
      item.groupId && descendantGroupIds.includes(item.groupId)
    );
    logger.log(`Found ${descendantItems.length} items in descendant groups`);

    if (descendantItems.length === 0) {
      return { ...defaultStatus, isLoading };
    }

    // Create a map of alarmId -> alarmPriority for quick lookup
    const alarmPriorityMap = new Map<string, 1 | 2>();
    
    // Handle nested alarm structure: {data: AlarmDto[]} or AlarmDto[]
    let alarmsArray: AlarmDto[] = [];
    if (Array.isArray(alarms)) {
      alarmsArray = alarms;
    } else if (typeof alarms === 'object' && 'data' in alarms) {
      const alarmsResponse = alarms as { data: AlarmDto[] };
      if (Array.isArray(alarmsResponse.data)) {
        alarmsArray = alarmsResponse.data;
      }
    }

    alarmsArray.forEach((alarm: AlarmDto) => {
      if (alarm.id && alarm.alarmPriority) {
        alarmPriorityMap.set(alarm.id, alarm.alarmPriority);
      }
    });

    logger.log(`Built alarm priority map with ${alarmPriorityMap.size} entries`);

    // Create a map to track unique items with alarms/warnings
    const itemsWithAlarms = new Set<string>(); // Items with priority 2 (Alarm)
    const itemsWithWarnings = new Set<string>(); // Items with priority 1 (Warning)

    // Check each active alarm
    activeAlarms.forEach((activeAlarm: ActiveAlarm) => {
      const itemId = activeAlarm.itemId;
      const alarmId = activeAlarm.alarmId;

      // Check if this alarm belongs to one of our descendant items
      if (!itemId || !alarmId) return;
      
      const item = descendantItems.find((i: Item) => i.id === itemId);
      if (!item) return;

      // Look up the alarm priority
      const priority = alarmPriorityMap.get(alarmId);
      if (!priority) {
        logger.warn(`Could not find priority for alarm ${alarmId}`);
        return;
      }

      // Track the item based on priority
      if (priority === 2) {
        itemsWithAlarms.add(itemId);
        logger.log(`Item ${itemId} has alarm (priority 2)`);
      } else if (priority === 1) {
        itemsWithWarnings.add(itemId);
        logger.log(`Item ${itemId} has warning (priority 1)`);
      }
    });

    // Calculate unique affected items (an item can have both alarm and warning, but count once)
    const allAffectedItems = new Set([...itemsWithAlarms, ...itemsWithWarnings]);

    const result: GroupAlarmStatus = {
      alarmCount: itemsWithAlarms.size,
      warningCount: itemsWithWarnings.size,
      totalAffectedItems: allAffectedItems.size,
      hasAlarms: itemsWithAlarms.size > 0,
      hasWarnings: itemsWithWarnings.size > 0,
      isLoading,
    };

    logger.log(`Alarm status for group ${groupId}:`, result);

    return result;
  }, [groupId, groups, items, alarms, activeAlarms, isLoading]);

  return status;
}
