/**
 * Sync Utilities
 * Helper functions for determining when data synchronization is needed
 */

interface LocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

interface LocationInfo {
  pathname: string;
  search?: string;
  hash?: string;
  state?: LocationState;
}

/**
 * Determines if data synchronization is needed based on monitoring state
 * 
 * @param monitoringState - Current monitoring state from Redux
 * @returns true if sync is needed, false otherwise
 */
export function isDataSyncNeeded(monitoringState: {
  groups: unknown[];
  items: unknown[];
  groupsLoading: boolean;
  itemsLoading: boolean;
  isDataSynced: boolean;
}): boolean {
  const { groups, items, groupsLoading, itemsLoading, isDataSynced } = monitoringState;
  
  // If currently loading, don't need to sync again
  if (groupsLoading || itemsLoading) {
    return false;
  }
  
  // If data has been synced in this browser session, don't sync again
  if (isDataSynced) {
    return false;
  }
  
  // If we have both groups and items data, assume it's still valid
  // (this provides fallback for cases where localStorage might be cleared)
  if (groups.length > 0 && items.length > 0) {
    return false;
  }
  
  // Otherwise, sync is needed
  return true;
}

/**
 * Builds the sync URL with redirect parameter
 * 
 * @param redirectTo - URL to redirect to after sync completion
 * @returns Sync URL with redirect parameter
 */
export function buildSyncUrl(redirectTo: string): string {
  const syncUrl = new URL('/sync', window.location.origin);
  syncUrl.searchParams.set('redirect', redirectTo);
  return syncUrl.pathname + syncUrl.search;
}

/**
 * Determines if a path requires data synchronization
 * 
 * @param pathname - Current pathname
 * @returns true if the path requires synchronized data
 */
export function pathRequiresSync(pathname: string): boolean {
  // Paths that don't require sync
  // - /login, /sync, /dashboard/sync: Authentication and sync pages
  // - /profile, /settings, /dashboard/profile, /dashboard/settings: User-specific pages that work without monitoring data
  const noSyncPaths = ['/login', '/sync', '/dashboard/sync', '/profile', '/settings', '/dashboard/profile', '/dashboard/settings'];
  
  // Check if current path is in the no-sync list
  return !noSyncPaths.some(path => pathname.startsWith(path));
}

/**
 * Gets the intended destination URL from various sources
 * 
 * @param location - Current location object
 * @param defaultPath - Default path if no other source is found
 * @returns The intended destination URL
 */
export function getIntendedDestination(
  location: LocationInfo,
  defaultPath: string = '/dashboard'
): string {
  // Check location state for saved redirect
  const fromLoc = location.state?.from;
  
  if (fromLoc && fromLoc.pathname) {
    return `${fromLoc.pathname}${fromLoc.search || ''}${fromLoc.hash || ''}`;
  }
  
  // Use current location if it's not a login page
  if (location.pathname !== '/login' && location.pathname !== '/') {
    return `${location.pathname}${location.search || ''}${location.hash || ''}`;
  }
  
  return defaultPath;
}