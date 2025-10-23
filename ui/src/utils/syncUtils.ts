/**
 * Sync Utilities - Rebuilt from Scratch
 * Clean, simple logic for data synchronization workflow
 * 
 * WORKFLOW:
 * - Fresh Login: Always sync
 * - Logout: Clear all IndexedDB
 * - Page Refresh: Sync if flag = false
 * - New Tab: Sync if flag = false
 * - Force Sync: Always sync (from navbar)
 */

import { getItem } from './indexedDbStorage';
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
 * Determines if sync is needed based on current page and sync status
 * 
 * @param pathname - Current pathname
 * @param syncedFlag - Sync status flag from IndexedDB
 * @returns true if sync is needed, false otherwise
 */
export function shouldRedirectToSync(pathname: string, syncedFlag: boolean): boolean {
  // Pages that don't require sync (already on sync page, login page, or user profile pages)
  const noSyncPages = ['/login', '/sync', '/dashboard/sync', '/dashboard/profile', '/dashboard/settings'];
  
  // If we're already on a no-sync page, don't redirect
  if (noSyncPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
    return false;
  }
  
  // If data is not synced, redirect to sync
  return !syncedFlag;
}

/**
 * Build sync URL with redirect parameter
 * 
 * @param redirectTo - URL to redirect to after sync
 * @returns Sync URL with redirect query param
 */
export function buildSyncUrl(redirectTo: string): string {
  const syncUrl = new URL('/dashboard/sync', window.location.origin);
  syncUrl.searchParams.set('redirect', redirectTo);
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