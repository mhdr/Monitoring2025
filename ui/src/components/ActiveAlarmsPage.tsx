import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Container,
  Card,
  CardHeader,
  CardContent,
  Alert,
  AlertTitle,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  SignalCellularAlt as SignalIcon,
  SignalCellularConnectedNoInternet0Bar as DisconnectedIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useMonitoring } from '../hooks/useMonitoring';
import { getActiveAlarms } from '../services/monitoringApi';
import { getValues } from '../services/monitoringApi';
import type { ActiveAlarm, Item, AlarmDto, MultiValue } from '../types/api';
import { createLogger } from '../utils/logger';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';

const logger = createLogger('ActiveAlarmsPage');

const ActiveAlarmsPage: React.FC = () => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { state } = useMonitoring();
  const streamData = state.activeAlarms;
  const isRTL = language === 'fa';
  
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [storedItems, setStoredItems] = useState<Item[]>([]);
  const [storedAlarms, setStoredAlarms] = useState<AlarmDto[]>([]);
  
  // State for instantaneous values
  const [itemValues, setItemValues] = useState<MultiValue[]>([]);
  
  // Ref for value refresh interval
  const valuesIntervalRef = useRef<number | null>(null);

  /**
   * Create lookup maps for items and alarms
   * Maps ID -> Name/Message for quick lookup
   */
  const itemsMap = useMemo(() => {
    const map = new Map<string, string>();
    storedItems.forEach(item => {
      // Use name in current language (nameFa for Persian, name for English)
      const displayName = isRTL && item.nameFa ? item.nameFa : item.name;
      map.set(item.id, displayName);
    });
    logger.log('Created items lookup map:', { size: map.size });
    return map;
  }, [storedItems, isRTL]);

  const alarmsMap = useMemo(() => {
    const map = new Map<string, string>();
    storedAlarms.forEach(alarm => {
      if (alarm.id) {
        // Use alarm message as display name, or show alarm type as fallback
        const displayMessage = alarm.message || `${alarm.alarmType || 'Unknown'} Alarm`;
        map.set(alarm.id, displayMessage);
      }
    });
    logger.log('Created alarms lookup map:', { size: map.size });
    return map;
  }, [storedAlarms]);

  /**
   * Load items and alarms from IndexedDB on mount
   */
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        logger.log('Loading stored items and alarms from IndexedDB...');
        
        const [items, alarms] = await Promise.all([
          monitoringStorageHelpers.getStoredItems(),
          monitoringStorageHelpers.getStoredAlarms(),
        ]);
        
        if (items && Array.isArray(items)) {
          setStoredItems(items);
          logger.log('Loaded items from IndexedDB:', { count: items.length });
        } else {
          logger.warn('No valid items array found in IndexedDB');
          setStoredItems([]);
        }
        
        // FIX: IndexedDB stores the full response object with {data: AlarmDto[]}
        // We need to extract the data array
        let alarmsArray: AlarmDto[] = [];
        if (alarms) {
          if (Array.isArray(alarms)) {
            // Direct array
            alarmsArray = alarms;
          } else if (typeof alarms === 'object' && 'data' in alarms) {
            // Wrapped in response object
            const alarmsResponse = alarms as { data: AlarmDto[] };
            if (Array.isArray(alarmsResponse.data)) {
              alarmsArray = alarmsResponse.data;
            }
          }
        }
        
        if (alarmsArray.length > 0) {
          setStoredAlarms(alarmsArray);
          logger.log('Loaded alarms from IndexedDB:', { count: alarmsArray.length });
        } else {
          logger.warn('No alarms found in IndexedDB');
          setStoredAlarms([]);
        }
      } catch (err) {
        logger.error('Failed to load stored data from IndexedDB:', err);
        setStoredItems([]);
        setStoredAlarms([]);
      }
    };
    
    loadStoredData();
  }, []);

  /**
   * Fetch instantaneous values for items with active alarms
   */
  const fetchInstantaneousValues = useCallback(async (activeAlarms: ActiveAlarm[]) => {
    try {
      logger.log('Fetching instantaneous values for alarmed items...');
      
      // Extract unique itemIds from alarms
      const itemIds = Array.from(new Set(
        activeAlarms
          .map(alarm => alarm.itemId)
          .filter((id): id is string => id !== null && id !== undefined)
      ));
      
      if (itemIds.length === 0) {
        logger.warn('No valid itemIds found in alarms');
        setItemValues([]);
        return;
      }
      
      logger.log('Fetching values for itemIds:', { count: itemIds.length, itemIds });
      
      // Call API with itemIds
      const response = await getValues({ itemIds });
      
      logger.log('Instantaneous values fetched successfully:', {
        count: response.values?.length || 0,
        values: response.values,
      });
      
      setItemValues(response.values || []);
    } catch (err) {
      logger.error('Error fetching instantaneous values:', err);
      // Don't set error state - values are optional, alarms table is more important
      setItemValues([]);
    }
  }, []);

  /**
   * Fetch active alarms from API
   */
  const fetchActiveAlarms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        logger.log('Refreshing active alarms...');
      } else {
        setLoading(true);
        logger.log('Fetching active alarms...');
      }
      
      setError(null);
      
      // Get items from IndexedDB to extract itemIds
      logger.log('Retrieving items from IndexedDB...');
      const storedItems = await monitoringStorageHelpers.getStoredItems();
      
      if (!storedItems || storedItems.length === 0) {
        logger.warn('No items found in IndexedDB, cannot fetch active alarms');
        setError(t('activeAlarmsPage.noItemsAvailable'));
        setAlarms([]);
        setLastFetchTime(Date.now());
        return;
      }
      
      // Extract itemIds from stored items (using 'id' property)
      const itemIds = storedItems
        .map(item => item.id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      logger.log('Extracted itemIds from stored items:', {
        totalItems: storedItems.length,
        itemIdsCount: itemIds.length,
      });
      
      if (itemIds.length === 0) {
        logger.warn('No valid itemIds found in stored items');
        setError(t('activeAlarmsPage.noItemsAvailable'));
        setAlarms([]);
        setLastFetchTime(Date.now());
        return;
      }
      
      // Call API with itemIds parameter
      const response = await getActiveAlarms({ itemIds });
      
      logger.log('Active alarms fetched successfully:', {
        count: response.data?.length || 0,
        alarms: response.data,
      });
      
      // FIX: API returns nested structure {data: {data: ActiveAlarm[]}}
      // TypeScript types don't match the actual API response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarmsData = (response as any).data.data || [];
      setAlarms(alarmsData);
      setLastFetchTime(Date.now());
      
      // Fetch instantaneous values for alarmed items
      if (alarmsData.length > 0) {
        fetchInstantaneousValues(alarmsData);
      } else {
        // Clear values if no alarms
        setItemValues([]);
      }
    } catch (err) {
      logger.error('Error fetching active alarms:', err);
      setError(t('activeAlarmsPage.errorLoadingAlarms'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, fetchInstantaneousValues]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchActiveAlarms(false);
  }, [fetchActiveAlarms]);

  /**
   * Re-fetch when SignalR stream reports alarm count change
   * Only refetch if alarm count changed and we're not already loading
   */
  useEffect(() => {
    if (
      streamData.lastUpdate &&
      lastFetchTime &&
      streamData.lastUpdate > lastFetchTime &&
      !loading &&
      !refreshing
    ) {
      logger.log('Alarm count changed via stream, refetching active alarms...', {
        newCount: streamData.alarmCount,
        lastUpdate: streamData.lastUpdate,
        lastFetch: lastFetchTime,
      });
      fetchActiveAlarms(true);
    }
  }, [streamData.lastUpdate, streamData.alarmCount, lastFetchTime, loading, refreshing, fetchActiveAlarms]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = () => {
    fetchActiveAlarms(true);
  };

  /**
   * Format timestamp to readable format
   */
  const formatTimestamp = useCallback((timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
      return date.toLocaleString(isRTL ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (err) {
      logger.error('Error formatting timestamp:', err);
      return '-';
    }
  }, [isRTL]);

  /**
   * Format last updated time
   */
  const formattedLastUpdate = useMemo(() => {
    if (!lastFetchTime) return null;
    const date = new Date(lastFetchTime);
    return date.toLocaleTimeString(isRTL ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastFetchTime, isRTL]);

  /**
   * Helper function to get value for an item
   */
  const getItemValue = useCallback((itemId: string) => {
    return itemValues.find((v) => v.itemId === itemId);
  }, [itemValues]);

  /**
   * Helper function to format value based on item type
   */
  const formatItemValue = useCallback((item: Item, value: string | null) => {
    if (value === null || value === undefined) {
      return t('noValue');
    }

    // For digital items (type 1 or 2), show on/off text
    if (item.itemType === 1 || item.itemType === 2) {
      const boolValue = value === 'true' || value === '1';
      
      // Use Farsi text if language is Persian and Farsi text is available
      if (boolValue) {
        return (isRTL && item.onTextFa) ? item.onTextFa : (item.onText || t('on'));
      } else {
        return (isRTL && item.offTextFa) ? item.offTextFa : (item.offText || t('off'));
      }
    }

    // For analog items (type 3 or 4), show value with unit
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Use Farsi unit if language is Persian and Farsi unit is available
      const unit = (isRTL && item.unitFa) ? item.unitFa : (item.unit || '');
      return unit ? `${numValue} ${unit}` : numValue.toString();
    }

    return value;
  }, [t, isRTL]);

  /**
   * Setup automatic refresh of instantaneous values every 5 seconds
   */
  useEffect(() => {
    // Only start interval if we have alarms
    if (alarms.length > 0) {
      logger.log('Starting automatic value refresh interval (5 seconds)');
      
      // Clear any existing interval
      if (valuesIntervalRef.current) {
        window.clearInterval(valuesIntervalRef.current);
      }
      
      // Set up new interval
      valuesIntervalRef.current = window.setInterval(() => {
        if (alarms.length > 0) {
          logger.log('Auto-refreshing instantaneous values...');
          fetchInstantaneousValues(alarms);
        }
      }, 5000); // 5 seconds
      
      // Cleanup on unmount or when alarms change
      return () => {
        if (valuesIntervalRef.current) {
          logger.log('Clearing value refresh interval');
          window.clearInterval(valuesIntervalRef.current);
          valuesIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval if no alarms
      if (valuesIntervalRef.current) {
        logger.log('Clearing value refresh interval (no alarms)');
        window.clearInterval(valuesIntervalRef.current);
        valuesIntervalRef.current = null;
      }
    }
  }, [alarms, fetchInstantaneousValues]);

  /**
   * Render stream status indicator
   */
  const renderStreamStatus = () => {
    let icon: React.ReactNode;
    let label: string;
    let color: 'success' | 'error' | 'warning' | 'info';

    switch (streamData.streamStatus) {
      case 'connected':
        icon = <SignalIcon />;
        label = t('activeAlarmsPage.streamConnected');
        color = 'success';
        break;
      case 'connecting':
        icon = <CircularProgress size={16} />;
        label = t('activeAlarmsPage.streamConnecting');
        color = 'info';
        break;
      case 'error':
        icon = <ErrorIcon />;
        label = t('activeAlarmsPage.streamError');
        color = 'error';
        break;
      case 'disconnected':
      case 'idle':
      default:
        icon = <DisconnectedIcon />;
        label = t('activeAlarmsPage.streamDisconnected');
        color = 'warning';
        break;
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant="outlined"
        data-id-ref="active-alarms-stream-status-chip"
      />
    );
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
      data-id-ref="active-alarms-page-container"
    >
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} data-id-ref="active-alarms-page-content">
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          data-id-ref="active-alarms-page-card"
        >
          <CardHeader
            title={
              <Typography variant="h5" component="h1" data-id-ref="active-alarms-page-title">
                {t('activeAlarmsPage.title')}
              </Typography>
            }
            action={
              <Stack direction="row" spacing={1} alignItems="center" data-id-ref="active-alarms-header-actions">
                {renderStreamStatus()}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  size="small"
                  data-id-ref="active-alarms-refresh-button"
                >
                  {refreshing ? t('activeAlarmsPage.refreshing') : t('refresh')}
                </Button>
              </Stack>
            }
            subheader={
              formattedLastUpdate ? (
                <Typography variant="caption" color="text.secondary" data-id-ref="active-alarms-last-updated">
                  {`${t('activeAlarmsPage.lastUpdated')}: ${formattedLastUpdate}`}
                </Typography>
              ) : null
            }
            data-id-ref="active-alarms-page-header"
          />
          <Divider />
          <CardContent
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
            data-id-ref="active-alarms-page-body"
          >
            {/* Loading State */}
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                }}
                data-id-ref="active-alarms-loading-state"
              >
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {t('activeAlarmsPage.loadingAlarms')}
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {!loading && error && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={handleRefresh} data-id-ref="active-alarms-error-retry">
                    {t('activeAlarmsPage.retryLoading')}
                  </Button>
                }
                data-id-ref="active-alarms-error-alert"
              >
                <AlertTitle>{t('activeAlarmsPage.errorLoadingAlarms')}</AlertTitle>
                {error}
              </Alert>
            )}

            {/* Empty State */}
            {!loading && !error && alarms.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                }}
                data-id-ref="active-alarms-empty-state"
              >
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('activeAlarmsPage.noActiveAlarms')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('activeAlarmsPage.noActiveAlarmsDescription')}
                </Typography>
              </Box>
            )}

            {/* Alarms Table */}
            {!loading && !error && alarms.length > 0 && (
              <Box sx={{ flexGrow: 1 }} data-id-ref="active-alarms-content-container">
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<WarningIcon />}
                    label={`${alarms.length} ${t('activeAlarmsPage.alarmCount')}`}
                    color="error"
                    data-id-ref="active-alarms-count-chip"
                  />
                </Box>

                <TableContainer component={Paper} variant="outlined" data-id-ref="active-alarms-table-wrapper">
                  <Table size="small" data-id-ref="active-alarms-table">
                    <TableHead data-id-ref="active-alarms-table-head">
                      <TableRow>
                        <TableCell data-id-ref="active-alarms-table-header-item-name">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.itemName')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-alarm-message">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.alarmMessage')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-triggered-at">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.triggeredAt')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody data-id-ref="active-alarms-table-body">
                      {alarms.map((alarm, index) => {
                        // Lookup alarm message from alarmsMap
                        const alarmMessage = alarm.alarmId 
                          ? (alarmsMap.get(alarm.alarmId) || alarm.alarmId)
                          : '-';
                        
                        // Lookup item name from itemsMap
                        const itemName = alarm.itemId 
                          ? (itemsMap.get(alarm.itemId) || alarm.itemId)
                          : '-';
                        
                        // Get corresponding item details and value
                        const item = storedItems.find(i => i.id === alarm.itemId);
                        const itemValue = alarm.itemId ? getItemValue(alarm.itemId) : null;
                        
                        return (
                          <React.Fragment key={alarm.id || `alarm-${index}`}>
                            <TableRow
                              hover
                              data-id-ref={`active-alarm-row-${index}`}
                            >
                              <TableCell data-id-ref={`active-alarm-item-name-${index}`}>
                                <Typography variant="body2">
                                  {itemName}
                                </Typography>
                              </TableCell>
                            <TableCell data-id-ref={`active-alarm-message-${index}`}>
                              <Typography variant="body2">
                                {alarmMessage}
                              </Typography>
                            </TableCell>
                            <TableCell data-id-ref={`active-alarm-time-${index}`}>
                              <Typography variant="body2">{formatTimestamp(alarm.time)}</Typography>
                            </TableCell>
                          </TableRow>
                          
                          {/* Instantaneous Values Row */}
                          {item && itemValue && (
                            <TableRow data-id-ref={`active-alarm-values-row-${index}`}>
                              <TableCell 
                                colSpan={3} 
                                sx={{ 
                                  bgcolor: 'action.hover',
                                  borderBottom: index < alarms.length - 1 ? 1 : 0,
                                  borderColor: 'divider',
                                }}
                                data-id-ref={`active-alarm-values-cell-${index}`}
                              >
                                <Box 
                                  sx={{ 
                                    py: 1, 
                                    px: 1,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                    alignItems: 'center',
                                  }}
                                  data-id-ref={`active-alarm-values-container-${index}`}
                                >
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontWeight: 600, 
                                      color: 'text.secondary',
                                      minWidth: '120px',
                                    }}
                                    data-id-ref={`active-alarm-values-label-${index}`}
                                  >
                                    {t('activeAlarmsPage.instantaneousDataTitle')}:
                                  </Typography>
                                  
                                  <Box 
                                    sx={{ 
                                      display: 'flex', 
                                      flexWrap: 'wrap', 
                                      gap: 2,
                                      flex: 1,
                                    }}
                                    data-id-ref={`active-alarm-values-details-${index}`}
                                  >
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {t('pointNumber')}:
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {item.pointNumber}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {t('value')}:
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: 'primary.main', 
                                          fontWeight: 600,
                                        }}
                                      >
                                        {formatItemValue(item, itemValue.value)}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {t('time')}:
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {formatTimestamp(itemValue.time)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ActiveAlarmsPage;
