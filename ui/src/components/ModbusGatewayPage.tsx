import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import { useGatewayStatus } from '../hooks/useGatewayStatus';
import AGGridWrapper from './AGGridWrapper';
import { getModbusGateways, deleteModbusGateway } from '../services/extendedApi';
import type { ModbusGatewayConfig } from '../types/api';
import type { AGGridRowData, AGGridApi } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusGatewayPage');

// Lazy load dialog components
const ModbusGatewayDialog = lazy(() => import('./ModbusGatewayDialog'));
const ModbusGatewayMappingsDialog = lazy(() => import('./ModbusGatewayMappingsDialog'));

// Extended row type for the grid with real-time status
interface GatewayRow extends ModbusGatewayConfig {
  // Additional computed fields can be added here
}

const ModbusGatewayPage: React.FC = () => {
  const { t, language } = useLanguage();
  
  // State
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Grid ref
  const mainGridRef = useRef<AGGridApi | null>(null);
  
  // Gateway dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<ModbusGatewayConfig | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Mappings dialog state
  const [mappingsDialogOpen, setMappingsDialogOpen] = useState(false);
  const [mappingsGateway, setMappingsGateway] = useState<ModbusGatewayConfig | null>(null);

  // Real-time gateway status
  const { gatewayStatuses, isConnected } = useGatewayStatus();

  // Merge real-time status with gateway data
  const gatewaysWithStatus = useMemo(() => {
    return gateways.map(gateway => {
      const status = gatewayStatuses[gateway.id];
      if (status) {
        return {
          ...gateway,
          connectedClients: status.connectedClients,
          lastReadTime: status.lastReadTime,
          lastWriteTime: status.lastWriteTime,
        };
      }
      return gateway;
    });
  }, [gateways, gatewayStatuses]);

  // Fetch gateways
  const fetchGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching Modbus gateways');
      const response = await getModbusGateways();

      if (response?.data) {
        setGateways(response.data);
        logger.log('Gateways fetched successfully', { count: response.data.length });
      } else {
        setError(t('modbusGateway.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch gateways', { error: err });
      setError(t('modbusGateway.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleAddGateway = useCallback(() => {
    setSelectedGateway(null);
    setEditMode(false);
    setDialogOpen(true);
  }, []);

  const handleEditGateway = useCallback((gateway: ModbusGatewayConfig) => {
    setSelectedGateway(gateway);
    setEditMode(true);
    setDialogOpen(true);
  }, []);

  const handleDeleteGateway = useCallback((gateway: ModbusGatewayConfig) => {
    setSelectedGateway(gateway);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedGateway) return;
    
    try {
      const response = await deleteModbusGateway({ gatewayId: selectedGateway.id });
      if (response.isSuccessful) {
        setSuccessMessage(t('modbusGateway.success.deleted'));
        fetchGateways();
      } else {
        setError(response.errorMessage || t('modbusGateway.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete gateway', { error: err });
      setError(t('modbusGateway.errors.deleteFailed'));
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedGateway(null);
    }
  }, [selectedGateway, t, fetchGateways]);

  const handleOpenMappings = useCallback((gateway: ModbusGatewayConfig) => {
    setMappingsGateway(gateway);
    setMappingsDialogOpen(true);
  }, []);

  const handleDialogClose = (shouldRefresh: boolean) => {
    setDialogOpen(false);
    setSelectedGateway(null);
    setEditMode(false);
    
    if (shouldRefresh) {
      fetchGateways();
    }
  };

  const handleMappingsDialogClose = () => {
    setMappingsDialogOpen(false);
    setMappingsGateway(null);
  };

  // Helper function to format relative time using native JS
  const formatRelativeTime = useCallback((dateStr: string | null): string => {
    if (!dateStr) return t('modbusGateway.realtime.neverRead');
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        return language === 'fa' ? 'چند لحظه پیش' : 'just now';
      } else if (diffMins < 60) {
        return language === 'fa' ? `${diffMins} دقیقه پیش` : `${diffMins} min ago`;
      } else if (diffHours < 24) {
        return language === 'fa' ? `${diffHours} ساعت پیش` : `${diffHours} hr ago`;
      } else {
        return language === 'fa' ? `${diffDays} روز پیش` : `${diffDays} days ago`;
      }
    } catch {
      return t('modbusGateway.realtime.neverRead');
    }
  }, [language, t]);

  // Filter gateways by search term
  const filteredGateways = useMemo(() => {
    if (!searchTerm) return gatewaysWithStatus;
    const term = searchTerm.toLowerCase();
    return gatewaysWithStatus.filter((g) =>
      g.name?.toLowerCase().includes(term) ||
      g.listenIP?.toLowerCase().includes(term) ||
      String(g.port).includes(term)
    );
  }, [gatewaysWithStatus, searchTerm]);

  // Main grid column definitions
  const columnDefs = useMemo<ColDef<GatewayRow>[]>(() => {
    return [
      {
        headerName: t('modbusGateway.fields.name'),
        field: 'name',
        flex: 1.5,
        minWidth: 150,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.fields.listenIP'),
        field: 'listenIP',
        flex: 1,
        minWidth: 120,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.fields.port'),
        field: 'port',
        width: 90,
        minWidth: 90,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.fields.unitId'),
        field: 'unitId',
        width: 80,
        minWidth: 80,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.fields.status'),
        field: 'isEnabled',
        width: 100,
        minWidth: 100,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<GatewayRow>) => {
          const isEnabled = params.value;
          return (
            <Chip
              data-id-ref={`gateway-status-chip-${params.data?.id}`}
              label={isEnabled ? t('modbusGateway.status.enabled') : t('modbusGateway.status.disabled')}
              color={isEnabled ? 'success' : 'default'}
              size="small"
            />
          );
        },
      },
      {
        headerName: t('modbusGateway.fields.connectedClients'),
        field: 'connectedClients',
        width: 110,
        minWidth: 110,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<GatewayRow>) => {
          const count = params.value || 0;
          return (
            <Chip
              data-id-ref={`gateway-clients-chip-${params.data?.id}`}
              label={count}
              color={count > 0 ? 'primary' : 'default'}
              size="small"
              variant={count > 0 ? 'filled' : 'outlined'}
            />
          );
        },
      },
      {
        headerName: t('modbusGateway.fields.lastActivity'),
        field: 'lastReadTime',
        flex: 1,
        minWidth: 130,
        sortable: true,
        valueFormatter: (params) => {
          const lastRead = params.data?.lastReadTime;
          const lastWrite = params.data?.lastWriteTime;
          // Show the most recent activity
          if (!lastRead && !lastWrite) return t('modbusGateway.realtime.neverRead');
          const lastActivity = [lastRead, lastWrite]
            .filter(Boolean)
            .map(d => new Date(d!).getTime())
            .sort((a, b) => b - a)[0];
          return formatRelativeTime(new Date(lastActivity).toISOString());
        },
      },
      {
        headerName: t('modbusGateway.fields.mappingCount'),
        field: 'mappingCount',
        width: 100,
        minWidth: 100,
        sortable: true,
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        width: 150,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<GatewayRow>) => {
          const gateway = params.data;
          if (!gateway) return null;
          
          return (
            <Box
              data-id-ref={`gateway-actions-${gateway.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <Tooltip title={t('modbusGateway.manageMappings')}>
                <IconButton
                  data-id-ref={`gateway-mappings-btn-${gateway.id}`}
                  size="small"
                  color="info"
                  onClick={() => handleOpenMappings(gateway)}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('modbusGateway.editGateway')}>
                <IconButton
                  data-id-ref={`gateway-edit-btn-${gateway.id}`}
                  size="small"
                  color="primary"
                  onClick={() => handleEditGateway(gateway)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('modbusGateway.deleteGateway')}>
                <IconButton
                  data-id-ref={`gateway-delete-btn-${gateway.id}`}
                  size="small"
                  color="error"
                  onClick={() => handleDeleteGateway(gateway)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ];
  }, [t, formatRelativeTime, handleOpenMappings, handleEditGateway, handleDeleteGateway]);

  return (
    <Container
      maxWidth={false}
      data-id-ref="modbus-gateway-page-container"
      sx={{
        height: '100%',
        width: '100%',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card
        data-id-ref="modbus-gateway-page-card"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardHeader
          data-id-ref="modbus-gateway-page-card-header"
          title={
            <Box>
              <Typography
                variant="h4"
                component="h1"
                data-id-ref="modbus-gateway-page-title"
              >
                {t('modbusGateway.title')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                data-id-ref="modbus-gateway-page-subtitle"
                sx={{ mt: 0.5 }}
              >
                {t('modbusGateway.subtitle')}
                {isConnected && (
                  <Chip
                    data-id-ref="gateway-realtime-indicator"
                    label="Live"
                    color="success"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </Box>
          }
          action={
            <Button
              data-id-ref="gateway-add-btn"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddGateway}
              sx={{ minWidth: 140 }}
            >
              {t('modbusGateway.addGateway')}
            </Button>
          }
        />
        <CardContent
          data-id-ref="modbus-gateway-page-card-body"
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack
            data-id-ref="gateway-filters"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              data-id-ref="gateway-search-input"
              placeholder={t('modbusGateway.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      data-id-ref="gateway-clear-search-btn"
                      size="small"
                      onClick={handleClearSearch}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {error && (
            <Alert
              data-id-ref="gateway-error-alert"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="gateway-success-alert"
              severity="success"
              onClose={() => setSuccessMessage(null)}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          {loading && (
            <Box
              data-id-ref="gateway-loading"
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && filteredGateways.length === 0 && (
            <Box
              data-id-ref="gateway-empty-state"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('modbusGateway.noGatewaysFound')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('modbusGateway.addFirstGateway')}
              </Typography>
              <Button
                data-id-ref="gateway-add-first-btn"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddGateway}
              >
                {t('modbusGateway.addGateway')}
              </Button>
            </Box>
          )}

          {!loading && filteredGateways.length > 0 && (
            <Box
              data-id-ref="gateway-grid-container"
              sx={{ flex: 1, minHeight: 400 }}
            >
              <AGGridWrapper
                idRef="modbus-gateways"
                rowData={filteredGateways as unknown as AGGridRowData[]}
                columnDefs={columnDefs}
                onGridReady={(api) => { mainGridRef.current = api; }}
                height="100%"
                gridOptions={{
                  pagination: true,
                  paginationPageSize: 25,
                  paginationPageSizeSelector: [10, 25, 50, 100],
                  domLayout: 'normal',
                  rowHeight: 52,
                  getRowId: (params) => String(params.data.id),
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Gateway Add/Edit Dialog */}
      <Suspense fallback={null}>
        {dialogOpen && (
          <ModbusGatewayDialog
            open={dialogOpen}
            editMode={editMode}
            gateway={selectedGateway}
            onClose={handleDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && selectedGateway && (
        <Suspense fallback={null}>
          <Box
            data-id-ref="gateway-delete-confirm-overlay"
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <Card
              data-id-ref="gateway-delete-confirm-dialog"
              sx={{ maxWidth: 400, mx: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader title={t('modbusGateway.dialogs.deleteTitle')} />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {t('modbusGateway.dialogs.deleteMessage', { name: selectedGateway.name })}
                </Typography>
                <Typography variant="body2" color="error">
                  {t('modbusGateway.dialogs.deleteWarning')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                  <Button
                    data-id-ref="gateway-delete-cancel-btn"
                    variant="outlined"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    data-id-ref="gateway-delete-confirm-btn"
                    variant="contained"
                    color="error"
                    onClick={handleConfirmDelete}
                  >
                    {t('delete')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Suspense>
      )}

      {/* Mappings Dialog */}
      <Suspense fallback={null}>
        {mappingsDialogOpen && mappingsGateway && (
          <ModbusGatewayMappingsDialog
            open={mappingsDialogOpen}
            gateway={mappingsGateway}
            onClose={handleMappingsDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>
    </Container>
  );
};

export default ModbusGatewayPage;
