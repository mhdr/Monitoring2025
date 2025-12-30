import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import MemorySidebar from './MemorySidebar';

/**
 * MemoryPage - Layout component for memory-related pages
 * Provides a sidebar for navigating between different memory types
 */
const MemoryPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
      data-id-ref="memory-page-root-container"
    >
      <MemorySidebar isOpen={sidebarOpen} onToggle={handleToggleSidebar} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'auto',
          backgroundColor: 'background.default',
        }}
        data-id-ref="memory-page-main-content"
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MemoryPage;
