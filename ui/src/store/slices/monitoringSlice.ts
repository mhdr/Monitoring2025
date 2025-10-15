import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Group, Item, MultiValue, AlarmDto } from '../../types/api';
import type { ApiError } from '../../types/auth';
import { api } from '../../services/rtkApi';
import { logout as authLogout } from './authSlice';
import { monitoringStorageHelpers } from '../../utils/monitoringStorage';

/**
 * Stream connection status for gRPC active alarms
 */
export const StreamStatus = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  DISCONNECTED: 'disconnected'
} as const;

export type StreamStatus = typeof StreamStatus[keyof typeof StreamStatus];

import { getItem, setItem, removeItem } from '../../utils/indexedDbStorage';

/**
 * IndexedDB key for data sync status
 * Using IndexedDB to support data sharing across tabs
 */
const SYNC_STATUS_STORAGE_KEY = 'monitoring_data_synced';

/**
 * Load data sync status from IndexedDB
 */
const loadSyncStatusFromStorage = async (): Promise<boolean> => {
  try {
    const stored = await getItem<boolean>(SYNC_STATUS_STORAGE_KEY);
    const isSynced = stored === true;
    console.info('[MonitoringSlice] Loading sync status from IndexedDB:', {
      storedValue: stored,
      isSynced,
      timestamp: new Date().toISOString()
    });
    return isSynced;
  } catch (error) {
    console.warn('Failed to read sync status from IndexedDB:', error);
    return false;
  }
};

/**
 * Load monitoring data from IndexedDB if sync is complete
 */
const loadMonitoringDataFromStorage = async () => {
  const isSynced = await loadSyncStatusFromStorage();
  
  console.info('[MonitoringSlice] Loading monitoring data from storage:', {
    isSynced,
    timestamp: new Date().toISOString()
  });
  
  if (!isSynced) {
    console.info('[MonitoringSlice] Data not synced, starting with empty state');
    return {
      groups: [],
      items: [],
      alarms: [],
    };
  }

  const storedGroups = (await monitoringStorageHelpers.getStoredGroups()) || [];
  const storedItems = (await monitoringStorageHelpers.getStoredItems()) || [];
  const storedAlarms = (await monitoringStorageHelpers.getStoredAlarms()) || [];

  console.info('[MonitoringSlice] Restoring data from IndexedDB:', {
    groups: storedGroups.length,
    items: storedItems.length,
    alarms: storedAlarms.length,
    timestamp: new Date().toISOString()
  });

  return {
    groups: storedGroups,
    items: storedItems,
    alarms: storedAlarms,
  };
};

/**
 * Save data sync status to IndexedDB and update metadata
 */
export const saveSyncStatusToStorage = async (isSynced: boolean): Promise<void> => {
  try {
    await setItem(SYNC_STATUS_STORAGE_KEY, isSynced);
    
    // Update metadata with last sync timestamp
    if (isSynced) {
      import('../../utils/monitoringStorage').then(({ updateMetadata }) => {
        updateMetadata({ lastSync: Date.now() });
      });
    }
  } catch (error) {
    console.warn('Failed to save sync status to IndexedDB:', error);
  }
};

/**
 * Clear data sync status from IndexedDB
 * NOTE: This only clears the sync flag, not the actual monitoring data
 * Use clearAllMonitoringDataFromStorage() to clear both flag and data
 */
export const clearSyncStatusFromStorage = async (): Promise<void> => {
  try {
    console.info('[MonitoringSlice] Clearing sync status flag from IndexedDB:', {
      timestamp: new Date().toISOString()
    });
    
    await removeItem(SYNC_STATUS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear sync status from IndexedDB:', error);
  }
};

/**
 * Clear data sync status AND all monitoring data from IndexedDB
 * Use this for logout or when you need to completely reset monitoring state
 */
export const clearAllMonitoringDataFromStorage = async (): Promise<void> => {
  try {
    console.warn('[MonitoringSlice] Clearing sync status and all monitoring data from IndexedDB:', {
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    
    await removeItem(SYNC_STATUS_STORAGE_KEY);
    await monitoringStorageHelpers.clearAllMonitoringData();
  } catch (error) {
    console.warn('Failed to clear monitoring data from IndexedDB:', error);
  }
};

/**
 * Monitoring state interface
 */
export interface MonitoringState {
  // Groups data
  groups: Group[];
  groupsLoading: boolean;
  groupsError: ApiError | null;
  
  // Items data
  items: Item[];
  itemsLoading: boolean;
  itemsError: ApiError | null;
  
  // Alarms data
  alarms: AlarmDto[];
  alarmsLoading: boolean;
  alarmsError: ApiError | null;
  
  // Values data
  values: MultiValue[];
  valuesLoading: boolean;
  valuesError: ApiError | null;
  
  // Navigation
  currentFolderId: string | null;
  
  // Data synchronization status
  isDataSynced: boolean;
  
  // Active Alarms Stream (global subscription)
  activeAlarms: {
    alarmCount: number;
    lastUpdate: number | null;
    streamStatus: StreamStatus;
    streamError: string | null;
  };
}

/**
 * Initial state
 * Note: Data restoration from IndexedDB happens asynchronously via initializeFromStorage action
 */
const initialState: MonitoringState = {
    groups: [],
    groupsLoading: false,
    groupsError: null,
    
    items: [],
    itemsLoading: false,
    itemsError: null,
    
    alarms: [],
    alarmsLoading: false,
    alarmsError: null,
    
    values: [],
    valuesLoading: false,
    valuesError: null,
    
    currentFolderId: null,
    
    // Initial value - will be updated by initializeFromStorage action
    isDataSynced: false,
    
    activeAlarms: {
      alarmCount: 0,
      lastUpdate: null,
      streamStatus: StreamStatus.IDLE,
      streamError: null,
    },
  };

// Note: Data fetching is now handled by RTK Query
// This slice maintains the state for compatibility with existing components

/**
 * Monitoring slice
 */
const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    /**
     * Initialize state from IndexedDB storage
     * Called on app startup to restore persisted data
     */
    initializeFromStorage: (state, action: PayloadAction<{
      groups: Group[];
      items: Item[];
      alarms: AlarmDto[];
      isDataSynced: boolean;
    }>) => {
      state.groups = action.payload.groups;
      state.items = action.payload.items;
      state.alarms = action.payload.alarms;
      state.isDataSynced = action.payload.isDataSynced;
      console.info('[MonitoringSlice] State initialized from IndexedDB:', {
        groups: state.groups.length,
        items: state.items.length,
        alarms: state.alarms.length,
        isDataSynced: state.isDataSynced,
        timestamp: new Date().toISOString()
      });
    },
    
    /**
     * Set current folder ID for navigation
     */
    setCurrentFolderId: (state, action: PayloadAction<string | null>) => {
      state.currentFolderId = action.payload;
    },
    
    /**
     * Set data sync completion status
     */
    setDataSynced: (state, action: PayloadAction<boolean>) => {
      state.isDataSynced = action.payload;
      // Save asynchronously without blocking
      saveSyncStatusToStorage(action.payload).catch((error) =>
        console.error('[MonitoringSlice] Failed to save sync status:', error)
      );
      console.info('[MonitoringSlice] Data sync status updated:', {
        isDataSynced: action.payload,
        timestamp: new Date().toISOString(),
        currentDataCounts: {
          groups: state.groups.length,
          items: state.items.length,
          alarms: state.alarms.length
        }
      });
    },
    
    /**
     * Clear data sync status flag only (for force sync)
     * This will trigger a fresh sync without losing existing data
     */
    clearDataSyncStatus: (state) => {
      state.isDataSynced = false;
      // Clear asynchronously without blocking
      clearSyncStatusFromStorage().catch((error) =>
        console.error('[MonitoringSlice] Failed to clear sync status:', error)
      );
    },
    
    /**
     * Clear data sync status AND all monitoring data (for logout)
     * This completely resets the monitoring state
     */
    clearAllMonitoringData: (state) => {
      state.isDataSynced = false;
      state.groups = [];
      state.items = [];
      state.alarms = [];
      // Clear asynchronously without blocking
      clearAllMonitoringDataFromStorage().catch((error) =>
        console.error('[MonitoringSlice] Failed to clear monitoring data:', error)
      );
    },
    
    /**
     * Clear all errors
     */
    clearErrors: (state) => {
      state.groupsError = null;
      state.itemsError = null;
      state.alarmsError = null;
    },
    
    /**
     * Reset monitoring state to initial
     */
    resetMonitoring: () => {
      // Clear all data from storage when resetting (async, non-blocking)
      clearAllMonitoringDataFromStorage().catch((error) =>
        console.error('[MonitoringSlice] Failed to clear monitoring data:', error)
      );
      return initialState;
    },
    
    /**
     * Update active alarms count and timestamp from gRPC stream
     */
    updateActiveAlarms: (state, action: PayloadAction<{ alarmCount: number; timestamp: number }>) => {
      state.activeAlarms.alarmCount = action.payload.alarmCount;
      state.activeAlarms.lastUpdate = action.payload.timestamp;
      state.activeAlarms.streamStatus = StreamStatus.CONNECTED;
      state.activeAlarms.streamError = null;
    },
    
    /**
     * Set active alarms stream connection status
     */
    setActiveAlarmsStreamStatus: (state, action: PayloadAction<StreamStatus>) => {
      state.activeAlarms.streamStatus = action.payload;
      if (action.payload === StreamStatus.CONNECTED) {
        state.activeAlarms.streamError = null;
      }
    },
    
    /**
     * Set active alarms stream error
     */
    setActiveAlarmsStreamError: (state, action: PayloadAction<string>) => {
      state.activeAlarms.streamError = action.payload;
      state.activeAlarms.streamStatus = StreamStatus.ERROR;
    },
    
    /**
     * Reset active alarms stream state
     */
    resetActiveAlarmsStream: (state) => {
      state.activeAlarms = initialState.activeAlarms;
    },
  },
  extraReducers: (builder) => {
    // Handle auth logout - clear ALL monitoring data when user logs out
    // NOTE: addCase must be called before addMatcher in Redux Toolkit
    builder.addCase(authLogout, (state) => {
      // Clear sync status AND all monitoring data when user logs out
      clearAllMonitoringDataFromStorage();
      state.isDataSynced = false;
      state.groups = [];
      state.items = [];
      state.alarms = [];
    });

    // Handle auth login success - clear sync status to allow fresh data sync for new session
    builder.addMatcher(
      api.endpoints.login.matchFulfilled,
      (state) => {
        // Clear sync status from storage and state when user logs in
        // This ensures fresh data sync for the new authenticated session
        console.info('[MonitoringSlice] Login detected, clearing sync status for fresh session:', {
          timestamp: new Date().toISOString()
        });
        clearSyncStatusFromStorage();
        state.isDataSynced = false;
      }
    );

    // Handle RTK Query getGroups
    builder
      .addMatcher(
        api.endpoints.getGroups.matchPending,
        (state) => {
          state.groupsLoading = true;
          state.groupsError = null;
        }
      )
      .addMatcher(
        api.endpoints.getGroups.matchFulfilled,
        (state, action) => {
          state.groupsLoading = false;
          state.groups = action.payload.groups || [];
          // Ensure data is stored in IndexedDB (redundant safeguard)
          if (action.payload.groups && action.payload.groups.length > 0) {
            // Store asynchronously without blocking
            monitoringStorageHelpers.setStoredGroups(action.payload.groups).catch((error) =>
              console.error('[MonitoringSlice] Failed to store groups:', error)
            );
            console.info('[MonitoringSlice] Groups data updated in Redux and IndexedDB:', {
              count: action.payload.groups.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      )
      .addMatcher(
        api.endpoints.getGroups.matchRejected,
        (state, action) => {
          state.groupsLoading = false;
          state.groupsError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch groups',
            status: 500,
          };
        }
      );

    // Handle RTK Query getItems
    builder
      .addMatcher(
        api.endpoints.getItems.matchPending,
        (state) => {
          state.itemsLoading = true;
          state.itemsError = null;
        }
      )
      .addMatcher(
        api.endpoints.getItems.matchFulfilled,
        (state, action) => {
          state.itemsLoading = false;
          state.items = action.payload.items || [];
          // Ensure data is stored in IndexedDB (redundant safeguard)
          if (action.payload.items && action.payload.items.length > 0) {
            // Store asynchronously without blocking
            monitoringStorageHelpers.setStoredItems(action.payload.items).catch((error) =>
              console.error('[MonitoringSlice] Failed to store items:', error)
            );
            console.info('[MonitoringSlice] Items data updated in Redux and IndexedDB:', {
              count: action.payload.items.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      )
      .addMatcher(
        api.endpoints.getItems.matchRejected,
        (state, action) => {
          state.itemsLoading = false;
          state.itemsError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch items',
            status: 500,
          };
        }
      );

    // Handle RTK Query getAlarms
    builder
      .addMatcher(
        api.endpoints.getAlarms.matchPending,
        (state) => {
          state.alarmsLoading = true;
          state.alarmsError = null;
        }
      )
      .addMatcher(
        api.endpoints.getAlarms.matchFulfilled,
        (state, action) => {
          state.alarmsLoading = false;
          state.alarms = action.payload.data || [];
          // Ensure data is stored in IndexedDB (redundant safeguard)
          if (action.payload.data && action.payload.data.length > 0) {
            // Store asynchronously without blocking
            monitoringStorageHelpers.setStoredAlarms(action.payload.data).catch((error) =>
              console.error('[MonitoringSlice] Failed to store alarms:', error)
            );
            console.info('[MonitoringSlice] Alarms data updated in Redux and IndexedDB:', {
              count: action.payload.data.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      )
      .addMatcher(
        api.endpoints.getAlarms.matchRejected,
        (state, action) => {
          state.alarmsLoading = false;
          state.alarmsError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch alarms',
            status: 500,
          };
        }
      );

    // Handle RTK Query getValues
    builder
      .addMatcher(
        api.endpoints.getValues.matchPending,
        (state) => {
          state.valuesLoading = true;
          state.valuesError = null;
        }
      )
      .addMatcher(
        api.endpoints.getValues.matchFulfilled,
        (state, action) => {
          state.valuesLoading = false;
          state.values = action.payload.values || [];
        }
      )
      .addMatcher(
        api.endpoints.getValues.matchRejected,
        (state, action) => {
          state.valuesLoading = false;
          state.valuesError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch values',
            status: 500,
          };
        }
      );
  },
});

/**
 * Export actions
 */
export const { 
  initializeFromStorage,
  setCurrentFolderId,
  setDataSynced,
  clearDataSyncStatus,
  clearAllMonitoringData,
  clearErrors, 
  resetMonitoring,
  updateActiveAlarms,
  setActiveAlarmsStreamStatus,
  setActiveAlarmsStreamError,
  resetActiveAlarmsStream,
} = monitoringSlice.actions;

/**
 * Export reducer
 */
export default monitoringSlice.reducer;

/**
 * Initialize monitoring state from IndexedDB storage
 * Call this on app startup to restore persisted data
 */
import type { AppDispatch } from '../index';

export const initializeMonitoringFromStorage = () => async (dispatch: AppDispatch) => {
  try {
    const restoredData = await loadMonitoringDataFromStorage();
    const isSynced = await loadSyncStatusFromStorage();
    
    dispatch(initializeFromStorage({
      groups: restoredData.groups,
      items: restoredData.items,
      alarms: restoredData.alarms,
      isDataSynced: isSynced,
    }));
  } catch (error) {
    console.error('[MonitoringSlice] Failed to initialize from storage:', error);
  }
};

/**
 * Wrapper thunks for backward compatibility with existing components
 * These dispatch RTK Query endpoints and update the monitoring slice
 */
export const fetchGroups = ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getGroups.initiate(undefined, { forceRefetch: forceRefresh }));
};

export const fetchItems = ({ showOrphans = false, forceRefresh = false }: { showOrphans?: boolean; forceRefresh?: boolean }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getItems.initiate({ showOrphans }, { forceRefetch: forceRefresh }));
};

export const fetchAlarms = ({ itemIds, forceRefresh = false }: { itemIds?: string[]; forceRefresh?: boolean } = {}) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getAlarms.initiate({ itemIds: itemIds || null }, { forceRefetch: forceRefresh }));
};

export const fetchValues = ({ itemIds }: { itemIds?: string[] }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getValues.initiate({ itemIds: itemIds || null }));
};
