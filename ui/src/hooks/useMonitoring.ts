/**
 * useMonitoring Hook
 * 
 * Hook for accessing monitoring state and actions.
 * Uses Zustand store instead of React Context.
 */

import { useMonitoringStore, StreamStatus } from '../stores/monitoringStore';
import { useCallback } from 'react';
import {
  getGroups,
  getItems,
  getAlarms,
} from '../services/api';
import { getActiveAlarms } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useMonitoring');

/**
 * Hook for accessing monitoring store
 */
export function useMonitoring() {
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
      const activeAlarmsData = activeAlarmsResponse.data;
      
      // Calculate highest priority
      let highestPriority: 1 | 2 | null = null;
      if (activeAlarmsData.length > 0) {
        const hasHighPriority = activeAlarmsData.some((alarm) => alarm.alarmPriority === 2);
        highestPriority = hasHighPriority ? 2 : 1;
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
  
  return {
    // State (similar to MonitoringContext)
    state: {
      groups,
      items,
      alarms,
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
      valuesLoading: false,
    },
    
    // Actions
    syncGroups,
    syncItems,
    syncAlarms,
    setDataSynced,
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
