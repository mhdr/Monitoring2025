import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';

interface LocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoginPage data-id-ref="public-route-login-page-loading" />;
  }

  if (isAuthenticated) {
    // Check if there's a saved location from where the user was redirected
    const state = location.state as LocationState;
    const fromLoc = state?.from;
    if (fromLoc && fromLoc.pathname) {
      const target = `${fromLoc.pathname || '/dashboard'}${fromLoc.search || ''}${fromLoc.hash || ''}`;
      return <Navigate to={target} replace data-id-ref="public-route-navigate-redirect" />;
    }
    return <Navigate to="/dashboard" replace data-id-ref="public-route-navigate-dashboard" />;
  }

  return <LoginPage data-id-ref="public-route-login-page" />;
};

export default PublicRoute;