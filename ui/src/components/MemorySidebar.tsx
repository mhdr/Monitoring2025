import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Timer as TimerIcon,
  PrecisionManufacturing as PIDIcon,
  Calculate as CalculateIcon,
  Countertops as TotalizerIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CompareArrows as CompareArrowsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';

interface MemorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

const MemorySidebar: React.FC<MemorySidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const menuItems: MenuItem[] = [
    { path: '/dashboard/memory/timeout-memory', key: 'timeoutMemory.title', icon: <TimerIcon /> },
    { path: '/dashboard/memory/average-memory', key: 'averageMemory.title', icon: <CalculateIcon /> },
    { path: '/dashboard/memory/pid-memory', key: 'pidMemory.title', icon: <PIDIcon /> },
    { path: '/dashboard/memory/totalizer-memory', key: 'totalizerMemory.title', icon: <TotalizerIcon /> },
    { path: '/dashboard/memory/rateofchange-memory', key: 'rateOfChangeMemory.title', icon: <TrendingUpIcon /> },
    { path: '/dashboard/memory/schedule-memory', key: 'scheduleMemory.title', icon: <ScheduleIcon /> },
    { path: '/dashboard/memory/comparison-memory', key: 'comparisonMemory.title', icon: <CompareArrowsIcon /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onToggle();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
      data-id-ref="memory-sidebar-root-container"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 64,
        }}
        data-id-ref="memory-sidebar-header"
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            letterSpacing: 0.5,
          }}
          data-id-ref="memory-sidebar-title"
        >
          {t('memory')}
        </Typography>
        {isMobile && (
          <IconButton
            onClick={onToggle}
            edge="end"
            className="touch-target"
            aria-label={t('common.buttons.close')}
            size="small"
            data-id-ref="memory-sidebar-toggle-close-btn"
            sx={{
              minWidth: { xs: 48, sm: 44 },
              minHeight: { xs: 48, sm: 44 },
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <CloseIcon data-id-ref="memory-sidebar-toggle-close-icon" />
          </IconButton>
        )}
      </Box>

      <Divider data-id-ref="memory-sidebar-divider" />

      {/* Navigation Menu */}
      <Box
        component="nav"
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
        }}
        data-id-ref="memory-sidebar-nav"
      >
        <List sx={{ px: 1 }} data-id-ref="memory-sidebar-nav-list">
          {menuItems.map((item) => {
            const active = isActive(item.path);

            return (
              <ListItem
                key={item.key}
                disablePadding
                sx={{ mb: 0.5 }}
                data-id-ref={`memory-sidebar-nav-item-${item.key}`}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  data-id-ref={`memory-sidebar-nav-button-${item.key}`}
                  className="touch-target"
                  sx={{
                    borderRadius: 1.5,
                    minHeight: { xs: 48, sm: 44 },
                    px: 2,
                    py: 1.5,
                    backgroundColor: active ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: active ? 'primary.dark' : 'action.hover',
                    },
                    '& .MuiListItemIcon-root': {
                      color: active ? 'primary.contrastText' : 'text.secondary',
                    },
                  }}
                >
                  <ListItemIcon
                    data-id-ref={`memory-sidebar-nav-icon-${item.key}`}
                    sx={{
                      minWidth: 40,
                      color: active ? 'primary.contrastText' : 'text.secondary',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
                    data-id-ref={`memory-sidebar-nav-text-${item.key}`}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                      fontSize: '0.9rem',
                      sx: {
                        color: active ? 'primary.contrastText' : 'text.primary',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isOpen}
      onClose={onToggle}
      data-id-ref="memory-sidebar-drawer"
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          position: isMobile ? 'fixed' : 'relative',
          height: isMobile ? '100vh' : '100%',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default MemorySidebar;
