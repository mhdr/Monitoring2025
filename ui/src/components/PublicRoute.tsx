import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isDataSynced, buildSyncUrl, getRedirectUrl } from '../utils/syncUtils';
import LoginPage from './LoginPage';

/**
 * PublicRoute - Clean login workflow
 * 
 * 1. Show LoginPage if not authenticated
 * 2. If authenticated, check if sync is needed
 * 3. Redirect to sync page if needed, otherwise go to intended destination
 */
const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  const [syncCheck, setSyncCheck] = useState<{ loading: boolean; needsSync: boolean }>({
    loading: true,
    needsSync: false,
  });

  // Check sync status if authenticated
  useEffect(() => {
    const checkSync = async () => {
      if (!isAuthenticated || isLoading) {
        setSyncCheck({ loading: false, needsSync: false });
        return;
      }

      try {
        // Read sync flag from Zustand store (persisted to localStorage)
        const syncedFlag = await isDataSynced();
        // We're on /login page, so check if we need to redirect to dashboard via sync
        const needsSync = !syncedFlag; // If not synced, we need to sync before going to dashboard
        
        setSyncCheck({ loading: false, needsSync });
      } catch (error) {
        console.error('Failed to check sync status:', error);
        // On error, assume sync is needed (safe default)
        setSyncCheck({ loading: false, needsSync: true });
      }
    };

    checkSync();
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking auth
  if (isLoading || (isAuthenticated && syncCheck.loading)) {
    return <LoginPage data-id-ref="public-route-login-page-loading" />;
  }

  if (isAuthenticated) {
    // Get intended destination from location state or default to dashboard
    const searchParams = new URLSearchParams(location.search);
    const intendedDestination = getRedirectUrl(
      searchParams,
      location.state as { from?: { pathname: string; search?: string; hash?: string } } | null,
      '/dashboard'
    );
    
    // Check if data sync is needed
    if (syncCheck.needsSync) {
      // Redirect to sync page with intended destination
      const syncUrl = buildSyncUrl(intendedDestination);
      return <Navigate to={syncUrl} replace data-id-ref="public-route-navigate-sync" />;
    }
    
    // If no sync needed, go directly to intended destination
    return <Navigate to={intendedDestination} replace data-id-ref="public-route-navigate-direct" />;
  }

  return <LoginPage data-id-ref="public-route-login-page" />;
};

export default PublicRoute;