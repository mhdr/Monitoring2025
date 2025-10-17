import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMonitoring } from '../hooks/useMonitoring';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { isDataSyncNeeded, buildSyncUrl, pathRequiresSync } from '../utils/syncUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { state: monitoringState } = useMonitoring();

  if (isLoading) {
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

  if (!isAuthenticated) {
    // Save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated and current path requires sync but data is not synced, redirect to sync
  if (pathRequiresSync(location.pathname) && isDataSyncNeeded(monitoringState)) {
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const syncUrl = buildSyncUrl(currentUrl);
    return <Navigate to={syncUrl} replace data-id-ref="protected-route-navigate-sync" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;