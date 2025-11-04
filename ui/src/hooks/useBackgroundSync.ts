/**
 * useBackgroundSync Hook
 * 
 * Monitors system/user version changes and automatically syncs data in the background.
 * This hook runs on app start or page refresh when the user is authenticated.
 * 
 * Flow:
 * 1. Fetch current version from API (/api/Monitoring/SettingsVersion)
 * 2. Compare with persisted version from localStorage
 * 3. If versions changed, fetch Groups, Items, and Alarms in background
 * 4. Update Zustand stores with new data (UI updates automatically via React subscriptions)
 * 5. Store new versions in localStorage for future comparisons
 * 
 * Features:
 * - Non-blocking: Runs in background without showing SyncPage
 * - Automatic: Triggers on app start/refresh
 * - Smooth UI updates: Uses Zustand reactivity
 * - Version-based: Only syncs when needed
 * - Error resilient: Logs errors but doesn't block app
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSettingsVersion } from '../services/monitoringApi';
import { getGroups, getItems, getAlarms } from '../services/monitoringApi';
import { useVersionStore } from '../stores/versionStore';
import { useMonitoringStore } from '../stores/monitoringStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('useBackgroundSync');

interface UseBackgroundSyncOptions {
  /** Whether user is authenticated (only sync when true) */
  isAuthenticated: boolean;
  /** Whether authentication is still loading */
  isAuthLoading: boolean;
}

interface SyncStatus {
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Last sync time (Unix timestamp) */
  lastSyncTime: number | null;
  /** Last sync error, if any */
  lastError: Error | null;
  /** Current sync phase */
  currentPhase: 'idle' | 'version-check' | 'groups' | 'items' | 'alarms' | 'complete';
}

/**
 * Hook to automatically sync data in background when versions change
 * 
 * @param options - Configuration options
 * @returns Sync status information
 */
export function useBackgroundSync({ isAuthenticated, isAuthLoading }: UseBackgroundSyncOptions): SyncStatus {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [currentPhase, setCurrentPhase] = useState<SyncStatus['currentPhase']>('idle');
  
  // Version store actions
  const { setVersions, hasVersionChanged } = useVersionStore();
  
  // Monitoring store actions
  const { setGroups, setItems, setAlarms, setDataSynced } = useMonitoringStore();
  
  // Track if sync has run to prevent duplicate syncs
  const hasSyncedRef = useRef(false);

  /**
   * Perform background data synchronization
   */
  const performBackgroundSync = useCallback(async () => {
    if (!isAuthenticated || isAuthLoading) {
      logger.log('Skipping background sync - user not authenticated or auth loading');
      return;
    }

    // Prevent duplicate syncs
    if (hasSyncedRef.current) {
      logger.log('Background sync already performed this session');
      return;
    }

    setIsSyncing(true);
    setLastError(null);
    setCurrentPhase('version-check');

    try {
      logger.info('Starting background sync - checking version');
      
      // Phase 1: Fetch current version from API
      const versionResponse = await getSettingsVersion();
      const { version, userVersion } = versionResponse;
      
      logger.log('Fetched version from API', { version, userVersion });
      
      // Check if version has changed
      const hasChanged = hasVersionChanged(version, userVersion);
      
      if (!hasChanged) {
        logger.info('Version unchanged - skipping data sync');
        setCurrentPhase('idle');
        setIsSyncing(false);
        hasSyncedRef.current = true;
        return;
      }
      
      logger.info('Version changed - syncing data in background');
      
      // Phase 2: Fetch Groups in background
      setCurrentPhase('groups');
      logger.log('Fetching groups');
      const groupsResponse = await getGroups();
      setGroups(groupsResponse.groups || []);
      logger.log('Groups synced', { count: groupsResponse.groups?.length || 0 });
      
      // Phase 3: Fetch Items in background
      setCurrentPhase('items');
      logger.log('Fetching items');
      const itemsResponse = await getItems({ showOrphans: false });
      setItems(itemsResponse.items || []);
      logger.log('Items synced', { count: itemsResponse.items?.length || 0 });
      
      // Phase 4: Fetch Alarms (requires itemIds from Phase 3)
      setCurrentPhase('alarms');
      const itemIds = itemsResponse.items?.map(item => item.id) || [];
      logger.log('Fetching alarms', { itemCount: itemIds.length });
      
      let alarmsCount = 0;
      if (itemIds.length > 0) {
        const alarmsResponse = await getAlarms({ itemIds });
        const alarms = alarmsResponse.data?.data || [];
        setAlarms(alarms);
        alarmsCount = alarms.length;
        logger.log('Alarms synced', { count: alarmsCount });
      } else {
        logger.warn('No items available - skipping alarm sync');
        setAlarms([]);
      }
      
      // Phase 5: Update versions and mark sync complete
      setVersions(version, userVersion);
      setDataSynced(true);
      setLastSyncTime(Date.now());
      setCurrentPhase('complete');
      hasSyncedRef.current = true;
      
      logger.info('Background sync completed successfully', {
        version,
        userVersion,
        groupsCount: groupsResponse.groups?.length || 0,
        itemsCount: itemsResponse.items?.length || 0,
        alarmsCount,
      });
      
      // Reset to idle after brief delay
      setTimeout(() => setCurrentPhase('idle'), 1000);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Background sync failed');
      logger.error('Background sync failed', err);
      setLastError(err);
      setCurrentPhase('idle');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isAuthLoading, hasVersionChanged, setVersions, setGroups, setItems, setAlarms, setDataSynced]);

  /**
   * Trigger background sync on mount when authenticated
   */
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !hasSyncedRef.current) {
      logger.log('Authenticated user detected - initiating background sync');
      performBackgroundSync();
    }
  }, [isAuthenticated, isAuthLoading, performBackgroundSync]);

  return {
    isSyncing,
    lastSyncTime,
    lastError,
    currentPhase,
  };
}
