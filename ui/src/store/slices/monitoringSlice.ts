import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Group, Item, MultiValue, AlarmDto } from '../../types/api';
import type { ApiError } from '../../types/auth';
import { api } from '../../services/rtkApi';
import { logout as authLogout } from './authSlice';

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

/**
 * Session storage key for data sync status
 */
const SYNC_STATUS_STORAGE_KEY = 'monitoring_data_synced';

/**
 * Load data sync status from session storage
 */
const loadSyncStatusFromStorage = (): boolean => {
  try {
    const stored = sessionStorage.getItem(SYNC_STATUS_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read sync status from sessionStorage:', error);
    return false;
  }
};

/**
 * Save data sync status to session storage
 */
export const saveSyncStatusToStorage = (isSynced: boolean): void => {
  try {
    sessionStorage.setItem(SYNC_STATUS_STORAGE_KEY, isSynced.toString());
  } catch (error) {
    console.warn('Failed to save sync status to sessionStorage:', error);
  }
};

/**
 * Clear data sync status from session storage
 */
export const clearSyncStatusFromStorage = (): void => {
  try {
    sessionStorage.removeItem(SYNC_STATUS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear sync status from sessionStorage:', error);
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
  
  // Load sync status from session storage on initialization
  isDataSynced: loadSyncStatusFromStorage(),
  
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
      saveSyncStatusToStorage(action.payload);
    },
    
    /**
     * Clear data sync status (when logging out)
     */
    clearDataSyncStatus: (state) => {
      state.isDataSynced = false;
      clearSyncStatusFromStorage();
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
      // Clear sync status from storage when resetting
      clearSyncStatusFromStorage();
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

    // Handle auth logout - clear sync status when user logs out
    builder.addCase(authLogout, (state) => {
      // Clear sync status from storage and state when user logs out
      clearSyncStatusFromStorage();
      state.isDataSynced = false;
    });
  },
});

/**
 * Export actions
 */
export const { 
  setCurrentFolderId,
  setDataSynced,
  clearDataSyncStatus,
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
 * Wrapper thunks for backward compatibility with existing components
 * These dispatch RTK Query endpoints and update the monitoring slice
 */
import type { AppDispatch } from '../index';

export const fetchGroups = () => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getGroups.initiate());
};

export const fetchItems = ({ showOrphans = false }: { showOrphans?: boolean }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getItems.initiate({ showOrphans }));
};

export const fetchAlarms = ({ itemIds }: { itemIds?: string[] } = {}) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getAlarms.initiate({ itemIds: itemIds || null }));
};

export const fetchValues = ({ itemIds }: { itemIds?: string[] }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getValues.initiate({ itemIds: itemIds || null }));
};
