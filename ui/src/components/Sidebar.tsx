import React, { useEffect, useRef, useState } from 'react';
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
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
  keyframes,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Warning as ActiveAlarmsIcon,
  Description as AlarmLogIcon,
  History as AuditTrailIcon,
  Settings as ManagementIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { createLogger } from '../utils/logger';
import { 
  areNotificationsEnabled, 
  showAlarmNotification, 
  formatAlarmNotificationMessage 
} from '../utils/notifications';
import { useNotificationStore } from '../stores/notificationStore';

const logger = createLogger('Sidebar');

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

// Pulse animation for badge when alarm count changes
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 6px rgba(211, 47, 47, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
  }
`;

  const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { state: monitoringState } = useMonitoring();
  const { alarmCount, fetchError, isFetching, highestPriority } = monitoringState.activeAlarms;
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { preferences } = useNotificationStore();
  
  // Log theme direction on mount to verify RTL is applied
  useEffect(() => {
    logger.log('[Sidebar] Theme direction initialized:', {
      direction: theme.direction,
      language: document.documentElement.lang,
      documentDir: document.documentElement.dir,
      isRTL: theme.direction === 'rtl'
    });
  }, [theme.direction]);
  
  // Track previous alarm count to trigger animation on change
  const prevAlarmCountRef = useRef<number>(alarmCount);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced animation trigger - prevents animation spam from rapid SignalR updates
  // FIXED: Only animate when alarm count actually increases (not on every polling update)
  useEffect(() => {
    // Only trigger animation if alarm count increased (not decreased or stayed same)
    const hasIncreasedAlarms = prevAlarmCountRef.current < alarmCount && alarmCount > 0;
    
    if (hasIncreasedAlarms) {
      // Clear any pending animation trigger
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce animation trigger by 1000ms
      debounceTimerRef.current = setTimeout(() => {
        setShouldAnimate(true);
        const animationTimer = setTimeout(() => setShouldAnimate(false), 1000);
        return () => clearTimeout(animationTimer);
      }, 1000);
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
    
    prevAlarmCountRef.current = alarmCount;
  }, [alarmCount]);

  // Desktop notification trigger - show notification when alarm count increases
  useEffect(() => {
    // Check if alarm count increased (not just changed)
    const hasNewAlarms = prevAlarmCountRef.current < alarmCount && alarmCount > 0;
    
    if (hasNewAlarms) {
      // Check both browser permission AND user preference
      const browserPermission = areNotificationsEnabled();
      const userEnabled = preferences.enabled;
      
      if (browserPermission && userEnabled) {
        const notificationOptions = formatAlarmNotificationMessage(alarmCount, highestPriority, t);
        showAlarmNotification(notificationOptions);
      }
    }
  }, [alarmCount, highestPriority, t, preferences.enabled]);

  const menuItems: MenuItem[] = [
    { path: '/dashboard/monitoring', key: 'monitoring', icon: <DashboardIcon /> },
    // { path: '/dashboard/plots', key: 'plots', icon: <PlotsIcon /> },
    { path: '/dashboard/active-alarms', key: 'activeAlarms', icon: <ActiveAlarmsIcon /> },
    { path: '/dashboard/alarm-log', key: 'alarmLog', icon: <AlarmLogIcon /> },
    { path: '/dashboard/audit-trail', key: 'auditTrail', icon: <AuditTrailIcon /> },
    // { path: '/dashboard/disabled-alarms', key: 'disabledAlarms', icon: <DisabledAlarmsIcon /> },
    // { path: '/dashboard/scheduler', key: 'scheduler', icon: <SchedulerIcon /> },
    // { path: '/dashboard/management', key: 'management', icon: <ManagementIcon /> },
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
      data-id-ref="sidebar-root-container"
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
        data-id-ref="sidebar-header"
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            letterSpacing: 0.5,
          }}
          data-id-ref="sidebar-title"
        >
          {t('dashboard')}
        </Typography>
        {isMobile && (
          <IconButton
            onClick={onToggle}
            edge="end"
            className="touch-target"
            aria-label={t('common.buttons.close')}
            size="small"
            data-id-ref="sidebar-toggle-close-btn"
            sx={{
              minWidth: { xs: 48, sm: 44 },
              minHeight: { xs: 48, sm: 44 },
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <CloseIcon data-id-ref="sidebar-toggle-close-icon" />
          </IconButton>
        )}
      </Box>

      <Divider data-id-ref="sidebar-divider" />

      {/* Navigation Menu */}
      <Box
        component="nav"
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
        }}
        data-id-ref="sidebar-nav"
      >
        <List sx={{ px: 1 }} data-id-ref="sidebar-nav-list">
          {menuItems.map((item) => {
            const active = isActive(item.path);

            return (
              <ListItem
                key={item.key}
                disablePadding
                sx={{ mb: 0.5 }}
                data-id-ref={`sidebar-nav-item-${item.key}`}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={active}
                  data-id-ref={`sidebar-nav-link-${item.key}`}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                    '&:hover': {
                      backgroundColor: active ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    data-id-ref={`sidebar-nav-icon-${item.key}`}
                    sx={{
                      minWidth: 40,
                      color: active ? 'primary.contrastText' : 'text.secondary',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {item.key === 'activeAlarms' ? (
                      <Tooltip 
                        title={
                          fetchError 
                            ? `${t('common.error')}: ${fetchError}` 
                            : isFetching 
                              ? t('loading') 
                              : ''
                        }
                        arrow
                        placement="right"
                        data-id-ref="sidebar-active-alarms-tooltip"
                      >
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          {/* FIXED: Always render Badge to prevent flicker, only hide when count is 0 */}
                          <Badge
                            badgeContent={alarmCount}
                            invisible={alarmCount === 0}
                            color={
                              fetchError 
                                ? 'warning' 
                                : highestPriority === 2 
                                  ? 'error' 
                                  : highestPriority === 1 
                                    ? 'warning' 
                                    : 'error'
                            }
                            max={999}
                            data-id-ref="sidebar-active-alarms-badge"
                            sx={{
                              '& .MuiBadge-badge': {
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                minWidth: 20,
                                height: 20,
                                animation: shouldAnimate ? `${pulseAnimation} 0.6s ease-in-out` : 'none',
                                transition: 'all 0.3s ease-in-out',
                              },
                            }}
                          >
                            {item.icon}
                          </Badge>
                          {/* Show loading spinner on top of icon when fetching */}
                          {isFetching && (
                            <CircularProgress 
                              size={20} 
                              thickness={4}
                              sx={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                marginTop: '-10px', 
                                marginLeft: '-10px',
                                color: active ? 'primary.contrastText' : 'primary.main',
                              }}
                              data-id-ref="sidebar-active-alarms-loading"
                            />
                          )}
                        </Box>
                      </Tooltip>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
                    data-id-ref={`sidebar-nav-text-${item.key}`}
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
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor={theme.direction === 'rtl' ? 'right' : 'left'}
      open={isOpen}
      onClose={onToggle}
      data-id-ref="sidebar-drawer"
      sx={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: theme.shadows[4],
          // Use logical properties for RTL support
          insetInlineStart: 0,
          insetInlineEnd: 'auto',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;