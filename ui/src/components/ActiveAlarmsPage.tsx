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
  Tooltip,
  Fade,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  SignalCellularAlt as SignalIcon,
  SignalCellularConnectedNoInternet0Bar as DisconnectedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useMonitoring } from '../hooks/useMonitoring';
import { getActiveAlarms } from '../services/monitoringApi';
import { getValues } from '../services/monitoringApi';
import type { ActiveAlarm, Item, AlarmDto, MultiValue } from '../types/api';
import { createLogger } from '../utils/logger';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';
import ValueHistoryChart from './ValueHistoryChart';

const logger = createLogger('ActiveAlarmsPage');

const ActiveAlarmsPage: React.FC = () => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { state, updateActiveAlarms } = useMonitoring();
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
  const [changedValues, setChangedValues] = useState<Set<string>>(new Set());
  const [valuesRefreshing, setValuesRefreshing] = useState<boolean>(false);
  const [valueHistory, setValueHistory] = useState<Map<string, Array<{value: number; time: number}>>>(new Map());
  
  // State for history modal
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<{
    item: Item;
    alarm: ActiveAlarm;
    history: Array<{value: number; time: number}>;
  } | null>(null);
  
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
        // Use Farsi message if language is Persian and Farsi message is available, otherwise use English message
        const displayMessage = (isRTL && alarm.messageFa) 
          ? alarm.messageFa 
          : (alarm.message || `${alarm.alarmType || 'Unknown'} Alarm`);
        map.set(alarm.id, displayMessage);
      }
    });
    logger.log('Created alarms lookup map:', { size: map.size });
    return map;
  }, [storedAlarms, isRTL]);

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
  const fetchInstantaneousValues = useCallback(async (activeAlarms: ActiveAlarm[], isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setValuesRefreshing(true);
      }
      
      logger.log('Fetching instantaneous values for alarmed items...', { isAutoRefresh });
      
      // Extract unique itemIds from alarms
      const itemIds = Array.from(new Set(
        activeAlarms
          .map(alarm => alarm.itemId)
          .filter((id): id is string => id !== null && id !== undefined)
      ));
      
      if (itemIds.length === 0) {
        logger.warn('No valid itemIds found in alarms');
        setItemValues([]);
        setValuesRefreshing(false);
        return;
      }
      
      logger.log('Fetching values for itemIds:', { count: itemIds.length, itemIds });
      
      // Call API with itemIds
      const response = await getValues({ itemIds });
      
      logger.log('Instantaneous values fetched successfully:', {
        count: response.values?.length || 0,
        values: response.values,
      });
      
      const newValues = response.values || [];
      
      // Track value changes by comparing with current itemValues
      const changed = new Set<string>();
      
      newValues.forEach(val => {
        if (val.itemId && val.value !== null) {
          const currentVal = itemValues.find(v => v.itemId === val.itemId);
          if (currentVal && currentVal.value !== val.value) {
            changed.add(val.itemId);
          }
        }
      });
      
      setChangedValues(changed);
      
      // Clear changed indicators after 2 seconds
      if (changed.size > 0) {
        setTimeout(() => {
          setChangedValues(new Set());
        }, 2000);
      }
      
      // Update value history using functional update (keep last 20 values per item)
      setValueHistory(prevHistory => {
        const nextHistory = new Map(prevHistory);
        
        newValues.forEach(val => {
          if (val.itemId && val.value !== null) {
            const numValue = parseFloat(val.value);
            if (!isNaN(numValue)) {
              const history = nextHistory.get(val.itemId) || [];
              history.push({ value: numValue, time: val.time });
              // Keep only last 20 values
              if (history.length > 20) {
                history.shift();
              }
              nextHistory.set(val.itemId, history);
            }
          }
        });
        
        return nextHistory;
      });
      
      setItemValues(newValues);
    } catch (err) {
      logger.error('Error fetching instantaneous values:', err);
      // Don't set error state - values are optional, alarms table is more important
      setItemValues([]);
    } finally {
      setValuesRefreshing(false);
    }
  }, [itemValues]); // Include itemValues for change detection

  /**
   * Fetch active alarms from API
   * 
   * IMPORTANT: Alarm Count Synchronization
   * This function fetches the authoritative alarm count from the REST API and updates
   * the MonitoringContext with the actual count. This ensures the sidebar badge count
   * (which initially comes from SignalR) converges to match the actual filtered alarms
   * for this user.
   * 
   * Why this is needed:
   * - SignalR broadcasts alarm count changes immediately (fast, but may not match user's view)
   * - REST API returns permission-filtered results (accurate, but slightly delayed)
   * - Brief mismatches are expected (eventual consistency)
   * - After API fetch, we update context with authoritative count
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
      
      // FIX: API returns nested structure {data: {data: ActiveAlarm[]}}
      // TypeScript types don't match the actual API response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alarmsData = (response as any).data.data || [];
      
      logger.log('Active alarms fetched successfully:', {
        count: alarmsData.length,
        alarms: alarmsData,
      });
      
      setAlarms(alarmsData);
      setLastFetchTime(Date.now());
      
      // Update the context's alarm count with the authoritative count from API
      // This ensures the sidebar badge matches the actual filtered alarms for this user
      updateActiveAlarms(alarmsData.length, Date.now());
      
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
  }, [t, fetchInstantaneousValues, updateActiveAlarms]);

  /**
   * Initial fetch on mount - with mount/unmount tracking
   */
  useEffect(() => {
    logger.log('⭐⭐⭐ ActiveAlarmsPage MOUNTED ⭐⭐⭐');
    fetchActiveAlarms(false);
    
    return () => {
      logger.log('❌❌❌ ActiveAlarmsPage UNMOUNTING ❌❌❌');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  /**
   * Re-fetch when SignalR stream reports alarm count change
   * Only refetch if alarm count changed and we're not already loading
   * 
   * NOTE: Eventual Consistency Behavior
   * - SignalR provides immediate alarm count updates (responsive UI)
   * - REST API provides authoritative alarm count (accurate, permission-filtered)
   * - Brief mismatches between sidebar badge and page count are expected
   * - After API fetch completes, we update the context with authoritative count
   * - This ensures both displays converge to the same value
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamData.lastUpdate, streamData.alarmCount]); // CRITICAL: Don't depend on lastFetchTime - it changes when we fetch, causing infinite loop

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
   * Get trend indicator for value change
   */
  const getValueTrend = useCallback((itemId: string, currentValue: string | null, history: Map<string, Array<{value: number; time: number}>>): 'up' | 'down' | 'stable' => {
    if (!currentValue) return 'stable';
    
    const itemHistory = history.get(itemId);
    if (!itemHistory || itemHistory.length < 2) return 'stable';
    
    const currentNum = parseFloat(currentValue);
    if (isNaN(currentNum)) return 'stable';
    
    const prevNum = itemHistory[itemHistory.length - 2].value;
    
    if (currentNum > prevNum) return 'up';
    if (currentNum < prevNum) return 'down';
    return 'stable';
  }, []);

  /**
   * Calculate threshold percentage for alarm visualization
   * Returns percentage (0-100) indicating how close value is to threshold
   */
  const getThresholdPercentage = useCallback((
    item: Item,
    alarm: AlarmDto | undefined,
    currentValue: string | null
  ): { percentage: number; color: string; labelKey: string; labelValue: string | number } | null => {
    if (!alarm || !currentValue || item.itemType === 1 || item.itemType === 2) {
      return null; // Digital items don't have thresholds
    }
    
    const numValue = parseFloat(currentValue);
    if (isNaN(numValue)) return null;
    
    const value1 = alarm.value1 ? parseFloat(alarm.value1) : null;
    const value2 = alarm.value2 ? parseFloat(alarm.value2) : null;
    
    // Get unit name based on language
    const unit = isRTL ? item.unitFa : item.unit;
    const unitText = unit ? ` ${unit}` : '';
    
    // CompareType: 3 = GreaterThan (High alarm), 4 = LessThan (Low alarm), 5 = InRange
    if (alarm.compareType === 3 && value1 !== null) {
      // High alarm - show how close to limit
      const percentage = Math.min(100, Math.max(0, (numValue / value1) * 100));
      const color = percentage >= 100 ? 'error' : percentage >= 90 ? 'warning' : 'success';
      return { percentage, color, labelKey: 'activeAlarmsPage.highLimit', labelValue: `${value1}${unitText}` };
    } else if (alarm.compareType === 4 && value1 !== null) {
      // Low alarm - show how far from limit
      const percentage = Math.min(100, Math.max(0, (numValue / value1) * 100));
      const color = percentage <= 0 ? 'error' : percentage <= 10 ? 'warning' : 'success';
      return { percentage, color, labelKey: 'activeAlarmsPage.lowLimit', labelValue: `${value1}${unitText}` };
    } else if (alarm.compareType === 5 && value1 !== null && value2 !== null) {
      // InRange alarm - show position in range
      const range = Math.abs(value2 - value1);
      const min = Math.min(value1, value2);
      const max = Math.max(value1, value2);
      const percentage = range > 0 ? ((numValue - min) / range) * 100 : 50;
      const color = numValue < min || numValue > max ? 'error' : 'success';
      return { percentage, color, labelKey: 'activeAlarmsPage.range', labelValue: `${min} - ${max}${unitText}` };
    }
    
    return null;
  }, [isRTL]);

  /**
   * Format alarm priority (AlarmPriority: 1 = Warning, 2 = Alarm)
   */
  const formatAlarmPriority = useCallback((priority: AlarmDto['alarmPriority']): string => {
    if (priority === 1) {
      return t('activeAlarmsPage.priorityWarning');
    } else if (priority === 2) {
      return t('activeAlarmsPage.priorityAlarm');
    }
    return '-';
  }, [t]);

  /**
   * Get color for alarm priority chip
   */
  const getPriorityColor = useCallback((priority: AlarmDto['alarmPriority']): 'warning' | 'error' | 'default' => {
    if (priority === 1) return 'warning';
    if (priority === 2) return 'error';
    return 'default';
  }, []);

  /**
   * Format compare type (CompareType: 1 = Equal, 2 = NotEqual, 3 = Higher, 4 = Lower, 5 = Between)
   */
  const formatCompareType = useCallback((compareType: AlarmDto['compareType']): string => {
    switch (compareType) {
      case 1:
        return t('activeAlarmsPage.conditionEqual');
      case 2:
        return t('activeAlarmsPage.conditionNotEqual');
      case 3:
        return t('activeAlarmsPage.conditionHigher');
      case 4:
        return t('activeAlarmsPage.conditionLower');
      case 5:
        return t('activeAlarmsPage.conditionBetween');
      default:
        return '-';
    }
  }, [t]);

  /**
   * Format alarm delay in seconds
   */
  const formatAlarmDelay = useCallback((delay: number | undefined): string => {
    if (delay === undefined || delay === null || delay === 0) {
      return t('activeAlarmsPage.noDelay');
    }
    return t('activeAlarmsPage.delaySeconds', { seconds: delay });
  }, [t]);

  /**
   * Format threshold value(s) based on compare type, with unit when available
   */
  const formatThreshold = useCallback((alarm: AlarmDto | undefined, item: Item | undefined): string => {
    if (!alarm) return '-';
    
    const value1 = alarm.value1;
    const value2 = alarm.value2;
    
    // Get unit name based on language
    const unit = item ? (isRTL ? item.unitFa : item.unit) : '';
    const unitText = unit ? ` ${unit}` : '';
    
    // CompareType: 5 = Between (needs both values), others need only value1
    if (alarm.compareType === 5 && value1 && value2) {
      return t('activeAlarmsPage.thresholdRange', { min: value1, max: value2 }) + unitText;
    } else if (value1) {
      return t('activeAlarmsPage.thresholdValue', { value: value1 }) + unitText;
    }
    
    return '-';
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
          fetchInstantaneousValues(alarms, true); // Pass true for auto-refresh
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
   * Handle history icon click
   */
  const handleHistoryClick = (alarm: ActiveAlarm) => {
    const item = storedItems.find(i => i.id === alarm.itemId);
    const history = valueHistory.get(alarm.itemId || '');
    
    if (item && history && history.length > 1) {
      logger.log(`Opening history modal for item: ${item.name}`, { historyLength: history.length });
      setSelectedHistoryItem({ item, alarm, history });
      setHistoryModalOpen(true);
    } else {
      logger.warn('Cannot open history: insufficient data', { 
        hasItem: !!item, 
        historyLength: history?.length || 0 
      });
    }
  };

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
                <CircularProgress size={48} sx={{ mb: 2 }} data-id-ref="active-alarms-loading-spinner" />
                <Typography variant="body1" color="text.secondary" data-id-ref="active-alarms-loading-text">
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
                <AlertTitle data-id-ref="active-alarms-error-title">{t('activeAlarmsPage.errorLoadingAlarms')}</AlertTitle>
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
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} data-id-ref="active-alarms-empty-icon" />
                <Typography variant="h6" gutterBottom data-id-ref="active-alarms-empty-title">
                  {t('activeAlarmsPage.noActiveAlarms')}
                </Typography>
                <Typography variant="body2" color="text.secondary" data-id-ref="active-alarms-empty-description">
                  {t('activeAlarmsPage.noActiveAlarmsDescription')}
                </Typography>
              </Box>
            )}

            {/* Alarms Table */}
            {!loading && !error && alarms.length > 0 && (
              <Box sx={{ flexGrow: 1 }} data-id-ref="active-alarms-content-container">
                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }} data-id-ref="active-alarms-count-container">
                  <Chip
                    icon={<WarningIcon data-id-ref="active-alarms-count-icon" />}
                    label={`${alarms.length} ${t('activeAlarmsPage.alarmCount')}`}
                    color="error"
                    data-id-ref="active-alarms-count-chip"
                  />
                  
                  {/* Color Legend for Threshold Indicators */}
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'background.default',
                      border: 1,
                      borderColor: 'divider',
                    }}
                    data-id-ref="active-alarms-legend-container"
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'text.secondary',
                        mb: 1,
                        display: 'block',
                      }}
                      data-id-ref="active-alarms-legend-title"
                    >
                      {t('activeAlarmsPage.thresholdIndicatorLegend')}:
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        gap: 2,
                        flexWrap: 'wrap',
                      }}
                      data-id-ref="active-alarms-legend-items"
                    >
                      {/* Green - Normal */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-id-ref="active-alarms-legend-normal">
                        <Box 
                          sx={{ 
                            width: 24, 
                            height: 8, 
                            bgcolor: 'success.main', 
                            borderRadius: 1,
                          }}
                          data-id-ref="active-alarms-legend-normal-bar"
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          {t('activeAlarmsPage.legendNormal')}
                        </Typography>
                      </Box>
                      
                      {/* Yellow - Warning */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-id-ref="active-alarms-legend-warning">
                        <Box 
                          sx={{ 
                            width: 24, 
                            height: 8, 
                            bgcolor: 'warning.main', 
                            borderRadius: 1,
                          }}
                          data-id-ref="active-alarms-legend-warning-bar"
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          {t('activeAlarmsPage.legendWarning')}
                        </Typography>
                      </Box>
                      
                      {/* Red - Critical */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-id-ref="active-alarms-legend-critical">
                        <Box 
                          sx={{ 
                            width: 24, 
                            height: 8, 
                            bgcolor: 'error.main', 
                            borderRadius: 1,
                          }}
                          data-id-ref="active-alarms-legend-critical-bar"
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          {t('activeAlarmsPage.legendCritical')}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
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
                        <TableCell data-id-ref="active-alarms-table-header-priority">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.priority')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-condition">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.condition')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-threshold">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.threshold')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-delay">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.delay')}
                          </Typography>
                        </TableCell>
                        <TableCell data-id-ref="active-alarms-table-header-external-alarm">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {t('activeAlarmsPage.externalAlarm')}
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
                        
                        // Get alarm details from storedAlarms
                        const alarmDto = storedAlarms.find(a => a.id === alarm.alarmId);
                        
                        return (
                          <React.Fragment key={alarm.id || `alarm-${index}`}>
                            <TableRow
                              hover
                              data-id-ref={`active-alarm-row-${index}`}
                            >
                              {/* Item Name */}
                              <TableCell data-id-ref={`active-alarm-item-name-${index}`}>
                                <Typography variant="body2">
                                  {itemName}
                                </Typography>
                              </TableCell>
                              
                              {/* Alarm Message */}
                              <TableCell data-id-ref={`active-alarm-message-${index}`}>
                                <Typography variant="body2">
                                  {alarmMessage}
                                </Typography>
                              </TableCell>
                              
                              {/* Priority */}
                              <TableCell data-id-ref={`active-alarm-priority-${index}`}>
                                <Chip
                                  label={formatAlarmPriority(alarmDto?.alarmPriority)}
                                  color={getPriorityColor(alarmDto?.alarmPriority)}
                                  size="small"
                                  sx={{ minWidth: 80 }}
                                  data-id-ref={`active-alarm-priority-chip-${index}`}
                                />
                              </TableCell>
                              
                              {/* Condition (Compare Type) */}
                              <TableCell data-id-ref={`active-alarm-condition-${index}`}>
                                <Typography variant="body2">
                                  {formatCompareType(alarmDto?.compareType)}
                                </Typography>
                              </TableCell>
                              
                              {/* Threshold */}
                              <TableCell data-id-ref={`active-alarm-threshold-${index}`}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: isRTL ? 'IRANSansX, sans-serif' : 'monospace',
                                  }}
                                >
                                  {formatThreshold(alarmDto, item)}
                                </Typography>
                              </TableCell>
                              
                              {/* Delay */}
                              <TableCell data-id-ref={`active-alarm-delay-${index}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-id-ref={`active-alarm-delay-box-${index}`}>
                                  {alarmDto?.alarmDelay && alarmDto.alarmDelay > 0 && (
                                    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} data-id-ref={`active-alarm-delay-icon-${index}`} />
                                  )}
                                  <Typography 
                                    variant="body2"
                                    sx={{ 
                                      fontFamily: isRTL ? 'IRANSansX, sans-serif' : undefined,
                                    }}
                                    data-id-ref={`active-alarm-delay-text-${index}`}
                                  >
                                    {formatAlarmDelay(alarmDto?.alarmDelay)}
                                  </Typography>
                                </Box>
                              </TableCell>
                              
                              {/* External Alarm */}
                              <TableCell data-id-ref={`active-alarm-external-${index}`}>
                                <Tooltip 
                                  title={alarmDto?.hasExternalAlarm 
                                    ? t('activeAlarmsPage.externalAlarmEnabled') 
                                    : t('activeAlarmsPage.externalAlarmDisabled')
                                  }
                                  arrow
                                >
                                  {alarmDto?.hasExternalAlarm ? (
                                    <NotificationsActiveIcon 
                                      sx={{ fontSize: 20, color: 'warning.main' }} 
                                      data-id-ref={`active-alarm-external-icon-active-${index}`}
                                    />
                                  ) : (
                                    <NotificationsOffIcon 
                                      sx={{ fontSize: 20, color: 'text.disabled' }} 
                                      data-id-ref={`active-alarm-external-icon-inactive-${index}`}
                                    />
                                  )}
                                </Tooltip>
                              </TableCell>
                              
                              {/* Triggered At */}
                              <TableCell data-id-ref={`active-alarm-time-${index}`}>
                                <Typography 
                                  variant="body2"
                                  sx={{ 
                                    fontFamily: isRTL ? 'IRANSansX, sans-serif' : undefined,
                                  }}
                                >
                                  {formatTimestamp(alarm.time)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          
                          {/* Instantaneous Values Row */}
                          {item && itemValue && (
                            <TableRow data-id-ref={`active-alarm-values-row-${index}`}>
                              <TableCell 
                                colSpan={8}
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
                                    flexDirection: 'column',
                                    gap: 1,
                                  }}
                                  data-id-ref={`active-alarm-values-container-${index}`}
                                >
                                  {/* Header with loading indicator */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref={`active-alarm-values-header-${index}`}>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontWeight: 600, 
                                        color: 'text.secondary',
                                      }}
                                      data-id-ref={`active-alarm-values-label-${index}`}
                                    >
                                      {t('activeAlarmsPage.instantaneousDataTitle')}:
                                    </Typography>
                                    {valuesRefreshing && (
                                      <CircularProgress size={12} thickness={4} data-id-ref={`active-alarm-values-spinner-${index}`} />
                                    )}
                                  </Box>
                                  
                                  {/* Values with trend indicators */}
                                  <Box 
                                    sx={{ 
                                      display: 'flex', 
                                      flexWrap: 'wrap', 
                                      gap: 2,
                                      alignItems: 'center',
                                    }}
                                    data-id-ref={`active-alarm-values-details-${index}`}
                                  >
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} data-id-ref={`active-alarm-point-number-box-${index}`}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }} data-id-ref={`active-alarm-point-number-label-${index}`}>
                                        {t('pointNumber')}:
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: 'text.secondary',
                                          fontFamily: isRTL ? 'IRANSansX, sans-serif' : undefined,
                                        }}
                                        data-id-ref={`active-alarm-point-number-value-${index}`}
                                      >
                                        {item.pointNumber}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} data-id-ref={`active-alarm-value-box-${index}`}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }} data-id-ref={`active-alarm-value-label-${index}`}>
                                        {t('value')}:
                                      </Typography>
                                      <Fade in={true} timeout={changedValues.has(alarm.itemId || '') ? 500 : 0}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-id-ref={`active-alarm-value-content-${index}`}>
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              color: changedValues.has(alarm.itemId || '') ? 'warning.main' : 'primary.main',
                                              fontWeight: 600,
                                              transition: 'color 0.3s ease-in-out',
                                              fontFamily: isRTL ? 'IRANSansX, sans-serif' : undefined,
                                            }}
                                            data-id-ref={`active-alarm-value-text-${index}`}
                                          >
                                            {formatItemValue(item, itemValue.value)}
                                          </Typography>
                                          {/* Trend indicator */}
                                          {(() => {
                                            const trend = getValueTrend(alarm.itemId || '', itemValue.value, valueHistory);
                                            if (trend === 'up') {
                                              return (
                                                <Tooltip title={t('activeAlarmsPage.trendIncreasing')} arrow>
                                                  <TrendingUpIcon sx={{ fontSize: 14, color: 'error.main' }} data-id-ref={`active-alarm-trend-up-icon-${index}`} />
                                                </Tooltip>
                                              );
                                            } else if (trend === 'down') {
                                              return (
                                                <Tooltip title={t('activeAlarmsPage.trendDecreasing')} arrow>
                                                  <TrendingDownIcon sx={{ fontSize: 14, color: 'success.main' }} data-id-ref={`active-alarm-trend-down-icon-${index}`} />
                                                </Tooltip>
                                              );
                                            } else if (valueHistory.get(alarm.itemId || '')?.length && valueHistory.get(alarm.itemId || '')!.length >= 2) {
                                              return (
                                                <Tooltip title={t('activeAlarmsPage.trendStable')} arrow>
                                                  <TrendingFlatIcon sx={{ fontSize: 14, color: 'text.disabled' }} data-id-ref={`active-alarm-trend-flat-icon-${index}`} />
                                                </Tooltip>
                                              );
                                            }
                                            return null;
                                          })()}
                                          {/* History chart icon */}
                                          {valueHistory.get(alarm.itemId || '')?.length && valueHistory.get(alarm.itemId || '')!.length > 1 && (
                                            <Tooltip title={t('activeAlarmsPage.viewHistory')} arrow>
                                              <IconButton 
                                                size="small" 
                                                sx={{ p: 0, ml: 0.5 }}
                                                onClick={() => handleHistoryClick(alarm)}
                                                data-id-ref={`value-history-icon-${index}`}
                                              >
                                                <TimelineIcon sx={{ fontSize: 14, color: 'info.main' }} data-id-ref={`value-history-timeline-icon-${index}`} />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Box>
                                      </Fade>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} data-id-ref={`active-alarm-time-box-${index}`}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }} data-id-ref={`active-alarm-time-label-${index}`}>
                                        {t('time')}:
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: 'text.secondary',
                                          fontFamily: isRTL ? 'IRANSansX, sans-serif' : undefined,
                                        }}
                                        data-id-ref={`active-alarm-time-value-${index}`}
                                      >
                                        {formatTimestamp(itemValue.time)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  {/* Threshold visualization with progress bar */}
                                  {(() => {
                                    const alarmDto = storedAlarms.find(a => a.id === alarm.alarmId);
                                    const thresholdInfo = getThresholdPercentage(item, alarmDto, itemValue.value);
                                    
                                    if (thresholdInfo) {
                                      const label = `${t(thresholdInfo.labelKey)}: ${thresholdInfo.labelValue}`;
                                      return (
                                        <Box sx={{ mt: 1 }} data-id-ref={`active-alarm-threshold-viz-${index}`}>
                                          {/* Progress bar */}
                                          <LinearProgress 
                                            variant="determinate" 
                                            value={thresholdInfo.percentage}
                                            color={thresholdInfo.color as 'success' | 'warning' | 'error'}
                                            sx={{ 
                                              height: 8, 
                                              borderRadius: 1,
                                              bgcolor: 'action.selected',
                                            }}
                                            data-id-ref={`active-alarm-threshold-progress-${index}`}
                                          />
                                          {/* Label with value */}
                                          <Box 
                                            sx={{ 
                                              display: 'flex', 
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              mt: 0.5,
                                            }}
                                            data-id-ref={`active-alarm-threshold-info-${index}`}
                                          >
                                            <Typography 
                                              variant="caption" 
                                              sx={{ 
                                                fontSize: '0.7rem', 
                                                color: 'text.secondary',
                                              }}
                                              data-id-ref={`active-alarm-threshold-label-${index}`}
                                            >
                                              {label}
                                            </Typography>
                                            <Typography 
                                              variant="caption" 
                                              sx={{ 
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: `${thresholdInfo.color}.main`,
                                              }}
                                              data-id-ref={`active-alarm-threshold-percentage-${index}`}
                                            >
                                              {Math.round(thresholdInfo.percentage)}%
                                            </Typography>
                                          </Box>
                                        </Box>
                                      );
                                    }
                                    return null;
                                  })()}
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

      {/* History Modal */}
      <Dialog
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        maxWidth="md"
        fullWidth
        data-id-ref="value-history-modal"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          data-id-ref="value-history-modal-title"
        >
          {selectedHistoryItem && t('activeAlarmsPage.historyModalTitle', { 
            itemName: isRTL && selectedHistoryItem.item.nameFa 
              ? selectedHistoryItem.item.nameFa 
              : selectedHistoryItem.item.name 
          })}
          <IconButton
            edge="end"
            color="inherit"
            onClick={() => setHistoryModalOpen(false)}
            aria-label="close"
            data-id-ref="value-history-modal-close-button"
          >
            <CloseIcon data-id-ref="value-history-modal-close-icon" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers data-id-ref="value-history-modal-content">
          {selectedHistoryItem && (
            <Box sx={{ height: 500, width: '100%' }} data-id-ref="value-history-chart-container">
              <ValueHistoryChart
                history={selectedHistoryItem.history}
                item={selectedHistoryItem.item}
                itemName={isRTL && selectedHistoryItem.item.nameFa 
                  ? selectedHistoryItem.item.nameFa 
                  : selectedHistoryItem.item.name}
                height="100%"
                width="100%"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions data-id-ref="value-history-modal-actions">
          <Button
            onClick={() => setHistoryModalOpen(false)}
            color="primary"
            variant="contained"
            data-id-ref="value-history-modal-close-action"
          >
            {t('common.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveAlarmsPage;
