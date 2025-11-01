import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
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
  Badge,
  CircularProgress,
  Tooltip,
  keyframes,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendAnalysisIcon,
  TableChart as DataTableIcon,
  MonitorHeart as LiveMonitoringIcon,
  Warning as ActiveAlarmsDetailIcon,
  Description as AlarmLogDetailIcon,
  Assessment as AuditTrailDetailIcon,
  NotificationsActive as AlarmsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useMonitoring } from '../../hooks/useMonitoring';

interface DetailSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  key: string;
  icon: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

// Pulse animation for alarm badge
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

const DetailSidebar: React.FC<DetailSidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { state: monitoringState } = useMonitoring();
  const { alarmCount, fetchError, isFetching, highestPriority } = monitoringState.activeAlarms;
  
  // Track previous alarm count to trigger animation on change
  const prevAlarmCountRef = useRef<number>(alarmCount);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced animation trigger - prevents animation spam from rapid SignalR updates
  useEffect(() => {
    if (prevAlarmCountRef.current !== alarmCount && alarmCount > 0) {
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
      
      prevAlarmCountRef.current = alarmCount;
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
    prevAlarmCountRef.current = alarmCount;
  }, [alarmCount]);

  // Get itemId from URL query string
  const itemId = searchParams.get('itemId');

  // Build full path with query string for each menu item
  const menuItemsWithQuery = useMemo(() => {
    const menuItems: MenuItem[] = [
      { path: '/item-detail/trend-analysis', key: 'trendAnalysis', icon: <TrendAnalysisIcon /> },
      { path: '/item-detail/data-table', key: 'dataTable', icon: <DataTableIcon /> },
      { path: '/item-detail/live-monitoring', key: 'liveMonitoring', icon: <LiveMonitoringIcon /> },
      { path: '/item-detail/alarms', key: 'alarmsDetail', icon: <AlarmsIcon /> },
      { path: '/item-detail/active-alarms', key: 'activeAlarmsDetail', icon: <ActiveAlarmsDetailIcon /> },
      { path: '/item-detail/alarm-log', key: 'alarmLogDetail', icon: <AlarmLogDetailIcon /> },
      { path: '/item-detail/audit-trail', key: 'auditTrailDetail', icon: <AuditTrailDetailIcon /> },
      // { path: '/item-detail/management', key: 'managementDetail', icon: <ManagementDetailIcon /> },
    ];

    return menuItems.map((item) => ({
      ...item,
      fullPath: itemId ? `${item.path}?itemId=${itemId}` : item.path,
    }));
  }, [itemId]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (fullPath: string) => {
    navigate(fullPath);
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
      data-id-ref="detail-sidebar-root-container"
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
        data-id-ref="detail-sidebar-header"
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            letterSpacing: 0.5,
          }}
          data-id-ref="detail-sidebar-title"
        >
          {t('itemDetailTitle')}
        </Typography>
        {isMobile && (
          <IconButton
            onClick={onToggle}
            edge="end"
            aria-label={t('common.buttons.close')}
            size="small"
            data-id-ref="detail-sidebar-toggle-close-btn"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <CloseIcon data-id-ref="detail-sidebar-toggle-close-icon" />
          </IconButton>
        )}
      </Box>

      <Divider data-id-ref="detail-sidebar-divider" />

      {/* Navigation Menu */}
      <Box
        component="nav"
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
        }}
        data-id-ref="detail-sidebar-nav"
      >
        <List sx={{ px: 1 }} data-id-ref="detail-sidebar-nav-list">
          {menuItemsWithQuery.map((item) => {
            const active = isActive(item.path);

            return (
              <ListItem
                key={item.key}
                disablePadding
                sx={{ mb: 0.5 }}
                data-id-ref={`detail-sidebar-nav-item-${item.key}`}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.fullPath)}
                  selected={active}
                  data-id-ref={`detail-sidebar-nav-link-${item.key}`}
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
                    data-id-ref={`detail-sidebar-nav-icon-${item.key}`}
                    sx={{
                      minWidth: 40,
                      color: active ? 'primary.contrastText' : 'text.secondary',
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {item.key === 'activeAlarmsDetail' ? (
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
                        data-id-ref="detail-sidebar-active-alarms-tooltip"
                      >
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          {isFetching ? (
                            <CircularProgress 
                              size={20} 
                              thickness={4}
                              sx={{ color: active ? 'primary.contrastText' : 'text.secondary' }}
                              data-id-ref="detail-sidebar-active-alarms-spinner"
                            />
                          ) : null}
                          {alarmCount > 0 && !isFetching ? (
                            <Badge
                              badgeContent={alarmCount}
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
                              data-id-ref="detail-sidebar-active-alarms-badge"
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
                          ) : (
                            item.icon
                          )}
                        </Box>
                      </Tooltip>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
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
      anchor="left"
      open={isOpen}
      onClose={onToggle}
      data-id-ref="detail-sidebar-drawer"
      sx={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: theme.shadows[4],
          // Fix RTL positioning issue
          left: '0 !important',
          right: 'auto !important',
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

export default DetailSidebar;
