import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  ButtonGroup,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Inbox as InboxIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { getAlarmHistory } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';
import type { AlarmHistoryRequestDto, AlarmHistory, Item, AlarmDto } from '../types/api';
import SeparatedDateTimePicker from './SeparatedDateTimePicker';
import { monitoringStorageHelpers } from '../utils/monitoringStorage';

// Use LazyAGGrid component for optimized AG Grid loading
import LazyAGGrid from './LazyAGGrid';
import { useAGGrid } from '../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi, AGGridColumnDef } from '../types/agGrid';
import { formatDate } from '../utils/dateFormatting';

const logger = createLogger('AlarmLogPage');

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const AlarmLogPage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [alarmHistoryData, setAlarmHistoryData] = useState<AlarmHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last24Hours');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateRangeCollapsed, setDateRangeCollapsed] = useState<boolean>(isMobile);
  
  // IndexedDB data for enrichment
  const [itemsMap, setItemsMap] = useState<Map<string, Item>>(new Map());
  const [alarmsMap, setAlarmsMap] = useState<Map<string, AlarmDto>>(new Map());

  // AG Grid integration
  const { exportToCsv, exportToExcel, handleGridReady } = useAGGrid();
  const gridRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  const onGridReadyInternal = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    gridRef.current = api;
    columnApiRef.current = colApi;
    handleGridReady(api, colApi);
  }, [handleGridReady]);

  // Helper function to format condition string based on alarm and item data
  const formatCondition = useCallback((alarm: AlarmDto | undefined, item: Item | undefined): string => {
    if (!alarm || !item) {
      return '';
    }

    const compareType = alarm.compareType;
    const value1 = alarm.value1 || '';
    const value2 = alarm.value2 || '';
    const unit = language === 'fa' ? (item.unitFa || item.unit || '') : (item.unit || '');

    // CompareType: 1 = Equal, 2 = NotEqual, 3 = Higher, 4 = Lower, 5 = Between
    switch (compareType) {
      case 1: // Equal
        return `${t('activeAlarmsPage.conditionEqual')} ${value1} ${unit}`;
      case 2: // NotEqual
        return `${t('activeAlarmsPage.conditionNotEqual')} ${value1} ${unit}`;
      case 3: // Higher
        return `${t('activeAlarmsPage.conditionHigher')} ${value1} ${unit}`;
      case 4: // Lower
        return `${t('activeAlarmsPage.conditionLower')} ${value1} ${unit}`;
      case 5: // Between
        return `${t('activeAlarmsPage.conditionBetween')} ${value1} ${t('and')} ${value2} ${unit}`;
      default:
        return '';
    }
  }, [language, t]);

  // Load items and alarms from IndexedDB on component mount
  useEffect(() => {
    const loadIndexedDBData = async () => {
      try {
        logger.log('Loading items and alarms from IndexedDB');
        
        const [items, alarms] = await Promise.all([
          monitoringStorageHelpers.getStoredItems(),
          monitoringStorageHelpers.getStoredAlarms(),
        ]);

        if (items) {
          const itemsMapData = new Map<string, Item>();
          items.forEach(item => {
            if (item.id) {
              itemsMapData.set(item.id, item);
            }
          });
          setItemsMap(itemsMapData);
          logger.log('Items loaded from IndexedDB', { count: itemsMapData.size });
        }

        if (alarms) {
          logger.log('Alarms data received from IndexedDB', { 
            isArray: Array.isArray(alarms), 
            count: Array.isArray(alarms) ? alarms.length : 'N/A',
            hasDataProperty: 'data' in alarms,
            sample: Array.isArray(alarms) && alarms.length > 0 ? alarms[0] : null
          });
          
          // Handle both array and object with data property
          const alarmsArray = Array.isArray(alarms) 
            ? alarms 
            : (alarms as { data?: AlarmDto[] })?.data;
          
          if (Array.isArray(alarmsArray)) {
            const alarmsMapData = new Map<string, AlarmDto>();
            alarmsArray.forEach((alarm: AlarmDto) => {
              if (alarm.id) {
                alarmsMapData.set(alarm.id, alarm);
              }
            });
            setAlarmsMap(alarmsMapData);
            logger.log('Alarms loaded from IndexedDB', { count: alarmsMapData.size });
          } else {
            logger.warn('Alarms data is not in expected format', { type: typeof alarmsArray });
          }
        } else {
          logger.warn('No alarms found in IndexedDB');
        }
      } catch (err) {
        logger.error('Error loading data from IndexedDB:', err);
      }
    };

    loadIndexedDBData();
  }, []);

  // Calculate Unix timestamps based on date range
  const getDateRange = useMemo(() => {
    const now = Math.floor(Date.now() / 1000); // Current time in Unix seconds
    let startDate: number;
    let endDate: number = now;

    switch (selectedPreset) {
      case 'last24Hours':
        startDate = now - 24 * 60 * 60; // 24 hours ago
        break;
      case 'last7Days':
        startDate = now - 7 * 24 * 60 * 60; // 7 days ago
        break;
      case 'last30Days':
        startDate = now - 30 * 24 * 60 * 60; // 30 days ago
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = Math.floor(new Date(customStartDate).getTime() / 1000);
          endDate = Math.floor(new Date(customEndDate).getTime() / 1000);
        } else {
          // Default to last 24 hours if custom dates not set
          startDate = now - 24 * 60 * 60;
        }
        break;
      default:
        startDate = now - 24 * 60 * 60;
    }

    return { startDate, endDate };
  }, [selectedPreset, customStartDate, customEndDate]);

  // Fetch alarm history data
  const fetchAlarmHistoryData = async () => {
    setError(null);
    setLoading(true);

    try {
      const { startDate, endDate } = getDateRange;

      // Validate date range
      if (startDate >= endDate) {
        setError(t('invalidDateRange'));
        setLoading(false);
        return;
      }

      const request: AlarmHistoryRequestDto = {
        // itemIds will be automatically extracted from IndexedDB by the API function
        startDate,
        endDate,
      };

      // Fetch alarm history from API
      const result = await getAlarmHistory(request);
      
      // Update alarm history data and stop loading
      setAlarmHistoryData(result.data || []);
      setError(null); // Clear any previous errors
      setLoading(false);
      
      logger.log('Alarm history data fetched successfully', { 
        count: result.data?.length || 0,
        startDate,
        endDate 
      });
    } catch (err) {
      logger.error('Error fetching alarm history data:', err);
      setError(t('errorLoadingData'));
      setLoading(false);
    }
  };

  // Fetch data on mount and when preset changes (not when custom dates change)
  useEffect(() => {
    fetchAlarmHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  // Convert Unix timestamp to datetime-local format for input
  const unixToDateTimeLocal = (unix: number): string => {
    const date = new Date(unix * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Initialize custom dates when switching to custom preset
  useEffect(() => {
    if (selectedPreset === 'custom' && !customStartDate && !customEndDate) {
      const { startDate, endDate } = getDateRange;
      setCustomStartDate(unixToDateTimeLocal(startDate));
      setCustomEndDate(unixToDateTimeLocal(endDate));
    }
  }, [selectedPreset, customStartDate, customEndDate, getDateRange]);

  // Prepare AG Grid column definitions
  const columnDefs = useMemo<AGGridColumnDef[]>(() => {
    return [
      {
        field: 'itemName',
        headerName: t('activeAlarmsPage.itemName'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
      {
        field: 'alarmLog',
        headerName: t('alarmMessage'),
        flex: 3,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
      {
        field: 'isActive',
        headerName: t('alarmStatus'),
        flex: 1,
        sortable: true,
        filter: true,
        resizable: true,
        cellRenderer: (params: { value: boolean }) => {
          const isActive = params.value;
          return (
            <Chip
              label={isActive ? t('active') : t('inactive')}
              color={isActive ? 'error' : 'default'}
              size="small"
              data-id-ref={`alarm-status-chip-${isActive ? 'active' : 'inactive'}`}
            />
          );
        },
      },
      {
        field: 'condition',
        headerName: t('activeAlarmsPage.condition'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
      {
        field: 'timeFormatted',
        headerName: t('time'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        sort: 'desc', // Default sort by time descending (newest first)
      },
    ];
  }, [t]);

  // Prepare AG Grid row data
  const rowData = useMemo(() => {
    return alarmHistoryData.map((alarm, index) => {
      const timeFormatted = formatDate(alarm.time, language, 'short');

      // Get item and alarm from IndexedDB maps
      const item = alarm.itemId ? itemsMap.get(alarm.itemId) : undefined;
      const alarmConfig = alarm.alarmId ? alarmsMap.get(alarm.alarmId) : undefined;

      // Get alarm message based on language
      // Priority: 
      // 1. AlarmDto messageFa (Persian) / message (English) from alarm configuration
      // 2. alarmLog JSON Message field (fallback - usually English only)
      // 
      // NOTE: If Persian messages are not showing, ensure that alarm configurations
      // in the database have the messageFa field populated. This can be done through
      // the Management page when creating or editing alarms.
      let alarmMessage = '';
      if (alarmConfig) {
        // Use messageFa for Persian, message for English
        alarmMessage = language === 'fa' 
          ? (alarmConfig.messageFa || alarmConfig.message || '')
          : (alarmConfig.message || '');
        
        // Log when Persian message is missing but we're in Persian mode
        if (language === 'fa' && !alarmConfig.messageFa && alarmConfig.message) {
          logger.warn('[AlarmLogPage] Persian message (messageFa) not found for alarm, using English message', {
            alarmId: alarm.alarmId,
            englishMessage: alarmConfig.message
          });
        }
      }
      
      // Fallback to alarmLog JSON if no message in alarm config
      if (!alarmMessage && alarm.alarmLog) {
        try {
          const alarmLogData = JSON.parse(alarm.alarmLog);
          alarmMessage = alarmLogData.Message || alarm.alarmLog;
        } catch {
          logger.warn('[AlarmLogPage] Failed to parse alarmLog JSON', { alarmLog: alarm.alarmLog });
          alarmMessage = alarm.alarmLog;
        }
      }

      // Get item name based on language
      const itemName = item 
        ? (language === 'fa' ? (item.nameFa || item.name) : item.name)
        : alarm.itemId || '';

      // Format condition string
      const condition = formatCondition(alarmConfig, item);

      return {
        id: alarm.id || `alarm-${index}`,
        alarmId: alarm.alarmId || '',
        itemId: alarm.itemId || '',
        itemName,
        condition,
        time: alarm.time,
        timeFormatted,
        isActive: alarm.isActive,
        alarmLog: alarmMessage,
      };
    });
  }, [alarmHistoryData, language, itemsMap, alarmsMap, formatCondition]);

  return (
    <Box 
      data-id-ref="alarm-log-page-container" 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        p: isMobile ? 1 : 3,
        maxWidth: '100%',
      }}
    >
      {/* Date Range Selection Card */}
      <Card data-id-ref="alarm-log-date-range-card" sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" data-id-ref="alarm-log-date-range-title">
            {t('dateRange')}
          </Typography>
          {/* Toggle button visible only on mobile */}
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setDateRangeCollapsed((s) => !s)}
              aria-expanded={!dateRangeCollapsed}
              data-id-ref="alarm-log-date-range-collapse-button"
            >
              {dateRangeCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
        </Box>

        {/* Card body: hidden on mobile when collapsed */}
        <Collapse in={!isMobile || !dateRangeCollapsed}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }} data-id-ref="alarm-log-date-range-card-body">
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-end' },
                gap: 2,
              }}
            >
              {/* Preset Buttons */}
              <ButtonGroup
                variant="outlined"
                size="small"
                sx={{ flexWrap: 'wrap' }}
                data-id-ref="alarm-log-date-range-preset-buttons"
              >
                <Button
                  variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPreset('last24Hours')}
                  data-id-ref="alarm-log-preset-last-24-hours"
                >
                  {t('last24Hours')}
                </Button>
                <Button
                  variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPreset('last7Days')}
                  data-id-ref="alarm-log-preset-last-7-days"
                >
                  {t('last7Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPreset('last30Days')}
                  data-id-ref="alarm-log-preset-last-30-days"
                >
                  {t('last30Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPreset('custom')}
                  data-id-ref="alarm-log-preset-custom"
                >
                  {t('customRange')}
                </Button>
              </ButtonGroup>

              {/* Custom Date Range Picker (only shown when custom is selected) */}
              {selectedPreset === 'custom' && (
                <>
                  <SeparatedDateTimePicker
                    id="alarm-log-custom-start-date"
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    data-id-ref="alarm-log-custom-start-date"
                    className=""
                    dateLabel={t('startDate')}
                    timeLabel={t('startTime')}
                  />
                  <SeparatedDateTimePicker
                    id="alarm-log-custom-end-date"
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    data-id-ref="alarm-log-custom-end-date"
                    className=""
                    dateLabel={t('endDate')}
                    timeLabel={t('endTime')}
                  />
                </>
              )}

              {/* Refresh Button */}
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={fetchAlarmHistoryData}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                data-id-ref="alarm-log-refresh-button"
                sx={{ ml: { md: 'auto' } }}
              >
                {t('refresh')}
              </Button>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Data Grid Card */}
      <Card data-id-ref="alarm-log-data-grid-card" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: isMobile ? 2 : 3 }}>
          {/* Toolbar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="h6" data-id-ref="alarm-log-grid-title">
              {t('alarmLog')}
              {alarmHistoryData.length > 0 && (
                <Chip
                  label={alarmHistoryData.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                  data-id-ref="alarm-log-count-chip"
                />
              )}
            </Typography>

            {/* Export Buttons */}
            <ButtonGroup variant="outlined" size="small" data-id-ref="alarm-log-export-buttons">
              <Button
                onClick={() => exportToCsv(`alarm-log-${Date.now()}.csv`)}
                disabled={loading || alarmHistoryData.length === 0}
                startIcon={<DescriptionIcon />}
                data-id-ref="alarm-log-export-csv-button"
              >
                {t('exportCsv')}
              </Button>
              <Button
                onClick={() => exportToExcel(`alarm-log-${Date.now()}.xlsx`)}
                disabled={loading || alarmHistoryData.length === 0}
                startIcon={<FileDownloadIcon />}
                data-id-ref="alarm-log-export-excel-button"
              >
                {t('exportExcel')}
              </Button>
            </ButtonGroup>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              icon={<WarningIcon />}
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
              data-id-ref="alarm-log-error-alert"
            >
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
              data-id-ref="alarm-log-loading-state"
            >
              <CircularProgress size={60} />
              <Typography variant="body1" color="text.secondary">
                {t('loadingData')}
              </Typography>
            </Box>
          )}

          {/* Empty State */}
          {!loading && !error && alarmHistoryData.length === 0 && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
              data-id-ref="alarm-log-empty-state"
            >
              <InboxIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                {t('noAlarmsFound')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('tryDifferentDateRange')}
              </Typography>
            </Box>
          )}

          {/* AG Grid */}
          {!loading && !error && alarmHistoryData.length > 0 && (
            <Box sx={{ flex: 1, minHeight: 0 }} data-id-ref="alarm-log-ag-grid-container">
              <LazyAGGrid
                columnDefs={columnDefs}
                rowData={rowData}
                theme="quartz"
                height="100%"
                width="100%"
                onGridReady={onGridReadyInternal}
                gridOptions={{
                  enableRtl: language === 'fa',
                  pagination: true,
                  paginationPageSize: isMobile ? 20 : 50,
                  paginationAutoPageSize: false,
                  suppressMenuHide: true,
                  enableCellTextSelection: true,
                  animateRows: true,
                  cellSelection: true,
                  rowHeight: 50,
                  headerHeight: 50,
                  sideBar: false,
                  statusBar: {
                    statusPanels: [
                      { statusPanel: 'agTotalRowCountComponent', align: 'left' },
                      { statusPanel: 'agFilteredRowCountComponent' },
                      { statusPanel: 'agAggregationComponent' }
                    ]
                  },
                  rowSelection: {
                    mode: 'singleRow',
                    checkboxes: false,
                  },
                  defaultColDef: {
                    resizable: true,
                    sortable: true,
                    filter: true,
                    flex: 1,
                    minWidth: 120,
                  },
                }}
                data-id-ref="alarm-log-ag-grid"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AlarmLogPage;