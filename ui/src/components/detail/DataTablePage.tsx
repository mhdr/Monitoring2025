import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Inbox as InboxIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppSelector } from '../../hooks/useRedux';
import { useLazyGetHistoryQuery } from '../../services/rtkApi';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DataTablePage');
import type { HistoryRequestDto, HistoricalDataPoint, Item } from '../../types/api';
import SeparatedDateTimePicker from '../SeparatedDateTimePicker';

// Use LazyAGGrid component for optimized AG Grid loading
import LazyAGGrid from '../LazyAGGrid';
import { useAGGrid } from '../../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi } from '../../types/agGrid';
import { useRef, useCallback } from 'react';
import type { AGGridColumnDef } from '../../types/agGrid';
import { formatDateByLanguage, createAGGridNumberFormatter } from '../../utils/numberFormatting';

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const DataTablePage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get item from Redux store
  const item = useAppSelector((state) => 
    state.monitoring.items.find((item) => item.id === itemId)
  );

  // RTK Query lazy hook for fetching history
  const [fetchHistory, { data: historyResponse, isError }] = useLazyGetHistoryQuery();
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Local loading state for better control
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last24Hours');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Collapsed state for the Date Range card on mobile
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

  // Get item unit based on language
  const itemUnit = useMemo(() => {
    const it = item as Item | undefined;
    if (!it) return '';
    if (language === 'fa' && it.unitFa) return it.unitFa;
    return it.unit ?? '';
  }, [item, language]);

  // Fetch historical data
  const fetchHistoryData = async () => {
    if (!itemId) {
      setError(t('itemNotFound'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { startDate, endDate } = getDateRange;

      // Validate date range
      if (startDate >= endDate) {
        setError(t('startDateAfterEnd'));
        setLoading(false);
        return;
      }

      const request: HistoryRequestDto = {
        itemId,
        startDate,
        endDate,
      };

      // Trigger RTK Query to fetch history
      const result = await fetchHistory(request).unwrap();
      
      // Update history data and stop loading
      setHistoryData(result.values || []);
      setLoading(false);
    } catch (err) {
      logger.error('Error fetching history data:', err);
      setError(t('errorLoadingData'));
      setLoading(false);
    }
  };
  
  // Update historyData when RTK Query response changes (for cache hits)
  useEffect(() => {
    if (historyResponse && !loading) {
      setHistoryData(historyResponse.values || []);
    }
  }, [historyResponse, loading]);
  
  // Set error when RTK Query has an error
  useEffect(() => {
    if (isError) {
      setError(t('errorLoadingData'));
    }
  }, [isError, t]);

  // Fetch data on mount and when preset changes (not when custom dates change)
  useEffect(() => {
    fetchHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, selectedPreset]);

  // Prepare AG Grid column definitions
  const columnDefs = useMemo<AGGridColumnDef[]>(() => {
    return [
      {
        field: 'value',
        headerName: itemUnit ? `${t('value')} (${itemUnit})` : t('value'),
        flex: 1,
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        valueFormatter: createAGGridNumberFormatter(language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      },
      {
        field: 'timeFormatted',
        headerName: t('time'),
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
      },
    ];
  }, [language, t, itemUnit]);

  // Prepare AG Grid row data
  const rowData = useMemo(() => {
    // Create a shallow copy and sort by time descending (newest first)
    const sorted = [...historyData].sort((a, b) => b.time - a.time);

    return sorted.map((point, index) => {
      const date = new Date(point.time * 1000);
      const timeFormatted = formatDateByLanguage(date, language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      
      return {
        id: index,
        time: point.time,
        timeFormatted,
        value: point.value,
      };
    });
  }, [historyData, language]);

  // Handle date range preset change
  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

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

  // Show helpful message when itemId is missing
  if (!itemId) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          p: 3,
        }}
        data-id-ref="data-table-no-item-container"
      >
        <Box sx={{ textAlign: 'center' }} data-id-ref="data-table-no-item-content">
          <WarningIcon
            sx={{ fontSize: 80, color: 'warning.main', mb: 3 }}
            data-id-ref="data-table-no-item-icon"
          />
          <Typography variant="h5" gutterBottom data-id-ref="data-table-no-item-title">
            {t('itemNotFound')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
            data-id-ref="data-table-no-item-description"
          >
            {language === 'fa' 
              ? 'برای مشاهده جدول داده‌ها، لطفاً از صفحه مانیتورینگ یک پوینت را انتخاب کنید.'
              : 'To view data table, please select a monitoring item from the Monitoring page.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            href="/dashboard/monitoring"
            startIcon={<ArrowBackIcon />}
            data-id-ref="data-table-no-item-back-button"
          >
            {language === 'fa' ? 'بازگشت به مانیتورینگ' : 'Go to Monitoring'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: isMobile ? 1 : 3,
        maxWidth: '100%',
      }}
      data-id-ref="data-table-page-container"
    >
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
          data-id-ref="data-table-error-alert"
        >
          {error}
        </Alert>
      )}

      {/* Date Range Selector */}
      <Card sx={{ mb: 3 }} data-id-ref="data-table-date-range-card">
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
          <Typography variant="subtitle1" fontWeight="bold" data-id-ref="data-table-date-range-label">
            {t('dateRange')}
          </Typography>
          {/* Toggle button visible only on mobile */}
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setDateRangeCollapsed((s) => !s)}
              aria-expanded={!dateRangeCollapsed}
              data-id-ref="data-table-date-range-toggle-button"
            >
              {dateRangeCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
        </Box>

        {/* Card body: hidden on mobile when collapsed */}
        <Collapse in={!isMobile || !dateRangeCollapsed}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }} data-id-ref="data-table-date-range-card-body">
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
                data-id-ref="data-table-preset-button-group"
              >
                <Button
                  variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last24Hours')}
                  data-id-ref="data-table-preset-24h-button"
                >
                  {t('last24Hours')}
                </Button>
                <Button
                  variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last7Days')}
                  data-id-ref="data-table-preset-7d-button"
                >
                  {t('last7Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last30Days')}
                  data-id-ref="data-table-preset-30d-button"
                >
                  {t('last30Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('custom')}
                  data-id-ref="data-table-preset-custom-button"
                >
                  {t('customRange')}
                </Button>
              </ButtonGroup>

              {/* Custom Date Inputs (shown only when custom is selected) */}
              {selectedPreset === 'custom' && (
                <>
                  <SeparatedDateTimePicker
                    id="startDate"
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    data-id-ref="data-table-start-date"
                    className=""
                    dateLabel={t('startDate')}
                    timeLabel={t('startTime')}
                  />
                  <SeparatedDateTimePicker
                    id="endDate"
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    data-id-ref="data-table-end-date"
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
                onClick={fetchHistoryData}
                disabled={loading}
                startIcon={<RefreshIcon />}
                sx={{ ml: { md: 'auto' }, minWidth: { xs: '100%', md: 'auto' } }}
                data-id-ref="data-table-refresh-button"
              >
                {loading ? t('fetchingData') : t('refresh')}
              </Button>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Table Section */}
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
        data-id-ref="data-table-table-card"
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: isMobile ? 1 : 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
          data-id-ref="data-table-table-card-header"
        >
          <Typography variant="h6" component="h5" data-id-ref="data-table-table-title">
            {t('dataTableTitle')}
          </Typography>
          {/* Export buttons and data point count */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {historyData.length > 0 && !loading && (
              <>
                <Chip
                  label={`${historyData.length} ${t('dataPoints')}`}
                  color="secondary"
                  size="small"
                  data-id-ref="data-table-data-count"
                />
                {!isMobile && (
                  <>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => exportToCsv('historical-data.csv')}
                      data-id-ref="data-table-export-csv-button"
                      title={t('export') + ' CSV'}
                    >
                      <DescriptionIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => exportToExcel('historical-data.xlsx')}
                      data-id-ref="data-table-export-excel-button"
                      title={t('export') + ' Excel'}
                    >
                      <FileDownloadIcon />
                    </IconButton>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            p: isMobile ? 1 : 2,
          }}
          data-id-ref="data-table-table-card-body"
        >
          {loading ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
              }}
              data-id-ref="data-table-loading-container"
            >
              <CircularProgress size={60} />
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ textAlign: 'center' }} data-id-ref="data-table-no-data-container">
              <InboxIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 3 }} data-id-ref="data-table-no-data-icon" />
              <Typography color="text.secondary" data-id-ref="data-table-no-data-text">
                {t('noData')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%', height: '100%', minHeight: isMobile ? '300px' : '400px' }}>
              <LazyAGGrid
                  ref={gridRef as React.Ref<AGGridApi>}
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
                    cellSelection: true, // v32.2+ replaces enableRangeSelection
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
                    // Explicitly disable checkbox selection for columns in this table
                    // and use single row selection without checkboxes so the selection
                    // column (checkbox column) does not appear.
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
                  data-id-ref="data-table-grid"
                />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DataTablePage;
