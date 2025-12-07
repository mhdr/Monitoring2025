import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  Functions as FunctionsIcon,
  DataUsage as DataUsageIcon,
  AccessTime as AccessTimeIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import {
  getPointMeanByDate,
  getPointMinByDate,
  getPointMaxByDate,
  getPointStdByDate,
  getPointCountByDate,
  getPointMean,
  getPointMin,
  getPointMax,
  getPointStd,
  getPointCount,
  calculateStateDuration,
} from '../services/monitoringApi';
import { createLogger } from '../utils/logger';
import { formatDate } from '../utils/dateFormatting';
import type { Item } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import SeparatedDateTimePicker from '../components/SeparatedDateTimePicker';
import { EChartsWrapper } from '../components/shared/EChartsWrapper';
import { CardHeader } from '../components/shared/CardHeader';

const logger = createLogger('StatisticsPage');

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

// Statistics data interfaces
interface AnalogStats {
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  count: number;
}

interface DigitalStats {
  onDuration: number;
  offDuration: number;
  totalDuration: number;
  onPercentage: number;
  offPercentage: number;
  count: number;
}

// Daily statistics interfaces
interface DailyAnalogStats {
  date: string;
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  count: number;
}

interface DailyDigitalStats {
  date: string;
  count: number;
}

const StatisticsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state: monitoringState } = useMonitoring();

  // Get item from monitoring context
  const item = monitoringState.items.find((item: Item) => item.id === itemId);
  const itemsLoading = monitoringState.itemsLoading;

  // Determine if point is analog or digital
  const isAnalog = useMemo(() => {
    if (!item) return true; // Default to analog
    return item.itemType === ItemTypeEnum.AnalogInput || item.itemType === ItemTypeEnum.AnalogOutput;
  }, [item]);

  // State management
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last30Days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateRangeCollapsed, setDateRangeCollapsed] = useState<boolean>(isMobile);

  // Statistics data
  const [last24hStats, setLast24hStats] = useState<AnalogStats | DigitalStats | null>(null);
  const [historicalStats, setHistoricalStats] = useState<AnalogStats | DigitalStats | null>(null);
  const [dailyHistoricalStats, setDailyHistoricalStats] = useState<DailyAnalogStats[] | DailyDigitalStats[] | null>(null);

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
          // Default to last 30 days if custom dates not set
          startDate = now - 30 * 24 * 60 * 60;
        }
        break;
      default:
        startDate = now - 30 * 24 * 60 * 60;
    }

    return { startDate, endDate };
  }, [selectedPreset, customStartDate, customEndDate]);

  // Localized labeled date range
  const labeledDateRange = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    
    const startDateStr = formatDate(startDate, language, 'short');
    const endDateStr = formatDate(endDate, language, 'short');

    if (language === 'fa') {
      return `${t('from')} ${startDateStr} ${t('to')} ${endDateStr}`;
    } else {
      return `${t('from')}: ${startDateStr} ${t('to')}: ${endDateStr}`;
    }
  }, [getDateRange, language, t]);

  // Get item name based on language
  const itemName = useMemo(() => {
    if (itemsLoading) return t('loading');
    if (!item) return t('unknown');
    return language === 'fa' && item.nameFa ? item.nameFa : item.name;
  }, [item, itemsLoading, language, t]);

  // Get item unit based on language
  const itemUnit = useMemo(() => {
    if (!item) return '';
    if (language === 'fa' && item.unitFa) return item.unitFa;
    return item.unit ?? '';
  }, [item, language]);

  // Fetch last 24 hours statistics
  const fetchLast24hStats = async () => {
    if (!itemId) return;

    try {
      if (isAnalog) {
        const [meanRes, minRes, maxRes, stdRes, countRes] = await Promise.all([
          getPointMean({ itemId }),
          getPointMin({ itemId }),
          getPointMax({ itemId }),
          getPointStd({ itemId }),
          getPointCount({ itemId }),
        ]);

        setLast24hStats({
          mean: meanRes.mean,
          min: minRes.min,
          max: maxRes.max,
          std: stdRes.std,
          count: countRes.count,
        });
      } else {
        // Digital point - use last 24 hours for state duration
        const now = Math.floor(Date.now() / 1000);
        const startDate = now - 24 * 60 * 60;
        
        // Call API for both ON (value: "1") and OFF (value: "0") states
        const [onDurationRes, offDurationRes, countRes] = await Promise.all([
          calculateStateDuration({ itemId, startDate, endDate: now, value: "1" }),
          calculateStateDuration({ itemId, startDate, endDate: now, value: "0" }),
          getPointCount({ itemId }),
        ]);

        const totalDuration = now - startDate;
        const onDuration = onDurationRes.success ? onDurationRes.totalDurationSeconds : 0;
        const offDuration = offDurationRes.success ? offDurationRes.totalDurationSeconds : 0;

        setLast24hStats({
          onDuration,
          offDuration,
          totalDuration,
          onPercentage: totalDuration > 0 ? (onDuration / totalDuration) * 100 : 0,
          offPercentage: totalDuration > 0 ? (offDuration / totalDuration) * 100 : 0,
          count: countRes.count,
        });
      }
    } catch (err) {
      logger.error('Error fetching last 24h statistics:', err);
      // Don't set error here, just log it
    }
  };

  // Fetch historical statistics
  const fetchHistoricalStats = async () => {
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

      if (isAnalog) {
        const [meanRes, minRes, maxRes, stdRes, countRes] = await Promise.all([
          getPointMeanByDate({ itemId, startDate, endDate }),
          getPointMinByDate({ itemId, startDate, endDate }),
          getPointMaxByDate({ itemId, startDate, endDate }),
          getPointStdByDate({ itemId, startDate, endDate }),
          getPointCountByDate({ itemId, startDate, endDate }),
        ]);

        // Store daily data for table display
        const dailyData: DailyAnalogStats[] = [];
        const dates = new Set<string>();
        
        // Collect all unique dates
        meanRes.dailyValues?.forEach(d => dates.add(d.date));
        minRes.dailyValues?.forEach(d => dates.add(d.date));
        maxRes.dailyValues?.forEach(d => dates.add(d.date));
        stdRes.dailyValues?.forEach(d => dates.add(d.date));
        countRes.dailyCounts?.forEach(d => dates.add(d.date));
        
        // Build daily data array
        Array.from(dates).sort().forEach(date => {
          const meanValue = meanRes.dailyValues?.find(d => d.date === date);
          const minValue = minRes.dailyValues?.find(d => d.date === date);
          const maxValue = maxRes.dailyValues?.find(d => d.date === date);
          const stdValue = stdRes.dailyValues?.find(d => d.date === date);
          const countValue = countRes.dailyCounts?.find(d => d.date === date);
          
          dailyData.push({
            date,
            mean: meanValue?.value ?? null,
            min: minValue?.value ?? null,
            max: maxValue?.value ?? null,
            std: stdValue?.value ?? null,
            count: countValue?.count ?? 0,
          });
        });
        
        setDailyHistoricalStats(dailyData);

        // Calculate aggregated statistics for summary
        const meanValues = meanRes.dailyValues?.map(d => d.value) || [];
        const minValues = minRes.dailyValues?.map(d => d.value) || [];
        const maxValues = maxRes.dailyValues?.map(d => d.value) || [];
        const stdValues = stdRes.dailyValues?.map(d => d.value) || [];
        const totalCount = countRes.dailyCounts?.reduce((sum, d) => sum + d.count, 0) || 0;

        setHistoricalStats({
          mean: meanValues.length > 0 ? meanValues.reduce((a, b) => a + b, 0) / meanValues.length : null,
          min: minValues.length > 0 ? Math.min(...minValues) : null,
          max: maxValues.length > 0 ? Math.max(...maxValues) : null,
          std: stdValues.length > 0 ? stdValues.reduce((a, b) => a + b, 0) / stdValues.length : null,
          count: totalCount,
        });
      } else {
        // Digital point - call API for both ON and OFF states
        const [onDurationRes, offDurationRes, countRes] = await Promise.all([
          calculateStateDuration({ itemId, startDate, endDate, value: "1" }),
          calculateStateDuration({ itemId, startDate, endDate, value: "0" }),
          getPointCountByDate({ itemId, startDate, endDate }),
        ]);

        // Store daily data for table display
        const dailyData: DailyDigitalStats[] = countRes.dailyCounts?.map(d => ({
          date: d.date,
          count: d.count,
        })) || [];
        
        setDailyHistoricalStats(dailyData);

        const totalCount = countRes.dailyCounts?.reduce((sum, d) => sum + d.count, 0) || 0;
        const totalDuration = endDate - startDate;
        const onDuration = onDurationRes.success ? onDurationRes.totalDurationSeconds : 0;
        const offDuration = offDurationRes.success ? offDurationRes.totalDurationSeconds : 0;

        setHistoricalStats({
          onDuration,
          offDuration,
          totalDuration,
          onPercentage: totalDuration > 0 ? (onDuration / totalDuration) * 100 : 0,
          offPercentage: totalDuration > 0 ? (offDuration / totalDuration) * 100 : 0,
          count: totalCount,
        });
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      logger.error('Error fetching historical statistics:', err);
      setError(t('statistics.errorLoadingStatistics'));
      setLoading(false);
    }
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchLast24hStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, isAnalog]);

  useEffect(() => {
    fetchHistoricalStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, selectedPreset, isAnalog]);

  // Handle preset change
  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Handle custom date apply
  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      fetchHistoricalStats();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchLast24hStats();
    fetchHistoricalStats();
  };

  // Format duration in hours and minutes
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} ${t('statistics.hours')} ${minutes} ${t('statistics.minutes')}`;
    }
    return `${minutes} ${t('statistics.minutes')}`;
  }, [t]);

  // Render analog comparison chart
  const analogComparisonChart: EChartsOption = useMemo(() => {
    if (!dailyHistoricalStats || !isAnalog) return {};
    
    const dailyData = dailyHistoricalStats as DailyAnalogStats[];
    const isRTL = language === 'fa';

    // Extract dates and values
    const dates = dailyData.map(d => d.date);
    const meanValues = dailyData.map(d => d.mean ?? 0);
    const minValues = dailyData.map(d => d.min ?? 0);
    const maxValues = dailyData.map(d => d.max ?? 0);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach((param: any) => {
            const value = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
            result += `${param.marker} ${param.seriesName}: ${value} ${itemUnit}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: [t('statistics.mean'), t('statistics.minimum'), t('statistics.maximum')],
        textStyle: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      grid: {
        left: isRTL ? '15%' : '10%',
        right: isRTL ? '10%' : '15%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: itemUnit,
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
        nameTextStyle: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      series: [
        {
          name: t('statistics.mean'),
          type: 'line',
          data: meanValues,
          itemStyle: {
            color: theme.palette.primary.main,
          },
          smooth: true,
        },
        {
          name: t('statistics.minimum'),
          type: 'line',
          data: minValues,
          itemStyle: {
            color: theme.palette.success.main,
          },
          smooth: true,
        },
        {
          name: t('statistics.maximum'),
          type: 'line',
          data: maxValues,
          itemStyle: {
            color: theme.palette.error.main,
          },
          smooth: true,
        },
      ],
    };
  }, [dailyHistoricalStats, isAnalog, language, t, itemUnit, theme]);

  // Render analog count trend chart
  const analogCountChart: EChartsOption = useMemo(() => {
    if (!dailyHistoricalStats || !isAnalog) return {};
    
    const dailyData = dailyHistoricalStats as DailyAnalogStats[];
    const isRTL = language === 'fa';

    // Extract dates and count values
    const dates = dailyData.map(d => d.date);
    const counts = dailyData.map(d => d.count);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
        },
        formatter: (params: any) => {
          const value = typeof params[0].value === 'number' ? params[0].value.toLocaleString() : params[0].value;
          return `${params[0].axisValue}<br/>${params[0].marker} ${params[0].seriesName}: ${value}`;
        },
      },
      grid: {
        left: isRTL ? '15%' : '10%',
        right: isRTL ? '10%' : '15%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: t('statistics.count'),
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
        nameTextStyle: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      series: [
        {
          name: t('statistics.count'),
          type: 'bar',
          data: counts,
          itemStyle: {
            color: theme.palette.info.main,
          },
        },
      ],
    };
  }, [dailyHistoricalStats, isAnalog, language, t, theme]);

  // Render digital state distribution chart
  const digitalDistributionChart: EChartsOption = useMemo(() => {
    if (!historicalStats || isAnalog) return {};
    
    const stats = historicalStats as DigitalStats;
    const isRTL = language === 'fa';

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: isRTL ? 'right' : 'left',
        textStyle: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      series: [
        {
          name: t('statistics.stateDuration'),
          type: 'pie',
          radius: '50%',
          data: [
            { 
              value: stats.onPercentage, 
              name: t('statistics.onState'),
              itemStyle: { color: theme.palette.success.main },
            },
            { 
              value: stats.offPercentage, 
              name: t('statistics.offState'),
              itemStyle: { color: theme.palette.grey[400] },
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
          },
        },
      ],
    };
  }, [historicalStats, isAnalog, language, t, theme]);

  // Render digital count trend chart
  const digitalCountChart: EChartsOption = useMemo(() => {
    if (!dailyHistoricalStats || isAnalog) return {};
    
    const dailyData = dailyHistoricalStats as DailyDigitalStats[];
    const isRTL = language === 'fa';

    // Extract dates and count values
    const dates = dailyData.map(d => d.date);
    const counts = dailyData.map(d => d.count);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
        },
        formatter: (params: any) => {
          const value = typeof params[0].value === 'number' ? params[0].value.toLocaleString() : params[0].value;
          return `${params[0].axisValue}<br/>${params[0].marker} ${params[0].seriesName}: ${value}`;
        },
      },
      grid: {
        left: isRTL ? '15%' : '10%',
        right: isRTL ? '10%' : '15%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: t('statistics.count'),
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
        nameTextStyle: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      series: [
        {
          name: t('statistics.count'),
          type: 'bar',
          data: counts,
          itemStyle: {
            color: theme.palette.info.main,
          },
        },
      ],
    };
  }, [dailyHistoricalStats, isAnalog, language, t, theme]);

  // Render digital duration bar chart
  const digitalDurationChart: EChartsOption = useMemo(() => {
    if (!historicalStats || isAnalog) return {};
    
    const stats = historicalStats as DigitalStats;
    const isRTL = language === 'fa';

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const value = params[0].value;
          return `${params[0].name}: ${formatDuration(value)}`;
        },
      },
      grid: {
        left: isRTL ? '15%' : '10%',
        right: isRTL ? '10%' : '15%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
          formatter: (value: number) => {
            const hours = Math.floor(value / 3600);
            return `${hours}h`;
          },
        },
      },
      yAxis: {
        type: 'category',
        data: [t('statistics.onState'), t('statistics.offState')],
        axisLabel: {
          fontFamily: isRTL ? 'Vazirmatn' : 'Inter',
        },
      },
      series: [
        {
          type: 'bar',
          data: [
            {
              value: stats.onDuration,
              itemStyle: { color: theme.palette.success.main },
            },
            {
              value: stats.offDuration,
              itemStyle: { color: theme.palette.grey[400] },
            },
          ],
        },
      ],
    };
  }, [historicalStats, isAnalog, language, t, theme, formatDuration]);

  if (!itemId) {
    return (
      <Box p={3} data-id-ref="statistics-page-no-item-container">
        <Alert severity="error" data-id-ref="statistics-page-no-item-alert">
          {t('itemNotFound')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} data-id-ref="statistics-page-root-container">
      {/* Header */}
      <Box mb={3} data-id-ref="statistics-page-header">
        <Typography variant="h4" gutterBottom data-id-ref="statistics-page-title">
          {t('statistics.title')} - {itemName}
        </Typography>
        <Chip 
          label={isAnalog ? t('statistics.analogPoint') : t('statistics.digitalPoint')} 
          color={isAnalog ? 'primary' : 'secondary'}
          size="small"
          data-id-ref="statistics-page-point-type-chip"
        />
      </Box>

      {/* Last 24 Hours Summary */}
      <Card sx={{ mb: 3 }} data-id-ref="statistics-page-summary-card">
        <CardHeader
          title={t('statistics.summary')}
          icon={<AccessTimeIcon />}
          action={
            <IconButton 
              onClick={handleRefresh} 
              size="small"
              data-id-ref="statistics-page-summary-refresh-btn"
            >
              <RefreshIcon />
            </IconButton>
          }
          dataIdRef="statistics-page-summary-card-header"
        />
        <CardContent data-id-ref="statistics-page-summary-content">
          {last24hStats ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }} data-id-ref="statistics-page-summary-grid">
              {isAnalog ? (
                <>
                  <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-mean">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.mean')}
                      </Typography>
                      <Typography variant="h6">
                        {(last24hStats as AnalogStats).mean !== null 
                          ? `${(last24hStats as AnalogStats).mean?.toFixed(2)} ${itemUnit}`
                          : t('noData')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-min">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.minimum')}
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {(last24hStats as AnalogStats).min !== null 
                          ? `${(last24hStats as AnalogStats).min?.toFixed(2)} ${itemUnit}`
                          : t('noData')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-max">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.maximum')}
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        {(last24hStats as AnalogStats).max !== null 
                          ? `${(last24hStats as AnalogStats).max?.toFixed(2)} ${itemUnit}`
                          : t('noData')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-std">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.standardDeviation')}
                      </Typography>
                      <Typography variant="h6">
                        {(last24hStats as AnalogStats).std !== null 
                          ? `${(last24hStats as AnalogStats).std?.toFixed(2)} ${itemUnit}`
                          : t('statistics.insufficientData')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-count">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.count')}
                      </Typography>
                      <Typography variant="h6">
                        {(last24hStats as AnalogStats).count}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ flex: '1 1 200px', minWidth: 200 }} data-id-ref="statistics-page-summary-on-duration">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.onDuration')}
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatDuration((last24hStats as DigitalStats).onDuration)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({(last24hStats as DigitalStats).onPercentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: 200 }} data-id-ref="statistics-page-summary-off-duration">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.offDuration')}
                      </Typography>
                      <Typography variant="h6">
                        {formatDuration((last24hStats as DigitalStats).offDuration)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({(last24hStats as DigitalStats).offPercentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: 200 }} data-id-ref="statistics-page-summary-count">
                    <Box textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        {t('statistics.count')}
                      </Typography>
                      <Typography variant="h6">
                        {(last24hStats as DigitalStats).count}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" data-id-ref="statistics-page-summary-no-data">
              {t('loading')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Date Range Selection */}
      <Card sx={{ mb: 3 }} data-id-ref="statistics-page-date-range-card">
        <CardHeader
          title={t('dateRange')}
          subtitle={labeledDateRange}
          action={
            isMobile ? (
              <IconButton
                onClick={() => setDateRangeCollapsed(!dateRangeCollapsed)}
                size="small"
                data-id-ref="statistics-page-date-range-toggle-btn"
              >
                {dateRangeCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            ) : undefined
          }
          dataIdRef="statistics-page-date-range-card-header"
        />
        <Collapse in={!dateRangeCollapsed} timeout="auto" unmountOnExit>
          <CardContent data-id-ref="statistics-page-date-range-content">
            <Box mb={2}>
              <ButtonGroup 
                fullWidth 
                variant="outlined" 
                size="small"
                data-id-ref="statistics-page-date-range-preset-group"
              >
                <Button
                  onClick={() => handlePresetChange('last24Hours')}
                  variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                  data-id-ref="statistics-page-preset-last24hours-btn"
                >
                  {t('last24Hours')}
                </Button>
                <Button
                  onClick={() => handlePresetChange('last7Days')}
                  variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                  data-id-ref="statistics-page-preset-last7days-btn"
                >
                  {t('last7Days')}
                </Button>
                <Button
                  onClick={() => handlePresetChange('last30Days')}
                  variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                  data-id-ref="statistics-page-preset-last30days-btn"
                >
                  {t('last30Days')}
                </Button>
                <Button
                  onClick={() => handlePresetChange('custom')}
                  variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                  data-id-ref="statistics-page-preset-custom-btn"
                >
                  {t('customRange')}
                </Button>
              </ButtonGroup>
            </Box>

            {selectedPreset === 'custom' && (
              <Box data-id-ref="statistics-page-custom-date-container">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                    <SeparatedDateTimePicker
                      id="start-datetime"
                      value={customStartDate}
                      onChange={setCustomStartDate}
                      dateLabel={t('startDate')}
                      timeLabel={t('startTime')}
                      data-id-ref="statistics-page-start-datetime-picker"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                    <SeparatedDateTimePicker
                      id="end-datetime"
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      dateLabel={t('endDate')}
                      timeLabel={t('endTime')}
                      data-id-ref="statistics-page-end-datetime-picker"
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate}
                  fullWidth
                  data-id-ref="statistics-page-apply-custom-date-btn"
                >
                  {t('apply')}
                </Button>
              </Box>
            )}
          </CardContent>
        </Collapse>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              {t('retry')}
            </Button>
          }
          data-id-ref="statistics-page-error-alert"
        >
          {error}
        </Alert>
      )}

      {/* Historical Statistics */}
      <Card sx={{ mb: 3 }} data-id-ref="statistics-page-historical-card">
        <CardHeader
          title={t('statistics.historical')}
          subtitle={labeledDateRange}
          icon={<BarChartIcon />}
          dataIdRef="statistics-page-historical-card-header"
        />
        <CardContent data-id-ref="statistics-page-historical-content">
          {dailyHistoricalStats && dailyHistoricalStats.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" data-id-ref="statistics-page-daily-table-container">
              <Table size="small" data-id-ref="statistics-page-daily-table">
                <TableHead>
                  <TableRow data-id-ref="statistics-page-daily-table-header-row">
                    <TableCell data-id-ref="statistics-page-daily-table-header-date">
                      <strong>{t('date')}</strong>
                    </TableCell>
                    {isAnalog ? (
                      <>
                        <TableCell align="right" data-id-ref="statistics-page-daily-table-header-mean">
                          <strong>{t('statistics.mean')}</strong>
                        </TableCell>
                        <TableCell align="right" data-id-ref="statistics-page-daily-table-header-min">
                          <strong>{t('statistics.minimum')}</strong>
                        </TableCell>
                        <TableCell align="right" data-id-ref="statistics-page-daily-table-header-max">
                          <strong>{t('statistics.maximum')}</strong>
                        </TableCell>
                        <TableCell align="right" data-id-ref="statistics-page-daily-table-header-std">
                          <strong>{t('statistics.standardDeviation')}</strong>
                        </TableCell>
                        <TableCell align="right" data-id-ref="statistics-page-daily-table-header-count">
                          <strong>{t('statistics.count')}</strong>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell align="right" data-id-ref="statistics-page-daily-table-header-count">
                        <strong>{t('statistics.count')}</strong>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(dailyHistoricalStats as (DailyAnalogStats | DailyDigitalStats)[]).map((day, index) => (
                    <TableRow 
                      key={day.date} 
                      hover
                      data-id-ref={`statistics-page-daily-table-row-${index}`}
                    >
                      <TableCell data-id-ref={`statistics-page-daily-table-date-${index}`}>
                        {day.date}
                      </TableCell>
                      {isAnalog ? (
                        <>
                          <TableCell align="right" data-id-ref={`statistics-page-daily-table-mean-${index}`}>
                            {(day as DailyAnalogStats).mean != null 
                              ? `${(day as DailyAnalogStats).mean.toFixed(2)} ${itemUnit}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right" data-id-ref={`statistics-page-daily-table-min-${index}`}>
                            {(day as DailyAnalogStats).min != null 
                              ? `${(day as DailyAnalogStats).min.toFixed(2)} ${itemUnit}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right" data-id-ref={`statistics-page-daily-table-max-${index}`}>
                            {(day as DailyAnalogStats).max != null 
                              ? `${(day as DailyAnalogStats).max.toFixed(2)} ${itemUnit}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right" data-id-ref={`statistics-page-daily-table-std-${index}`}>
                            {(day as DailyAnalogStats).std != null 
                              ? `${(day as DailyAnalogStats).std.toFixed(2)} ${itemUnit}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right" data-id-ref={`statistics-page-daily-table-count-${index}`}>
                            {(day as DailyAnalogStats).count}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell align="right" data-id-ref={`statistics-page-daily-table-count-${index}`}>
                          {(day as DailyDigitalStats).count}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" data-id-ref="statistics-page-historical-loading">
              {loading ? t('loading') : t('noData')}
            </Typography>
          )}
          
          {/* Summary Statistics */}
          {historicalStats && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }} data-id-ref="statistics-page-summary-statistics">
              <Typography variant="h6" gutterBottom data-id-ref="statistics-page-summary-title">
                {t('statistics.overallSummary')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }} data-id-ref="statistics-page-summary-grid">
                {isAnalog ? (
                  <>
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-mean">
                      <Box textAlign="center">
                        <FunctionsIcon color="primary" />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('statistics.averageMean')}
                        </Typography>
                        <Typography variant="h6">
                          {(historicalStats as AnalogStats).mean != null
                            ? `${(historicalStats as AnalogStats).mean.toFixed(2)} ${itemUnit}`
                            : t('noData')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-min">
                      <Box textAlign="center">
                        <TrendingUpIcon color="success" sx={{ transform: 'rotate(180deg)' }} />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('statistics.overallMinimum')}
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {(historicalStats as AnalogStats).min != null
                            ? `${(historicalStats as AnalogStats).min.toFixed(2)} ${itemUnit}`
                            : t('noData')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-max">
                      <Box textAlign="center">
                        <TrendingUpIcon color="error" />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('statistics.overallMaximum')}
                        </Typography>
                        <Typography variant="h6" color="error.main">
                          {(historicalStats as AnalogStats).max != null
                            ? `${(historicalStats as AnalogStats).max.toFixed(2)} ${itemUnit}`
                            : t('noData')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-std">
                      <Box textAlign="center">
                        <ShowChartIcon color="primary" />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('statistics.averageStdDev')}
                        </Typography>
                        <Typography variant="h6">
                          {(historicalStats as AnalogStats).std != null
                            ? `${(historicalStats as AnalogStats).std.toFixed(2)} ${itemUnit}`
                            : t('statistics.insufficientData')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 150px', minWidth: 150 }} data-id-ref="statistics-page-summary-count">
                      <Box textAlign="center">
                        <DataUsageIcon color="primary" />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('statistics.totalCount')}
                        </Typography>
                        <Typography variant="h6">
                          {(historicalStats as AnalogStats).count}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ flex: '1 1 250px', minWidth: 250 }} data-id-ref="statistics-page-summary-on-duration">
                      <Box textAlign="center">
                        <Typography variant="caption" color="text.secondary">
                          {t('statistics.onDuration')}
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {formatDuration((historicalStats as DigitalStats).onDuration)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {(historicalStats as DigitalStats).onPercentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 250px', minWidth: 250 }} data-id-ref="statistics-page-summary-off-duration">
                      <Box textAlign="center">
                        <Typography variant="caption" color="text.secondary">
                          {t('statistics.offDuration')}
                        </Typography>
                        <Typography variant="h5">
                          {formatDuration((historicalStats as DigitalStats).offDuration)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {(historicalStats as DigitalStats).offPercentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 250px', minWidth: 250 }} data-id-ref="statistics-page-summary-count">
                      <Box textAlign="center">
                        <Typography variant="caption" color="text.secondary">
                          {t('statistics.totalCount')}
                        </Typography>
                        <Typography variant="h5">
                          {(historicalStats as DigitalStats).count}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Visualizations */}
      {historicalStats && (
        <Box data-id-ref="statistics-page-charts-container">
          <Typography variant="h5" gutterBottom data-id-ref="statistics-page-charts-title">
            {t('statistics.visualizations')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {isAnalog ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }} data-id-ref="statistics-page-analog-comparison-chart-container">
                <Card>
                  <CardHeader
                    title={t('statistics.comparisonChart')}
                    dataIdRef="statistics-page-analog-comparison-chart-header"
                  />
                  <CardContent>
                    <EChartsWrapper
                      option={analogComparisonChart}
                      loading={loading}
                      height="400px"
                      onRetry={handleRefresh}
                      dataIdRef="statistics-page-analog-comparison-chart"
                    />
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }} data-id-ref="statistics-page-analog-count-chart-container">
                <Card>
                  <CardHeader
                    title={t('statistics.dailyCountTrend')}
                    dataIdRef="statistics-page-analog-count-chart-header"
                  />
                  <CardContent>
                    <EChartsWrapper
                      option={analogCountChart}
                      loading={loading}
                      height="300px"
                      onRetry={handleRefresh}
                      dataIdRef="statistics-page-analog-count-chart"
                    />
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 400px', minWidth: 400 }} data-id-ref="statistics-page-digital-distribution-chart-container">
                <Card>
                  <CardHeader
                    title={t('statistics.stateDistribution')}
                    dataIdRef="statistics-page-digital-distribution-chart-header"
                  />
                  <CardContent>
                    <EChartsWrapper
                      option={digitalDistributionChart}
                      loading={loading}
                      height="400px"
                      onRetry={handleRefresh}
                      dataIdRef="statistics-page-digital-distribution-chart"
                    />
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 400px', minWidth: 400 }} data-id-ref="statistics-page-digital-duration-chart-container">
                <Card>
                  <CardHeader
                    title={t('statistics.durationChart')}
                    dataIdRef="statistics-page-digital-duration-chart-header"
                  />
                  <CardContent>
                    <EChartsWrapper
                      option={digitalDurationChart}
                      loading={loading}
                      height="400px"
                      onRetry={handleRefresh}
                      dataIdRef="statistics-page-digital-duration-chart"
                    />
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }} data-id-ref="statistics-page-digital-count-chart-container">
                <Card>
                  <CardHeader
                    title={t('statistics.dailyCountTrend')}
                    dataIdRef="statistics-page-digital-count-chart-header"
                  />
                  <CardContent>
                    <EChartsWrapper
                      option={digitalCountChart}
                      loading={loading}
                      height="300px"
                      onRetry={handleRefresh}
                      dataIdRef="statistics-page-digital-count-chart"
                    />
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StatisticsPage;
