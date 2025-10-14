import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import ResponsiveNavbar from '../ResponsiveNavbar';
import DetailSidebar from './DetailSidebar';

const DetailLayout: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Initialize sidebar state based on screen size
  // Desktop (lg+): open by default, Mobile: closed by default
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
      data-id-ref="detail-layout-root-container"
    >
      {/* Detail Sidebar */}
      <DetailSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100vh',
        }}
        data-id-ref="detail-layout-main-content-area"
      >
        {/* Top Navigation */}
        <ResponsiveNavbar onToggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            backgroundColor: 'background.default',
          }}
          data-id-ref="detail-layout-page-content-main"
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DetailLayout;
