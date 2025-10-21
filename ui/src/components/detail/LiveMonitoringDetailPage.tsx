import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as ClearIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useMonitoring } from '../../hooks/useMonitoring';
import { getValue } from '../../services/api';
import { createLogger } from '../../utils/logger';
import { getItem, setItem } from '../../utils/indexedDbStorage';
import type { ValueRequestDto, Item } from '../../types/api';
import { EChartsWrapper } from '../shared/EChartsWrapper';
import { CardHeader } from '../shared/CardHeader';

const logger = createLogger('LiveMonitoringDetailPage');

// IndexedDB key for settings
const SETTINGS_DB_KEY = 'live_monitoring_settings';

// Interface for saved settings
interface LiveMonitoringSettings {
  pollingInterval: number;
  maxDataPoints: number;
}

// Live data point interface
interface LiveDataPoint {
  value: number;
  time: number;
}

// Refresh rate options (in milliseconds)
const REFRESH_RATES = [
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 4000, label: '4s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
];

// Max data points options
const MAX_DATA_POINTS_OPTIONS = [50, 100, 200, 500];

const LiveMonitoringDetailPage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state: monitoringState } = useMonitoring();

  // Get item from monitoring context
  const item = monitoringState.items.find((item: Item) => item.id === itemId);
  const itemsLoading = monitoringState.itemsLoading;

  // State management
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number>(4000); // Default 4s
  const [maxDataPoints, setMaxDataPoints] = useState<number>(50); // Default 50 points
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  // Use ref to store interval ID for cleanup
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load settings from IndexedDB
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getItem<LiveMonitoringSettings>(SETTINGS_DB_KEY);
        if (settings) {
          setPollingInterval(settings.pollingInterval);
          setMaxDataPoints(settings.maxDataPoints);
          logger.log('Loaded live monitoring settings from IndexedDB', settings);
        } else {
          logger.log('No saved settings found, using defaults', {
            pollingInterval: 4000,
            maxDataPoints: 50,
          });
        }
      } catch (err) {
        logger.error('Error loading settings from IndexedDB:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings to IndexedDB when they change
  useEffect(() => {
    // Don't save until initial settings are loaded
    if (!settingsLoaded) return;

    const saveSettings = async () => {
      try {
        const settings: LiveMonitoringSettings = {
          pollingInterval,
          maxDataPoints,
        };
        await setItem(SETTINGS_DB_KEY, settings);
        logger.log('Saved live monitoring settings to IndexedDB', settings);
      } catch (err) {
        logger.error('Error saving settings to IndexedDB:', err);
      }
    };

    saveSettings();
  }, [pollingInterval, maxDataPoints, settingsLoaded]);

  // Get item name based on language
  const itemName = useMemo(() => {
    if (itemsLoading) return t('loadingItemData');
    if (!item) return t('itemNotFoundInStore');
    return language === 'fa' && item.nameFa ? item.nameFa : item.name;
  }, [item, itemsLoading, language, t]);

  // Get item unit based on language
  const itemUnit = useMemo(() => {
    const it = item as Item | undefined;
    if (!it) return '';
    if (language === 'fa' && it.unitFa) return it.unitFa;
    return it.unit ?? '';
  }, [item, language]);

  // Fetch single value from API
  const fetchValue = useCallback(async () => {
    if (!itemId) {
      setError(t('itemNotFound'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: ValueRequestDto = { itemId };
      const result = await getValue(request);

      if (result.value) {
        const valueFloat = parseFloat(result.value.value || '0');
        const newDataPoint: LiveDataPoint = {
          value: isNaN(valueFloat) ? 0 : valueFloat,
          time: result.value.time,
        };

        setLiveData((prevData) => {
          const newData = [...prevData, newDataPoint];
          // Trim to maxDataPoints (FIFO queue)
          if (newData.length > maxDataPoints) {
            return newData.slice(newData.length - maxDataPoints);
          }
          return newData;
        });

        logger.log('Fetched live value', { itemId, value: newDataPoint.value, time: newDataPoint.time });
      }

      setLoading(false);
    } catch (err) {
      logger.error('Error fetching live value:', err);
      setError(t('errorLoadingData'));
      setLoading(false);
      // Stop polling on error
      setIsPolling(false);
    }
  }, [itemId, maxDataPoints, t]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!itemId) return;

    setIsPolling(true);
    setError(null);

    // Fetch immediately
    fetchValue();

    // Set up interval
    intervalRef.current = setInterval(fetchValue, pollingInterval);

    logger.log('Started live monitoring', { itemId, pollingInterval });
  }, [itemId, pollingInterval, fetchValue]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    logger.log('Stopped live monitoring', { itemId });
  }, [itemId]);

  // Clear data
  const clearData = useCallback(() => {
    setLiveData([]);
    setError(null);
    logger.log('Cleared live data', { itemId });
  }, [itemId]);

  // Cleanup interval on unmount only
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        logger.log('Cleaned up interval on unmount', { itemId });
      }
    };
  }, [itemId]);

  // Update polling interval when it changes
  useEffect(() => {
    if (isPolling && intervalRef.current) {
      // Clear existing interval and restart with new interval
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      
      // Fetch immediately
      fetchValue();
      
      // Set up new interval with updated polling rate
      intervalRef.current = setInterval(fetchValue, pollingInterval);
      
      logger.log('Polling interval updated', { itemId, pollingInterval });
    }
  }, [pollingInterval, isPolling, fetchValue, itemId]);

  // Prepare chart data
  const chartOption: EChartsOption = useMemo(() => {
    const isRTL = language === 'fa';

    // Convert data points to chart format
    const timestamps = liveData.map((point) => {
      const date = new Date(point.time * 1000);
      // Use short time format for live monitoring (HH:mm:ss)
      return date.toLocaleTimeString(language === 'fa' ? 'fa-IR' : 'en-US');
    });

    const values = liveData.map((point) => point.value);

    // Get current value for display
    const currentValue = liveData.length > 0 ? liveData[liveData.length - 1].value : null;

    return {
      title: isMobile
        ? undefined
        : {
            text: `${itemName} - ${t('liveMonitoring')}`,
            subtext: currentValue !== null ? `${t('currentValue')}: ${currentValue} ${itemUnit}` : undefined,
            left: 'center',
            textStyle: {
              fontSize: 16,
              fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
            },
            subtextStyle: {
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
        left: isMobile ? (isRTL ? '8%' : '4%') : isRTL ? '15%' : '10%',
        right: isMobile ? (isRTL ? '4%' : '8%') : isRTL ? '10%' : '15%',
        bottom: isMobile ? '8%' : '15%',
        top: isMobile ? '8%' : '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
          fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
          // Show subset of labels on mobile
          interval: isMobile
            ? Math.max(0, Math.floor(timestamps.length / Math.max(1, Math.min(6, timestamps.length))))
            : timestamps.length > 50
            ? Math.floor(timestamps.length / 20)
            : timestamps.length > 20
            ? Math.floor(timestamps.length / 10)
            : 0,
        },
      },
      yAxis: {
        type: 'value',
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
      legend: {
        show: false,
      },
      series: [
        {
          name: t('value'),
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            color: theme.palette.primary.main,
            width: 2,
          },
          itemStyle: {
            color: theme.palette.primary.main,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${theme.palette.primary.main}40` },
                { offset: 1, color: `${theme.palette.primary.main}10` },
              ],
            },
          },
          label: {
            fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
          },
        },
      ],
      dataZoom: isMobile
        ? undefined
        : [
            {
              type: 'inside',
              start: liveData.length > 50 ? 50 : 0,
              end: 100,
            },
            {
              type: 'slider',
              start: liveData.length > 50 ? 50 : 0,
              end: 100,
              height: 30,
              bottom: 10,
              textStyle: {
                fontFamily: language === 'fa' ? 'iransansxv, iransansx, Tahoma, Arial, sans-serif' : undefined,
              },
            },
          ],
      toolbox: isMobile
        ? undefined
        : {
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
  }, [liveData, language, t, itemUnit, itemName, isMobile, theme.palette.primary.main]);

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
        data-id-ref="live-monitoring-no-item-container"
      >
        <Box sx={{ textAlign: 'center' }} data-id-ref="live-monitoring-no-item-content">
          <WarningIcon
            sx={{ fontSize: 80, color: 'warning.main', mb: 3 }}
            data-id-ref="live-monitoring-no-item-icon"
          />
          <Typography variant="h5" gutterBottom data-id-ref="live-monitoring-no-item-title">
            {t('itemNotFound')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
            data-id-ref="live-monitoring-no-item-description"
          >
            {language === 'fa'
              ? 'برای مشاهده مانیتورینگ زنده، لطفاً از صفحه مانیتورینگ یک پوینت را انتخاب کنید.'
              : 'To view live monitoring, please select a monitoring item from the Monitoring page.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            href="/dashboard/monitoring"
            startIcon={<ArrowBackIcon />}
            data-id-ref="live-monitoring-no-item-back-button"
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
      data-id-ref="live-monitoring-page-container"
    >
      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }} data-id-ref="live-monitoring-error-alert">
          {error}
        </Alert>
      )}

      {/* Controls Card */}
      <Card sx={{ mb: 3 }} data-id-ref="live-monitoring-controls-card">
        <CardHeader title={t('liveMonitoring')} dataIdRef="live-monitoring-controls-header" />
        <CardContent sx={{ p: isMobile ? 2 : 3 }} data-id-ref="live-monitoring-controls-card-body">
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'stretch' : 'center'}>
            {/* Start/Stop Button */}
            <Button
              variant="contained"
              color={isPolling ? 'error' : 'success'}
              size="medium"
              onClick={isPolling ? stopPolling : startPolling}
              startIcon={isPolling ? <StopIcon /> : <PlayIcon />}
              sx={{ minWidth: { xs: '100%', md: 150 } }}
              data-id-ref="live-monitoring-toggle-button"
            >
              {isPolling ? t('stopMonitoring') : t('startMonitoring')}
            </Button>

            {/* Status Indicator */}
            <Chip
              icon={<CircleIcon />}
              label={isPolling ? t('pollingActive') : t('pollingStopped')}
              color={isPolling ? 'success' : 'default'}
              size="medium"
              data-id-ref="live-monitoring-status-chip"
            />

            {/* Refresh Rate Selector */}
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 120 } }} data-id-ref="live-monitoring-refresh-rate-form">
              <InputLabel id="refresh-rate-label">{t('refreshRate')}</InputLabel>
              <Select
                labelId="refresh-rate-label"
                id="refresh-rate-select"
                value={pollingInterval}
                label={t('refreshRate')}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                disabled={isPolling}
                data-id-ref="live-monitoring-refresh-rate-select"
              >
                {REFRESH_RATES.map((rate) => (
                  <MenuItem key={rate.value} value={rate.value} data-id-ref={`live-monitoring-refresh-rate-${rate.value}`}>
                    {rate.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Max Data Points Selector */}
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 150 } }} data-id-ref="live-monitoring-max-points-form">
              <InputLabel id="max-points-label">{t('maxDataPoints')}</InputLabel>
              <Select
                labelId="max-points-label"
                id="max-points-select"
                value={maxDataPoints}
                label={t('maxDataPoints')}
                onChange={(e) => setMaxDataPoints(Number(e.target.value))}
                disabled={isPolling}
                data-id-ref="live-monitoring-max-points-select"
              >
                {MAX_DATA_POINTS_OPTIONS.map((points) => (
                  <MenuItem key={points} value={points} data-id-ref={`live-monitoring-max-points-${points}`}>
                    {points}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Clear Data Button */}
            <Button
              variant="outlined"
              color="warning"
              size="medium"
              onClick={clearData}
              disabled={isPolling || liveData.length === 0}
              startIcon={<ClearIcon />}
              sx={{ minWidth: { xs: '100%', md: 'auto' }, ml: { md: 'auto' } }}
              data-id-ref="live-monitoring-clear-button"
            >
              {t('clearData')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
        data-id-ref="live-monitoring-chart-card"
      >
        <CardHeader
          title={itemName}
          action={
            liveData.length > 0 ? (
              <Chip
                label={`${liveData.length} ${liveData.length === 1 ? t('dataPoint') : t('dataPoints')}`}
                color="secondary"
                size="small"
                data-id-ref="live-monitoring-data-count"
              />
            ) : undefined
          }
          dataIdRef="live-monitoring-chart-header"
        />
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            p: isMobile ? 1 : 2,
          }}
          data-id-ref="live-monitoring-chart-card-body"
        >
          <EChartsWrapper
            option={chartOption}
            loading={loading && liveData.length === 0}
            error={error}
            emptyMessage={t('noData')}
            height="100%"
            width="100%"
            dataIdRef="live-monitoring-chart"
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default LiveMonitoringDetailPage;
