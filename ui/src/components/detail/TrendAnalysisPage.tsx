import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { fetchItems } from '../../store/slices/monitoringSlice';
import { monitoringApi } from '../../services/api';
import type { HistoryRequestDto, HistoryResponseDto, HistoricalDataPoint, Item } from '../../types/api';
import SeparatedDateTimePicker from '../SeparatedDateTimePicker';

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const TrendAnalysisPage: React.FC = () => {
  const { t, language } = useLanguage();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');

  // Get item from Redux store
  const items = useAppSelector((state) => state.monitoring.items);
  const item = useAppSelector((state) => 
    state.monitoring.items.find((item) => item.id === itemId)
  );
  const itemsLoading = useAppSelector((state) => state.monitoring.itemsLoading);

  // State management
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last24Hours');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  // Collapsed state for the Date Range card on mobile
  const [dateRangeCollapsed, setDateRangeCollapsed] = useState<boolean>(window.innerWidth < 768);

  // Fetch items if not loaded (for direct URL access)
  useEffect(() => {
    if (items.length === 0 && !itemsLoading) {
      dispatch(fetchItems({ showOrphans: false }));
    }
  }, [dispatch, items.length, itemsLoading]);

  // Handle window resize for responsive chart title
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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

      const response: HistoryResponseDto = await monitoringApi.getHistory(request);
      setHistoryData(response.values || []);
    } catch (err) {
      console.error('Error fetching history data:', err);
      setError(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

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
            width: 2,
          },
          itemStyle: {
            color: '#0d6efd',
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
  }, [historyData, language, t, itemUnit, composedChartTitle, isMobile]);

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
      <div
        className="container-fluid h-100 d-flex align-items-center justify-content-center"
        data-id-ref="trend-analysis-no-item-container"
      >
        <div className="text-center" data-id-ref="trend-analysis-no-item-content">
          <i className="bi bi-exclamation-triangle text-warning display-1 mb-4" data-id-ref="trend-analysis-no-item-icon" />
          <h3 className="mb-3" data-id-ref="trend-analysis-no-item-title">
            {t('itemNotFound')}
          </h3>
          <p className="text-muted mb-4" data-id-ref="trend-analysis-no-item-description">
            {language === 'fa' 
              ? 'برای مشاهده تحلیل روند، لطفاً از صفحه مانیتورینگ یک پوینت را انتخاب کنید.'
              : 'To view trend analysis, please select a monitoring item from the Monitoring page.'}
          </p>
          <a
            href="/dashboard/monitoring"
            className="btn btn-primary"
            data-id-ref="trend-analysis-no-item-back-button"
          >
            <i className="bi bi-arrow-left me-2" data-id-ref="trend-analysis-no-item-back-icon" />
            {language === 'fa' ? 'بازگشت به مانیتورینگ' : 'Go to Monitoring'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container-fluid h-100 d-flex flex-column ${isMobile ? 'py-1' : 'py-3 py-md-4'}`}
      data-id-ref="trend-analysis-page-container"
    >
      {/* Error Alert */}
      {error && (
        <div className="row mb-3" data-id-ref="trend-analysis-error-row">
          <div className="col-12">
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
              data-id-ref="trend-analysis-error-alert"
            >
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError(null)}
                aria-label="Close"
                data-id-ref="trend-analysis-error-close-button"
              />
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="row mb-3" data-id-ref="trend-analysis-date-range-row">
        <div className="col-12">
          <div className="card" data-id-ref="trend-analysis-date-range-card">
            <div className="card-header d-flex align-items-center justify-content-between p-2">
              <div className="d-flex align-items-center">
                <strong className="small mb-0" data-id-ref="trend-analysis-date-range-label">{t('dateRange')}</strong>
              </div>
              {/* Toggle button visible only on mobile */}
              {isMobile && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDateRangeCollapsed((s) => !s)}
                  aria-expanded={!dateRangeCollapsed}
                  data-id-ref="trend-analysis-date-range-toggle-button"
                >
                  <i className={`bi ${dateRangeCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`} />
                </button>
              )}
            </div>

            {/* Card body: hidden on mobile when collapsed */}
              {(!isMobile || !dateRangeCollapsed) && (
              <div className={`card-body ${isMobile ? 'p-2' : 'p-3'}`} data-id-ref="trend-analysis-date-range-card-body">
                <div className="row g-2 align-items-end">
                  {/* Preset Buttons */}
                  <div className="col-12 col-md-auto">
                    <div className="btn-group flex-wrap mt-1 mt-md-0 ms-md-2" role="group" data-id-ref="trend-analysis-preset-button-group">
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last24Hours' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last24Hours')}
                        data-id-ref="trend-analysis-preset-24h-button"
                      >
                        {t('last24Hours')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last7Days' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last7Days')}
                        data-id-ref="trend-analysis-preset-7d-button"
                      >
                        {t('last7Days')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last30Days' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last30Days')}
                        data-id-ref="trend-analysis-preset-30d-button"
                      >
                        {t('last30Days')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'custom' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('custom')}
                        data-id-ref="trend-analysis-preset-custom-button"
                      >
                        {t('customRange')}
                      </button>
                    </div>
                  </div>

                  {/* Custom Date Inputs (shown only when custom is selected) */}
                  {selectedPreset === 'custom' && (
                    <>
                      <SeparatedDateTimePicker
                        id="startDate"
                        value={customStartDate}
                        onChange={setCustomStartDate}
                        data-id-ref="trend-analysis-start-date"
                        className="col-12 col-md-auto"
                        dateLabel={t('startDate')}
                        timeLabel={t('startTime')}
                      />
                      <SeparatedDateTimePicker
                        id="endDate"
                        value={customEndDate}
                        onChange={setCustomEndDate}
                        data-id-ref="trend-analysis-end-date"
                        className="col-12 col-md-auto"
                        dateLabel={t('endDate')}
                        timeLabel={t('endTime')}
                      />
                    </>
                  )}

                  {/* Refresh Button */}
                  <div className="col-12 col-md-auto ms-md-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-success w-100 w-md-auto"
                      onClick={fetchHistoryData}
                      disabled={loading}
                      data-id-ref="trend-analysis-refresh-button"
                    >
                      <i className="bi bi-arrow-clockwise me-1" data-id-ref="trend-analysis-refresh-icon" />
                      {loading ? t('fetchingData') : t('refresh')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="row flex-fill" data-id-ref="trend-analysis-chart-row">
        <div className={`col-12 h-100 ${isMobile ? 'px-1' : ''}`} data-id-ref="trend-analysis-chart-col">
      <div className="card h-100 d-flex flex-column" data-id-ref="trend-analysis-chart-card">
            <div className={`card-header d-flex justify-content-between align-items-center ${isMobile ? 'py-1' : ''}`} data-id-ref="trend-analysis-chart-card-header">
              <h5 className="card-title mb-0" data-id-ref="trend-analysis-chart-title">
                {t('trendAnalysisTitle')}
              </h5>
              {/* Data Point Count */}
              {historyData.length > 0 && !loading && (
                <span className="badge bg-secondary" data-id-ref="trend-analysis-data-count">
                  {historyData.length} {t('dataPoints')}
                </span>
              )}
            </div>
            <div
              className={`card-body flex-fill d-flex align-items-center ${isMobile ? '' : 'justify-content-center'}`}
              data-id-ref="trend-analysis-chart-card-body"
            >
              {loading ? (
                <div className="text-center" data-id-ref="trend-analysis-loading-container">
                  <div className="spinner-border text-primary mb-3" role="status" data-id-ref="trend-analysis-loading-spinner">
                    <span className="visually-hidden">{t('loadingChart')}</span>
                  </div>
                  <p className="text-muted" data-id-ref="trend-analysis-loading-text">
                    {t('loadingChart')}
                  </p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center text-muted" data-id-ref="trend-analysis-no-data-container">
                  <i className="bi bi-inbox fs-1 mb-3 d-block" data-id-ref="trend-analysis-no-data-icon" />
                  <p data-id-ref="trend-analysis-no-data-text">{t('noData')}</p>
                </div>
              ) : (
                <ReactECharts
                  option={chartOption}
                  style={{ height: '100%', width: '100%', minHeight: isMobile ? '260px' : '400px' }}
                  opts={{ renderer: 'canvas' }}
                  data-id-ref="trend-analysis-chart"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysisPage;
