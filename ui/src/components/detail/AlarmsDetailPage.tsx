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
  Tooltip,
  IconButton,
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
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { getAlarms, getExternalAlarms } from '../../services/monitoringApi';
import { createLogger } from '../../utils/logger';
import type { 
  AlarmDto, 
  AlarmsRequestDto, 
  AlarmsResponseDto,
  GetExternalAlarmsRequestDto,
  Item,
} from '../../types/api';
import { monitoringStorageHelpers } from '../../utils/monitoringStorage';

// Use LazyAGGrid component for optimized AG Grid loading
import LazyAGGrid from '../LazyAGGrid';
import { useAGGrid } from '../../hooks/useAGGrid';
import type { AGGridApi, AGGridColumnApi, AGGridColumnDef } from '../../types/agGrid';

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
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [alarmsData, setAlarmsData] = useState<EnrichedAlarm[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingExternalAlarms, setLoadingExternalAlarms] = useState<Set<string>>(new Set());
  
  // IndexedDB data for enrichment
  const [itemsMap, setItemsMap] = useState<Map<string, Item>>(new Map());

  // AG Grid integration
  const { exportToCsv, exportToExcel, handleGridReady } = useAGGrid();
  const gridRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  const onGridReadyInternal = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    gridRef.current = api;
    columnApiRef.current = colApi;
    handleGridReady(api, colApi);
  }, [handleGridReady]);

  // Load items from IndexedDB on component mount
  useEffect(() => {
    const loadIndexedDBData = async () => {
      try {
        logger.log('Loading items from IndexedDB');
        
        const items = await monitoringStorageHelpers.getStoredItems();

        if (items) {
          const itemsMapData = new Map<string, Item>();
          items.forEach(item => {
            if (item.id) {
              itemsMapData.set(item.id, item);
            }
          });
          setItemsMap(itemsMapData);
          logger.log('Items loaded from IndexedDB', { count: itemsMapData.size });
        }
      } catch (err) {
        logger.error('Error loading data from IndexedDB:', err);
      }
    };

    loadIndexedDBData();
  }, []);

  // Helper function to get item name based on language
  const getItemName = useCallback((item: Item | undefined): string => {
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

    // CompareType: 1 = Equal, 2 = NotEqual, 3 = GreaterThan, 4 = LessThan, 5 = InRange
    switch (compareType) {
      case 1: // Equal
        return `${t('alarms.condition.equal')} ${value1} ${unit}`;
      case 2: // NotEqual
        return `${t('alarms.condition.notEqual')} ${value1} ${unit}`;
      case 3: // GreaterThan
        return `${t('alarms.condition.greaterThan')} ${value1} ${unit}`;
      case 4: // LessThan
        return `${t('alarms.condition.lessThan')} ${value1} ${unit}`;
      case 5: // InRange
        return `${t('alarms.condition.between')} ${value1} ${t('and')} ${value2} ${unit}`;
      default:
        return '';
    }
  }, [language, t]);

  // Fetch alarms data
  const fetchAlarmsData = async () => {
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
          itemName: getItemName(item),
        };
      });

      setAlarmsData(enriched);
    } catch (err) {
      logger.error('Error fetching alarms:', err);
      setError(t('activeAlarmsPage.errorLoadingAlarms'));
    } finally {
      setLoading(false);
    }
  };

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

  // Fetch alarms on component mount or when itemId changes
  useEffect(() => {
    if (itemId) {
      fetchAlarmsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]); // Fetch alarms when itemId is available

  // Re-enrich alarms with item names when itemsMap loads or changes
  useEffect(() => {
    if (itemsMap.size > 0 && alarmsData.length > 0) {
      logger.log('Re-enriching alarms with item names from IndexedDB');
      setAlarmsData(prev => prev.map(alarm => {
        const item = alarm.itemId ? itemsMap.get(alarm.itemId) : undefined;
        return {
          ...alarm,
          itemName: getItemName(item),
        };
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsMap.size]); // Re-enrich when itemsMap changes

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
      width: 120,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      valueGetter: (params: { data: EnrichedAlarm }) => {
        // AlarmType: 1 = Process, 2 = Digital
        return params.data.alarmType === 1 
          ? t('alarms.type.process') 
          : t('alarms.type.digital');
      },
    },
    {
      headerName: t('alarms.columns.priority'),
      field: 'alarmPriority',
      width: 120,
      sortable: true,
      filter: true,
      cellDataType: 'text',
      cellRenderer: (params: { data: EnrichedAlarm }) => {
        // AlarmPriority: 1 = Medium, 2 = High
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
      width: 100,
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
      width: 100,
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
      width: 120,
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
      width: 160,
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
    {
      headerName: t('alarms.columns.actions'),
      field: 'actions',
      width: 150,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: EnrichedAlarm }) => {
        const alarmId = params.data.id;
        
        return (
          <Stack direction="row" spacing={0.5} data-id-ref={`alarm-actions-${alarmId}`}>
            <Tooltip title={t('alarms.actions.viewDetails')} arrow>
              <IconButton 
                size="small" 
                color="info"
                data-id-ref={`alarm-action-view-${alarmId}`}
                disabled
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('alarms.actions.edit')} arrow>
              <IconButton 
                size="small" 
                color="primary"
                data-id-ref={`alarm-action-edit-${alarmId}`}
                disabled
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('alarms.actions.delete')} arrow>
              <IconButton 
                size="small" 
                color="error"
                data-id-ref={`alarm-action-delete-${alarmId}`}
                disabled
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
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
    <Box sx={{ width: '100%', height: '100%' }} data-id-ref="alarms-detail-page">
      <Card 
        elevation={2} 
        data-id-ref="alarms-detail-card"
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
        }}
      >
        <CardContent 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            p: { xs: 2, sm: 3 },
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
            sx={{ flex: 1, minHeight: 400 }} 
            data-id-ref="alarms-detail-grid-container"
          >
            <LazyAGGrid
              columnDefs={columnDefs}
              rowData={alarmsData as never[]}
              onGridReady={onGridReadyInternal}
              gridOptions={{
                pagination: true,
                paginationPageSize: 20,
                paginationPageSizeSelector: [10, 20, 50, 100],
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AlarmsDetailPage;
