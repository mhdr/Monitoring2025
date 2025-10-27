import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { isDataSynced, hasCachedData, shouldRedirectToSync, buildSyncUrl } from '../utils/syncUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Clean sync workflow with cached data support
 * 
 * 1. Check if user is authenticated
 * 2. Check if cached data exists in IndexedDB
 * 3. Only redirect to sync if NO cached data exists
 * 4. Otherwise, render the protected content
 * 
 * NEW BEHAVIOR: Page refresh and new tabs use cached data without syncing
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  
  const [syncCheck, setSyncCheck] = useState<{ loading: boolean; needsSync: boolean }>({
    loading: true,
    needsSync: false,
  });

  // Check sync status on mount and when location changes
  useEffect(() => {
    const checkSync = async () => {
      // If auth is still loading, wait
      if (authLoading) {
        return;
      }

      // If not authenticated, no need to check sync - will redirect to login
      if (!isAuthenticated) {
        setSyncCheck({ loading: false, needsSync: false });
        return;
      }

      try {
        // Read sync flag and check for cached data in IndexedDB
        const [syncedFlag, hasCached] = await Promise.all([
          isDataSynced(),
          hasCachedData()
        ]);
        
        // Only sync if no cached data exists (prevents sync on page refresh/new tab)
        const needsSync = shouldRedirectToSync(location.pathname, syncedFlag, hasCached);
        
        setSyncCheck({ loading: false, needsSync });
      } catch (error) {
        console.error('Failed to check sync status:', error);
        // On error, check if we have cached data to fall back on
        try {
          const hasCached = await hasCachedData();
          if (hasCached) {
            // Have cached data, no need to sync
            setSyncCheck({ loading: false, needsSync: false });
          } else {
            // No cached data, sync is needed
            setSyncCheck({ loading: false, needsSync: true });
          }
        } catch {
          // Complete failure, assume sync is needed
          setSyncCheck({ loading: false, needsSync: true });
        }
      }
    };

    checkSync();
  }, [isAuthenticated, authLoading, location.pathname]);

  // Show loading state while checking auth or sync status
  if (authLoading || syncCheck.loading) {
    return (
      <Container
        maxWidth={false}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-id-ref="protected-route-loading-container"
      >
        <Box
          sx={{
            textAlign: 'center',
          }}
          data-id-ref="protected-route-loading-box"
        >
          <CircularProgress
            color="primary"
            sx={{ mb: 2 }}
            data-id-ref="protected-route-loading-spinner"
          />
          <Typography
            variant="body1"
            color="text.secondary"
            data-id-ref="protected-route-loading-text"
          >
            {t('loading')}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to sync if sync is needed
  if (syncCheck.needsSync) {
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const syncUrl = buildSyncUrl(currentUrl);
    return <Navigate to={syncUrl} replace data-id-ref="protected-route-navigate-sync" />;
  }

  // All checks passed, render protected content
  return <>{children}</>;
};

export default ProtectedRoute;