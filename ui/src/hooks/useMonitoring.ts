/**
 * useMonitoring Hook
 * 
 * Hook for accessing monitoring state and actions.
 * Uses Zustand store instead of React Context.
 */

import { useMonitoringStore, StreamStatus } from '../stores/monitoringStore';
import { useCallback, useState } from 'react';
import {
  getGroups,
  getItems,
  getAlarms,
} from '../services/api';
import { getActiveAlarms, getValues } from '../services/monitoringApi';
import type { MultiValue, ActiveAlarm } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('useMonitoring');

/**
 * Hook for accessing monitoring store
 */
export function useMonitoring() {
  // Local state for values (not persisted - real-time data)
  const [values, setValues] = useState<MultiValue[]>([]);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [valuesError, setValuesError] = useState<{ status?: number; message: string } | null>(null);
  
  // State selectors
  const groups = useMonitoringStore((state) => state.groups);
  const items = useMonitoringStore((state) => state.items);
  const alarms = useMonitoringStore((state) => state.alarms);
  const isDataSynced = useMonitoringStore((state) => state.isDataSynced);
  const lastSyncTime = useMonitoringStore((state) => state.lastSyncTime);
  const activeAlarms = useMonitoringStore((state) => state.activeAlarms);
  const backgroundRefresh = useMonitoringStore((state) => state.backgroundRefresh);
  const alarmRefreshTrigger = useMonitoringStore((state) => state.alarmRefreshTrigger);
  
  // Action selectors
  const setGroups = useMonitoringStore((state) => state.setGroups);
  const setItems = useMonitoringStore((state) => state.setItems);
  const setAlarms = useMonitoringStore((state) => state.setAlarms);
  const setDataSynced = useMonitoringStore((state) => state.setDataSynced);
  const clearDataSyncStatus = useMonitoringStore((state) => state.clearDataSyncStatus);
  const updateActiveAlarms = useMonitoringStore((state) => state.updateActiveAlarms);
  const setActiveAlarmsStreamStatus = useMonitoringStore((state) => state.setActiveAlarmsStreamStatus);
  const setActiveAlarmsStreamError = useMonitoringStore((state) => state.setActiveAlarmsStreamError);
  const setActiveAlarmsFetching = useMonitoringStore((state) => state.setActiveAlarmsFetching);
  const setActiveAlarmsFetchError = useMonitoringStore((state) => state.setActiveAlarmsFetchError);
  const resetActiveAlarmsStream = useMonitoringStore((state) => state.resetActiveAlarmsStream);
  const updateBackgroundRefreshConfig = useMonitoringStore((state) => state.updateBackgroundRefreshConfig);
  const setLastRefreshTime = useMonitoringStore((state) => state.setLastRefreshTime);
  const triggerAlarmRefresh = useMonitoringStore((state) => state.triggerAlarmRefresh);
  const clearAllMonitoringData = useMonitoringStore((state) => state.clearAllMonitoringData);
  
  // Sync groups from API
  const syncGroups = useCallback(async () => {
    try {
      logger.log('Syncing groups from API...');
      const groupsData = await getGroups();
      setGroups(groupsData.groups);
      logger.log('Groups synced successfully:', { count: groupsData.groups.length });
    } catch (error) {
      logger.error('Failed to sync groups:', error);
      throw error;
    }
  }, [setGroups]);
  
  // Sync items from API
  const syncItems = useCallback(async () => {
    try {
      logger.log('Syncing items from API...');
      const itemsData = await getItems();
      setItems(itemsData.items);
      logger.log('Items synced successfully:', { count: itemsData.items.length });
    } catch (error) {
      logger.error('Failed to sync items:', error);
      throw error;
    }
  }, [setItems]);
  
  // Sync alarms from API
  const syncAlarms = useCallback(async () => {
    try {
      logger.log('Syncing alarms from API...');
      const alarmsData = await getAlarms();
      setAlarms(alarmsData.data.data);
      logger.log('Alarms synced successfully:', { count: alarmsData.data.data.length });
    } catch (error) {
      logger.error('Failed to sync alarms:', error);
      throw error;
    }
  }, [setAlarms]);
  
  // Fetch active alarm count
  const fetchActiveAlarmCount = useCallback(async () => {
    try {
      setActiveAlarmsFetching(true);
      const activeAlarmsResponse = await getActiveAlarms();
      
      // FIX: API returns nested structure {data: {data: ActiveAlarm[]}}
      // TypeScript types don't match the actual API response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeAlarmsData: ActiveAlarm[] = (activeAlarmsResponse as any).data.data || [];
      
      // Calculate highest priority by looking up alarm configurations from stored alarms
      // The API response doesn't include priority, so we need to enrich it from alarm configs
      let highestPriority: 1 | 2 | null = null;
      if (activeAlarmsData.length > 0) {
        // Get current alarm configurations from Zustand store
        const currentState = useMonitoringStore.getState();
        const storedAlarms = currentState.alarms;
        
        // Find the highest priority among active alarms by matching with alarm configs
        for (const activeAlarm of activeAlarmsData) {
          if (activeAlarm.alarmId) {
            const alarmConfig = storedAlarms.find(a => a.id === activeAlarm.alarmId);
            if (alarmConfig?.alarmPriority) {
              // Priority 2 (High) is the highest, so we can break early if found
              if (alarmConfig.alarmPriority === 2) {
                highestPriority = 2;
                break;
              }
              // Otherwise track if we have at least priority 1 (Low/Warning)
              if (alarmConfig.alarmPriority === 1 && !highestPriority) {
                highestPriority = 1;
              }
            }
          }
        }
      }
      
      logger.log('Active alarm count fetched successfully:', {
        count: activeAlarmsData.length,
        highestPriority: highestPriority === 2 ? 'High' : highestPriority === 1 ? 'Low' : 'None',
      });
      
      updateActiveAlarms(activeAlarmsData.length, Date.now(), highestPriority);
      setActiveAlarmsFetchError(null);
    } catch (error) {
      logger.error('Failed to fetch active alarm count:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alarm count';
      setActiveAlarmsFetchError(errorMessage);
    } finally {
      setActiveAlarmsFetching(false);
    }
  }, [updateActiveAlarms, setActiveAlarmsFetching, setActiveAlarmsFetchError]);
  
  // Fetch values for specific items
  const fetchValues = useCallback(async (itemIds: string[]) => {
    try {
      setValuesLoading(true);
      setValuesError(null);
      logger.log('Fetching values for items:', { count: itemIds.length });
      
      const response = await getValues({ itemIds });
      setValues(response.values);
      
      logger.log('Values fetched successfully:', { count: response.values.length });
    } catch (error) {
      logger.error('Failed to fetch values:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch values';
      setValuesError({ message: errorMessage });
    } finally {
      setValuesLoading(false);
    }
  }, []);
  
  // Alias for syncGroups (backward compatibility)
  const fetchGroups = syncGroups;
  
  // Alias for syncItems (backward compatibility)
  const fetchItems = syncItems;
  
  // Alias for syncAlarms (backward compatibility)
  const fetchAlarms = syncAlarms;
  
  // No-op function for setCurrentFolderId (folder ID is managed by URL params in MonitoringPage)
  const setCurrentFolderId = useCallback((_folderId: string | null) => {
    // This is intentionally a no-op as folder ID is managed by URL search params
    // Kept for backward compatibility with MonitoringPage
  }, []);
  
  return {
    // State (similar to MonitoringContext)
    state: {
      groups,
      items,
      alarms,
      values,
      isDataSynced,
      lastSyncTime,
      activeAlarms: {
        alarmCount: activeAlarms.alarmCount,
        lastUpdate: activeAlarms.lastUpdate,
        streamStatus: activeAlarms.streamStatus,
        streamError: activeAlarms.streamError,
        fetchError: activeAlarms.fetchError,
        isFetching: activeAlarms.isFetching,
        highestPriority: activeAlarms.highestPriority,
      },
      backgroundRefresh: {
        enabled: backgroundRefresh.enabled,
        refreshInterval: backgroundRefresh.refreshInterval,
        lastRefreshTime: backgroundRefresh.lastRefreshTime,
      },
      alarmRefreshTrigger,
      // Loading states for compatibility
      groupsLoading: false,
      itemsLoading: false,
      alarmsLoading: false,
      valuesLoading,
      groupsError: null,
      itemsError: null,
      alarmsError: null,
      valuesError,
    },
    
    // Actions
    syncGroups,
    syncItems,
    syncAlarms,
    fetchGroups,
    fetchItems,
    fetchAlarms,
    fetchValues,
    setCurrentFolderId,
    setDataSynced,
    clearDataSyncStatus,
    updateActiveAlarms,
    setActiveAlarmsStreamStatus,
    setActiveAlarmsStreamError,
    resetActiveAlarmsStream,
    fetchActiveAlarmCount,
    updateBackgroundRefreshConfig,
    setLastRefreshTime,
    triggerAlarmRefresh,
    clearAllMonitoringData,
    
    // Export StreamStatus for convenience
    StreamStatus,
  };
}
