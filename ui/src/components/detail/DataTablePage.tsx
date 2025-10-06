import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { fetchItems } from '../../store/slices/monitoringSlice';
import { useLazyGetHistoryQuery } from '../../services/rtkApi';
import type { HistoryRequestDto, HistoricalDataPoint, Item } from '../../types/api';
import SeparatedDateTimePicker from '../SeparatedDateTimePicker';
import { AGGridWrapper } from '../AGGridWrapper';
import { useAGGrid } from '../../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi } from '../../types/agGrid';
import { useRef, useCallback } from 'react';
import type { AGGridColumnDef } from '../../types/agGrid';
import { formatDateByLanguage, createAGGridNumberFormatter } from '../../utils/numberFormatting';

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const DataTablePage: React.FC = () => {
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

  // RTK Query lazy hook for fetching history
  const [fetchHistory, { data: historyResponse, isError }] = useLazyGetHistoryQuery();
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Local loading state for better control
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last24Hours');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  // Collapsed state for the Date Range card on mobile
  const [dateRangeCollapsed, setDateRangeCollapsed] = useState<boolean>(window.innerWidth < 768);

  // AG Grid integration
  const { exportToCsv, exportToExcel, handleGridReady } = useAGGrid();
  const gridRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);

  // Column state persistence keys
  const COLUMN_STATE_KEY = 'dataTable.columnState.v1';

  const onGridReadyInternal = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    gridRef.current = api;
    columnApiRef.current = colApi;
    handleGridReady(api, colApi);
    // Restore column state if stored
    try {
      const saved = localStorage.getItem(COLUMN_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (api.applyColumnState && state) {
          api.applyColumnState(state);
        }
      }
    } catch (e) {
      console.warn('[DataTablePage] Failed to restore column state', e);
    }
  }, [handleGridReady]);

  const saveColumnState = useCallback(() => {
    if (gridRef.current?.getColumnState) {
      try {
        const state = gridRef.current.getColumnState?.();
        localStorage.setItem(COLUMN_STATE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('[DataTablePage] Failed to save column state', e);
      }
    }
  }, []);

  // Fetch items if not loaded (for direct URL access)
  useEffect(() => {
    if (items.length === 0 && !itemsLoading) {
      dispatch(fetchItems({ showOrphans: false }));
    }
  }, [dispatch, items.length, itemsLoading]);

  // Handle window resize for responsive layout
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
      console.error('Error fetching history data:', err);
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
      <div
        className="container-fluid h-100 d-flex align-items-center justify-content-center"
        data-id-ref="data-table-no-item-container"
      >
        <div className="text-center" data-id-ref="data-table-no-item-content">
          <i className="bi bi-exclamation-triangle text-warning display-1 mb-4" data-id-ref="data-table-no-item-icon" />
          <h3 className="mb-3" data-id-ref="data-table-no-item-title">
            {t('itemNotFound')}
          </h3>
          <p className="text-muted mb-4" data-id-ref="data-table-no-item-description">
            {language === 'fa' 
              ? 'برای مشاهده جدول داده‌ها، لطفاً از صفحه مانیتورینگ یک پوینت را انتخاب کنید.'
              : 'To view data table, please select a monitoring item from the Monitoring page.'}
          </p>
          <a
            href="/dashboard/monitoring"
            className="btn btn-primary"
            data-id-ref="data-table-no-item-back-button"
          >
            <i className="bi bi-arrow-left me-2" data-id-ref="data-table-no-item-back-icon" />
            {language === 'fa' ? 'بازگشت به مانیتورینگ' : 'Go to Monitoring'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container-fluid h-100 d-flex flex-column ${isMobile ? 'py-1' : 'py-3 py-md-4'}`}
      data-id-ref="data-table-page-container"
    >
      {/* Error Alert */}
      {error && (
        <div className="row mb-3" data-id-ref="data-table-error-row">
          <div className="col-12">
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
              data-id-ref="data-table-error-alert"
            >
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError(null)}
                aria-label="Close"
                data-id-ref="data-table-error-close-button"
              />
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="row mb-3" data-id-ref="data-table-date-range-row">
        <div className="col-12">
          <div className="card" data-id-ref="data-table-date-range-card">
            <div className="card-header d-flex align-items-center justify-content-between p-2">
              <div className="d-flex align-items-center">
                <strong className="small mb-0" data-id-ref="data-table-date-range-label">{t('dateRange')}</strong>
              </div>
              {/* Toggle button visible only on mobile */}
              {isMobile && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDateRangeCollapsed((s) => !s)}
                  aria-expanded={!dateRangeCollapsed}
                  data-id-ref="data-table-date-range-toggle-button"
                >
                  <i className={`bi ${dateRangeCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`} />
                </button>
              )}
            </div>

            {/* Card body: hidden on mobile when collapsed */}
            {(!isMobile || !dateRangeCollapsed) && (
              <div className={`card-body ${isMobile ? 'p-2' : 'p-3'}`} data-id-ref="data-table-date-range-card-body">
                <div className="row g-2 align-items-end">
                  {/* Preset Buttons */}
                  <div className="col-12 col-md-auto">
                    <div className="btn-group flex-wrap mt-1 mt-md-0 ms-md-2" role="group" data-id-ref="data-table-preset-button-group">
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last24Hours' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last24Hours')}
                        data-id-ref="data-table-preset-24h-button"
                      >
                        {t('last24Hours')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last7Days' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last7Days')}
                        data-id-ref="data-table-preset-7d-button"
                      >
                        {t('last7Days')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'last30Days' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('last30Days')}
                        data-id-ref="data-table-preset-30d-button"
                      >
                        {t('last30Days')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedPreset === 'custom' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handlePresetChange('custom')}
                        data-id-ref="data-table-preset-custom-button"
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
                        data-id-ref="data-table-start-date"
                        className="col-12 col-md-auto"
                        dateLabel={t('startDate')}
                        timeLabel={t('startTime')}
                      />
                      <SeparatedDateTimePicker
                        id="endDate"
                        value={customEndDate}
                        onChange={setCustomEndDate}
                        data-id-ref="data-table-end-date"
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
                      data-id-ref="data-table-refresh-button"
                    >
                      <i className="bi bi-arrow-clockwise me-1" data-id-ref="data-table-refresh-icon" />
                      {loading ? t('fetchingData') : t('refresh')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="row flex-fill" data-id-ref="data-table-table-row">
        <div className={`col-12 h-100 ${isMobile ? 'px-1' : ''}`} data-id-ref="data-table-table-col">
          <div className="card h-100 d-flex flex-column" data-id-ref="data-table-table-card">
            <div className={`card-header d-flex justify-content-between align-items-center ${isMobile ? 'py-1' : ''}`} data-id-ref="data-table-table-card-header">
              <h5 className="card-title mb-0" data-id-ref="data-table-table-title">
                {t('dataTableTitle')}
              </h5>
              {/* Export buttons and data point count */}
              <div className="d-flex align-items-center gap-2">
                {historyData.length > 0 && !loading && (
                  <>
                    <span className="badge bg-secondary" data-id-ref="data-table-data-count">
                      {historyData.length} {t('dataPoints')}
                    </span>
                    {!isMobile && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => exportToCsv('historical-data.csv')}
                          data-id-ref="data-table-export-csv-button"
                          title={t('export') + ' CSV'}
                        >
                          <i className="bi bi-filetype-csv" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => exportToExcel('historical-data.xlsx')}
                          data-id-ref="data-table-export-excel-button"
                          title={t('export') + ' Excel'}
                        >
                          <i className="bi bi-file-earmark-excel" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={saveColumnState}
                          data-id-ref="data-table-save-state-button"
                          title={t('export') + ' state'}
                        >
                          <i className="bi bi-save" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div
              className={`card-body flex-fill d-flex align-items-center ${isMobile ? 'p-1' : ''}`}
              data-id-ref="data-table-table-card-body"
            >
              {loading ? (
                <div className="text-center w-100" data-id-ref="data-table-loading-container">
                  <div className="spinner-border text-primary mb-3" role="status" data-id-ref="data-table-loading-spinner">
                    <span className="visually-hidden">{t('loadingTable')}</span>
                  </div>
                  <p className="text-muted" data-id-ref="data-table-loading-text">
                    {t('loadingTable')}
                  </p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center text-muted w-100" data-id-ref="data-table-no-data-container">
                  <i className="bi bi-inbox fs-1 mb-3 d-block" data-id-ref="data-table-no-data-icon" />
                  <p data-id-ref="data-table-no-data-text">{t('noData')}</p>
                </div>
              ) : (
                <>
                  <div className="w-100 h-100" style={{ minHeight: isMobile ? '300px' : '400px' }}>
                    <AGGridWrapper
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
                          headerCheckbox: false,
                        },

                        defaultColDef: {
                          resizable: true,
                          sortable: true,
                          filter: true,
                          flex: 1,
                          minWidth: 120,
                        },
                        onColumnMoved: saveColumnState,
                        onColumnVisible: saveColumnState,
                        onColumnPinned: saveColumnState,
                        onColumnResized: saveColumnState,
                      }}
                      data-id-ref="data-table-grid"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTablePage;
