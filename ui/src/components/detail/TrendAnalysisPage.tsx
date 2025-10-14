import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Collapse,
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
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppSelector } from '../../hooks/useRedux';
import { useLazyGetHistoryQuery } from '../../services/rtkApi';
import type { HistoryRequestDto, HistoricalDataPoint, Item } from '../../types/api';
import SeparatedDateTimePicker from '../SeparatedDateTimePicker';

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const TrendAnalysisPage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get item from Redux store
  const item = useAppSelector((state) => 
    state.monitoring.items.find((item) => item.id === itemId)
  );
  const itemsLoading = useAppSelector((state) => state.monitoring.itemsLoading);

  // RTK Query lazy hook for fetching history
  const [fetchHistory, { data: historyResponse, isLoading: loading, isError }] = useLazyGetHistoryQuery();
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last24Hours');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Collapsed state for the Date Range card on mobile
  const [dateRangeCollapsed, setDateRangeCollapsed] = useState<boolean>(isMobile);

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

  // Localized labeled date range for clarity in the chart title (e.g. "From: <start> To: <end>")
  const labeledDateRange = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    const locale = language === 'fa' ? 'fa-IR' : 'en-US';
    // Use a more human-friendly format: e.g. "Oct 5, 2025 14:30" or Persian equivalent
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const startDateStr = new Date(startDate * 1000).toLocaleString(locale, dateOptions);
    const endDateStr = new Date(endDate * 1000).toLocaleString(locale, dateOptions);

    // Use existing translation keys 'from' and 'to'
    return `${t('from')}: ${startDateStr} ${t('to')}: ${endDateStr}`;
  }, [getDateRange, language, t]);

  // Get item name based on language
  const itemName = useMemo(() => {
    if (itemsLoading) return t('loadingItemData');
    if (!item) return t('itemNotFoundInStore');
    return language === 'fa' && item.nameFa ? item.nameFa : item.name;
  }, [item, itemsLoading, language, t]);

  // Point number label (localized), e.g. "Point Number: 123"
  const itemPointLabel = useMemo(() => {
    if (!item) return '';
    return `${t('pointNumber')}: ${item.pointNumber}`;
  }, [item, t]);

  // Compose full title: item name, point label (if any), and labeled date range
  const composedChartTitle = useMemo(() => {
    const parts: string[] = [];
    if (itemName) parts.push(itemName);
    if (itemPointLabel) parts.push(itemPointLabel);
    parts.push(labeledDateRange);
    return parts.join(' — ');
  }, [itemName, itemPointLabel, labeledDateRange]);

  // Get item unit based on language (use unitFa for Persian if available)
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

    try {
      const { startDate, endDate } = getDateRange;

      // Validate date range
      if (startDate >= endDate) {
        setError(t('startDateAfterEnd'));
        return;
      }

      const request: HistoryRequestDto = {
        itemId,
        startDate,
        endDate,
      };

      // Trigger RTK Query to fetch history
      await fetchHistory(request).unwrap();
    } catch (err) {
      console.error('Error fetching history data:', err);
      setError(t('errorLoadingData'));
    }
  };
  
  // Update historyData when RTK Query response changes
  useEffect(() => {
    if (historyResponse) {
      setHistoryData(historyResponse.values || []);
    }
  }, [historyResponse]);
  
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

  // Prepare chart data
  const chartOption: EChartsOption = useMemo(() => {
    const isRTL = language === 'fa';

    // Convert data points to chart format
    const timestamps = historyData.map((point) => {
      const date = new Date(point.time * 1000);
      return date.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US');
    });

    const values = historyData.map((point) => {
      const value = parseFloat(point.value || '0');
      return isNaN(value) ? null : value;
    });

    return {
      title: isMobile ? undefined : {
        text: composedChartTitle,
        left: isRTL ? 'right' : 'left',
        textStyle: {
          fontSize: 16,
          // Use IRANSans variable font in Persian mode
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          if (Array.isArray(params) && params.length > 0) {
            const param = params[0] as { axisValue: string; value: number };
            // Convert value to Persian digits if in Persian mode
            let displayValue = String(param.value);
            if (language === 'fa') {
              const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
              displayValue = displayValue.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
            }
            // Add unit if available
            const unitDisplay = itemUnit ? ` ${itemUnit}` : '';
            return `${t('time')}: ${param.axisValue}<br/>${t('value')}: ${displayValue}${unitDisplay}`;
          }
          return '';
        },
        textStyle: {
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
        },
      },
      grid: {
        // Reduce left/right margins on mobile to use full width
        left: isMobile ? (isRTL ? '8%' : '4%') : (isRTL ? '15%' : '10%'),
        right: isMobile ? (isRTL ? '4%' : '8%') : (isRTL ? '10%' : '15%'),
        bottom: isMobile ? '8%' : '15%',
        top: isMobile ? '8%' : '15%', // Less top padding on mobile when title is hidden
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        // Intentionally no name to avoid displaying a label like 'time' on the x-axis
        axisLabel: {
          rotate: 45,
          fontSize: 10,
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
          // Show only a subset of labels to prevent clutter
          // On mobile, show at most ~6 labels for readability
          interval: isMobile
            ? Math.max(0, Math.floor(timestamps.length / Math.max(1, Math.min(6, timestamps.length))))
            : timestamps.length > 50 
              ? Math.floor(timestamps.length / 20) // Show ~20 labels for large datasets
              : timestamps.length > 20 
              ? Math.floor(timestamps.length / 10) // Show ~10 labels for medium datasets
              : 0, // Show all labels for small datasets (< 20 points)
        },
      },
      yAxis: {
        type: 'value',
        // Use the item's unit as the axis name when available, otherwise show no name
        name: itemUnit || undefined,
        nameLocation: itemUnit ? 'middle' : undefined,
        nameGap: itemUnit ? 50 : undefined,
        nameRotate: itemUnit ? (isRTL ? -90 : 90) : undefined,
        nameTextStyle: {
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
        },
        axisLabel: {
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
        },
      },
      series: [
        {
          name: t('value'),
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            color: theme.palette.primary.main,
          },
          itemStyle: {
            color: theme.palette.primary.main,
          },
          label: {
            fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
          },
        },
      ],
      dataZoom: isMobile ? undefined : [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 30,
          bottom: 10,
          textStyle: {
            fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
          },
        },
      ],
      toolbox: isMobile ? undefined : {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: t('zoom'),
              back: t('reset'),
            },
          },
          restore: {
            title: t('reset'),
          },
          saveAsImage: {
            title: t('export'),
          },
        },
        right: isRTL ? 'auto' : 20,
        left: isRTL ? 20 : 'auto',
      },
    };
  }, [historyData, language, t, itemUnit, composedChartTitle, isMobile, theme.palette.primary.main]);

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
        data-id-ref="trend-analysis-no-item-container"
      >
        <Box sx={{ textAlign: 'center' }} data-id-ref="trend-analysis-no-item-content">
          <WarningIcon
            sx={{ fontSize: 80, color: 'warning.main', mb: 3 }}
            data-id-ref="trend-analysis-no-item-icon"
          />
          <Typography variant="h5" gutterBottom data-id-ref="trend-analysis-no-item-title">
            {t('itemNotFound')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
            data-id-ref="trend-analysis-no-item-description"
          >
            {language === 'fa' 
              ? 'برای مشاهده تحلیل روند، لطفاً از صفحه مانیتورینگ یک پوینت را انتخاب کنید.'
              : 'To view trend analysis, please select a monitoring item from the Monitoring page.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            href="/dashboard/monitoring"
            startIcon={<ArrowBackIcon />}
            data-id-ref="trend-analysis-no-item-back-button"
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
      data-id-ref="trend-analysis-page-container"
    >
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
          data-id-ref="trend-analysis-error-alert"
        >
          {error}
        </Alert>
      )}

      {/* Date Range Selector */}
      <Card sx={{ mb: 3 }} data-id-ref="trend-analysis-date-range-card">
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
          <Typography variant="subtitle1" fontWeight="bold" data-id-ref="trend-analysis-date-range-label">
            {t('dateRange')}
          </Typography>
          {/* Toggle button visible only on mobile */}
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setDateRangeCollapsed((s) => !s)}
              aria-expanded={!dateRangeCollapsed}
              data-id-ref="trend-analysis-date-range-toggle-button"
            >
              {dateRangeCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
        </Box>

        {/* Card body: hidden on mobile when collapsed */}
        <Collapse in={!isMobile || !dateRangeCollapsed}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }} data-id-ref="trend-analysis-date-range-card-body">
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
                data-id-ref="trend-analysis-preset-button-group"
              >
                <Button
                  variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last24Hours')}
                  data-id-ref="trend-analysis-preset-24h-button"
                >
                  {t('last24Hours')}
                </Button>
                <Button
                  variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last7Days')}
                  data-id-ref="trend-analysis-preset-7d-button"
                >
                  {t('last7Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('last30Days')}
                  data-id-ref="trend-analysis-preset-30d-button"
                >
                  {t('last30Days')}
                </Button>
                <Button
                  variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                  onClick={() => handlePresetChange('custom')}
                  data-id-ref="trend-analysis-preset-custom-button"
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
                    data-id-ref="trend-analysis-start-date"
                    className=""
                    dateLabel={t('startDate')}
                    timeLabel={t('startTime')}
                  />
                  <SeparatedDateTimePicker
                    id="endDate"
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    data-id-ref="trend-analysis-end-date"
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
                data-id-ref="trend-analysis-refresh-button"
              >
                {loading ? t('fetchingData') : t('refresh')}
              </Button>
            </Box>
          </CardContent>
        </Collapse>
      </Card>

      {/* Chart Section */}
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
        data-id-ref="trend-analysis-chart-card"
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
          data-id-ref="trend-analysis-chart-card-header"
        >
          <Typography variant="h6" component="h5" data-id-ref="trend-analysis-chart-title">
            {t('trendAnalysisTitle')}
          </Typography>
          {/* Data Point Count */}
          {historyData.length > 0 && !loading && (
            <Chip
              label={`${historyData.length} ${t('dataPoints')}`}
              color="secondary"
              size="small"
              data-id-ref="trend-analysis-data-count"
            />
          )}
        </Box>
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'center',
            minHeight: 0,
          }}
          data-id-ref="trend-analysis-chart-card-body"
        >
          {loading ? (
            <Box sx={{ textAlign: 'center' }} data-id-ref="trend-analysis-loading-container">
              <CircularProgress sx={{ mb: 3 }} data-id-ref="trend-analysis-loading-spinner" />
              <Typography color="text.secondary" data-id-ref="trend-analysis-loading-text">
                {t('loadingChart')}
              </Typography>
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ textAlign: 'center' }} data-id-ref="trend-analysis-no-data-container">
              <InboxIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 3 }} data-id-ref="trend-analysis-no-data-icon" />
              <Typography color="text.secondary" data-id-ref="trend-analysis-no-data-text">
                {t('noData')}
              </Typography>
            </Box>
          ) : (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%', minHeight: isMobile ? '260px' : '400px' }}
              opts={{ renderer: 'canvas' }}
              data-id-ref="trend-analysis-chart"
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TrendAnalysisPage;
