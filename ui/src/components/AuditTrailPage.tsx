import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
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
import { useLanguage } from '../hooks/useLanguage';
import { useAGGrid } from '../hooks/useAGGrid';
import { useMonitoring } from '../hooks/useMonitoring';
import AGGridWrapper from './AGGridWrapper';
import AuditTrailDetailDialog from './AuditTrailDetailDialog';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import type { AuditLogRequestDto, AuditLogResponseDto, DataDto, LogType } from '../types/api';
import type { AGGridRowData } from '../types/agGrid';
import { LogTypeEnum } from '../types/api';

// Backend wraps the AuditLogResponseDto in a response envelope
interface AuditLogApiResponse {
  success: boolean;
  data: AuditLogResponseDto;
}
import apiClient, { handleApiError } from '../services/apiClient';
import { formatDate } from '../utils/dateFormatting';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuditTrailPage');

const AuditTrailPage: React.FC = () => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const isRTL = language === 'fa';
  const { state: monitoringState } = useMonitoring();
  const items = monitoringState.items;

  // Filter state
  const [startDate, setStartDate] = useState<string>(() => {
    // Default: 7 days ago
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    // Default: today
    return new Date().toISOString().split('T')[0];
  });
  const [selectedLogType, setSelectedLogType] = useState<LogType | 'all'>('all');
  const [itemIdFilter, setItemIdFilter] = useState<string>('');

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

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert date strings to Unix timestamps (start of day and end of day)
      const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0) / 1000;
      const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999) / 1000;

      const requestDto: AuditLogRequestDto = {
        startDate: Math.floor(startTimestamp),
        endDate: Math.floor(endTimestamp),
        itemId: itemIdFilter.trim() || null,
        page: currentPage,
        pageSize: pageSize,
      };

      logger.log('Fetching audit logs:', requestDto);

      const response = await apiClient.post<AuditLogApiResponse>('/api/Monitoring/AuditLog', requestDto);

      if (response.data?.data) {
        let filteredData = response.data.data.data || [];

        // Client-side filter by LogType if not 'all'
        if (selectedLogType !== 'all') {
          filteredData = filteredData.filter((log: DataDto) => log.actionType === selectedLogType);
        }

        setAuditLogs(filteredData);
        setTotalCount(response.data.data.totalCount || 0);
        setTotalPages(response.data.data.totalPages || 0);
        setCurrentPage(response.data.data.page || 1);

        logger.log(`Loaded ${filteredData.length} audit logs (page ${response.data.data.page}/${response.data.data.totalPages})`);
      }
    } catch (err) {
      logger.error('Error fetching audit logs:', err);
      setError(t('auditTrailPage.error'));
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, itemIdFilter, currentPage, pageSize, selectedLogType, t]);

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
    const date = new Date();
    date.setDate(date.getDate() - 7);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setSelectedLogType('all');
    setItemIdFilter('');
    setCurrentPage(1);
  }, []);

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
   * Get point name translation
   */
  const getPointName = useCallback(
    (itemId: string | null | undefined): string => {
      if (!itemId) {
        return '-';
      }
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return '-';
      }
      
      // Return appropriate name based on language
      return language === 'fa' ? (item.nameFa || item.name) : item.name;
    },
    [items, language]
  );

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
   * AG Grid column definitions
   */
  const columnDefs = useMemo<ColDef<DataDto>[]>(
    () => [
      {
        field: 'userName',
        headerName: t('auditTrailPage.columns.userName'),
        width: 180,
        valueGetter: (params) => {
          if (params.data?.isUser) {
            return params.data.userName || '-';
          }
          return t('auditTrailPage.systemUser');
        },
      },
      {
        field: 'actionType',
        headerName: t('auditTrailPage.columns.actionType'),
        width: 200,
        valueGetter: (params) => {
          if (params.data?.actionType) {
            return getLogTypeLabel(params.data.actionType);
          }
          return '';
        },
      },
      {
        field: 'point',
        headerName: t('auditTrailPage.columns.point'),
        width: 280,
        valueGetter: (params) => getPointName(params.data?.itemId),
      },
      {
        field: 'dateTime',
        headerName: t('auditTrailPage.columns.dateTime'),
        width: 250,
        valueGetter: (params) => {
          if (params.data?.time) {
            return formatDate(params.data.time, language, 'long');
          }
          return '';
        },
        sort: 'desc',
        sortIndex: 0,
      },
      {
        field: 'ipAddress',
        headerName: t('auditTrailPage.columns.ipAddress'),
        width: 160,
        valueGetter: (params) => params.data?.ipAddress || '-',
      },
      {
        field: 'logValue',
        headerName: t('auditTrailPage.columns.details'),
        flex: 1,
        minWidth: 300,
        cellRenderer: (params: { data?: DataDto }) => {
          if (!params.data?.logValue) {
            return '-';
          }
          
          try {
            // Try to parse and format JSON
            const parsed = JSON.parse(params.data.logValue);
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
                {params.data.logValue}
              </pre>
            );
          }
        },
        autoHeight: true,
      },
    ],
    [t, language, getLogTypeLabel, getPointName, theme.palette.mode]
  );

  /**
   * Handle row click - open detail dialog
   */
  const handleRowClick = useCallback((event: RowClickedEvent<DataDto>) => {
    if (event.data) {
      logger.log('Row clicked:', event.data);
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

  /**
   * AG Grid setup
   */
  const { handleGridReady } = useAGGrid({});

  // Fetch data on mount and when pagination changes
  React.useEffect(() => {
    if (currentPage > 0) {
      fetchAuditLogs();
    }
  }, [currentPage, pageSize, fetchAuditLogs]);

  return (
    <Container
      maxWidth={false}
      data-id-ref="audit-trail-page-container"
      sx={{ height: '100%', width: '100%', py: 3, px: 0, mx: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Card data-id-ref="audit-trail-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <CardHeader
          data-id-ref="audit-trail-page-card-header"
          sx={{ py: 3, minHeight: 80 }}
          title={
            <Typography variant="h4" component="h1" data-id-ref="audit-trail-page-title">
              {t('auditTrailPage.title')}
            </Typography>
          }
        />
        <CardContent data-id-ref="audit-trail-page-card-body" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 2 }}>
          {/* Filters Section */}
          <Box data-id-ref="audit-trail-filters" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} data-id-ref="audit-trail-date-filters">
              <TextField
                label={t('auditTrailPage.startDateLabel')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                data-id-ref="audit-trail-start-date"
              />
              <TextField
                label={t('auditTrailPage.endDateLabel')}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                data-id-ref="audit-trail-end-date"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} data-id-ref="audit-trail-type-filters">
              <FormControl fullWidth data-id-ref="audit-trail-log-type-filter">
                <InputLabel>{t('auditTrailPage.logTypeLabel')}</InputLabel>
                <Select<LogType | 'all'>
                  value={selectedLogType}
                  label={t('auditTrailPage.logTypeLabel')}
                  onChange={(e) => setSelectedLogType(e.target.value as LogType | 'all')}
                >
                  <MenuItem value="all" data-id-ref="audit-trail-log-type-all">
                    {t('auditTrailPage.allLogTypes')}
                  </MenuItem>
                  {Object.entries(LogTypeEnum).map(([key, value]) => (
                    <MenuItem key={value} value={value} data-id-ref={`audit-trail-log-type-${key}`}>
                      {getLogTypeLabel(value as LogType)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label={t('auditTrailPage.itemIdLabel')}
                placeholder={t('auditTrailPage.itemIdPlaceholder')}
                value={itemIdFilter}
                onChange={(e) => setItemIdFilter(e.target.value)}
                fullWidth
                data-id-ref="audit-trail-item-id-filter"
              />
            </Stack>

            <Stack direction="row" spacing={2} data-id-ref="audit-trail-filter-buttons">
              <Button variant="contained" onClick={handleApplyFilters} disabled={loading} data-id-ref="audit-trail-apply-filters-btn">
                {t('auditTrailPage.applyFilters')}
              </Button>
              <Button variant="outlined" onClick={handleClearFilters} disabled={loading} data-id-ref="audit-trail-clear-filters-btn">
                {t('auditTrailPage.clearFilters')}
              </Button>
            </Stack>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" data-id-ref="audit-trail-error-alert" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }} data-id-ref="audit-trail-loading">
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>{t('auditTrailPage.loadingData')}</Typography>
            </Box>
          )}

          {/* AG Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 0 }} data-id-ref="audit-trail-grid-container">
              <AGGridWrapper
                rowData={auditLogs as unknown as AGGridRowData[]}
                columnDefs={columnDefs}
                onGridReady={handleGridReady}
                theme="quartz"
                height="100%"
                idRef="audit-trail-grid"
                gridOptions={{
                  defaultColDef: {
                    sortable: true,
                    filter: true,
                    resizable: true,
                  },
                  enableRtl: isRTL,
                  pagination: false,
                  suppressContextMenu: true,
                  onRowClicked: handleRowClick,
                }}
              />
            </Box>
          )}

          {/* Pagination Controls */}
          {!loading && totalCount > 0 && (
            <Box
              data-id-ref="audit-trail-pagination"
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} data-id-ref="audit-trail-pagination-info">
                <FormControl size="small" sx={{ minWidth: 120 }} data-id-ref="audit-trail-page-size-select">
                  <InputLabel>{t('auditTrailPage.pagination.rowsPerPage')}</InputLabel>
                  <Select value={pageSize} label={t('auditTrailPage.pagination.rowsPerPage')} onChange={handlePageSizeChange}>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" data-id-ref="audit-trail-pagination-text">
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
                data-id-ref="audit-trail-pagination-component"
              />
            </Box>
          )}

          {/* No Data Message */}
          {!loading && auditLogs.length === 0 && (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
              data-id-ref="audit-trail-no-data"
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

export default AuditTrailPage;