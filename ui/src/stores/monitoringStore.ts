/**
 * Monitoring Store
 * 
 * Zustand store for managing monitoring data with localStorage persistence.
 * Stores groups, items, alarms, and sync status for offline-first experience.
 * 
 * Note: Active alarms count and stream status are NOT persisted (real-time only).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Group, Item, AlarmDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('MonitoringStore');

/**
 * Stream connection status for real-time active alarms (SignalR)
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
 * Persisted monitoring data (saved to localStorage)
 */
interface PersistedMonitoringState {
  groups: Group[];
  items: Item[];
  alarms: AlarmDto[];
  isDataSynced: boolean;
  lastSyncTime: number | null;
}

/**
 * Transient monitoring data (not persisted - runtime only)
 */
interface TransientMonitoringState {
  // Active alarms (real-time via SignalR)
  activeAlarms: {
    alarmCount: number;
    lastUpdate: number | null;
    streamStatus: StreamStatus;
    streamError: string | null;
    fetchError: string | null;
    isFetching: boolean;
    highestPriority: 1 | 2 | null;
  };
  
  // Background refresh
  backgroundRefresh: {
    enabled: boolean;
    refreshInterval: number;
    lastRefreshTime: number | null;
  };
  
  // Alarm refresh trigger
  alarmRefreshTrigger: number;
}

/**
 * Complete monitoring store state
 */
interface MonitoringState extends PersistedMonitoringState, TransientMonitoringState {}

/**
 * Monitoring store actions
 */
interface MonitoringActions {
  // Groups
  setGroups: (groups: Group[]) => void;
  clearGroups: () => void;
  
  // Items
  setItems: (items: Item[]) => void;
  clearItems: () => void;
  
  // Alarms
  setAlarms: (alarms: AlarmDto[]) => void;
  clearAlarms: () => void;
  
  // Sync status
  setDataSynced: (synced: boolean) => void;
  clearDataSyncStatus: () => void;
  
  // Active alarms (real-time)
  updateActiveAlarms: (alarmCount: number, timestamp: number, highestPriority?: 1 | 2 | null) => void;
  setActiveAlarmsStreamStatus: (status: StreamStatus) => void;
  setActiveAlarmsStreamError: (error: string) => void;
  setActiveAlarmsFetching: (fetching: boolean) => void;
  setActiveAlarmsFetchError: (error: string | null) => void;
  resetActiveAlarmsStream: () => void;
  
  // Background refresh
  updateBackgroundRefreshConfig: (config: Partial<MonitoringState['backgroundRefresh']>) => void;
  setLastRefreshTime: (time: number) => void;
  
  // Alarm refresh trigger
  triggerAlarmRefresh: () => void;
  
  // Utility
  clearAllMonitoringData: () => void;
  hasStoredData: () => boolean;
}

/**
 * Initial persisted state
 */
const initialPersistedState: PersistedMonitoringState = {
  groups: [],
  items: [],
  alarms: [],
  isDataSynced: false,
  lastSyncTime: null,
};

/**
 * Initial transient state
 */
const initialTransientState: TransientMonitoringState = {
  activeAlarms: {
    alarmCount: 0,
    lastUpdate: null,
    streamStatus: StreamStatus.IDLE,
    streamError: null,
    fetchError: null,
    isFetching: false,
    highestPriority: null,
  },
  backgroundRefresh: {
    enabled: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    lastRefreshTime: null,
  },
  alarmRefreshTrigger: 0,
};

/**
 * Zustand store for monitoring data with partial localStorage persistence
 * Only groups, items, alarms, and sync status are persisted
 * Active alarms and stream state are transient (runtime only)
 */
export const useMonitoringStore = create<MonitoringState & MonitoringActions>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      ...initialTransientState,
      
      // Groups actions
      setGroups: (groups: Group[]) => {
        logger.info('Setting groups:', { count: groups.length });
        set({ groups, lastSyncTime: Date.now() });
      },
      
      clearGroups: () => {
        logger.info('Clearing groups');
        set({ groups: [] });
      },
      
      // Items actions
      setItems: (items: Item[]) => {
        logger.info('Setting items:', { count: items.length });
        set({ items, lastSyncTime: Date.now() });
      },
      
      clearItems: () => {
        logger.info('Clearing items');
        set({ items: [] });
      },
      
      // Alarms actions
      setAlarms: (alarms: AlarmDto[]) => {
        logger.info('Setting alarms:', { count: alarms.length });
        set({ alarms, lastSyncTime: Date.now() });
      },
      
      clearAlarms: () => {
        logger.info('Clearing alarms');
        set({ alarms: [] });
      },
      
      // Sync status actions
      setDataSynced: (synced: boolean) => {
        logger.info('Setting data synced status:', synced);
        set({ isDataSynced: synced });
      },
      
      clearDataSyncStatus: () => {
        logger.info('Clearing data sync status');
        set({ isDataSynced: false });
      },
      
      // Active alarms actions (transient - not persisted)
      updateActiveAlarms: (alarmCount: number, timestamp: number, highestPriority?: 1 | 2 | null) => {
        logger.log('Updating active alarms:', { alarmCount, highestPriority, timestamp });
        set((state) => ({
          activeAlarms: {
            ...state.activeAlarms,
            alarmCount,
            lastUpdate: timestamp,
            highestPriority: highestPriority ?? state.activeAlarms.highestPriority,
          },
        }));
      },
      
      setActiveAlarmsStreamStatus: (status: StreamStatus) => {
        logger.log('Setting active alarms stream status:', status);
        set((state) => ({
          activeAlarms: {
            ...state.activeAlarms,
            streamStatus: status,
          },
        }));
      },
      
      setActiveAlarmsStreamError: (error: string) => {
        logger.error('Active alarms stream error:', error);
        set((state) => ({
          activeAlarms: {
            ...state.activeAlarms,
            streamError: error,
            streamStatus: StreamStatus.ERROR,
          },
        }));
      },
      
      setActiveAlarmsFetching: (fetching: boolean) => {
        set((state) => ({
          activeAlarms: {
            ...state.activeAlarms,
            isFetching: fetching,
          },
        }));
      },
      
      setActiveAlarmsFetchError: (error: string | null) => {
        set((state) => ({
          activeAlarms: {
            ...state.activeAlarms,
            fetchError: error,
          },
        }));
      },
      
      resetActiveAlarmsStream: () => {
        logger.info('Resetting active alarms stream');
        set({
          activeAlarms: {
            ...initialTransientState.activeAlarms,
          },
        });
      },
      
      // Background refresh actions
      updateBackgroundRefreshConfig: (config) => {
        logger.info('Updating background refresh config:', config);
        set((state) => ({
          backgroundRefresh: {
            ...state.backgroundRefresh,
            ...config,
          },
        }));
      },
      
      setLastRefreshTime: (time: number) => {
        set((state) => ({
          backgroundRefresh: {
            ...state.backgroundRefresh,
            lastRefreshTime: time,
          },
        }));
      },
      
      // Alarm refresh trigger
      triggerAlarmRefresh: () => {
        set((state) => ({
          alarmRefreshTrigger: state.alarmRefreshTrigger + 1,
        }));
      },
      
      // Utility actions
      clearAllMonitoringData: () => {
        logger.info('Clearing all monitoring data');
        set({
          ...initialPersistedState,
          ...initialTransientState,
        });
      },
      
      hasStoredData: (): boolean => {
        const state = get();
        return state.groups.length > 0 || state.items.length > 0 || state.alarms.length > 0;
      },
    }),
    {
      name: 'monitoring-storage', // localStorage key
      version: 1,
      // Only persist specific fields (exclude transient state)
      partialize: (state) => ({
        groups: state.groups,
        items: state.items,
        alarms: state.alarms,
        isDataSynced: state.isDataSynced,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

/**
 * Helper functions for backward compatibility with monitoringStorage
 */
export const monitoringStorageHelpers = {
  // Groups
  getStoredGroups: async (): Promise<Group[] | null> => {
    const groups = useMonitoringStore.getState().groups;
    return groups.length > 0 ? groups : null;
  },
  
  setStoredGroups: async (groups: Group[]): Promise<void> => {
    useMonitoringStore.getState().setGroups(groups);
  },
  
  clearStoredGroups: async (): Promise<void> => {
    useMonitoringStore.getState().clearGroups();
  },
  
  // Items
  getStoredItems: async (): Promise<Item[] | null> => {
    const items = useMonitoringStore.getState().items;
    return items.length > 0 ? items : null;
  },
  
  setStoredItems: async (items: Item[]): Promise<void> => {
    useMonitoringStore.getState().setItems(items);
  },
  
  clearStoredItems: async (): Promise<void> => {
    useMonitoringStore.getState().clearItems();
  },
  
  // Alarms
  getStoredAlarms: async (): Promise<AlarmDto[] | null> => {
    const alarms = useMonitoringStore.getState().alarms;
    return alarms.length > 0 ? alarms : null;
  },
  
  setStoredAlarms: async (alarms: AlarmDto[]): Promise<void> => {
    useMonitoringStore.getState().setAlarms(alarms);
  },
  
  clearStoredAlarms: async (): Promise<void> => {
    useMonitoringStore.getState().clearAlarms();
  },
  
  // Utility
  clearAllMonitoringData: async (): Promise<void> => {
    useMonitoringStore.getState().clearAllMonitoringData();
  },
  
  hasStoredData: async (): Promise<boolean> => {
    return useMonitoringStore.getState().hasStoredData();
  },
};
