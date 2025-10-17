import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMonitoring } from '../hooks/useMonitoring';
import { isDataSyncNeeded, buildSyncUrl, getIntendedDestination } from '../utils/syncUtils';
import LoginPage from './LoginPage';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { state: monitoringState } = useMonitoring();

  if (isLoading) {
    return <LoginPage data-id-ref="public-route-login-page-loading" />;
  }

  if (isAuthenticated) {
    // Determine the intended destination
    const intendedDestination = getIntendedDestination(location);
    
    // Check if data sync is needed
    if (isDataSyncNeeded(monitoringState)) {
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