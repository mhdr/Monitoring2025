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
import AGGridWrapper from './AGGridWrapper';
import { getModbusControllers } from '../services/extendedApi';
import type {
  ControllerModbus,
  Endianness,
  ModbusConnectionType,
  MyModbusType,
} from '../types/api';
import type { AGGridRowData, AGGridApi } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusControllersPage');

// Lazy load dialog components
const AddEditModbusControllerDialog = lazy(() => import('./AddEditModbusControllerDialog'));
const DeleteModbusControllerDialog = lazy(() => import('./DeleteModbusControllerDialog'));
const ModbusMappingsDialog = lazy(() => import('./ModbusMappingsDialog'));

// Extended row type for the grid
interface ControllerRow extends ControllerModbus {
  mappingsCount?: number;
}

const ModbusControllersPage: React.FC = () => {
  const { t } = useLanguage();
  
  // State
  const [controllers, setControllers] = useState<ControllerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Grid ref
  const mainGridRef = useRef<AGGridApi | null>(null);
  
  // Controller dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedController, setSelectedController] = useState<ControllerModbus | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Mappings dialog state
  const [mappingsDialogOpen, setMappingsDialogOpen] = useState(false);
  const [mappingsController, setMappingsController] = useState<ControllerModbus | null>(null);

  // Fetch controllers
  const fetchControllers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching Modbus controllers');
      const response = await getModbusControllers();

      if (response?.data) {
        setControllers(response.data);
        logger.log('Controllers fetched successfully', { count: response.data.length });
      } else {
        setError(t('modbusControllers.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch controllers', { error: err });
      setError(t('modbusControllers.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleAddController = useCallback(() => {
    setSelectedController(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditController = useCallback((controller: ControllerModbus) => {
    setSelectedController(controller);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteController = useCallback((controller: ControllerModbus) => {
    setSelectedController(controller);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenMappings = useCallback((controller: ControllerModbus) => {
    setMappingsController(controller);
    setMappingsDialogOpen(true);
  }, []);

  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedController(null);
    setEditMode(false);
    
    if (shouldRefresh) {
      fetchControllers();
      if (successMessage) {
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  };

  const handleMappingsDialogClose = () => {
    setMappingsDialogOpen(false);
    setMappingsController(null);
  };

  // Helper functions for enum display
  const getEndiannessLabel = useCallback((value: Endianness | null | undefined): string => {
    if (value === null || value === undefined) return t('modbusControllers.endianness.none');
    const labels: Record<number, string> = {
      0: t('modbusControllers.endianness.none'),
      1: t('modbusControllers.endianness.bigEndian'),
      2: t('modbusControllers.endianness.littleEndian'),
      3: t('modbusControllers.endianness.midBigEndian'),
      4: t('modbusControllers.endianness.midLittleEndian'),
    };
    return labels[value] || String(value);
  }, [t]);

  const getConnectionTypeLabel = useCallback((value: ModbusConnectionType | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const labels: Record<number, string> = {
      1: t('modbusControllers.connectionTypes.tcp'),
      2: t('modbusControllers.connectionTypes.tcpOverRtu'),
    };
    return labels[value] || String(value);
  }, [t]);

  const getModbusTypeLabel = useCallback((value: MyModbusType | null | undefined): string => {
    if (value === null || value === undefined) return t('modbusControllers.modbusTypes.none');
    const labels: Record<number, string> = {
      0: t('modbusControllers.modbusTypes.none'),
      1: t('modbusControllers.modbusTypes.ascii'),
      2: t('modbusControllers.modbusTypes.rtu'),
    };
    return labels[value] || String(value);
  }, [t]);

  // Filter controllers by search term
  const filteredControllers = useMemo(() => {
    if (!searchTerm) return controllers;
    const term = searchTerm.toLowerCase();
    return controllers.filter((c) =>
      c.name?.toLowerCase().includes(term) ||
      c.ipAddress?.toLowerCase().includes(term)
    );
  }, [controllers, searchTerm]);

  // Main grid column definitions
  const columnDefs = useMemo<ColDef<ControllerRow>[]>(() => {
    return [
      {
        headerName: t('modbusControllers.fields.name'),
        field: 'name',
        flex: 1.5,
        minWidth: 150,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusControllers.fields.ipAddress'),
        field: 'ipAddress',
        flex: 1,
        minWidth: 130,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusControllers.fields.port'),
        field: 'port',
        width: 80,
        minWidth: 80,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('modbusControllers.fields.connectionType'),
        field: 'connectionType',
        flex: 1,
        minWidth: 120,
        sortable: true,
        valueFormatter: (params) => getConnectionTypeLabel(params.value),
      },
      {
        headerName: t('modbusControllers.fields.modbusType'),
        field: 'modbusType',
        flex: 1,
        minWidth: 100,
        sortable: true,
        valueFormatter: (params) => getModbusTypeLabel(params.value),
      },
      {
        headerName: t('modbusControllers.fields.endianness'),
        field: 'endianness',
        flex: 1.2,
        minWidth: 140,
        sortable: true,
        valueFormatter: (params) => getEndiannessLabel(params.value),
      },
      {
        headerName: t('modbusControllers.fields.status'),
        field: 'isDisabled',
        width: 100,
        minWidth: 100,
        sortable: true,
        cellRenderer: (params: ICellRendererParams<ControllerRow>) => {
          const isDisabled = params.value || false;
          return (
            <Chip
              data-id-ref={`modbus-status-${params.data?.id}`}
              label={isDisabled ? t('modbusControllers.status.disabled') : t('modbusControllers.status.enabled')}
              color={isDisabled ? 'error' : 'success'}
              size="small"
            />
          );
        },
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        width: 150,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ControllerRow>) => {
          const controller = params.data;
          if (!controller) return null;
          
          return (
            <Box
              data-id-ref={`modbus-actions-${controller.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <Tooltip title={t('modbusControllers.mappings.title')}>
                <IconButton
                  data-id-ref={`modbus-mappings-btn-${controller.id}`}
                  size="small"
                  color="info"
                  onClick={() => handleOpenMappings(controller)}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('modbusControllers.editController')}>
                <IconButton
                  data-id-ref={`modbus-edit-btn-${controller.id}`}
                  size="small"
                  color="primary"
                  onClick={() => handleEditController(controller)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('modbusControllers.deleteController')}>
                <IconButton
                  data-id-ref={`modbus-delete-btn-${controller.id}`}
                  size="small"
                  color="error"
                  onClick={() => handleDeleteController(controller)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ];
  }, [t, handleOpenMappings, handleEditController, handleDeleteController, getConnectionTypeLabel, getModbusTypeLabel, getEndiannessLabel]);

  return (
    <Container
      maxWidth={false}
      data-id-ref="modbus-controllers-page-container"
      sx={{
        height: '100%',
        width: '100%',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card
        data-id-ref="modbus-controllers-page-card"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardHeader
          data-id-ref="modbus-controllers-page-card-header"
          title={
            <Typography
              variant="h4"
              component="h1"
              data-id-ref="modbus-controllers-page-title"
            >
              {t('modbusControllers.title')}
            </Typography>
          }
          action={
            <Button
              data-id-ref="modbus-add-controller-btn"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddController}
              sx={{ minWidth: 140 }}
            >
              {t('modbusControllers.addController')}
            </Button>
          }
        />
        <CardContent
          data-id-ref="modbus-controllers-page-card-body"
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack
            data-id-ref="modbus-filters"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              data-id-ref="modbus-search-input"
              placeholder={t('modbusControllers.searchPlaceholder')}
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
                      data-id-ref="modbus-clear-search-btn"
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
              data-id-ref="modbus-error-alert"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="modbus-success-alert"
              severity="success"
              onClose={() => setSuccessMessage(null)}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          {loading && (
            <Box
              data-id-ref="modbus-loading"
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && (
            <Box
              data-id-ref="modbus-grid-container"
              sx={{ flex: 1, minHeight: 400 }}
            >
              <AGGridWrapper
                idRef="modbus-controllers"
                rowData={filteredControllers as unknown as AGGridRowData[]}
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

      {/* Controller Dialogs */}
      <Suspense fallback={null}>
        {addEditDialogOpen && (
          <AddEditModbusControllerDialog
            open={addEditDialogOpen}
            editMode={editMode}
            controller={selectedController}
            onClose={handleDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {deleteDialogOpen && (
          <DeleteModbusControllerDialog
            open={deleteDialogOpen}
            controller={selectedController}
            onClose={handleDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>

      {/* Mappings Dialog */}
      <Suspense fallback={null}>
        {mappingsDialogOpen && (
          <ModbusMappingsDialog
            open={mappingsDialogOpen}
            controller={mappingsController}
            onClose={handleMappingsDialogClose}
          />
        )}
      </Suspense>
    </Container>
  );
};

export default ModbusControllersPage;
