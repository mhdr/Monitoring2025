import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Stack,
  Paper,
  Divider,
  Toolbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useMonitoring } from '../../hooks/useMonitoring';
import { getAlarms, getExternalAlarms } from '../../services/monitoringApi';
import { createLogger } from '../../utils/logger';
import type { 
  AlarmDto, 
  AlarmsRequestDto, 
  AlarmsResponseDto,
  GetExternalAlarmsRequestDto,
  Item,
} from '../../types/api';

// Use LazyAGGrid component for optimized AG Grid loading
import LazyAGGrid from '../LazyAGGrid';
import { useAGGrid } from '../../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi, AGGridColumnDef } from '../../types/agGrid';
import AddAlarmDialog from '../AddAlarmDialog';
import DeleteAlarmDialog from '../DeleteAlarmDialog';

const logger = createLogger('AlarmsDetailPage');

interface EnrichedAlarm extends AlarmDto {
  itemName?: string;
  hasExternalAlarmsData?: boolean;
  externalAlarmsCount?: number;
}

const AlarmsDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  
  const { t, language } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state } = useMonitoring();
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [alarmsData, setAlarmsData] = useState<EnrichedAlarm[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingExternalAlarms, setLoadingExternalAlarms] = useState<Set<string>>(new Set());
  const [addAlarmDialogOpen, setAddAlarmDialogOpen] = useState<boolean>(false);
  const [deleteAlarmDialogOpen, setDeleteAlarmDialogOpen] = useState<boolean>(false);
  const [alarmToDelete, setAlarmToDelete] = useState<EnrichedAlarm | null>(null);
  
  // Create items map from MonitoringContext
  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    state.items.forEach((item: Item) => {
      if (item.id) {
        map.set(item.id, item);
      }
    });
    logger.log('Created items map from MonitoringContext:', { size: map.size, itemsCount: state.items.length });
    return map;
  }, [state.items]);

  // AG Grid integration
  const { exportToCsv, exportToExcel, handleGridReady } = useAGGrid();
  const gridRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  const [selectedRows, setSelectedRows] = useState<EnrichedAlarm[]>([]);
  
  const onGridReadyInternal = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    gridRef.current = api;
    columnApiRef.current = colApi;
    handleGridReady(api, colApi);
  }, [handleGridReady]);

  // Handle row selection changes
  const onSelectionChanged = useCallback(() => {
    if (gridRef.current) {
      const selected = gridRef.current.getSelectedRows() as EnrichedAlarm[];
      setSelectedRows(selected);
      logger.log('Row selection changed:', { count: selected.length });
    }
  }, []);

  // Helper function to get item name based on language
  const getItemName = useCallback((item: Item | undefined, itemId?: string): string => {
    // If items haven't loaded yet, show item ID as fallback
    if (!item && itemId) {
      return itemId;
    }
    
    if (!item) return t('unknown');
    
    if (language === 'fa') {
      return item.nameFa || item.name || t('unknown');
    }
    return item.name || t('unknown');
  }, [language, t]);

  // Helper function to format condition string
  const formatCondition = useCallback((alarm: AlarmDto, item: Item | undefined): string => {
    const compareType = alarm.compareType;
    const value1 = alarm.value1 || '';
    const value2 = alarm.value2 || '';
    const unit = language === 'fa' ? (item?.unitFa || item?.unit || '') : (item?.unit || '');

    // CompareType: 1 = Equal, 2 = NotEqual, 3 = Higher, 4 = Lower, 5 = Between
    switch (compareType) {
      case 1: // Equal
        return `${t('alarms.condition.equal')} ${value1} ${unit}`;
      case 2: // NotEqual
        return `${t('alarms.condition.notEqual')} ${value1} ${unit}`;
      case 3: // Higher
        return `${t('alarms.condition.higher')} ${value1} ${unit}`;
      case 4: // Lower
        return `${t('alarms.condition.lower')} ${value1} ${unit}`;
      case 5: // Between
        return `${t('alarms.condition.between')} ${value1} ${t('and')} ${value2} ${unit}`;
      default:
        logger.warn('Unknown comparison type encountered:', { compareType, alarmId: alarm.id });
        return `${t('unknown')} (${compareType})`;
    }
  }, [language, t]);

  // Fetch alarms data
  const fetchAlarmsData = useCallback(async () => {
    if (!itemId) {
      setError(t('noItemIdProvided'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      logger.log('Fetching alarms for itemId:', itemId);

      const request: AlarmsRequestDto = {
        itemIds: [itemId],
      };

      const response: AlarmsResponseDto = await getAlarms(request);
      logger.log('Alarms fetched successfully:', { count: response.data?.data?.length || 0 });

      // Enrich alarms with item names
      const enriched: EnrichedAlarm[] = (response.data?.data || []).map(alarm => {
        const item = alarm.itemId ? itemsMap.get(alarm.itemId) : undefined;
        return {
          ...alarm,
          itemName: getItemName(item, alarm.itemId || undefined),
        };
      });

      setAlarmsData(enriched);
    } catch (err) {
      logger.error('Error fetching alarms:', err);
      setError(t('activeAlarmsPage.errorLoadingAlarms'));
    } finally {
      setLoading(false);
    }
  }, [itemId, itemsMap, getItemName, t]);

  // Fetch external alarms for a specific alarm
  const fetchExternalAlarms = useCallback(async (alarmId: string) => {
    setLoadingExternalAlarms(prev => new Set(prev).add(alarmId));

    try {
      logger.log('Fetching external alarms for alarmId:', alarmId);

      const request: GetExternalAlarmsRequestDto = {
        alarmId,
      };

      const response = await getExternalAlarms(request);
      logger.log('External alarms fetched successfully:', { 
        count: response.externalAlarms?.length || 0,
        success: response.success,
      });

      if (response.success && response.externalAlarms) {
        // Update alarms data with external alarms info
        setAlarmsData(prev => prev.map(alarm => {
          if (alarm.id === alarmId) {
            return {
              ...alarm,
              hasExternalAlarmsData: true,
              externalAlarmsCount: response.externalAlarms?.length || 0,
            };
          }
          return alarm;
        }));
      }
    } catch (err) {
      logger.error('Error fetching external alarms:', err);
    } finally {
      setLoadingExternalAlarms(prev => {
        const newSet = new Set(prev);
        newSet.delete(alarmId);
        return newSet;
      });
    }
  }, []);

  // Fetch alarms on component mount or when itemId or itemsMap changes
  useEffect(() => {
    if (itemId) {
      fetchAlarmsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, itemsMap]); // Fetch alarms when itemId is available or items change

  // Column definitions for AG Grid
  const columnDefs = useMemo<AGGridColumnDef[]>(() => [
    {
      headerName: t('alarms.columns.itemName'),
      field: 'itemName',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true,
      cellDataType: 'text',
    },
    {
      headerName: t('alarms.columns.message'),
      field: language === 'fa' ? 'messageFa' : 'message',
      flex: 2,
      minWidth: 250,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      valueGetter: (params: { data: EnrichedAlarm }) => {
        const message = language === 'fa' 
          ? (params.data.messageFa || params.data.message)
          : (params.data.message || params.data.messageFa);
        return message || t('alarms.noMessage');
      },
    },
    {
      headerName: t('alarms.columns.condition'),
      field: 'condition',
      flex: 1.5,
      minWidth: 200,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      valueGetter: (params: { data: EnrichedAlarm }) => {
        const item = params.data.itemId ? itemsMap.get(params.data.itemId) : undefined;
        return formatCondition(params.data, item);
      },
    },
    {
      headerName: t('alarms.columns.type'),
      field: 'alarmType',
      flex: 0.8,
      minWidth: 140,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      valueGetter: (params: { data: EnrichedAlarm }) => {
        // AlarmType: 1 = Comparative, 2 = Timeout
        return params.data.alarmType === 1 
          ? t('alarms.type.comparative') 
          : t('alarms.type.timeout');
      },
    },
    {
      headerName: t('alarms.columns.priority'),
      field: 'alarmPriority',
      flex: 0.8,
      minWidth: 140,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      cellRenderer: (params: { data: EnrichedAlarm }) => {
        // AlarmPriority: 1 = Warning, 2 = Alarm
        const priority = params.data.alarmPriority;
        const label = priority === 2 ? t('alarms.priority.high') : t('alarms.priority.medium');
        const color = priority === 2 ? 'error' : 'warning';
        
        return (
          <Chip 
            label={label} 
            color={color} 
            size="small" 
            data-id-ref={`alarm-priority-chip-${params.data.id}`}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      headerName: t('alarms.columns.delay'),
      field: 'alarmDelay',
      flex: 0.6,
      minWidth: 110,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellDataType: 'number',
      valueFormatter: (params: { value: number }) => {
        return params.value ? `${params.value}${t('alarms.seconds')}` : '0' + t('alarms.seconds');
      },
    },
    {
      headerName: t('alarms.columns.timeout'),
      field: 'timeout',
      flex: 0.6,
      minWidth: 130,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellDataType: 'number',
      valueFormatter: (params: { value: number | null }) => {
        return params.value ? `${params.value}${t('alarms.seconds')}` : t('alarms.noTimeout');
      },
    },
    {
      headerName: t('alarms.columns.status'),
      field: 'isDisabled',
      flex: 0.8,
      minWidth: 140,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      cellRenderer: (params: { data: EnrichedAlarm }) => {
        const isDisabled = params.data.isDisabled;
        const label = isDisabled ? t('alarms.status.disabled') : t('alarms.status.enabled');
        const color = isDisabled ? 'default' : 'success';
        const icon = isDisabled ? <NotificationsOffIcon fontSize="small" /> : <NotificationsActiveIcon fontSize="small" />;
        
        return (
          <Chip 
            label={label} 
            color={color} 
            size="small" 
            icon={icon}
            data-id-ref={`alarm-status-chip-${params.data.id}`}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      headerName: t('alarms.columns.externalAlarms'),
      field: 'hasExternalAlarm',
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      cellRenderer: (params: { data: EnrichedAlarm }) => {
        const alarmId = params.data.id;
        const hasExternal = params.data.hasExternalAlarm;
        const hasData = params.data.hasExternalAlarmsData;
        const count = params.data.externalAlarmsCount || 0;
        const isLoading = alarmId ? loadingExternalAlarms.has(alarmId) : false;

        if (!hasExternal) {
          return (
            <Chip 
              label={t('alarms.externalAlarms.none')} 
              size="small" 
              icon={<LinkOffIcon fontSize="small" />}
              data-id-ref={`alarm-external-chip-none-${alarmId}`}
            />
          );
        }

        if (!hasData && !isLoading) {
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => alarmId && fetchExternalAlarms(alarmId)}
              data-id-ref={`alarm-external-btn-load-${alarmId}`}
              sx={{ textTransform: 'none' }}
            >
              {t('alarms.externalAlarms.load')}
            </Button>
          );
        }

        if (isLoading) {
          return <CircularProgress size={20} data-id-ref={`alarm-external-spinner-${alarmId}`} />;
        }

        return (
          <Chip 
            label={`${count} ${t('alarms.externalAlarms.count')}`}
            size="small" 
            color="info"
            icon={<LinkIcon fontSize="small" />}
            data-id-ref={`alarm-external-chip-count-${alarmId}`}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
  ], [t, language, itemsMap, formatCondition, loadingExternalAlarms, fetchExternalAlarms]);

  // Handle export actions
  const handleExportCsv = useCallback(() => {
    exportToCsv('alarms-export');
    logger.log('Exporting alarms data to CSV');
  }, [exportToCsv]);

  const handleExportExcel = useCallback(() => {
    exportToExcel('alarms-export');
    logger.log('Exporting alarms data to Excel');
  }, [exportToExcel]);

  // Handle action button clicks
  const handleAdd = useCallback(() => {
    logger.log('Add new alarm for itemId:', itemId);
    setAddAlarmDialogOpen(true);
  }, [itemId]);

  const handleAddAlarmSuccess = useCallback(() => {
    logger.log('Alarm added successfully, refreshing data');
    fetchAlarmsData();
  }, [fetchAlarmsData]);

  const handleAddAlarmClose = useCallback(() => {
    setAddAlarmDialogOpen(false);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (selectedRows.length === 1) {
      logger.log('View details for alarm:', selectedRows[0]);
      // TODO: Implement view details dialog
    }
  }, [selectedRows]);

  const handleEdit = useCallback(() => {
    if (selectedRows.length === 1) {
      logger.log('Edit alarm:', selectedRows[0]);
      // TODO: Implement edit dialog
    }
  }, [selectedRows]);

  const handleDelete = useCallback(() => {
    if (selectedRows.length === 1) {
      logger.log('Opening delete confirmation for alarm:', selectedRows[0]);
      setAlarmToDelete(selectedRows[0]);
      setDeleteAlarmDialogOpen(true);
    }
  }, [selectedRows]);

  const handleDeleteAlarmSuccess = useCallback(() => {
    logger.log('Alarm deleted successfully, refreshing data');
    setAlarmToDelete(null);
    fetchAlarmsData();
  }, [fetchAlarmsData]);

  const handleDeleteAlarmClose = useCallback(() => {
    setDeleteAlarmDialogOpen(false);
    setAlarmToDelete(null);
  }, []);

  // Render loading state
  if (loading && alarmsData.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 2,
        }}
        data-id-ref="alarms-detail-loading"
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error && alarmsData.length === 0) {
    return (
      <Box sx={{ p: 3 }} data-id-ref="alarms-detail-error-container">
        <Alert 
          severity="error" 
          data-id-ref="alarms-detail-error-alert"
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchAlarmsData}
              startIcon={<RefreshIcon />}
              data-id-ref="alarms-detail-error-retry-btn"
            >
              {t('retry')}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Render no item ID state
  if (!itemId) {
    return (
      <Box sx={{ p: 3 }} data-id-ref="alarms-detail-no-item-container">
        <Alert severity="warning" data-id-ref="alarms-detail-no-item-alert">
          {t('noItemIdProvided')}
        </Alert>
      </Box>
    );
  }

  // Main render
  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: isMobile ? 1 : 3,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }} 
      data-id-ref="alarms-detail-page"
    >
      <Card 
        elevation={2} 
        data-id-ref="alarms-detail-card"
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <CardContent 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            p: { xs: 2, sm: 3 },
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            '&:last-child': { pb: { xs: 2, sm: 3 } },
          }}
          data-id-ref="alarms-detail-card-content"
        >
          {/* Header Section */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 2,
              flexWrap: 'wrap',
              gap: 2,
            }}
            data-id-ref="alarms-detail-header"
          >
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                color: 'primary.main',
              }}
              data-id-ref="alarms-detail-title"
            >
              {t('alarmsDetail')}
            </Typography>
            
            <Stack direction="row" spacing={1} data-id-ref="alarms-detail-actions">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchAlarmsData}
                disabled={loading}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-detail-refresh-btn"
              >
                {t('refresh')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportCsv}
                disabled={alarmsData.length === 0}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-detail-export-csv-btn"
              >
                {t('exportCsv')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                disabled={alarmsData.length === 0}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-detail-export-excel-btn"
              >
                {t('exportExcel')}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} data-id-ref="alarms-detail-divider" />

          {/* Grid Toolbar */}
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 2,
              border: 1,
              borderColor: 'divider',
            }}
            data-id-ref="alarms-detail-toolbar-paper"
          >
            <Toolbar 
              sx={{ 
                gap: 1,
                minHeight: { xs: 56, sm: 64 },
                px: { xs: 2, sm: 3 },
              }}
              data-id-ref="alarms-detail-toolbar"
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  flexGrow: 1,
                  color: 'text.secondary',
                }}
                data-id-ref="alarms-detail-selected-count"
              >
                {selectedRows.length > 0 
                  ? `${selectedRows.length} ${t('selected')}`
                  : t('alarms.toolbar.selectRowsHint')}
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-toolbar-add-btn"
                sx={{
                  alignItems: 'center',
                  '& .MuiButton-startIcon': {
                    display: 'flex',
                    alignItems: 'center',
                    marginInlineEnd: 1,
                  },
                }}
              >
                {t('add')}
              </Button>
              
              <Button
                variant="outlined"
                color="info"
                startIcon={<InfoIcon />}
                onClick={handleViewDetails}
                disabled={selectedRows.length !== 1}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-toolbar-view-btn"
                sx={{
                  alignItems: 'center',
                  '& .MuiButton-startIcon': {
                    display: 'flex',
                    alignItems: 'center',
                    marginInlineEnd: 1,
                  },
                }}
              >
                {t('alarms.actions.viewDetails')}
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                disabled={selectedRows.length !== 1}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-toolbar-edit-btn"
                sx={{
                  alignItems: 'center',
                  '& .MuiButton-startIcon': {
                    display: 'flex',
                    alignItems: 'center',
                    marginInlineEnd: 1,
                  },
                }}
              >
                {t('alarms.actions.edit')}
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={selectedRows.length !== 1}
                size={isMobile ? 'small' : 'medium'}
                data-id-ref="alarms-toolbar-delete-btn"
                sx={{
                  alignItems: 'center',
                  '& .MuiButton-startIcon': {
                    display: 'flex',
                    alignItems: 'center',
                    marginInlineEnd: 1,
                  },
                }}
              >
                {t('alarms.actions.delete')}
              </Button>
            </Toolbar>
          </Paper>

          {/* Summary Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 2, 
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
            }}
            data-id-ref="alarms-detail-summary"
          >
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box data-id-ref="alarms-detail-summary-total">
                <Typography variant="caption" color="text.secondary">
                  {t('alarms.summary.total')}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {alarmsData.length}
                </Typography>
              </Box>
              <Box data-id-ref="alarms-detail-summary-enabled">
                <Typography variant="caption" color="text.secondary">
                  {t('alarms.summary.enabled')}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {alarmsData.filter(a => !a.isDisabled).length}
                </Typography>
              </Box>
              <Box data-id-ref="alarms-detail-summary-disabled">
                <Typography variant="caption" color="text.secondary">
                  {t('alarms.summary.disabled')}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="text.disabled">
                  {alarmsData.filter(a => a.isDisabled).length}
                </Typography>
              </Box>
              <Box data-id-ref="alarms-detail-summary-high-priority">
                <Typography variant="caption" color="text.secondary">
                  {t('alarms.summary.highPriority')}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="error.main">
                  {alarmsData.filter(a => a.alarmPriority === 2).length}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* AG Grid Table */}
          <Box 
            sx={{ 
              width: '100%',
              minWidth: 0,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }} 
            data-id-ref="alarms-detail-grid-container"
          >
            <LazyAGGrid
              columnDefs={columnDefs}
              rowData={alarmsData as never[]}
              onGridReady={onGridReadyInternal}
              height="100%"
              gridOptions={{
                pagination: true,
                paginationPageSize: 20,
                paginationPageSizeSelector: [10, 20, 50, 100],
                suppressColumnVirtualisation: true,
                rowSelection: { mode: 'singleRow' },
                onSelectionChanged: onSelectionChanged,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Add Alarm Dialog */}
      {itemId && (
        <AddAlarmDialog
          open={addAlarmDialogOpen}
          onClose={handleAddAlarmClose}
          itemId={itemId}
          itemName={itemId ? getItemName(itemsMap.get(itemId), itemId) : undefined}
          onSuccess={handleAddAlarmSuccess}
        />
      )}

      {/* Delete Alarm Dialog */}
      <DeleteAlarmDialog
        open={deleteAlarmDialogOpen}
        onClose={handleDeleteAlarmClose}
        alarm={alarmToDelete}
        itemName={alarmToDelete?.itemId ? getItemName(itemsMap.get(alarmToDelete.itemId), alarmToDelete.itemId) : undefined}
        onSuccess={handleDeleteAlarmSuccess}
      />
    </Box>
  );
};

export default AlarmsDetailPage;
