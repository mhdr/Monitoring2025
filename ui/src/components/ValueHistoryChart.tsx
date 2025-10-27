import React, { useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@mui/material/styles';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import type { Item } from '../types/api';
import { createLogger } from '../utils/logger';
import { toPersianDigits } from '../utils/numberFormatting';
import { formatDate } from '../utils/dateFormatting';

const logger = createLogger('ValueHistoryChart');

interface ValueHistoryChartProps {
  /** Array of historical value data points */
  history: Array<{ value: number; time: number }>;
  /** Item metadata for formatting and display */
  item: Item;
  /** Item display name */
  itemName: string;
  /** Chart container height in pixels */
  height?: string | number;
  /** Chart container width */
  width?: string | number;
}

/**
 * ValueHistoryChart - Reusable chart component for displaying item value history
 * 
 * Used in:
 * - ItemCard.tsx - Quick history modal in monitoring page
 * - ActiveAlarmsPage.tsx - Value history modal for alarmed items
 * 
 * Features:
 * - Automatic timestamp conversion (Unix seconds to Date)
 * - Bilingual support (fa/en) with proper date formatting
 * - RTL layout support
 * - Theme-aware styling (light/dark mode)
 * - Responsive design with minimal padding
 * - Gradient area fill
 * - Custom tooltip formatting based on item type
 */
const ValueHistoryChart: React.FC<ValueHistoryChartProps> = ({
  history,
  item,
  itemName,
  height = '100%',
  width = '100%',
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const theme = useTheme();
  const isRTL = language === 'fa';

  logger.log('ValueHistoryChart render', { 
    itemId: item.id, 
    itemName, 
    historyLength: history.length 
  });

  /**
   * Format item value based on item type (digital/analog)
   */
  const formatItemValue = useCallback((value: string | null): string => {
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
      const formattedValue = unit ? `${numValue} ${unit}` : numValue.toString();
      
      // Convert to Persian digits if in RTL mode
      return isRTL ? toPersianDigits(formattedValue) : formattedValue;
    }

    return isRTL ? toPersianDigits(value) : value;
  }, [t, isRTL, item]);

  /**
   * Generate ECharts configuration
   */
  const chartOptions: EChartsOption = useMemo(() => {
    if (!history || history.length === 0) return {};

    // Prepare data - convert Unix timestamp (seconds) to full date/time using global formatter
    const times = history.map(h => {
      return formatDate(h.time, language, 'long');
    });
    const values = history.map(h => h.value);
    
    // Get unit suffix in current language
    const unit = isRTL && item.unitFa ? item.unitFa : item.unit;
    const unitSuffix = unit ? ` (${unit})` : '';
    
    // Set font family for Persian language - IRANSansX converts digits to Persian
    const fontFamily = isRTL ? 'IRANSansX, sans-serif' : 'inherit';

    return {
      // Title is shown in dialog, not in chart
      title: {
        show: false,
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = params as Array<{ name: string; value: number; seriesName: string }>;
          if (p && p[0]) {
            const formattedValue = formatItemValue(String(p[0].value));
            return `${p[0].seriesName}: ${formattedValue}<br/>${p[0].name}`;
          }
          return '';
        },
        textStyle: {
          fontFamily,
          fontSize: 12,
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          show: false, // Hide x-axis labels for cleaner appearance
          fontFamily,
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: `${t('value')}${unitSuffix}`,
        nameTextStyle: {
          color: theme.palette.text.secondary,
          fontFamily,
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: (value: number) => formatItemValue(String(value)),
          fontFamily,
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          },
        },
        splitLine: {
          lineStyle: {
            color: theme.palette.divider,
            type: 'dashed',
          },
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
                {
                  offset: 0,
                  color: theme.palette.primary.main + '40', // 25% opacity at top
                },
                {
                  offset: 1,
                  color: theme.palette.primary.main + '10', // 6% opacity at bottom
                },
              ],
            },
          },
        },
      ],
      textStyle: {
        fontFamily,
      },
    };
  }, [history, language, isRTL, item, formatItemValue, theme, t]);

  return (
    <ReactECharts
      option={chartOptions}
      style={{ height, width }}
      opts={{ renderer: 'svg', locale: isRTL ? 'FA' : 'EN' }}
      notMerge={true}
      lazyUpdate={false}
      data-id-ref="value-history-chart"
    />
  );
};

export default ValueHistoryChart;
