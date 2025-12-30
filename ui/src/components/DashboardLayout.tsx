import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import ResponsiveNavbar from './ResponsiveNavbar';
import Sidebar from './Sidebar';
import ManagementSidebar from './ManagementSidebar';
import MemorySidebar from './MemorySidebar';
import { useAuth } from '../hooks/useAuth';
import { useGlobalDataInitialization } from '../hooks/useGlobalDataInitialization';

const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { isAuthenticated } = useAuth();
  
  // Determine if we're on a management or memory route
  const isManagementRoute = location.pathname.startsWith('/dashboard/management');
  const isMemoryRoute = location.pathname.startsWith('/dashboard/memory');
  
  // Initialize global monitoring data (groups, items) when authenticated
  // This ensures data is available across all dashboard pages
  useGlobalDataInitialization(isAuthenticated);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
      data-id-ref="dashboard-layout-root-container"
    >
      {/* Conditional Sidebar - Show appropriate sidebar based on route */}
      {isManagementRoute ? (
        <ManagementSidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar}
        />
      ) : isMemoryRoute ? (
        <MemorySidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar}
        />
      ) : (
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar}
        />
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
        data-id-ref="dashboard-layout-main-content-area"
      >
        {/* Top Navigation */}
        <ResponsiveNavbar 
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            backgroundColor: 'background.default',
            height: 0, // This forces the flex item to respect flexGrow and not expand based on content
            minHeight: 0,
          }}
          data-id-ref="dashboard-layout-page-content-main"
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;