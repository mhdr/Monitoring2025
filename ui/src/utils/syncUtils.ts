/**
 * Sync Utilities - Rebuilt from Scratch
 * Clean, simple logic for data synchronization workflow
 * 
 * WORKFLOW:
 * - Fresh Login: Sync ONLY if no data in IndexedDB
 * - Logout: Clear all IndexedDB
 * - Page Refresh: Use cached data (NO sync)
 * - New Tab: Use cached data (NO sync)
 * - Force Sync: Always sync (from navbar)
 */

import { getItem } from './indexedDbStorage';
import { monitoringStorageHelpers, getMetadata } from './monitoringStorage';
import { createLogger } from './logger';

const logger = createLogger('SyncUtils');

const SYNC_FLAG_KEY = 'monitoring_data_synced';

/**
 * Check if data is synced by reading the sync flag from IndexedDB
 * This is the SINGLE SOURCE OF TRUTH for sync status
 * 
 * @returns Promise<boolean> - true if data is synced, false otherwise
 */
export async function isDataSynced(): Promise<boolean> {
  try {
    const syncFlag = await getItem<boolean>(SYNC_FLAG_KEY);
    const isSynced = syncFlag === true;
    logger.log('Sync flag status:', { syncFlag, isSynced });
    return isSynced;
  } catch (error) {
    logger.error('Failed to read sync flag:', error);
    return false; // Default to not synced on error
  }
}

/**
 * Check if cached data exists in IndexedDB
 * Used to determine if we can use cached data on page refresh/new tab
 * 
 * @returns Promise<boolean> - true if data exists, false otherwise
 */
export async function hasCachedData(): Promise<boolean> {
  try {
    const [groups, items, alarms] = await Promise.all([
      monitoringStorageHelpers.getStoredGroups(),
      monitoringStorageHelpers.getStoredItems(),
      monitoringStorageHelpers.getStoredAlarms()
    ]);

    const groupCount = Array.isArray(groups) ? groups.length : 0;
    const itemCount = Array.isArray(items) ? items.length : 0;
    const alarmCount = Array.isArray(alarms) ? alarms.length : 0;
    const hasStoredData = Boolean(groups || items || alarms);

    logger.log('Cached data check:', {
      groupCount,
      itemCount,
      alarmCount,
      hasStoredData,
    });

    if (hasStoredData) {
      return true;
    }

    // Fallback: if metadata indicates a recent sync, treat as cached to avoid unnecessary sync loops
    const metadata = await getMetadata();
    const hasRecentSync = typeof metadata?.lastSync === 'number' && metadata.lastSync > 0;

    if (hasRecentSync) {
      logger.log('Cached data metadata fallback:', {
        lastSync: metadata?.lastSync,
        lastCleanup: metadata?.lastCleanup,
        version: metadata?.version,
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check cached data:', error);
    return false;
  }
}

/**
 * Determines if sync is needed based on current page, sync status, and cached data
 * 
 * NEW BEHAVIOR: Only sync if no cached data exists
 * This prevents unnecessary syncs on page refresh and new tabs
 * 
 * @param pathname - Current pathname
 * @param syncedFlag - Sync status flag from IndexedDB
 * @param hasCached - Whether cached data exists in IndexedDB
 * @returns true if sync is needed, false otherwise
 */
export function shouldRedirectToSync(pathname: string, syncedFlag: boolean, hasCached: boolean): boolean {
  // Pages that don't require sync (already on sync page, login page, or user profile pages)
  const noSyncPages = ['/login', '/sync', '/dashboard/sync', '/dashboard/profile', '/dashboard/settings'];
  
  // If we're already on a no-sync page, don't redirect
  if (noSyncPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
    return false;
  }
  
  // NEW LOGIC: Only sync if sync flag is false AND no cached data exists
  // This allows page refresh/new tab to use cached data without syncing
  const needsSync = !syncedFlag && !hasCached;
  
  logger.log('Sync decision:', { 
    pathname, 
    syncedFlag, 
    hasCached, 
    needsSync 
  });
  
  return needsSync;
}

/**
 * Build sync URL with redirect parameter
 * CRITICAL: Validates redirect URL to prevent infinite loops
 * 
 * @param redirectTo - URL to redirect to after sync
 * @returns Sync URL with redirect query param
 */
export function buildSyncUrl(redirectTo: string): string {
  // Extract final destination to prevent nested sync URLs
  const finalDestination = extractFinalDestination(redirectTo);
  
  // If final destination is a sync URL itself, use default
  const cleanDestination = finalDestination.includes('/sync') ? '/dashboard' : finalDestination;
  
  const syncUrl = new URL('/dashboard/sync', window.location.origin);
  syncUrl.searchParams.set('redirect', cleanDestination);
  
  logger.log('Building sync URL:', { 
    original: redirectTo, 
    final: finalDestination,
    clean: cleanDestination,
    syncUrl: syncUrl.pathname + syncUrl.search 
  });
  
  return syncUrl.pathname + syncUrl.search;
}

/**
 * Extract the final destination from a potentially nested redirect URL
 * Prevents infinite loops by stripping out sync URLs
 * 
 * @param url - URL that might contain nested sync redirects
 * @returns Final destination URL without sync in the path
 */
function extractFinalDestination(url: string): string {
  try {
    // Parse the URL to extract pathname and query
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    
    // If the pathname itself is a sync URL, extract the redirect param
    if (pathname.includes('/sync')) {
      const nestedRedirect = searchParams.get('redirect');
      if (nestedRedirect) {
        // Recursively extract in case of multiple nesting levels
        return extractFinalDestination(nestedRedirect);
      }
      // If it's a sync URL without redirect param, use default
      return '/dashboard';
    }
    
    // Return the full path (pathname + search + hash)
    return pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    // If URL parsing fails, try to extract using string manipulation
    logger.warn('Failed to parse URL, using fallback extraction:', error);
    
    // Check if URL contains /sync
    if (url.includes('/sync')) {
      // Try to extract redirect parameter using regex
      const redirectMatch = url.match(/[?&]redirect=([^&]*)/);
      if (redirectMatch && redirectMatch[1]) {
        const decodedRedirect = decodeURIComponent(redirectMatch[1]);
        // Recursively extract in case of multiple nesting levels
        return extractFinalDestination(decodedRedirect);
      }
      // If no redirect found in sync URL, use default
      return '/dashboard';
    }
    
    // Return as-is if not a sync URL
    return url;
  }
}

/**
 * Get the intended redirect URL after sync
 * Priority: URL param > location state > default
 * CRITICAL: Prevents infinite redirect loops by extracting final destination
 * 
 * @param searchParams - URLSearchParams from current location
 * @param locationState - Location state object
 * @param defaultPath - Default path if no other source
 * @returns Intended destination URL
 */
export function getRedirectUrl(
  searchParams: URLSearchParams,
  locationState: { from?: { pathname: string; search?: string; hash?: string } } | null,
  defaultPath: string = '/dashboard'
): string {
  // 1. Check URL param first (highest priority)
  const redirectParam = searchParams.get('redirect');
  if (redirectParam) {
    const finalDestination = extractFinalDestination(redirectParam);
    logger.log('Redirect from URL param:', { original: redirectParam, final: finalDestination });
    return finalDestination;
  }
  
  // 2. Check location state (from ProtectedRoute)
  const fromLocation = locationState?.from;
  if (fromLocation?.pathname) {
    const fullPath = `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`;
    const finalDestination = extractFinalDestination(fullPath);
    logger.log('Redirect from location state:', { original: fullPath, final: finalDestination });
    return finalDestination;
  }
  
  // 3. Default path
  logger.log('Using default redirect:', defaultPath);
  return defaultPath;
}