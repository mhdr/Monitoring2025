/**
 * EChartsWrapper Component
 * 
 * Reusable wrapper for ECharts with MUI theme integration, loading states,
 * responsive sizing, and internationalization support.
 * 
 * Features:
 * - Automatic MUI theme color integration (light/dark modes)
 * - Built-in loading skeleton
 * - RTL support for Persian language
 * - Responsive sizing
 * - Error handling with retry functionality
 * - Empty state display
 */

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Box, Skeleton, Typography, Button, useTheme } from '@mui/material';
import { Inbox as InboxIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';

export interface EChartsWrapperProps {
  /** ECharts option configuration */
  option: EChartsOption;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Empty state message when no data */
  emptyMessage?: string;
  /** Chart height (CSS value) */
  height?: string | number;
  /** Chart width (CSS value) */
  width?: string | number;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** data-id-ref for testing */
  dataIdRef?: string;

  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom empty state component */
  emptyComponent?: React.ReactNode;
}

/**
 * EChartsWrapper - MUI-themed chart component with loading and error states
 * 
 * @example
 * <EChartsWrapper 
 *   option={chartOption}
 *   loading={isLoading}
 *   error={errorMessage}
 *   height="400px"
 *   onRetry={() => fetchData()}
 * />
 */
export const EChartsWrapper: React.FC<EChartsWrapperProps> = ({
  option,
  loading = false,
  error = null,
  emptyMessage,
  height = '400px',
  width = '100%',
  onRetry,
  className = '',
  dataIdRef,
  loadingComponent,
  emptyComponent,
}) => {
  const theme = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === 'fa';

  // Check if chart has data
  const isEmpty = useMemo(() => {
    if (!option || !option.series) return true;
    return false; // If series exists, assume it has data (let ECharts handle empty series)
  }, [option]);

  // Merge user option with MUI theme colors
  const themedOption: EChartsOption = useMemo(() => {
    if (!option) return {};

    // Extract theme colors
    const primaryColor = theme.palette.primary.main;
    const secondaryColor = theme.palette.secondary.main;
    const textPrimary = theme.palette.text.primary;
    const textSecondary = theme.palette.text.secondary;
    const backgroundColor = theme.palette.background.paper;
    const gridColor = theme.palette.divider;

    return {
      ...option,
      backgroundColor: backgroundColor,
      textStyle: {
        color: textPrimary,
        fontFamily: isRTL ? 'iransansx, Tahoma, Arial, sans-serif' : theme.typography.fontFamily,
      },
      // Apply theme colors to grid if not explicitly set
      grid: {
        borderColor: gridColor,
        ...option.grid,
      },
      // Apply theme colors to axes if not explicitly set
      xAxis: option.xAxis ? {
        ...(Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis),
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textSecondary },
        splitLine: { lineStyle: { color: gridColor } },
      } : undefined,
      yAxis: option.yAxis ? {
        ...(Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis),
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textSecondary },
        splitLine: { lineStyle: { color: gridColor } },
      } : undefined,
      // Apply primary color to series if not explicitly set
      color: option.color || [primaryColor, secondaryColor],
      // Apply theme to tooltip
      tooltip: {
        backgroundColor: backgroundColor,
        borderColor: gridColor,
        textStyle: { color: textPrimary },
        ...option.tooltip,
      },
      // Apply theme to legend
      legend: {
        textStyle: { color: textPrimary },
        ...option.legend,
      },
      // Apply theme to title
      title: option.title ? {
        ...option.title,
        textStyle: {
          color: textPrimary,
          ...(typeof option.title === 'object' && 'textStyle' in option.title ? option.title.textStyle : {}),
        },
      } : undefined,
    };
  }, [option, theme, isRTL]);

  // Container style
  const containerStyle = useMemo(() => ({
    width,
    height,
    position: 'relative' as const,
  }), [width, height]);

  // Loading State
  if (loading) {
    if (loadingComponent) {
      return <Box sx={containerStyle} data-id-ref={dataIdRef ? `${dataIdRef}-loading` : undefined}>{loadingComponent}</Box>;
    }
    
    return (
      <Box sx={containerStyle} data-id-ref={dataIdRef ? `${dataIdRef}-loading` : undefined}>
        <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box
        sx={{
          ...containerStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
        }}
        data-id-ref={dataIdRef ? `${dataIdRef}-error` : undefined}
      >
        <Typography variant="h6" color="error.main" gutterBottom>
          {error}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            {t('retry')}
          </Button>
        )}
      </Box>
    );
  }

  // Empty State
  if (isEmpty) {
    if (emptyComponent) {
      return <Box sx={containerStyle} data-id-ref={dataIdRef ? `${dataIdRef}-empty` : undefined}>{emptyComponent}</Box>;
    }

    return (
      <Box
        sx={{
          ...containerStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
        data-id-ref={dataIdRef ? `${dataIdRef}-empty` : undefined}
      >
        <InboxIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary">
          {emptyMessage || t('noData')}
        </Typography>
      </Box>
    );
  }

  // Chart Render
  return (
    <Box sx={containerStyle} className={className} data-id-ref={dataIdRef}>
      <ReactECharts
        option={themedOption}
        style={{ width: '100%', height: '100%' }}
        opts={{
          renderer: 'svg', // SVG for better performance with many data points
          locale: isRTL ? 'FA' : 'EN',
        }}
        notMerge={true}
        lazyUpdate={true}
      />
    </Box>
  );
};

export default EChartsWrapper;
