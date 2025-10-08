import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import ResponsiveNavbar from '../ResponsiveNavbar';
import DetailSidebar from './DetailSidebar';

const DetailLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
