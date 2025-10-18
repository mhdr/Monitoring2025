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
import type { AlarmHistoryRequestDto, AlarmHistory } from '../types/api';
import SeparatedDateTimePicker from './SeparatedDateTimePicker';

// Use LazyAGGrid component for optimized AG Grid loading
import LazyAGGrid from './LazyAGGrid';
import { useAGGrid } from '../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi, AGGridColumnDef } from '../types/agGrid';
import { formatDateByLanguage } from '../utils/numberFormatting';

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

  // AG Grid integration
  const { exportToCsv, exportToExcel, handleGridReady } = useAGGrid();
  const gridRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  const onGridReadyInternal = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    gridRef.current = api;
    columnApiRef.current = colApi;
    handleGridReady(api, colApi);
  }, [handleGridReady]);

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

  // Fetch data on mount and when preset changes
  useEffect(() => {
    fetchAlarmHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  // Prepare AG Grid column definitions
  const columnDefs = useMemo<AGGridColumnDef[]>(() => {
    return [
      {
        field: 'timeFormatted',
        headerName: t('time'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        sort: 'desc', // Default sort by time descending (newest first)
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
        field: 'alarmLog',
        headerName: t('alarmMessage'),
        flex: 3,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        wrapText: true,
        autoHeight: true,
      },
      {
        field: 'itemId',
        headerName: t('itemId'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
      {
        field: 'alarmId',
        headerName: t('alarmId'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
    ];
  }, [t]);

  // Prepare AG Grid row data
  const rowData = useMemo(() => {
    return alarmHistoryData.map((alarm, index) => {
      const date = new Date(alarm.time * 1000);
      const timeFormatted = formatDateByLanguage(date, language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: language === 'en',
      });

      // Parse alarmLog JSON to extract the Message field
      let alarmMessage = '';
      if (alarm.alarmLog) {
        try {
          const alarmLogData = JSON.parse(alarm.alarmLog);
          alarmMessage = alarmLogData.Message || alarm.alarmLog;
        } catch {
          logger.warn('[AlarmLogPage] Failed to parse alarmLog JSON', { alarmLog: alarm.alarmLog });
          alarmMessage = alarm.alarmLog;
        }
      }

      return {
        id: alarm.id || `alarm-${index}`,
        alarmId: alarm.alarmId || '',
        itemId: alarm.itemId || '',
        time: alarm.time,
        timeFormatted,
        isActive: alarm.isActive,
        alarmLog: alarmMessage,
      };
    });
  }, [alarmHistoryData, language]);

  return (
    <Box 
      data-id-ref="alarm-log-page-container" 
      sx={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2,
        p: 3,
      }}
    >
      {/* Date Range Selection Card */}
      <Card data-id-ref="alarm-log-date-range-card" elevation={2}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: dateRangeCollapsed ? 0 : 2,
            }}
          >
            <Typography variant="h6" data-id-ref="alarm-log-date-range-title">
              {t('dateRange')}
            </Typography>
            {isMobile && (
              <IconButton
                onClick={() => setDateRangeCollapsed(!dateRangeCollapsed)}
                data-id-ref="alarm-log-date-range-collapse-button"
                aria-label={dateRangeCollapsed ? t('expand') : t('collapse')}
              >
                {dateRangeCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            )}
          </Box>

          <Collapse in={!dateRangeCollapsed}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 2,
                alignItems: isMobile ? 'stretch' : 'center',
              }}
            >
              {/* Preset Buttons */}
              <ButtonGroup
                variant="outlined"
                orientation={isMobile ? 'vertical' : 'horizontal'}
                data-id-ref="alarm-log-date-range-preset-buttons"
                sx={{ flexShrink: 0 }}
              >
                <Button
                  onClick={() => setSelectedPreset('last24Hours')}
                  variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                  data-id-ref="alarm-log-preset-last-24-hours"
                >
                  {t('last24Hours')}
                </Button>
                <Button
                  onClick={() => setSelectedPreset('last7Days')}
                  variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                  data-id-ref="alarm-log-preset-last-7-days"
                >
                  {t('last7Days')}
                </Button>
                <Button
                  onClick={() => setSelectedPreset('last30Days')}
                  variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                  data-id-ref="alarm-log-preset-last-30-days"
                >
                  {t('last30Days')}
                </Button>
                <Button
                  onClick={() => setSelectedPreset('custom')}
                  variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                  data-id-ref="alarm-log-preset-custom"
                >
                  {t('custom')}
                </Button>
              </ButtonGroup>

              {/* Custom Date Range Picker (only shown when custom is selected) */}
              {selectedPreset === 'custom' && (
                <Box sx={{ flex: 1, display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                  <SeparatedDateTimePicker
                    id="alarm-log-custom-start-date"
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    data-id-ref="alarm-log-custom-start-date"
                    dateLabel={t('startDate')}
                  />
                  <SeparatedDateTimePicker
                    id="alarm-log-custom-end-date"
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    data-id-ref="alarm-log-custom-end-date"
                    dateLabel={t('endDate')}
                  />
                  <Button
                    variant="contained"
                    onClick={fetchAlarmHistoryData}
                    disabled={!customStartDate || !customEndDate || loading}
                    data-id-ref="alarm-log-custom-apply-button"
                    startIcon={<RefreshIcon />}
                  >
                    {t('apply')}
                  </Button>
                </Box>
              )}

              {/* Refresh button for non-custom presets */}
              {selectedPreset !== 'custom' && (
                <Button
                  variant="contained"
                  onClick={fetchAlarmHistoryData}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  data-id-ref="alarm-log-refresh-button"
                >
                  {t('refresh')}
                </Button>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Data Grid Card */}
      <Card data-id-ref="alarm-log-data-grid-card" elevation={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
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
                onGridReady={onGridReadyInternal}
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