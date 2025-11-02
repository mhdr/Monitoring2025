import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Maximally Simplified
 * 
 * PRINCIPLE: If user is authenticated, data is in IndexedDB
 * 
 * 1. Check if user is authenticated
 * 2. If yes, render content (assume data is in IndexedDB)
 * 3. If no, redirect to login
 * 
 * SYNC WORKFLOW:
 * - Login page handles initial sync after authentication
 * - Data persists in IndexedDB until logout
 * - NO sync checks on route navigation
 * - Force sync available from navbar when needed
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Show loading state while checking auth
  if (authLoading) {
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

  // User is authenticated, render protected content
  // Data is assumed to be in IndexedDB
  return <>{children}</>;
};

export default ProtectedRoute;