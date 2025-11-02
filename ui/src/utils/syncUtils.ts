/**
 * Sync Utilities - Simplified for Login-Once Persistence
 * 
 * WORKFLOW:
 * - Fresh Login: Sync once, data persists in localStorage via Zustand
 * - Page Refresh: Use persisted data (NO sync)
 * - New Tab: Use persisted data (NO sync)
 * - Force Sync: User triggers from navbar, always sync
 * - Logout: Clear ALL localStorage data
 */

import { createLogger } from './logger';

const logger = createLogger('SyncUtils');

/**
 * Check if data is synced by reading from Zustand store
 * This flag is set ONCE after successful login sync and persists until logout
 * 
 * @returns Promise<boolean> - true if data has been synced, false otherwise
 */
export async function isDataSynced(): Promise<boolean> {
  try {
    // Import Zustand store dynamically to avoid circular dependencies
    const { useMonitoringStore } = await import('../stores/monitoringStore');
    const isSynced = useMonitoringStore.getState().isDataSynced;
    
    logger.log('Sync flag status:', { isSynced });
    return isSynced;
  } catch (error) {
    logger.error('Failed to read sync flag:', error);
    return false; // Default to not synced on error
  }
}

/**
 * Clear the sync flag cache (called on logout)
 * 
 * @internal Used during logout
 */
export function clearSyncFlagCache(): void {
  try {
    // Nothing to do - Zustand handles persistence automatically
    logger.log('Sync flag cache cleared (via Zustand)');
  } catch (error) {
    logger.warn('Failed to clear sync flag cache:', error);
  }
}

/**
 * Determines if sync is needed based on current page and sync status
 * 
 * SIMPLIFIED LOGIC: Only check sync flag, assume data persists after login
 * 
 * @param pathname - Current pathname
 * @param syncedFlag - Sync status flag from Zustand store (persisted to localStorage)
 * @returns true if sync is needed, false otherwise
 */
export function shouldRedirectToSync(pathname: string, syncedFlag: boolean): boolean {
  // Pages that don't require sync (already on sync page, login page, or user profile pages)
  const noSyncPages = ['/login', '/sync', '/dashboard/sync', '/dashboard/profile', '/dashboard/settings'];
  
  // If we're already on a no-sync page, don't redirect
  if (noSyncPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
    return false;
  }
  
  // Only sync if sync flag is false
  // Data persists in Zustand stores (localStorage) until logout, no need to check for cached data
  const needsSync = !syncedFlag;
  
  logger.log('Sync decision:', { 
    pathname, 
    syncedFlag, 
    needsSync 
  });
  
  return needsSync;
}

/**
 * Build sync URL with redirect parameter
 * Prevents nested sync URLs by extracting the final destination
 * 
 * @param redirectTo - URL to redirect to after sync
 * @param forceSync - Whether this is a force sync (defaults to false)
 * @returns Sync URL with redirect and force query params
 */
export function buildSyncUrl(redirectTo: string, forceSync: boolean = false): string {
  let cleanRedirect = redirectTo;
  
  // If redirectTo is already a sync URL, extract the redirect parameter
  if (redirectTo.includes('/sync')) {
    try {
      const url = new URL(redirectTo, window.location.origin);
      const existingRedirect = url.searchParams.get('redirect');
      if (existingRedirect) {
        // Use the existing redirect destination
        cleanRedirect = decodeURIComponent(existingRedirect);
        // Recursively extract in case of multiple nesting
        if (cleanRedirect.includes('/sync')) {
          return buildSyncUrl(cleanRedirect, forceSync);
        }
      } else {
        // Sync URL without redirect, use default
        cleanRedirect = '/dashboard';
      }
    } catch (error) {
      logger.warn('Failed to parse sync URL, using default:', error);
      cleanRedirect = '/dashboard';
    }
  }
  
  const syncUrl = new URL('/dashboard/sync', window.location.origin);
  syncUrl.searchParams.set('redirect', cleanRedirect);
  if (forceSync) {
    syncUrl.searchParams.set('force', 'true');
  }
  
  logger.log('Building sync URL:', { 
    original: redirectTo,
    cleanRedirect, 
    forceSync,
    syncUrl: syncUrl.pathname + syncUrl.search 
  });
  
  return syncUrl.pathname + syncUrl.search;
}

/**
 * Get the intended redirect URL after sync
 * Priority: URL param > location state > default
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
    logger.log('Redirect from URL param:', redirectParam);
    return redirectParam;
  }
  
  // 2. Check location state (from ProtectedRoute)
  const fromLocation = locationState?.from;
  if (fromLocation?.pathname) {
    const fullPath = `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`;
    logger.log('Redirect from location state:', fullPath);
    return fullPath;
  }
  
  // 3. Default path
  logger.log('Using default redirect:', defaultPath);
  return defaultPath;
}

/**
 * Check if this is a force sync request
 * 
 * @param searchParams - URLSearchParams from current location
 * @returns true if force sync is requested, false otherwise
 */
export function isForceSync(searchParams: URLSearchParams): boolean {
  const forceParam = searchParams.get('force');
  return forceParam === 'true';
}