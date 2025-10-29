import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Stack,
  Divider,
  Tooltip,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Zoom,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  OpenInNew,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  Input as InputIcon,
  Output as OutputIcon,
  GraphicEq as AnalogIcon,
  ToggleOn as DigitalIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Settings as SettingsIcon,
  DriveFileMove as MoveItemIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useUrlPrefetch } from '../hooks/useUrlPrefetch';
import { useItemAlarmStatus } from '../hooks/useItemAlarmStatus';
import { useAuth } from '../hooks/useAuth';
import { useMonitoring } from '../hooks/useMonitoring';
import { buildDetailTabUrl } from '../utils/detailRoutes';
import { createLogger } from '../utils/logger';
import type { Item, InterfaceType, ItemType } from '../types/api';
import { InterfaceTypeEnum, ItemTypeEnum } from '../types/api';
import ValueHistoryChart from './ValueHistoryChart';
import ItemCommandDialog from './ItemCommandDialog';
import MoveItemDialog from './MoveItemDialog';
import EditItemDialog from './EditItemDialog';
import AlarmBadgePopover from './AlarmBadgePopover';
import { deletePoint } from '../services/monitoringApi';

const logger = createLogger('ItemCard');

/**
 * Get interface type display information with color coding
 */
const getInterfaceTypeInfo = (interfaceType: InterfaceType) => {
  switch (interfaceType) {
    case InterfaceTypeEnum.Sharp7:
      return { 
        short: 'S', 
        translationKey: 'itemCard.interfaceTypes.sharp7',
        color: 'info' as const // Blue for Siemens/Sharp7
      };
    case InterfaceTypeEnum.BACnet:
      return { 
        short: 'B', 
        translationKey: 'itemCard.interfaceTypes.bacnet',
        color: 'success' as const // Green for building automation
      };
    case InterfaceTypeEnum.Modbus:
      return { 
        short: 'M', 
        translationKey: 'itemCard.interfaceTypes.modbus',
        color: 'warning' as const // Orange for industrial protocol
      };
    case InterfaceTypeEnum.None:
    default:
      return { 
        short: 'N', 
        translationKey: 'itemCard.interfaceTypes.none',
        color: 'default' as const // Gray for no interface
      };
  }
};

/**
 * Get item type display information with icon and color coding
 */
const getItemTypeInfo = (itemType: ItemType) => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return { 
        icon: <InputIcon sx={{ fontSize: 14 }} data-id-ref="item-card-item-type-icon-digital-input" />, 
        translationKey: 'itemCard.itemTypes.digitalInput',
        color: 'primary' as const // Blue for digital input
      };
    case ItemTypeEnum.DigitalOutput:
      return { 
        icon: <OutputIcon sx={{ fontSize: 14 }} data-id-ref="item-card-item-type-icon-digital-output" />, 
        translationKey: 'itemCard.itemTypes.digitalOutput',
        color: 'secondary' as const // Purple for digital output
      };
    case ItemTypeEnum.AnalogInput:
      return { 
        icon: <AnalogIcon sx={{ fontSize: 14 }} data-id-ref="item-card-item-type-icon-analog-input" />, 
        translationKey: 'itemCard.itemTypes.analogInput',
        color: 'success' as const // Green for analog input
      };
    case ItemTypeEnum.AnalogOutput:
      return { 
        icon: <DigitalIcon sx={{ fontSize: 14 }} data-id-ref="item-card-item-type-icon-analog-output" />, 
        translationKey: 'itemCard.itemTypes.analogOutput',
        color: 'warning' as const // Orange for analog output
      };
    default:
      return { 
        icon: <InputIcon sx={{ fontSize: 14 }} data-id-ref="item-card-item-type-icon-default" />, 
        translationKey: 'itemCard.itemTypes.digitalInput',
        color: 'default' as const
      };
  }
};

/**
 * Get editable status display information with icon and color coding
 */
const getEditableStatusInfo = (isEditable: boolean) => {
  if (isEditable) {
    return {
      icon: <EditIcon sx={{ fontSize: 14 }} data-id-ref="item-card-editable-status-icon-editable" />,
      translationKey: 'itemCard.editableStatus.editable',
      color: 'info' as const // Blue for editable
    };
  } else {
    return {
      icon: <LockIcon sx={{ fontSize: 14 }} data-id-ref="item-card-editable-status-icon-readonly" />,
      translationKey: 'itemCard.editableStatus.readOnly',
      color: 'default' as const // Gray for read-only
    };
  }
};

interface ItemCardProps {
  itemId: string;
  name: string;
  pointNumber: number;
  value: string;
  time: string;
  valueHistory?: Array<{value: number; time: number}>;
  item?: Item;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
  itemId, 
  name, 
  pointNumber, 
  value, 
  time, 
  valueHistory = [],
  item 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { fetchGroups, fetchItems } = useMonitoring();
  const prefetchUrl = useUrlPrefetch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [elevation, setElevation] = useState<number>(1);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState<boolean>(false);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuPosition, setAdminMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [alarmBadgeAnchor, setAlarmBadgeAnchor] = useState<null | HTMLElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Check if user has admin role
  const isAdmin = useMemo(() => {
    if (!user || !user.roles) return false;
    const roles = user.roles.map(r => r.toLowerCase());
    return roles.includes('admin');
  }, [user]);

  // Check if this item has active alarms
  const { hasAlarm, alarmPriority, alarms, isChecking } = useItemAlarmStatus({
    itemId,
    enablePolling: true,
    pollingInterval: 30000, // Re-check every 30 seconds
  });

  logger.log('ItemCard render', { 
    itemId, 
    name, 
    historyLength: valueHistory.length,
    hasAlarm,
    alarmPriority,
    alarmCount: alarms.length,
    isChecking,
    isAdmin,
  });

  // Memoize the detail URL to avoid recalculating on every render
  const detailUrl = useMemo(
    () => buildDetailTabUrl('trend-analysis', { itemId }),
    [itemId]
  );

  /**
   * Get trend indicator for value change
   */
  const getValueTrend = useMemo((): 'up' | 'down' | 'stable' => {
    if (!valueHistory || valueHistory.length < 2) return 'stable';
    
    const currentValue = valueHistory[valueHistory.length - 1].value;
    const prevValue = valueHistory[valueHistory.length - 2].value;
    
    if (currentValue > prevValue) return 'up';
    if (currentValue < prevValue) return 'down';
    return 'stable';
  }, [valueHistory]);

  const handleOpenNewTab = () => {
    // On mobile (xs/sm), navigate in current tab for better UX
    // On desktop (md+), open in new tab
    try {
      if (isMobile) {
        // Mobile: navigate in same tab
        // detailUrl is absolute (with origin), but navigate() needs relative path
        const relativePath = detailUrl.replace(window.location.origin, '');
        navigate(relativePath);
      } else {
        // Desktop: open in new tab
        window.open(detailUrl, '_blank');
      }
    } catch (e) {
      // no-op - window may be undefined in some test environments
      // keep silent to avoid breaking UI; log warning in dev
      logger.warn('Could not open tab', e);
    }
  };

  const handlePrefetch = () => {
    // Start prefetching the detail page when user hovers
    // This loads resources BEFORE the click, significantly improving perceived performance
    prefetchUrl(detailUrl);
  };

  /**
   * Handle history icon click
   */
  const handleHistoryClick = () => {
    if (valueHistory && valueHistory.length > 1) {
      logger.log(`Opening history modal for item: ${name}`, { historyLength: valueHistory.length });
      setHistoryModalOpen(true);
    } else {
      logger.warn('Cannot open history: insufficient data', { 
        historyLength: valueHistory?.length || 0 
      });
    }
  };

  /**
   * Handle command button click - opens command dialog
   */
  const handleCommandClick = () => {
    logger.log(`Opening command dialog for editable item: ${name}`, { 
      itemId, 
      itemType: item?.itemType 
    });
    setCommandDialogOpen(true);
  };

  /**
   * Handle successful command sent
   */
  const handleCommandSent = (itemIdSent: string, value: string) => {
    logger.log('Command sent successfully from ItemCard', {
      itemId: itemIdSent,
      value,
      itemName: name,
    });
    // Optionally, you could trigger a refresh of the item value here
    // or show a success notification
  };

  /**
   * Alarm badge hover handlers
   */
  const handleAlarmBadgeMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (hasAlarm && alarms.length > 0) {
      setAlarmBadgeAnchor(event.currentTarget);
    }
  };

  const handleAlarmBadgeMouseLeave = () => {
    setAlarmBadgeAnchor(null);
  };

  const alarmPopoverOpen = Boolean(alarmBadgeAnchor);

  /**
   * Admin menu handlers - only for admin role
   */
  const handleCardContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault(); // Always prevent default browser context menu
    event.stopPropagation(); // Prevent event bubbling
    
    // Only show admin menu for admin users
    if (!isAdmin) {
      return;
    }
    
    // Capture event coordinates before any async operations
    const clickX = event.clientX;
    const clickY = event.clientY;
    const currentTarget = event.currentTarget;
    
    // Close any existing menu first
    if (adminMenuAnchor !== null) {
      logger.log('Closing existing admin menu before opening new one');
      
      // Use requestAnimationFrame to ensure state updates happen in the right order
      setAdminMenuAnchor(null);
      setAdminMenuPosition(null);
      
      // Wait for next frame to reopen
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          logger.log('Opening admin menu at new position', { 
            itemId, 
            itemName: name,
            x: clickX,
            y: clickY,
          });
          
          setAdminMenuAnchor(currentTarget);
          setAdminMenuPosition({
            top: clickY,
            left: clickX,
          });
        });
      });
    } else {
      logger.log('Opening admin menu via right-click', { 
        itemId, 
        itemName: name,
        x: clickX,
        y: clickY,
      });
      
      // Set anchor element and position under cursor
      setAdminMenuAnchor(currentTarget);
      setAdminMenuPosition({
        top: clickY,
        left: clickX,
      });
    }
  };

  const handleAdminMenuClose = () => {
    logger.log('Closing admin menu');
    setAdminMenuAnchor(null);
    setAdminMenuPosition(null);
  };

  const handleMoveItemToGroup = () => {
    logger.log('Opening move item dialog', { itemId, itemName: name });
    handleAdminMenuClose();
    setMoveDialogOpen(true);
  };

  const handleEditGroup = () => {
    logger.log('Opening edit item dialog', { itemId, itemName: name });
    handleAdminMenuClose();
    setEditDialogOpen(true);
  };

  const handleDeletePoint = () => {
    logger.log('Delete point clicked', { itemId, itemName: name });
    handleAdminMenuClose();
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirmClose = () => {
    logger.log('Delete confirmation dialog closed');
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    logger.log('Confirming deletion', { itemId, itemName: name });
    setIsDeleting(true);

    try {
      const response = await deletePoint({ id: itemId });
      
      if (response.isSuccess) {
        logger.log('Point deleted successfully', { itemId, itemName: name });
        setDeleteConfirmOpen(false);
        // Refresh data to remove the deleted item from UI
        await handleMoveSuccess();
      } else {
        logger.error('Failed to delete point - backend returned isSuccess=false', { 
          itemId, 
          itemName: name,
          response 
        });
        // Could show an error message to the user here
      }
    } catch (error) {
      logger.error('Error deleting point - exception caught:', { 
        itemId, 
        itemName: name,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Could show an error message to the user here
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle successful move or edit - refresh data without page reload
   */
  const handleMoveSuccess = async () => {
    logger.log('Item updated successfully, refreshing data', { itemId, itemName: name });
    try {
      // Refresh groups and items data from the server
      await Promise.all([fetchGroups(), fetchItems()]);
      logger.log('Data refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh data after item update', error);
      // Even if refresh fails, the operation succeeded, so just log it
    }
  };

  return (
    <>
      <Fade in timeout={300}>
        <Card
          elevation={elevation}
          onMouseEnter={() => setElevation(6)}
          onMouseLeave={() => setElevation(1)}
          onContextMenu={handleCardContextMenu}
          sx={{
            height: '100%',
            position: 'relative',
            overflow: 'visible',
            transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            // Visual hint for admin users that right-click is available
            ...(isAdmin && {
              cursor: 'context-menu',
            }),
            // Alarm state styling
            ...(hasAlarm && {
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: alarmPriority === 2 ? 'error.main' : 'warning.main',
              boxShadow: alarmPriority === 2 
                ? (theme) => `0 0 0 2px ${theme.palette.error.main}40, 0 0 20px ${theme.palette.error.main}30`
                : (theme) => `0 0 0 2px ${theme.palette.warning.main}40, 0 0 20px ${theme.palette.warning.main}30`,
              animation: 'alarm-pulse 2s ease-in-out infinite',
              '@keyframes alarm-pulse': {
                '0%, 100%': {
                  boxShadow: alarmPriority === 2 
                    ? (theme) => `0 0 0 2px ${theme.palette.error.main}40, 0 0 20px ${theme.palette.error.main}30`
                    : (theme) => `0 0 0 2px ${theme.palette.warning.main}40, 0 0 20px ${theme.palette.warning.main}30`,
                },
                '50%': {
                  boxShadow: alarmPriority === 2 
                    ? (theme) => `0 0 0 4px ${theme.palette.error.main}60, 0 0 30px ${theme.palette.error.main}50`
                    : (theme) => `0 0 0 4px ${theme.palette.warning.main}60, 0 0 30px ${theme.palette.warning.main}50`,
                },
              },
            }),
          }}
          data-id-ref="item-card-root-container"
        >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 2,
            '&:last-child': {
              paddingBottom: 2,
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'flex-start', md: 'center' },
              gap: { xs: 1.5, sm: 1.5, md: 1 },
              marginBottom: 1.5,
            }}
            data-id-ref="item-card-header"
          >
            {/* Title Row */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              gap: 1, 
              width: { xs: '100%', sm: '100%', md: 'auto' },
              flex: { xs: 'none', sm: 'none', md: 1 },
            }}>
              <Typography
                variant="h6"
                component="h6"
                sx={{
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  flex: 1,
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                }}
                data-id-ref="item-card-title"
              >
                {name}
              </Typography>
              
              {/* Action buttons on mobile - top right */}
              <Box sx={{ 
                display: { xs: 'flex', sm: 'flex', md: 'none' }, 
                alignItems: 'center', 
                gap: 0.5,
                flexShrink: 0,
              }}>
                {/* Command button - only show for editable items */}
                {item?.isEditable && (
                  <Tooltip title={t('itemCard.setCommand')} arrow placement="top">
                    <IconButton
                      onClick={handleCommandClick}
                      aria-label={t('itemCard.setCommand')}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: 'warning.main',
                          transform: 'scale(1.1)',
                        },
                      }}
                      data-id-ref="item-card-command-button"
                    >
                      <SettingsIcon fontSize="small" data-id-ref="item-card-command-icon" />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title={t(isMobile ? 'openDetails' : 'openInNewTab')} arrow placement="top">
                  <IconButton
                    onClick={handleOpenNewTab}
                    onMouseEnter={handlePrefetch}
                    aria-label={t(isMobile ? 'openDetails' : 'openInNewTab')}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'scale(1.1)',
                      },
                    }}
                    data-id-ref="item-card-open-new-tab-button"
                  >
                    <OpenInNew fontSize="small" data-id-ref="item-card-open-icon" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {/* Badges Row - separate row on mobile */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              flexWrap: 'wrap',
              width: { xs: '100%', sm: '100%', md: 'auto' },
            }}>
              {/* Item type indicator */}
              {item?.itemType !== undefined && (() => {
                const itemTypeInfo = getItemTypeInfo(item.itemType);
                const tooltipText = t(itemTypeInfo.translationKey);
                return (
                  <Tooltip 
                    title={tooltipText} 
                    arrow 
                    placement="top"
                  >
                    <Chip
                      icon={itemTypeInfo.icon}
                      size="small"
                      color={itemTypeInfo.color}
                      variant="outlined"
                      sx={{
                        height: 24,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        '& .MuiChip-icon': {
                          marginInlineStart: 1,
                          marginInlineEnd: -0.5,
                        },
                      }}
                      data-id-ref="item-card-item-type-indicator"
                    />
                  </Tooltip>
                );
              })()}

              {/* Interface type indicator */}
              {item?.interfaceType !== undefined && (() => {
                const interfaceInfo = getInterfaceTypeInfo(item.interfaceType);
                const tooltipText = t(interfaceInfo.translationKey);
                return (
                  <Tooltip 
                    title={tooltipText} 
                    arrow 
                    placement="top"
                  >
                    <Chip
                      label={interfaceInfo.short}
                      size="small"
                      color={interfaceInfo.color}
                      variant="filled"
                      sx={{
                        minWidth: 32,
                        height: 24,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: 1,
                      }}
                      data-id-ref="item-card-interface-type-indicator"
                    />
                  </Tooltip>
                );
              })()}

              {/* Editable status indicator */}
              {item?.isEditable !== undefined && (() => {
                const editableInfo = getEditableStatusInfo(item.isEditable);
                const tooltipText = t(editableInfo.translationKey);
                return (
                  <Tooltip 
                    title={tooltipText} 
                    arrow 
                    placement="top"
                  >
                    <Chip
                      icon={editableInfo.icon}
                      size="small"
                      color={editableInfo.color}
                      variant="outlined"
                      sx={{
                        height: 24,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        '& .MuiChip-icon': {
                          marginInlineStart: 1,
                          marginInlineEnd: -0.5,
                        },
                      }}
                      data-id-ref="item-card-editable-status-indicator"
                    />
                  </Tooltip>
                );
              })()}
              
              {/* Alarm badge indicator */}
              {hasAlarm && (
                <Zoom in timeout={300}>
                  <Chip
                    icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} data-id-ref="item-card-alarm-badge-icon" />}
                    label={alarmPriority === 2 ? t('itemCard.highPriorityAlarm') : t('itemCard.lowPriorityAlarm')}
                    size="small"
                    color={alarmPriority === 2 ? 'error' : 'warning'}
                    onMouseEnter={handleAlarmBadgeMouseEnter}
                    onMouseLeave={handleAlarmBadgeMouseLeave}
                    sx={{
                      fontWeight: 600,
                      animation: 'alarm-badge-pulse 2s ease-in-out infinite',
                      cursor: 'default',
                      '@keyframes alarm-badge-pulse': {
                        '0%, 100%': {
                          opacity: 1,
                        },
                        '50%': {
                          opacity: 0.7,
                        },
                      },
                    }}
                    data-id-ref="item-card-alarm-badge"
                  />
                </Zoom>
              )}
              
              {/* Action buttons on desktop - far right */}
              <Box sx={{ 
                display: { xs: 'none', sm: 'none', md: 'flex' }, 
                alignItems: 'center', 
                gap: 0.5,
                marginInlineStart: 'auto',
              }}>
                {/* Command button - only show for editable items */}
                {item?.isEditable && (
                  <Tooltip title={t('itemCard.setCommand')} arrow placement="top">
                    <IconButton
                      onClick={handleCommandClick}
                      aria-label={t('itemCard.setCommand')}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: 'warning.main',
                          transform: 'scale(1.1)',
                        },
                      }}
                      data-id-ref="item-card-command-button-desktop"
                    >
                      <SettingsIcon fontSize="small" data-id-ref="item-card-command-icon-desktop" />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title={t(isMobile ? 'openDetails' : 'openInNewTab')} arrow placement="top">
                  <IconButton
                    onClick={handleOpenNewTab}
                    onMouseEnter={handlePrefetch}
                    aria-label={t(isMobile ? 'openDetails' : 'openInNewTab')}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'scale(1.1)',
                      },
                    }}
                    data-id-ref="item-card-open-new-tab-button-desktop"
                  >
                    <OpenInNew fontSize="small" data-id-ref="item-card-open-icon-desktop" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ marginBottom: 1.5 }} data-id-ref="item-card-header-divider" />

          {/* Body */}
          <Stack
            spacing={{ xs: 0.75, sm: 1 }}
            sx={{ flex: 1 }}
            data-id-ref="item-card-body"
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-point-number"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
                data-id-ref="item-card-label-point-number"
              >
                {t('pointNumber')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
                data-id-ref="item-card-value-point-number"
              >
                {pointNumber}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-value"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
                data-id-ref="item-card-label-value"
              >
                {t('value')}:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    color: 'text.secondary',
                    wordBreak: 'break-word',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                  data-id-ref="item-card-value-value"
                >
                  {value}
                </Typography>
                {/* Trend indicator */}
                {valueHistory && valueHistory.length >= 2 && (() => {
                  const trend = getValueTrend;
                  if (trend === 'up') {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendIncreasing')} arrow>
                        <TrendingUpIcon 
                          sx={{ fontSize: { xs: 14, sm: 16 }, color: 'error.main' }} 
                          data-id-ref="item-card-trend-up-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (trend === 'down') {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendDecreasing')} arrow>
                        <TrendingDownIcon 
                          sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} 
                          data-id-ref="item-card-trend-down-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (valueHistory.length >= 2) {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendStable')} arrow>
                        <TrendingFlatIcon 
                          sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.disabled' }} 
                          data-id-ref="item-card-trend-flat-icon" 
                        />
                      </Tooltip>
                    );
                  }
                  return null;
                })()}
                {/* History chart icon */}
                {valueHistory && valueHistory.length > 1 && (
                  <Tooltip title={t('activeAlarmsPage.viewHistory')} arrow>
                    <IconButton 
                      size="small" 
                      sx={{ p: 0, ml: 0.5 }}
                      onClick={handleHistoryClick}
                      data-id-ref="value-history-icon"
                    >
                      <TimelineIcon 
                        sx={{ fontSize: { xs: 14, sm: 16 }, color: 'info.main' }} 
                        data-id-ref="value-history-timeline-icon" 
                      />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-time"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
                data-id-ref="item-card-label-time"
              >
                {t('time')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
                data-id-ref="item-card-value-time"
              >
                {time}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
    
    {/* Value History Modal */}
    <Dialog
      open={historyModalOpen}
      onClose={() => setHistoryModalOpen(false)}
      maxWidth="md"
      fullWidth
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 2, sm: 3 },
          maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
        },
      }}
      data-id-ref="item-card-history-modal"
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1,
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
        data-id-ref="item-card-history-modal-title"
      >
        <Typography 
          variant="h6" 
          component="span" 
          sx={{ 
            fontSize: { xs: '1rem', sm: '1.25rem' },
            pr: 2,
          }}
          data-id-ref="item-card-history-modal-title-text"
        >
          {t('activeAlarmsPage.historyModalTitle', { itemName: name })}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={() => setHistoryModalOpen(false)}
          aria-label={t('cancel')}
          size="small"
          data-id-ref="item-card-history-modal-close-button"
        >
          <CloseIcon data-id-ref="item-card-history-modal-close-icon" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent 
        sx={{ 
          pt: 2, 
          pb: 2,
          px: { xs: 2, sm: 3 },
        }} 
        data-id-ref="item-card-history-modal-content"
      >
        <Box 
          sx={{ 
            width: '100%', 
            height: { xs: 300, sm: 400, md: 500 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-id-ref="item-card-history-chart-container"
        >
          {valueHistory && valueHistory.length > 1 && item ? (
            <ValueHistoryChart
              history={valueHistory}
              item={item}
              itemName={name}
              height="100%"
              width="100%"
              data-id-ref="item-card-history-chart"
            />
          ) : (
            <Typography 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              data-id-ref="item-card-history-no-data"
            >
              {t('activeAlarmsPage.noHistoryData')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions 
        sx={{ 
          p: { xs: 2, sm: 2 },
        }} 
        data-id-ref="item-card-history-modal-actions"
      >
        <Button 
          onClick={() => setHistoryModalOpen(false)}
          variant="contained"
          fullWidth={false}
          sx={{
            minWidth: { xs: 80, sm: 100 },
          }}
          data-id-ref="item-card-history-modal-close-action-button"
        >
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Command Dialog */}
    {item && (
      <ItemCommandDialog
        open={commandDialogOpen}
        onClose={() => setCommandDialogOpen(false)}
        item={item}
        onCommandSent={handleCommandSent}
      />
    )}

    {/* Admin Menu */}
    <Menu
      open={Boolean(adminMenuAnchor) && adminMenuPosition !== null}
      onClose={handleAdminMenuClose}
      anchorReference="anchorPosition"
      anchorPosition={
        adminMenuPosition !== null
          ? { top: adminMenuPosition.top, left: adminMenuPosition.left }
          : undefined
      }
      MenuListProps={{
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        },
      }}
      data-id-ref="item-card-admin-menu"
    >
      <MenuItem onClick={handleMoveItemToGroup} data-id-ref="item-card-admin-menu-move-item">
        <ListItemIcon>
          <MoveItemIcon fontSize="small" data-id-ref="item-card-admin-menu-move-item-icon" />
        </ListItemIcon>
        <ListItemText primary={t('itemCard.adminMenu.moveItemToGroup')} />
      </MenuItem>
      <MenuItem onClick={handleEditGroup} data-id-ref="item-card-admin-menu-edit-point">
        <ListItemIcon>
          <EditIcon fontSize="small" data-id-ref="item-card-admin-menu-edit-point-icon" />
        </ListItemIcon>
        <ListItemText primary={t('itemCard.adminMenu.editPoint')} />
      </MenuItem>
      <MenuItem onClick={handleDeletePoint} data-id-ref="item-card-admin-menu-delete-point">
        <ListItemIcon>
          <DeleteIcon fontSize="small" data-id-ref="item-card-admin-menu-delete-point-icon" />
        </ListItemIcon>
        <ListItemText primary={t('itemCard.adminMenu.deletePoint')} />
      </MenuItem>
    </Menu>

    {/* Move Item Dialog */}
    <MoveItemDialog
      open={moveDialogOpen}
      onClose={() => setMoveDialogOpen(false)}
      itemId={itemId}
      itemName={name}
      currentGroupId={item?.groupId}
      onSuccess={handleMoveSuccess}
      data-id-ref="item-card-move-item-dialog"
    />

    {/* Edit Item Dialog */}
    <EditItemDialog
      open={editDialogOpen}
      onClose={() => setEditDialogOpen(false)}
      itemId={itemId}
      onSuccess={handleMoveSuccess}
      data-id-ref="item-card-edit-item-dialog"
    />

    {/* Alarm Badge Popover */}
    <AlarmBadgePopover
      anchorEl={alarmBadgeAnchor}
      open={alarmPopoverOpen}
      onClose={handleAlarmBadgeMouseLeave}
      alarms={alarms.map(alarm => ({
        alarmId: alarm.alarmId,
        priority: alarm.priority,
        message: alarm.message,
        messageFa: alarm.messageFa,
        activatedAt: alarm.activatedAt,
        dateTime: alarm.dateTime,
      }))}
      itemName={name}
    />

    {/* Delete Confirmation Dialog */}
    <Dialog
      open={deleteConfirmOpen}
      onClose={handleDeleteConfirmClose}
      data-id-ref="item-card-delete-confirm-dialog"
    >
      <DialogTitle data-id-ref="item-card-delete-confirm-title">
        {t('itemCard.deleteConfirm.title')}
      </DialogTitle>
      <DialogContent data-id-ref="item-card-delete-confirm-content">
        <Typography data-id-ref="item-card-delete-confirm-message">
          {t('itemCard.deleteConfirm.message')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-id-ref="item-card-delete-confirm-item-name">
          <strong>{t('itemCard.deleteConfirm.itemName')}:</strong> {name}
        </Typography>
      </DialogContent>
      <DialogActions data-id-ref="item-card-delete-confirm-actions">
        <Button
          onClick={handleDeleteConfirmClose}
          disabled={isDeleting}
          data-id-ref="item-card-delete-confirm-cancel-button"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirmDelete}
          color="error"
          variant="contained"
          disabled={isDeleting}
          data-id-ref="item-card-delete-confirm-delete-button"
        >
          {isDeleting ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default ItemCard;
