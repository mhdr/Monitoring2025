import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ManagementSidebar from './ManagementSidebar';
import { useLanguage } from '../hooks/useLanguage';

const ManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Redirect to /dashboard/management/users if on base /dashboard/management route
  useEffect(() => {
    if (location.pathname === '/dashboard/management') {
      navigate('/dashboard/management/users', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      data-id-ref="management-page-root-container"
    >
      {/* Management Sidebar */}
      <ManagementSidebar 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          overflow: 'auto',
          marginInlineStart: sidebarOpen && !isMobile ? '280px' : 0,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
        data-id-ref="management-page-main-content-area"
      >
        {/* Check if we're on a sub-route */}
        {location.pathname !== '/dashboard/management' ? (
          <Outlet />
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 400,
              p: 3,
            }}
            data-id-ref="management-page-placeholder"
          >
            <Typography color="text.secondary">
              {t('management')} - Select an option from the sidebar
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ManagementPage;