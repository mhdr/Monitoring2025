/**
 * Monitoring Context
 * Manages monitoring data (groups, items, alarms, values) with IndexedDB persistence
 */

import { createContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Group, Item, MultiValue, AlarmDto } from '../types/api';
import type { ApiError } from '../types/auth';
import { 
  getGroups, 
  getItems, 
  getAlarms, 
  getValues 
} from '../services/api';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import { getItem, setItem, removeItem } from '../utils/indexedDbStorage';
import { createLogger } from '../utils/logger';

const logger = createLogger('MonitoringContext');

const SYNC_STATUS_STORAGE_KEY = 'monitoring_data_synced';

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
 * Background refresh configuration
 */
export interface BackgroundRefreshConfig {
  enabled: boolean;
  refreshInterval: number; // milliseconds
  dataStaleThreshold: number; // milliseconds
}

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
  
  // Background refresh
  backgroundRefresh: BackgroundRefreshConfig & {
    lastRefreshTime: number | null;
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
  isDataSynced: false,
  
  activeAlarms: {
    alarmCount: 0,
    lastUpdate: null,
    streamStatus: StreamStatus.IDLE,
    streamError: null,
  },
  
  backgroundRefresh: {
    enabled: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    dataStaleThreshold: 30 * 60 * 1000, // 30 minutes
    lastRefreshTime: null,
  },
};

/**
 * Action types
 */
type MonitoringAction =
  | { type: 'INITIALIZE_FROM_STORAGE'; payload: { groups: Group[]; items: Item[]; alarms: AlarmDto[]; isDataSynced: boolean } }
  | { type: 'SET_CURRENT_FOLDER_ID'; payload: string | null }
  | { type: 'SET_DATA_SYNCED'; payload: boolean }
  | { type: 'CLEAR_DATA_SYNC_STATUS' }
  | { type: 'CLEAR_ALL_MONITORING_DATA' }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'RESET_MONITORING' }
  | { type: 'GROUPS_LOADING' }
  | { type: 'GROUPS_SUCCESS'; payload: Group[] }
  | { type: 'GROUPS_ERROR'; payload: ApiError }
  | { type: 'ITEMS_LOADING' }
  | { type: 'ITEMS_SUCCESS'; payload: Item[] }
  | { type: 'ITEMS_ERROR'; payload: ApiError }
  | { type: 'ALARMS_LOADING' }
  | { type: 'ALARMS_SUCCESS'; payload: AlarmDto[] }
  | { type: 'ALARMS_ERROR'; payload: ApiError }
  | { type: 'VALUES_LOADING' }
  | { type: 'VALUES_SUCCESS'; payload: MultiValue[] }
  | { type: 'VALUES_ERROR'; payload: ApiError }
  | { type: 'UPDATE_ACTIVE_ALARMS'; payload: { alarmCount: number; timestamp: number } }
  | { type: 'SET_ACTIVE_ALARMS_STREAM_STATUS'; payload: StreamStatus }
  | { type: 'SET_ACTIVE_ALARMS_STREAM_ERROR'; payload: string }
  | { type: 'RESET_ACTIVE_ALARMS_STREAM' }
  | { type: 'UPDATE_BACKGROUND_REFRESH_CONFIG'; payload: Partial<BackgroundRefreshConfig> }
  | { type: 'SET_LAST_REFRESH_TIME'; payload: number };

/**
 * Reducer function
 */
function monitoringReducer(state: MonitoringState, action: MonitoringAction): MonitoringState {
  switch (action.type) {
    case 'INITIALIZE_FROM_STORAGE':
      logger.log('State initialized from IndexedDB:', {
        groups: action.payload.groups.length,
        items: action.payload.items.length,
        alarms: action.payload.alarms.length,
        isDataSynced: action.payload.isDataSynced,
      });
      return {
        ...state,
        groups: action.payload.groups,
        items: action.payload.items,
        alarms: action.payload.alarms,
        isDataSynced: action.payload.isDataSynced,
      };

    case 'SET_CURRENT_FOLDER_ID':
      return { ...state, currentFolderId: action.payload };

    case 'SET_DATA_SYNCED':
      // Save to IndexedDB asynchronously
      setItem(SYNC_STATUS_STORAGE_KEY, action.payload).catch((error) =>
        logger.error('Failed to save sync status:', error)
      );
      logger.log('Data sync status updated:', {
        isDataSynced: action.payload,
        currentDataCounts: {
          groups: state.groups.length,
          items: state.items.length,
          alarms: state.alarms.length,
        },
      });
      return { ...state, isDataSynced: action.payload };

    case 'CLEAR_DATA_SYNC_STATUS':
      removeItem(SYNC_STATUS_STORAGE_KEY).catch((error) =>
        logger.error('Failed to clear sync status:', error)
      );
      return { ...state, isDataSynced: false };

    case 'CLEAR_ALL_MONITORING_DATA':
      // Clear from IndexedDB asynchronously
      removeItem(SYNC_STATUS_STORAGE_KEY).catch((error: unknown) =>
        logger.error('Failed to clear sync status:', error)
      );
      monitoringStorageHelpers.clearAllMonitoringData().catch((error: unknown) =>
        logger.error('Failed to clear monitoring data:', error)
      );
      return {
        ...state,
        isDataSynced: false,
        groups: [],
        items: [],
        alarms: [],
        values: [],
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        groupsError: null,
        itemsError: null,
        alarmsError: null,
        valuesError: null,
      };

    case 'RESET_MONITORING':
      // Clear from IndexedDB asynchronously
      removeItem(SYNC_STATUS_STORAGE_KEY).catch((error: unknown) =>
        logger.error('Failed to clear sync status:', error)
      );
      monitoringStorageHelpers.clearAllMonitoringData().catch((error: unknown) =>
        logger.error('Failed to clear monitoring data:', error)
      );
      return initialState;

    case 'GROUPS_LOADING':
      return { ...state, groupsLoading: true, groupsError: null };

    case 'GROUPS_SUCCESS':
      // Store in IndexedDB asynchronously
      monitoringStorageHelpers.setStoredGroups(action.payload).catch((error: unknown) =>
        logger.error('Failed to store groups:', error)
      );
      return { ...state, groupsLoading: false, groups: action.payload };

    case 'GROUPS_ERROR':
      return { ...state, groupsLoading: false, groupsError: action.payload };

    case 'ITEMS_LOADING':
      return { ...state, itemsLoading: true, itemsError: null };

    case 'ITEMS_SUCCESS':
      // Store in IndexedDB asynchronously
      monitoringStorageHelpers.setStoredItems(action.payload).catch((error: unknown) =>
        logger.error('Failed to store items:', error)
      );
      return { ...state, itemsLoading: false, items: action.payload };

    case 'ITEMS_ERROR':
      return { ...state, itemsLoading: false, itemsError: action.payload };

    case 'ALARMS_LOADING':
      return { ...state, alarmsLoading: true, alarmsError: null };

    case 'ALARMS_SUCCESS':
      // Store in IndexedDB asynchronously
      monitoringStorageHelpers.setStoredAlarms(action.payload).catch((error: unknown) =>
        logger.error('Failed to store alarms:', error)
      );
      return { ...state, alarmsLoading: false, alarms: action.payload };

    case 'ALARMS_ERROR':
      return { ...state, alarmsLoading: false, alarmsError: action.payload };

    case 'VALUES_LOADING':
      return { ...state, valuesLoading: true, valuesError: null };

    case 'VALUES_SUCCESS':
      return { ...state, valuesLoading: false, values: action.payload };

    case 'VALUES_ERROR':
      return { ...state, valuesLoading: false, valuesError: action.payload };

    case 'UPDATE_ACTIVE_ALARMS':
      return {
        ...state,
        activeAlarms: {
          alarmCount: action.payload.alarmCount,
          lastUpdate: action.payload.timestamp,
          streamStatus: StreamStatus.CONNECTED,
          streamError: null,
        },
      };

    case 'SET_ACTIVE_ALARMS_STREAM_STATUS':
      return {
        ...state,
        activeAlarms: {
          ...state.activeAlarms,
          streamStatus: action.payload,
          streamError: action.payload === StreamStatus.CONNECTED ? null : state.activeAlarms.streamError,
        },
      };

    case 'SET_ACTIVE_ALARMS_STREAM_ERROR':
      return {
        ...state,
        activeAlarms: {
          ...state.activeAlarms,
          streamError: action.payload,
          streamStatus: StreamStatus.ERROR,
        },
      };

    case 'RESET_ACTIVE_ALARMS_STREAM':
      return {
        ...state,
        activeAlarms: initialState.activeAlarms,
      };

    case 'UPDATE_BACKGROUND_REFRESH_CONFIG':
      return {
        ...state,
        backgroundRefresh: {
          ...state.backgroundRefresh,
          ...action.payload,
        },
      };

    case 'SET_LAST_REFRESH_TIME':
      return {
        ...state,
        backgroundRefresh: {
          ...state.backgroundRefresh,
          lastRefreshTime: action.payload,
        },
      };

    default:
      return state;
  }
}

/**
 * Context value interface
 */
export interface MonitoringContextValue {
  // State
  state: MonitoringState;
  
  // Data fetching actions
  fetchGroups: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchAlarms: () => Promise<void>;
  fetchValues: (itemIds: string[]) => Promise<void>;
  
  // Navigation actions
  setCurrentFolderId: (folderId: string | null) => void;
  
  // Sync actions
  setDataSynced: (synced: boolean) => void;
  clearDataSyncStatus: () => void;
  clearAllMonitoringData: () => void;
  
  // Error actions
  clearErrors: () => void;
  
  // Reset action
  resetMonitoring: () => void;
  
  // Active alarms stream actions
  updateActiveAlarms: (alarmCount: number, timestamp: number) => void;
  setActiveAlarmsStreamStatus: (status: StreamStatus) => void;
  setActiveAlarmsStreamError: (error: string) => void;
  resetActiveAlarmsStream: () => void;
  
  // Background refresh actions
  updateBackgroundRefreshConfig: (config: Partial<BackgroundRefreshConfig>) => void;
  forceRefresh: () => Promise<void>;
}

/**
 * Context
 */
export const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined);

/**
 * Provider props
 */
interface MonitoringProviderProps {
  children: React.ReactNode;
}

/**
 * Load data sync status from IndexedDB
 */
async function loadSyncStatusFromStorage(): Promise<boolean> {
  try {
    const stored = await getItem<boolean>(SYNC_STATUS_STORAGE_KEY);
    const isSynced = stored === true;
    logger.log('Loading sync status from IndexedDB:', { storedValue: stored, isSynced });
    return isSynced;
  } catch (error) {
    logger.error('Failed to read sync status from IndexedDB:', error);
    return false;
  }
}

/**
 * Load monitoring data from IndexedDB if sync is complete
 */
async function loadMonitoringDataFromStorage() {
  const isSynced = await loadSyncStatusFromStorage();
  
  logger.log('Loading monitoring data from storage:', { isSynced });
  
  if (!isSynced) {
    logger.log('Data not synced, starting with empty state');
    return {
      groups: [],
      items: [],
      alarms: [],
      isDataSynced: false,
    };
  }

  const storedGroups = (await monitoringStorageHelpers.getStoredGroups()) || [];
  const storedItems = (await monitoringStorageHelpers.getStoredItems()) || [];
  const storedAlarms = (await monitoringStorageHelpers.getStoredAlarms()) || [];

  logger.log('Restoring data from IndexedDB:', {
    groups: storedGroups.length,
    items: storedItems.length,
    alarms: storedAlarms.length,
  });

  return {
    groups: storedGroups,
    items: storedItems,
    alarms: storedAlarms,
    isDataSynced: isSynced,
  };
}

/**
 * MonitoringProvider component
 */
export function MonitoringProvider({ children }: MonitoringProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(monitoringReducer, initialState);
  const isInitialized = useRef(false);

  // Initialize from IndexedDB on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    (async () => {
      try {
        const data = await loadMonitoringDataFromStorage();
        dispatch({
          type: 'INITIALIZE_FROM_STORAGE',
          payload: data,
        });
      } catch (error) {
        logger.error('Failed to initialize monitoring data from storage:', error);
      }
    })();
  }, []);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    dispatch({ type: 'GROUPS_LOADING' });
    try {
      const response = await getGroups();
      dispatch({ type: 'GROUPS_SUCCESS', payload: response.groups || [] });
    } catch (error) {
      logger.error('Failed to fetch groups:', error);
      dispatch({ type: 'GROUPS_ERROR', payload: error as ApiError });
    }
  }, []);

  // Fetch items
  const fetchItems = useCallback(async () => {
    dispatch({ type: 'ITEMS_LOADING' });
    try {
      const response = await getItems();
      dispatch({ type: 'ITEMS_SUCCESS', payload: response.items || [] });
    } catch (error) {
      logger.error('Failed to fetch items:', error);
      dispatch({ type: 'ITEMS_ERROR', payload: error as ApiError });
    }
  }, []);

  // Fetch alarms
  const fetchAlarms = useCallback(async () => {
    dispatch({ type: 'ALARMS_LOADING' });
    try {
      const response = await getAlarms();
      dispatch({ type: 'ALARMS_SUCCESS', payload: response.data || [] });
    } catch (error) {
      logger.error('Failed to fetch alarms:', error);
      dispatch({ type: 'ALARMS_ERROR', payload: error as ApiError });
    }
  }, []);

  // Fetch values
  const fetchValues = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) {
      logger.log('No item IDs provided, skipping fetchValues');
      return;
    }
    
    dispatch({ type: 'VALUES_LOADING' });
    try {
      const response = await getValues({ itemIds });
      dispatch({ type: 'VALUES_SUCCESS', payload: response.values || [] });
    } catch (error) {
      logger.error('Failed to fetch values:', error);
      dispatch({ type: 'VALUES_ERROR', payload: error as ApiError });
    }
  }, []);

  // Navigation actions
  const setCurrentFolderId = useCallback((folderId: string | null) => {
    dispatch({ type: 'SET_CURRENT_FOLDER_ID', payload: folderId });
  }, []);

  // Sync actions
  const setDataSynced = useCallback((synced: boolean) => {
    dispatch({ type: 'SET_DATA_SYNCED', payload: synced });
  }, []);

  const clearDataSyncStatus = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA_SYNC_STATUS' });
  }, []);

  const clearAllMonitoringData = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_MONITORING_DATA' });
  }, []);

  // Error actions
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // Reset action
  const resetMonitoring = useCallback(() => {
    dispatch({ type: 'RESET_MONITORING' });
  }, []);

  // Active alarms stream actions
  const updateActiveAlarms = useCallback((alarmCount: number, timestamp: number) => {
    dispatch({ type: 'UPDATE_ACTIVE_ALARMS', payload: { alarmCount, timestamp } });
  }, []);

  const setActiveAlarmsStreamStatus = useCallback((status: StreamStatus) => {
    dispatch({ type: 'SET_ACTIVE_ALARMS_STREAM_STATUS', payload: status });
  }, []);

  const setActiveAlarmsStreamError = useCallback((error: string) => {
    dispatch({ type: 'SET_ACTIVE_ALARMS_STREAM_ERROR', payload: error });
  }, []);

  const resetActiveAlarmsStream = useCallback(() => {
    dispatch({ type: 'RESET_ACTIVE_ALARMS_STREAM' });
  }, []);

  // Background refresh actions
  const updateBackgroundRefreshConfig = useCallback((config: Partial<BackgroundRefreshConfig>) => {
    dispatch({ type: 'UPDATE_BACKGROUND_REFRESH_CONFIG', payload: config });
  }, []);

  const forceRefresh = useCallback(async () => {
    logger.log('Force refresh requested');
    try {
      // Fetch all data in parallel
      await Promise.all([
        fetchGroups(),
        fetchItems(),
        fetchAlarms(),
      ]);
      // Update last refresh time
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: Date.now() });
      logger.log('Force refresh completed successfully');
    } catch (error) {
      logger.error('Force refresh failed:', error);
      throw error;
    }
  }, [fetchGroups, fetchItems, fetchAlarms]);

  // Background refresh with Page Visibility API support
  useEffect(() => {
    const config = state.backgroundRefresh;
    
    if (!config.enabled || !state.isDataSynced) {
      logger.log('Background refresh disabled or data not synced');
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isPageVisible = !document.hidden;

    const checkAndRefresh = async () => {
      // Only refresh if page is visible
      if (!isPageVisible) {
        logger.log('Page hidden, skipping background refresh');
        return;
      }

      const now = Date.now();
      const lastRefresh = state.backgroundRefresh.lastRefreshTime || 0;
      const timeSinceLastRefresh = now - lastRefresh;

      // Check if data is stale
      if (timeSinceLastRefresh >= config.dataStaleThreshold) {
        logger.log('Data is stale, refreshing in background', {
          timeSinceLastRefresh,
          threshold: config.dataStaleThreshold,
        });

        try {
          // Silent refresh without showing loading states to user
          await Promise.all([
            getGroups().then(res => dispatch({ type: 'GROUPS_SUCCESS', payload: res.groups || [] })),
            getItems().then(res => dispatch({ type: 'ITEMS_SUCCESS', payload: res.items || [] })),
            getAlarms().then(res => dispatch({ type: 'ALARMS_SUCCESS', payload: res.data || [] })),
          ]);
          
          dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: Date.now() });
          logger.log('Background refresh completed successfully');
        } catch (error) {
          logger.error('Background refresh failed:', error);
          // Don't show error to user - it's a background operation
        }
      } else {
        logger.log('Data is fresh, no refresh needed', {
          timeSinceLastRefresh,
          threshold: config.dataStaleThreshold,
        });
      }
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      logger.log('Page visibility changed:', { isPageVisible });
      
      // When page becomes visible, check if refresh needed
      if (isPageVisible) {
        checkAndRefresh();
      }
    };

    // Set up periodic checks
    intervalId = setInterval(checkAndRefresh, config.refreshInterval);
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check
    checkAndRefresh();

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.backgroundRefresh, state.isDataSynced]);

  // Context value
  const value = useMemo<MonitoringContextValue>(
    () => ({
      state,
      fetchGroups,
      fetchItems,
      fetchAlarms,
      fetchValues,
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
      updateBackgroundRefreshConfig,
      forceRefresh,
    }),
    [
      state,
      fetchGroups,
      fetchItems,
      fetchAlarms,
      fetchValues,
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
      updateBackgroundRefreshConfig,
      forceRefresh,
    ]
  );

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}
