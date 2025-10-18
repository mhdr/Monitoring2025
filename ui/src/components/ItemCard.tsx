import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Stack,
  Divider,
  Tooltip,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { 
  OpenInNew,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useLanguage } from '../hooks/useLanguage';
import { useTranslation } from '../hooks/useTranslation';
import { useUrlPrefetch } from '../hooks/useUrlPrefetch';
import { buildDetailTabUrl } from '../utils/detailRoutes';
import { createLogger } from '../utils/logger';
import type { Item } from '../types/api';

const logger = createLogger('ItemCard');

interface ItemCardProps {
  itemId: string;
  name: string;
  pointNumber: number;
  value: string;
  time: string;
  valueHistory?: Array<{value: number; time: number}>;
  item?: Item;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
  itemId, 
  name, 
  pointNumber, 
  value, 
  time, 
  valueHistory = [],
  item 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const theme = useTheme();
  const prefetchUrl = useUrlPrefetch();
  const [elevation, setElevation] = useState<number>(1);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const isRTL = language === 'fa';

  logger.log('ItemCard render', { itemId, name, historyLength: valueHistory.length });

  // Memoize the detail URL to avoid recalculating on every render
  const detailUrl = useMemo(
    () => buildDetailTabUrl('trend-analysis', { itemId }),
    [itemId]
  );

  /**
   * Get trend indicator for value change
   */
  const getValueTrend = useMemo((): 'up' | 'down' | 'stable' => {
    if (!valueHistory || valueHistory.length < 2) return 'stable';
    
    const currentValue = valueHistory[valueHistory.length - 1].value;
    const prevValue = valueHistory[valueHistory.length - 2].value;
    
    if (currentValue > prevValue) return 'up';
    if (currentValue < prevValue) return 'down';
    return 'stable';
  }, [valueHistory]);

  const handleOpenNewTab = () => {
    // Open a new tab with the item detail page
    try {
      // Open in new tab
      window.open(detailUrl, '_blank');
    } catch (e) {
      // no-op - window may be undefined in some test environments
      // keep silent to avoid breaking UI; log warning in dev
      logger.warn('Could not open new tab', e);
    }
  };

  const handlePrefetch = () => {
    // Start prefetching the detail page when user hovers
    // This loads resources BEFORE the click, significantly improving perceived performance
    prefetchUrl(detailUrl);
  };

  /**
   * Handle history icon click
   */
  const handleHistoryClick = () => {
    if (valueHistory && valueHistory.length > 1) {
      logger.log(`Opening history modal for item: ${name}`, { historyLength: valueHistory.length });
      setHistoryModalOpen(true);
    } else {
      logger.warn('Cannot open history: insufficient data', { 
        historyLength: valueHistory?.length || 0 
      });
    }
  };

  /**
   * Get chart options for history modal
   */
  const getHistoryChartOptions = (): EChartsOption => {
    if (!valueHistory || valueHistory.length === 0) return {};

    // Prepare data - convert Unix timestamp (seconds) to milliseconds and format full date/time
    const times = valueHistory.map(h => {
      const date = new Date(h.time * 1000); // Convert Unix timestamp to milliseconds
      return date.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    });
    const values = valueHistory.map(h => h.value);
    
    // Get unit suffix in current language
    const unit = item && isRTL && item.unitFa ? item.unitFa : item?.unit;
    const unitSuffix = unit ? ` (${unit})` : '';
    
    // Set font family for Persian language
    const fontFamily = isRTL ? 'IRANSansX, sans-serif' : undefined;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: theme.palette.grey[700],
          },
        },
      },
      grid: {
        left: isRTL ? '3%' : '3%',
        right: isRTL ? '3%' : '3%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLabel: {
          show: false, // Hide x-axis labels
        },
      },
      yAxis: {
        type: 'value',
        name: `${t('value')}${unitSuffix}`,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontFamily,
          fontSize: 12,
        },
        axisLabel: {
          fontFamily,
        },
      },
      series: [
        {
          name: name,
          type: 'line',
          data: values,
          smooth: true,
          areaStyle: {
            opacity: 0.2,
          },
          lineStyle: {
            color: theme.palette.primary.main,
            width: 2,
          },
          itemStyle: {
            color: theme.palette.primary.main,
          },
        },
      ],
      textStyle: {
        fontFamily,
      },
    };
  };

  return (
    <>
      <Fade in timeout={300}>
        <Card
          elevation={elevation}
          onMouseEnter={() => setElevation(6)}
          onMouseLeave={() => setElevation(1)}
          sx={{
            height: '100%',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
          data-id-ref="item-card-root-container"
        >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 2,
            '&:last-child': {
              paddingBottom: 2,
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              marginBottom: 1.5,
            }}
            data-id-ref="item-card-header"
          >
            <Typography
              variant="h6"
              component="h6"
              sx={{
                fontWeight: 600,
                wordBreak: 'break-word',
                lineHeight: 1.4,
                flex: 1,
                fontSize: '1rem',
              }}
              data-id-ref="item-card-title"
            >
              {name}
            </Typography>
            <Tooltip title={t('openInNewTab')} arrow placement="top">
              <IconButton
                onClick={handleOpenNewTab}
                onMouseEnter={handlePrefetch}
                aria-label={t('openInNewTab')}
                size="small"
                sx={{
                  color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: 'primary.main',
                    transform: 'scale(1.1)',
                  },
                }}
                data-id-ref="item-card-open-new-tab-button"
              >
                <OpenInNew fontSize="small" data-id-ref="item-card-open-icon" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider sx={{ marginBottom: 1.5 }} />

          {/* Body */}
          <Stack
            spacing={1}
            sx={{ flex: 1 }}
            data-id-ref="item-card-body"
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-point-number"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-point-number"
              >
                {t('pointNumber')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                }}
                data-id-ref="item-card-value-point-number"
              >
                {pointNumber}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-value"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-value"
              >
                {t('value')}:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    color: 'text.secondary',
                    wordBreak: 'break-word',
                  }}
                  data-id-ref="item-card-value-value"
                >
                  {value}
                </Typography>
                {/* Trend indicator */}
                {valueHistory && valueHistory.length >= 2 && (() => {
                  const trend = getValueTrend;
                  if (trend === 'up') {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendIncreasing')} arrow>
                        <TrendingUpIcon 
                          sx={{ fontSize: 14, color: 'error.main' }} 
                          data-id-ref="item-card-trend-up-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (trend === 'down') {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendDecreasing')} arrow>
                        <TrendingDownIcon 
                          sx={{ fontSize: 14, color: 'success.main' }} 
                          data-id-ref="item-card-trend-down-icon" 
                        />
                      </Tooltip>
                    );
                  } else if (valueHistory.length >= 2) {
                    return (
                      <Tooltip title={t('activeAlarmsPage.trendStable')} arrow>
                        <TrendingFlatIcon 
                          sx={{ fontSize: 14, color: 'text.disabled' }} 
                          data-id-ref="item-card-trend-flat-icon" 
                        />
                      </Tooltip>
                    );
                  }
                  return null;
                })()}
                {/* History chart icon */}
                {valueHistory && valueHistory.length > 1 && (
                  <Tooltip title={t('activeAlarmsPage.viewHistory')} arrow>
                    <IconButton 
                      size="small" 
                      sx={{ p: 0, ml: 0.5 }}
                      onClick={handleHistoryClick}
                      data-id-ref="value-history-icon"
                    >
                      <TimelineIcon 
                        sx={{ fontSize: 14, color: 'info.main' }} 
                        data-id-ref="value-history-timeline-icon" 
                      />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
              }}
              data-id-ref="item-card-row-time"
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                data-id-ref="item-card-label-time"
              >
                {t('time')}:
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: 'text.secondary',
                  wordBreak: 'break-word',
                }}
                data-id-ref="item-card-value-time"
              >
                {time}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
    
    {/* Value History Modal */}
    <Dialog
      open={historyModalOpen}
      onClose={() => setHistoryModalOpen(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="item-card-history-modal"
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1,
        }}
        data-id-ref="item-card-history-modal-title"
      >
        <Typography variant="h6" component="span" data-id-ref="item-card-history-modal-title-text">
          {t('activeAlarmsPage.historyModalTitle', { itemName: name })}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={() => setHistoryModalOpen(false)}
          aria-label={t('cancel')}
          size="small"
          data-id-ref="item-card-history-modal-close-button"
        >
          <CloseIcon data-id-ref="item-card-history-modal-close-icon" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2, pb: 2 }} data-id-ref="item-card-history-modal-content">
        <Box 
          sx={{ 
            width: '100%', 
            height: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-id-ref="item-card-history-chart-container"
        >
          {valueHistory && valueHistory.length > 1 ? (
            <ReactECharts
              option={getHistoryChartOptions()}
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'svg' }}
              data-id-ref="item-card-history-chart"
            />
          ) : (
            <Typography color="text.secondary" data-id-ref="item-card-history-no-data">
              {t('activeAlarmsPage.noHistoryData')}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }} data-id-ref="item-card-history-modal-actions">
        <Button 
          onClick={() => setHistoryModalOpen(false)}
          variant="contained"
          data-id-ref="item-card-history-modal-close-action-button"
        >
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default ItemCard;
