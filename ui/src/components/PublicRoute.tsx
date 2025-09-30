import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoginPage />;
  }

  if (isAuthenticated) {
    // Check if there's a saved location from where the user was redirected
    const state = location.state as LocationState;
    const from = state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <LoginPage />;
};

export default PublicRoute;