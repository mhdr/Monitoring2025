/**
 * useSettingsVersion Hook
 * Fetches system settings version information for cache management
 * 
 * This hook provides settings version information to help clients determine
 * when to refresh cached settings data.
 * 
 * Features:
 * - Automatic fetching when user is authenticated
 * - Error handling and logging
 * - Returns version and userVersion for cache comparison
 * - Loading and error states
 * 
 * The Version field represents the global system settings version that changes
 * when system-wide configuration is updated. The UserVersion field is user-specific
 * and changes when that user's settings or permissions are modified.
 * 
 * Usage:
 * ```typescript
 * const { version, userVersion, loading, error, refetch } = useSettingsVersion();
 * 
 * // Compare with cached version to determine if refresh is needed
 * if (version !== cachedVersion) {
 *   // Refresh cached data
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { getSettingsVersion } from '../services/monitoringApi';
import type { SettingsVersionResponseDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSettingsVersion');

interface UseSettingsVersionReturn {
  /** Global system settings version */
  version: string | null | undefined;
  /** User-specific settings version */
  userVersion: string | null | undefined;
  /** Whether the version is currently being fetched */
  loading: boolean;
  /** Error that occurred during fetch, if any */
  error: Error | null;
  /** Manually trigger a refetch of the settings version */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage system settings version information
 * 
 * @param isAuthenticated - Whether user is authenticated (optional, defaults to true)
 * @returns Settings version information with loading and error states
 */
export function useSettingsVersion(isAuthenticated = true): UseSettingsVersionReturn {
  const [data, setData] = useState<SettingsVersionResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch settings version from API
   */
  const fetchVersion = useCallback(async () => {
    if (!isAuthenticated) {
      logger.log('Skipping fetch - user not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Fetching settings version');
      const response = await getSettingsVersion();
      
      setData(response);
      logger.log('Settings version fetched successfully', {
        version: response.version,
        userVersion: response.userVersion,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch settings version');
      logger.error('Failed to fetch settings version', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Fetch version on mount if authenticated
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchVersion();
    }
  }, [isAuthenticated, fetchVersion]);

  return {
    version: data?.version,
    userVersion: data?.userVersion,
    loading,
    error,
    refetch: fetchVersion,
  };
}
