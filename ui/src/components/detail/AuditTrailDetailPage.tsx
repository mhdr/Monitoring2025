import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  MenuItem,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
  Stack,
  Pagination,
  Select,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../../hooks/useLanguage';
import { useMonitoring } from '../../hooks/useMonitoring';
import SyncfusionGridWrapper from '../SyncfusionGridWrapper';
import type { SyncfusionColumnDef, GridComponentType } from '../SyncfusionGridWrapper';
import AuditTrailDetailDialog from '../AuditTrailDetailDialog';
import SeparatedDateTimePicker from '../SeparatedDateTimePicker';
import type { AuditLogRequestDto, AuditLogResponseDto, DataDto, LogType } from '../../types/api';
import { LogTypeEnum } from '../../types/api';
import apiClient, { handleApiError } from '../../services/apiClient';
import { formatDate } from '../../utils/dateFormatting';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuditTrailDetailPage');

// Date range preset types
type DateRangePreset = 'last24Hours' | 'last7Days' | 'last30Days' | 'custom';

const AuditTrailDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  
  const { t, language } = useLanguage();
  const theme = useTheme();
  const { state: monitoringState } = useMonitoring();
  const items = monitoringState.items;

  // Get the item details for the specified itemId
  const currentItem = useMemo(() => {
    if (!itemId) return null;
    return items.find(i => i.id === itemId);
  }, [itemId, items]);

  // Filter state
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('last7Days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedLogType, setSelectedLogType] = useState<LogType | 'all'>('all');

  // Data state
  const [auditLogs, setAuditLogs] = useState<DataDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Dialog state
  const [selectedRow, setSelectedRow] = useState<DataDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

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
          // Default to last 7 days if custom dates not set
          startDate = now - 7 * 24 * 60 * 60;
        }
        break;
      default:
        startDate = now - 7 * 24 * 60 * 60;
    }

    return { startDate, endDate };
  }, [selectedPreset, customStartDate, customEndDate]);

  /**
   * Fetch audit logs from API (filtered by itemId from query string)
   */
  const fetchAuditLogs = useCallback(async () => {
    if (!itemId) {
      setError(t('itemNotFound'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange;

      const requestDto: AuditLogRequestDto = {
        startDate,
        endDate,
        itemId: itemId, // Pre-filter by itemId from query string
        page: currentPage,
        pageSize: pageSize,
      };

      logger.log('Fetching audit logs for itemId:', itemId, requestDto);

      const response = await apiClient.post<{ success: boolean; data: AuditLogResponseDto }>('/api/Monitoring/AuditLog', requestDto);

      if (response.data?.data) {
        const auditLogResponse = response.data.data;
        let filteredData = auditLogResponse.data || [];

        // Client-side filter by LogType if not 'all'
        if (selectedLogType !== 'all') {
          filteredData = filteredData.filter((log: DataDto) => log.actionType === selectedLogType);
        }

        setAuditLogs(filteredData);
        setTotalCount(auditLogResponse.totalCount || 0);
        setTotalPages(auditLogResponse.totalPages || 0);
        setCurrentPage(auditLogResponse.page || 1);

        logger.log(`Loaded ${filteredData.length} audit logs for item ${itemId} (page ${auditLogResponse.page}/${auditLogResponse.totalPages}, total: ${auditLogResponse.totalCount})`);
      }
    } catch (err) {
      logger.error('Error fetching audit logs:', err);
      setError(t('auditTrailPage.error'));
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, itemId, currentPage, pageSize, selectedLogType, t]);

  /**
   * Handle filter application
   */
  const handleApplyFilters = useCallback(() => {
    setCurrentPage(1); // Reset to first page
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setSelectedPreset('last7Days');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedLogType('all');
    setCurrentPage(1);
  }, []);

  /**
   * Handle date range preset change
   */
  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  /**
   * Convert Unix timestamp to datetime-local format for input
   */
  const unixToDateTimeLocal = (unix: number): string => {
    const date = new Date(unix * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  /**
   * Initialize custom dates when switching to custom preset
   */
  useEffect(() => {
    if (selectedPreset === 'custom' && !customStartDate && !customEndDate) {
      const { startDate, endDate } = getDateRange;
      setCustomStartDate(unixToDateTimeLocal(startDate));
      setCustomEndDate(unixToDateTimeLocal(endDate));
    }
  }, [selectedPreset, customStartDate, customEndDate, getDateRange]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback((event: SelectChangeEvent<number>) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Get log type translation
   */
  const getLogTypeLabel = useCallback(
    (logType: LogType): string => {
      switch (logType) {
        case LogTypeEnum.EditPoint:
          return t('auditTrailPage.logTypes.EditPoint');
        case LogTypeEnum.EditAlarm:
          return t('auditTrailPage.logTypes.EditAlarm');
        case LogTypeEnum.Login:
          return t('auditTrailPage.logTypes.Login');
        case LogTypeEnum.Logout:
          return t('auditTrailPage.logTypes.Logout');
        case LogTypeEnum.EditGroup:
          return t('auditTrailPage.logTypes.EditGroup');
        case LogTypeEnum.AddAlarm:
          return t('auditTrailPage.logTypes.AddAlarm');
        case LogTypeEnum.DeleteAlarm:
          return t('auditTrailPage.logTypes.DeleteAlarm');
        case LogTypeEnum.AddExternalAlarm:
          return t('auditTrailPage.logTypes.AddExternalAlarm');
        case LogTypeEnum.DeleteExternalAlarm:
          return t('auditTrailPage.logTypes.DeleteExternalAlarm');
        case LogTypeEnum.EditExternalAlarm:
          return t('auditTrailPage.logTypes.EditExternalAlarm');
        case LogTypeEnum.AddPoint:
          return t('auditTrailPage.logTypes.AddPoint');
        case LogTypeEnum.DeletePoint:
          return t('auditTrailPage.logTypes.DeletePoint');
        case LogTypeEnum.DeleteGroup:
          return t('auditTrailPage.logTypes.DeleteGroup');
        default:
          return `Unknown (${logType})`;
      }
    },
    [t]
  );

  /**
   * Details cell template
   */
  const detailsTemplate = useCallback((props: unknown) => {
    const data = props as DataDto;
    if (!data?.logValue) {
      return '-';
    }
    
    try {
      // Try to parse and format JSON
      const parsed = JSON.parse(data.logValue);
      return (
        <pre
          style={{
            margin: 0,
            padding: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // If not JSON, return as-is in a pre tag
      return (
        <pre
          style={{
            margin: 0,
            padding: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {data.logValue}
        </pre>
      );
    }
  }, [theme.palette.mode]);

  /**
   * Syncfusion Grid column definitions
   */
  const columnDefs = useMemo<SyncfusionColumnDef[]>(
    () => [
      {
        field: 'userNameDisplay',
        headerText: t('auditTrailPage.columns.userName'),
        width: 180,
        minWidth: 150,
        allowSorting: true,
        allowFiltering: true,
      },
      {
        field: 'actionTypeDisplay',
        headerText: t('auditTrailPage.columns.actionType'),
        width: 200,
        minWidth: 150,
        allowSorting: true,
        allowFiltering: true,
      },
      {
        field: 'dateTimeDisplay',
        headerText: t('auditTrailPage.columns.dateTime'),
        width: 250,
        minWidth: 180,
        allowSorting: true,
        allowFiltering: true,
      },
      {
        field: 'ipAddressDisplay',
        headerText: t('auditTrailPage.columns.ipAddress'),
        width: 160,
        minWidth: 120,
        allowSorting: true,
        allowFiltering: true,
      },
      {
        field: 'logValue',
        headerText: t('auditTrailPage.columns.details'),
        width: 300,
        minWidth: 200,
        allowSorting: false,
        allowFiltering: true,
        template: detailsTemplate,
      },
    ],
    [t, detailsTemplate]
  );

  /**
   * Prepare row data with display fields
   */
  const rowData = useMemo(() => {
    return auditLogs.map((log) => ({
      ...log,
      userNameDisplay: log.isUser ? (log.userName || '-') : t('auditTrailPage.systemUser'),
      actionTypeDisplay: log.actionType ? getLogTypeLabel(log.actionType) : '',
      dateTimeDisplay: log.time ? formatDate(log.time, language, 'long') : '',
      ipAddressDisplay: log.ipAddress || '-',
    }));
  }, [auditLogs, t, language, getLogTypeLabel]);

  /**
   * Syncfusion Grid ref
   */
  const gridRef = useRef<GridComponentType | null>(null);

  /**
   * Handle row click - open detail dialog
   */
  const handleRowSelected = useCallback((args: unknown) => {
    const event = args as { data?: DataDto };
    if (event.data) {
      logger.log('Row selected:', event.data);
      setSelectedRow(event.data);
      setDialogOpen(true);
    }
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedRow(null);
  }, []);

  // Reset to page 1 when date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPreset]);

  // Fetch data on mount and when pagination changes
  useEffect(() => {
    if (currentPage > 0 && itemId) {
      fetchAuditLogs();
    }
  }, [currentPage, pageSize, fetchAuditLogs, itemId]);

  // Show error if no itemId provided
  if (!itemId) {
    return (
      <Container
        maxWidth={false}
        data-id-ref="audit-trail-detail-page-container"
        sx={{ height: '100%', width: '100%', py: 3, px: 0, mx: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Card data-id-ref="audit-trail-detail-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            data-id-ref="audit-trail-detail-page-card-header"
            sx={{ py: 3, minHeight: 80 }}
            title={
              <Typography variant="h4" component="h1" data-id-ref="audit-trail-detail-page-title">
                {t('auditTrailDetail')}
              </Typography>
            }
          />
          <CardContent data-id-ref="audit-trail-detail-page-card-body" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Alert severity="error" data-id-ref="audit-trail-detail-no-itemid-alert">
              {t('itemNotFound')}
            </Alert>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Get display name for the item
  const itemDisplayName = currentItem 
    ? (language === 'fa' ? (currentItem.nameFa || currentItem.name) : currentItem.name)
    : itemId;

  return (
    <Container
      maxWidth={false}
      data-id-ref="audit-trail-detail-page-container"
      sx={{ height: '100%', width: '100%', py: 3, px: 0, mx: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Card data-id-ref="audit-trail-detail-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <CardHeader
          data-id-ref="audit-trail-detail-page-card-header"
          sx={{ py: 3, minHeight: 80 }}
          title={
            <Box data-id-ref="audit-trail-detail-page-title-box">
              <Typography variant="h4" component="h1" data-id-ref="audit-trail-detail-page-title">
                {t('auditTrailDetail')}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" data-id-ref="audit-trail-detail-page-subtitle">
                {itemDisplayName}
              </Typography>
            </Box>
          }
        />
        <CardContent data-id-ref="audit-trail-detail-page-card-body" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 2 }}>
          {/* Filters Section */}
          <Box data-id-ref="audit-trail-detail-filters" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Date Range Selection */}
            <Box data-id-ref="audit-trail-detail-date-range-section">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('dateRange')}
              </Typography>
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
                  data-id-ref="audit-trail-detail-preset-button-group"
                >
                  <Button
                    variant={selectedPreset === 'last24Hours' ? 'contained' : 'outlined'}
                    onClick={() => handlePresetChange('last24Hours')}
                    data-id-ref="audit-trail-detail-preset-24h-button"
                  >
                    {t('last24Hours')}
                  </Button>
                  <Button
                    variant={selectedPreset === 'last7Days' ? 'contained' : 'outlined'}
                    onClick={() => handlePresetChange('last7Days')}
                    data-id-ref="audit-trail-detail-preset-7d-button"
                  >
                    {t('last7Days')}
                  </Button>
                  <Button
                    variant={selectedPreset === 'last30Days' ? 'contained' : 'outlined'}
                    onClick={() => handlePresetChange('last30Days')}
                    data-id-ref="audit-trail-detail-preset-30d-button"
                  >
                    {t('last30Days')}
                  </Button>
                  <Button
                    variant={selectedPreset === 'custom' ? 'contained' : 'outlined'}
                    onClick={() => handlePresetChange('custom')}
                    data-id-ref="audit-trail-detail-preset-custom-button"
                  >
                    {t('customRange')}
                  </Button>
                </ButtonGroup>

                {/* Custom Date Range Picker (only shown when custom is selected) */}
                {selectedPreset === 'custom' && (
                  <>
                    <SeparatedDateTimePicker
                      id="audit-trail-detail-start"
                      value={customStartDate}
                      onChange={setCustomStartDate}
                      data-id-ref="audit-trail-detail-start-datetime"
                      className=""
                      dateLabel={t('startDate')}
                      timeLabel={t('startTime')}
                    />
                    <SeparatedDateTimePicker
                      id="audit-trail-detail-end"
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      data-id-ref="audit-trail-detail-end-datetime"
                      className=""
                      dateLabel={t('endDate')}
                      timeLabel={t('endTime')}
                    />
                  </>
                )}
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} data-id-ref="audit-trail-detail-type-filters">
              <FormControl fullWidth data-id-ref="audit-trail-detail-log-type-filter">
                <InputLabel>{t('auditTrailPage.logTypeLabel')}</InputLabel>
                <Select<LogType | 'all'>
                  value={selectedLogType}
                  label={t('auditTrailPage.logTypeLabel')}
                  onChange={(e) => setSelectedLogType(e.target.value as LogType | 'all')}
                >
                  <MenuItem value="all" data-id-ref="audit-trail-detail-log-type-all">
                    {t('auditTrailPage.allLogTypes')}
                  </MenuItem>
                  {Object.entries(LogTypeEnum).map(([key, value]) => (
                    <MenuItem key={value} value={value} data-id-ref={`audit-trail-detail-log-type-${key}`}>
                      {getLogTypeLabel(value as LogType)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2} data-id-ref="audit-trail-detail-filter-buttons">
              <Button variant="contained" onClick={handleApplyFilters} disabled={loading} data-id-ref="audit-trail-detail-apply-filters-btn">
                {t('auditTrailPage.applyFilters')}
              </Button>
              <Button variant="outlined" onClick={handleClearFilters} disabled={loading} data-id-ref="audit-trail-detail-clear-filters-btn">
                {t('auditTrailPage.clearFilters')}
              </Button>
            </Stack>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" data-id-ref="audit-trail-detail-error-alert" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }} data-id-ref="audit-trail-detail-loading">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>{t('auditTrailPage.loadingData')}</Typography>
            </Box>
          )}

          {/* Syncfusion Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 0 }} data-id-ref="audit-trail-detail-grid-container">
              <SyncfusionGridWrapper
                ref={gridRef}
                data={rowData}
                columns={columnDefs}
                height="100%"
                allowPaging={false}
                allowSorting={true}
                allowFiltering={true}
                allowResizing={true}
                allowExcelExport={true}
                onRowSelected={handleRowSelected}
              />
            </Box>
          )}

          {/* Pagination Controls */}
          {!loading && totalCount > 0 && (
            <Box
              data-id-ref="audit-trail-detail-pagination"
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                pt: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} data-id-ref="audit-trail-detail-pagination-info">
                <FormControl size="small" sx={{ minWidth: 120 }} data-id-ref="audit-trail-detail-page-size-select">
                  <InputLabel>{t('auditTrailPage.pagination.rowsPerPage')}</InputLabel>
                  <Select value={pageSize} label={t('auditTrailPage.pagination.rowsPerPage')} onChange={handlePageSizeChange}>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" data-id-ref="audit-trail-detail-pagination-text">
                  {t('auditTrailPage.pagination.showing', {
                    from: (currentPage - 1) * pageSize + 1,
                    to: Math.min(currentPage * pageSize, totalCount),
                    total: totalCount,
                  })}
                </Typography>
              </Box>

              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
                data-id-ref="audit-trail-detail-pagination-component"
              />
            </Box>
          )}

          {/* No Data Message */}
          {!loading && auditLogs.length === 0 && (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
              data-id-ref="audit-trail-detail-no-data"
            >
              <Typography color="text.secondary">{t('auditTrailPage.noData')}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <AuditTrailDetailDialog open={dialogOpen} onClose={handleDialogClose} data={selectedRow} />
    </Container>
  );
};

export default AuditTrailDetailPage;
