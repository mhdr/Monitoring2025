/**
 * useDataSync Hook
 * Manages synchronization of essential data (groups and items) with individual progress tracking
 * Provides granular progress information for each sync operation to display in UI
 */

import { useState, useCallback, useRef } from 'react';
import { useMonitoring } from './useMonitoring';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataSync');

export interface SyncProgress {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current status */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}

export interface SyncState {
  /** Overall sync status */
  overall: 'idle' | 'syncing' | 'completed' | 'error';
  /** Groups sync progress */
  groups: SyncProgress;
  /** Items sync progress */
  items: SyncProgress;
  /** Alarms sync progress */
  alarms: SyncProgress;
  /** Whether sync has been completed successfully */
  isCompleted: boolean;
  /** Whether any sync operation failed */
  hasErrors: boolean;
}

export interface UseDataSyncResult {
  /** Current sync state */
  syncState: SyncState;
  /** Start synchronization process */
  startSync: (options?: { forceRefresh?: boolean }) => Promise<boolean>;
  /** Reset sync state */
  resetSync: () => void;
  /** Retry failed operations */
  retryFailed: () => Promise<boolean>;
}

/**
 * Custom hook for managing data synchronization with progress tracking
 * 
 * @example
 * ```tsx
 * function SyncPage() {
 *   const { syncState, startSync, retryFailed } = useDataSync();
 *   
 *   useEffect(() => {
 *     startSync();
 *   }, []);
 *   
 *   return (
 *     <div>
 *       <ProgressBar 
 *         label="Groups" 
 *         progress={syncState.groups.progress}
 *         status={syncState.groups.status} 
 *       />
 *       <ProgressBar 
 *         label="Items" 
 *         progress={syncState.items.progress}
 *         status={syncState.items.status} 
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDataSync(): UseDataSyncResult {
  const { 
    state: { items },
    fetchGroups,
    fetchItems,
    fetchAlarms,
    setDataSynced
  } = useMonitoring();
  
  const isSyncingRef = useRef<boolean>(false);
  
  // Keep a ref to the latest items for use in async functions
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [syncState, setSyncState] = useState<SyncState>({
    overall: 'idle',
    groups: { progress: 0, status: 'idle' },
    items: { progress: 0, status: 'idle' },
    alarms: { progress: 0, status: 'idle' },
    isCompleted: false,
    hasErrors: false,
  });

  /**
   * Update groups sync progress
   */
  const updateGroupsProgress = useCallback((update: Partial<SyncProgress>) => {
    setSyncState(prev => ({
      ...prev,
      groups: { ...prev.groups, ...update }
    }));
  }, []);

  /**
   * Update items sync progress
   */
  const updateItemsProgress = useCallback((update: Partial<SyncProgress>) => {
    setSyncState(prev => ({
      ...prev,
      items: { ...prev.items, ...update }
    }));
  }, []);

  /**
   * Update alarms sync progress
   */
  const updateAlarmsProgress = useCallback((update: Partial<SyncProgress>) => {
    setSyncState(prev => ({
      ...prev,
      alarms: { ...prev.alarms, ...update }
    }));
  }, []);

  /**
   * Update overall sync status
   */
  const updateOverallStatus = useCallback((status: SyncState['overall']) => {
    setSyncState(prev => ({ ...prev, overall: status }));
  }, []);

  /**
   * Sync groups data
   */
  const syncGroups = useCallback(async (_forceRefresh: boolean = false): Promise<boolean> => {
    updateGroupsProgress({ progress: 0, status: 'loading', error: undefined });

    try {
      // Simulate progress updates
      updateGroupsProgress({ progress: 25 });
      
      // Fetch groups using MonitoringContext
      await fetchGroups();
      
      updateGroupsProgress({ progress: 100, status: 'success' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateGroupsProgress({ 
        progress: 0, 
        status: 'error', 
        error: errorMessage 
      });
      return false;
    }
  }, [fetchGroups, updateGroupsProgress]);

  /**
   * Sync items data
   */
  const syncItems = useCallback(async (_forceRefresh: boolean = false): Promise<boolean> => {
    updateItemsProgress({ progress: 0, status: 'loading', error: undefined });

    try {
      // Simulate progress updates
      updateItemsProgress({ progress: 25 });
      
      // Fetch items using MonitoringContext
      await fetchItems();
      
      updateItemsProgress({ progress: 100, status: 'success' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateItemsProgress({ 
        progress: 0, 
        status: 'error', 
        error: errorMessage 
      });
      return false;
    }
  }, [fetchItems, updateItemsProgress]);

  /**
   * Sync alarms data
   */
  const syncAlarms = useCallback(async (_itemIds: string[] = [], _forceRefresh: boolean = false): Promise<boolean> => {
    updateAlarmsProgress({ progress: 0, status: 'loading', error: undefined });

    try {
      // Simulate progress updates
      updateAlarmsProgress({ progress: 25 });
      
      // Fetch alarms using MonitoringContext
      await fetchAlarms();
      
      updateAlarmsProgress({ progress: 100, status: 'success' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateAlarmsProgress({ 
        progress: 0, 
        status: 'error', 
        error: errorMessage 
      });
      return false;
    }
  }, [fetchAlarms, updateAlarmsProgress]);

  /**
   * Start the complete synchronization process
   */
  const startSync = useCallback(async (options: { forceRefresh?: boolean } = {}): Promise<boolean> => {
    const { forceRefresh = false } = options;
    
    // Prevent concurrent sync operations
    if (isSyncingRef.current) {
      return false;
    }

    isSyncingRef.current = true;
    updateOverallStatus('syncing');

    try {
      // Reset progress
      setSyncState(prev => ({
        ...prev,
        groups: { progress: 0, status: 'idle' },
        items: { progress: 0, status: 'idle' },
        alarms: { progress: 0, status: 'idle' },
        isCompleted: false,
        hasErrors: false,
      }));

      // Execute groups and items sync in parallel first
      const [groupsSuccess, itemsSuccess] = await Promise.all([
        syncGroups(forceRefresh),
        syncItems(forceRefresh)
      ]);

      // After items are synced, get the item IDs and sync alarms
      let alarmsSuccess = false;
      if (itemsSuccess) {
        // Add a small delay to ensure Redux state has been updated
        // RTK Query updates might not be reflected immediately
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get fresh items from ref (always has latest state)
        const freshItems = itemsRef.current;
        const itemIds = freshItems.map(item => item.id);
        logger.info('[useDataSync] Extracted item IDs for alarm sync:', {
          itemCount: itemIds.length,
          sampleIds: itemIds.slice(0, 5),
          forceRefresh,
          timestamp: new Date().toISOString()
        });
        alarmsSuccess = await syncAlarms(itemIds, forceRefresh);
      } else {
        // If items sync failed, mark alarms as failed too
        updateAlarmsProgress({ 
          progress: 0, 
          status: 'error', 
          error: 'Cannot sync alarms: items sync failed' 
        });
      }

      const allSuccess = groupsSuccess && itemsSuccess && alarmsSuccess;
      const hasErrors = !groupsSuccess || !itemsSuccess || !alarmsSuccess;

      setSyncState(prev => ({
        ...prev,
        overall: allSuccess ? 'completed' : 'error',
        isCompleted: allSuccess,
        hasErrors,
      }));

      // Set the sync flag in MonitoringContext if all operations succeeded
      if (allSuccess) {
        setDataSynced(true);
        
        // Additional safeguard: verify data is stored in IndexedDB
        const storedGroups = await monitoringStorageHelpers.getStoredGroups();
        const storedItems = await monitoringStorageHelpers.getStoredItems();
        
        logger.log('Sync completed successfully. Verification:', {
          syncedDataCounts: {
            groups: storedGroups?.length || 0,
            items: storedItems?.length || 0
          },
          syncStatusSet: true,
          forceRefresh,
        });
      }

      return allSuccess;
    } catch (error) {
      logger.error('Sync process failed:', error);
      updateOverallStatus('error');
      setSyncState(prev => ({ ...prev, hasErrors: true }));
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncGroups, syncItems, syncAlarms, updateOverallStatus, updateAlarmsProgress, setDataSynced]);

  /**
   * Retry failed sync operations
   */
  const retryFailed = useCallback(async (): Promise<boolean> => {
    if (isSyncingRef.current) {
      return false;
    }

    const failedOperations: Promise<boolean>[] = [];

    // Retry groups if failed
    if (syncState.groups.status === 'error') {
      failedOperations.push(syncGroups());
    }

    // Retry items if failed
    if (syncState.items.status === 'error') {
      failedOperations.push(syncItems());
    }

    // Retry alarms if failed (but only if we have items available)
    if (syncState.alarms.status === 'error' && itemsRef.current.length > 0) {
      const itemIds = itemsRef.current.map(item => item.id);
      failedOperations.push(syncAlarms(itemIds));
    }

    if (failedOperations.length === 0) {
      return true; // Nothing to retry
    }

    isSyncingRef.current = true;
    updateOverallStatus('syncing');

    try {
      const results = await Promise.all(failedOperations);
      const allSuccess = results.every(result => result);

      setSyncState(prev => ({
        ...prev,
        overall: allSuccess ? 'completed' : 'error',
        isCompleted: allSuccess,
        hasErrors: !allSuccess,
      }));

      // Set the sync flag in MonitoringContext if all retry operations succeeded
      if (allSuccess) {
        setDataSynced(true);
        
        // Additional safeguard: verify data is stored in IndexedDB
        const storedGroups = await monitoringStorageHelpers.getStoredGroups();
        const storedItems = await monitoringStorageHelpers.getStoredItems();
        
        logger.log('Retry completed successfully. Verification:', {
          syncedDataCounts: {
            groups: storedGroups?.length || 0,
            items: storedItems?.length || 0
          },
          syncStatusSet: true,
        });
      }

      return allSuccess;
    } catch (error) {
      logger.error('Retry sync failed:', error);
      updateOverallStatus('error');
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncState.groups.status, syncState.items.status, syncState.alarms.status, syncGroups, syncItems, syncAlarms, updateOverallStatus, setDataSynced]);

  /**
   * Reset sync state to initial values
   */
  const resetSync = useCallback(() => {
    setSyncState({
      overall: 'idle',
      groups: { progress: 0, status: 'idle' },
      items: { progress: 0, status: 'idle' },
      alarms: { progress: 0, status: 'idle' },
      isCompleted: false,
      hasErrors: false,
    });
  }, []);

  return {
    syncState,
    startSync,
    resetSync,
    retryFailed,
  };
}
