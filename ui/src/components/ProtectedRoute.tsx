import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { isDataSynced, shouldRedirectToSync, buildSyncUrl } from '../utils/syncUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Clean sync workflow
 * 
 * 1. Check if user is authenticated
 * 2. Check if sync is needed by reading sync flag from IndexedDB
 * 3. Redirect to sync page if needed
 * 4. Otherwise, render the protected content
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
        // Read sync flag from IndexedDB
        const syncedFlag = await isDataSynced();
        const needsSync = shouldRedirectToSync(location.pathname, syncedFlag);
        
        setSyncCheck({ loading: false, needsSync });
      } catch (error) {
        console.error('Failed to check sync status:', error);
        // On error, assume sync is needed (safe default)
        setSyncCheck({ loading: false, needsSync: true });
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