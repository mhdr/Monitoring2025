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
} from '@mui/material';
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
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useUrlPrefetch } from '../hooks/useUrlPrefetch';
import { useItemAlarmStatus } from '../hooks/useItemAlarmStatus';
import { buildDetailTabUrl } from '../utils/detailRoutes';
import { createLogger } from '../utils/logger';
import type { Item, InterfaceType, ItemType } from '../types/api';
import { InterfaceTypeEnum, ItemTypeEnum } from '../types/api';
import ValueHistoryChart from './ValueHistoryChart';

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
        icon: <InputIcon sx={{ fontSize: 14 }} />, 
        translationKey: 'itemCard.itemTypes.digitalInput',
        color: 'primary' as const // Blue for digital input
      };
    case ItemTypeEnum.DigitalOutput:
      return { 
        icon: <OutputIcon sx={{ fontSize: 14 }} />, 
        translationKey: 'itemCard.itemTypes.digitalOutput',
        color: 'secondary' as const // Purple for digital output
      };
    case ItemTypeEnum.AnalogInput:
      return { 
        icon: <AnalogIcon sx={{ fontSize: 14 }} />, 
        translationKey: 'itemCard.itemTypes.analogInput',
        color: 'success' as const // Green for analog input
      };
    case ItemTypeEnum.AnalogOutput:
      return { 
        icon: <DigitalIcon sx={{ fontSize: 14 }} />, 
        translationKey: 'itemCard.itemTypes.analogOutput',
        color: 'warning' as const // Orange for analog output
      };
    default:
      return { 
        icon: <InputIcon sx={{ fontSize: 14 }} />, 
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
      icon: <EditIcon sx={{ fontSize: 14 }} />,
      translationKey: 'itemCard.editableStatus.editable',
      color: 'info' as const // Blue for editable
    };
  } else {
    return {
      icon: <LockIcon sx={{ fontSize: 14 }} />,
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
  const prefetchUrl = useUrlPrefetch();
  const [elevation, setElevation] = useState<number>(1);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);

  // Check if this item has active alarms
  const { hasAlarm, alarmPriority, isChecking } = useItemAlarmStatus({
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
    isChecking,
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
    // Open a new tab with the item detail page
    try {
      // Open in new tab
      window.open(detailUrl, '_blank');
    } catch (e) {
      // no-op - window may be undefined in some test environments
      // keep silent to avoid breaking UI; log warning in dev
      logger.warn('Could not open new tab', e);
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

  return (
    <>
      <Fade in timeout={300}>
        <Card
          elevation={elevation}
          onMouseEnter={() => setElevation(6)}
          onMouseLeave={() => setElevation(1)}
          sx={{
            height: '100%',
            position: 'relative',
            overflow: 'visible',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
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
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              marginBottom: 1.5,
            }}
            data-id-ref="item-card-header"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography
                variant="h6"
                component="h6"
                sx={{
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  flex: 1,
                  fontSize: '1rem',
                }}
                data-id-ref="item-card-title"
              >
                {name}
              </Typography>
              
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
                    icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />}
                    label={alarmPriority === 2 ? t('itemCard.highPriorityAlarm') : t('itemCard.lowPriorityAlarm')}
                    size="small"
                    color={alarmPriority === 2 ? 'error' : 'warning'}
                    sx={{
                      fontWeight: 600,
                      animation: 'alarm-badge-pulse 2s ease-in-out infinite',
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
            </Box>
            <Tooltip title={t('openInNewTab')} arrow placement="top">
              <IconButton
                onClick={handleOpenNewTab}
                onMouseEnter={handlePrefetch}
                aria-label={t('openInNewTab')}
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

          <Divider sx={{ marginBottom: 1.5 }} />

          {/* Body */}
          <Stack
            spacing={1}
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
                }}
                data-id-ref="item-card-label-value"
              >
                {t('value')}:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    color: 'text.secondary',
                    wordBreak: 'break-word',
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
                          sx={{ fontSize: 14, color: 'error.main' }} 
                          data-id-ref="item-card-trend-up-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (trend === 'down') {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendDecreasing')} arrow>
                        <TrendingDownIcon 
                          sx={{ fontSize: 14, color: 'success.main' }} 
                          data-id-ref="item-card-trend-down-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (valueHistory.length >= 2) {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendStable')} arrow>
                        <TrendingFlatIcon 
                          sx={{ fontSize: 14, color: 'text.disabled' }} 
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
                        sx={{ fontSize: 14, color: 'info.main' }} 
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
      data-id-ref="item-card-history-modal"
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1,
        }}
        data-id-ref="item-card-history-modal-title"
      >
        <Typography variant="h6" component="span" data-id-ref="item-card-history-modal-title-text">
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
      <DialogContent sx={{ pt: 2, pb: 2 }} data-id-ref="item-card-history-modal-content">
        <Box 
          sx={{ 
            width: '100%', 
            height: 500,
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
            />
          ) : (
            <Typography color="text.secondary" data-id-ref="item-card-history-no-data">
              {t('activeAlarmsPage.noHistoryData')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }} data-id-ref="item-card-history-modal-actions">
        <Button 
          onClick={() => setHistoryModalOpen(false)}
          variant="contained"
          data-id-ref="item-card-history-modal-close-action-button"
        >
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default ItemCard;
