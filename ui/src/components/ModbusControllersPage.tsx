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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams, CellValueChangedEvent } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import AGGridWrapper from './AGGridWrapper';
import {
  getModbusControllers,
  getModbusMaps,
  batchEditModbusMaps,
} from '../services/extendedApi';
import { getItems } from '../services/monitoringApi';
import type {
  ControllerModbus,
  MapModbus,
  Endianness,
  ModbusConnectionType,
  MyModbusType,
  Item,
  IoOperationType,
  BatchEditModbusMapsRequestDto,
  ModbusMapItem,
} from '../types/api';
import type { AGGridRowData, AGGridApi } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusControllersPage');

// Lazy load dialog components
const AddEditModbusControllerDialog = lazy(() => import('./AddEditModbusControllerDialog'));
const DeleteModbusControllerDialog = lazy(() => import('./DeleteModbusControllerDialog'));

// Extended row type for the grid
interface ControllerRow extends ControllerModbus {
  mappingsCount?: number;
}

// Mapping row type for detail grid
interface MapRow extends MapModbus {
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

const ModbusControllersPage: React.FC = () => {
  const { t } = useLanguage();
  
  // State
  const [controllers, setControllers] = useState<ControllerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modbus items for dropdown (interface type 3 = Modbus)
  const [modbusItems, setModbusItems] = useState<Item[]>([]);
  
  // Detail grid state
  const [expandedControllerId, setExpandedControllerId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<MapRow[]>([]);
  const [originalMappings, setOriginalMappings] = useState<MapRow[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  
  // Grid refs
  const mainGridRef = useRef<AGGridApi | null>(null);
  const detailGridRef = useRef<AGGridApi | null>(null);
  
  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedController, setSelectedController] = useState<ControllerModbus | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch Modbus items on mount
  useEffect(() => {
    const fetchModbusItems = async () => {
      try {
        const response = await getItems();
        if (response?.items) {
          // Filter items by interface type 3 (Modbus)
          const filteredItems = response.items.filter(
            (item) => item.interfaceType === 3
          );
          setModbusItems(filteredItems);
          logger.log('Modbus items fetched', { count: filteredItems.length });
        }
      } catch (err) {
        logger.error('Failed to fetch items', { error: err });
      }
    };
    fetchModbusItems();
  }, []);

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

  // Fetch mappings for expanded controller
  const fetchMappings = useCallback(async (controllerId: string) => {
    setMappingsLoading(true);
    try {
      logger.log('Fetching mappings', { controllerId });
      const response = await getModbusMaps({ controllerId });

      if (response?.data) {
        const mapsData = response.data.map((m: MapModbus) => ({ ...m }));
        setMappings(mapsData);
        setOriginalMappings(JSON.parse(JSON.stringify(mapsData)));
        setHasUnsavedChanges(false);
        logger.log('Mappings fetched', { count: mapsData.length });
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('modbusControllers.errors.fetchMappingsFailed'));
    } finally {
      setMappingsLoading(false);
    }
  }, [t]);

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

  const handleToggleExpand = useCallback((controller: ControllerRow) => {
    if (hasUnsavedChanges && expandedControllerId !== controller.id) {
      if (!window.confirm(t('modbusControllers.mappings.confirmDiscard'))) {
        return;
      }
    }
    
    if (expandedControllerId === controller.id) {
      setExpandedControllerId(null);
      setMappings([]);
      setOriginalMappings([]);
      setHasUnsavedChanges(false);
    } else {
      setExpandedControllerId(controller.id);
      fetchMappings(controller.id);
    }
  }, [expandedControllerId, hasUnsavedChanges, fetchMappings, t]);

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

  // Mapping inline editing handlers
  const handleAddMapping = useCallback(() => {
    if (expandedControllerId === null) return;
    
    const newMapping: MapRow = {
      id: `temp-${Date.now()}`, // Temporary ID for new items
      controllerId: expandedControllerId,
      itemId: '',
      position: mappings.length,
      operationType: 0 as IoOperationType,
      isNew: true,
    };
    
    setMappings([...mappings, newMapping]);
    setHasUnsavedChanges(true);
  }, [expandedControllerId, mappings]);

  const handleMappingCellChange = useCallback((event: CellValueChangedEvent) => {
    const updatedMappings = mappings.map((m) => {
      if (m.id === event.data.id) {
        return { ...m, ...event.data, isModified: !m.isNew };
      }
      return m;
    });
    setMappings(updatedMappings);
    setHasUnsavedChanges(true);
  }, [mappings]);

  const handleDeleteMapping = useCallback((mapping: MapRow) => {
    if (mapping.isNew) {
      // Remove new unsaved mappings completely
      setMappings(mappings.filter((m) => m.id !== mapping.id));
    } else {
      // Mark existing mappings for deletion
      setMappings(mappings.map((m) => 
        m.id === mapping.id ? { ...m, isDeleted: true } : m
      ));
    }
    setHasUnsavedChanges(true);
  }, [mappings]);

  const handleSaveMappings = useCallback(async () => {
    if (expandedControllerId === null) return;
    
    setSavingMappings(true);
    setError(null);
    
    try {
      const added: ModbusMapItem[] = mappings
        .filter((m) => m.isNew && !m.isDeleted)
        .map((m) => ({
          position: m.position,
          itemId: m.itemId,
          operationType: m.operationType ?? null,
        }));
      
      const changed: ModbusMapItem[] = mappings
        .filter((m) => m.isModified && !m.isNew && !m.isDeleted)
        .map((m) => ({
          id: m.id,
          position: m.position,
          itemId: m.itemId,
          operationType: m.operationType ?? null,
        }));
      
      const removed: string[] = mappings
        .filter((m) => m.isDeleted && !m.isNew)
        .map((m) => m.id);
      
      const request: BatchEditModbusMapsRequestDto = {
        controllerId: expandedControllerId,
        added,
        changed,
        removed,
      };
      
      logger.log('Saving mappings', { added: added.length, changed: changed.length, removed: removed.length });
      
      const response = await batchEditModbusMaps(request);
      
      if (response.isSuccessful) {
        setSuccessMessage(t('modbusControllers.success.mappingsSaved'));
        setTimeout(() => setSuccessMessage(null), 5000);
        await fetchMappings(expandedControllerId);
        fetchControllers(); // Refresh to update mapping counts
      } else {
        setError(response.errorMessage || t('modbusControllers.errors.saveMappingsFailed'));
      }
    } catch (err) {
      logger.error('Failed to save mappings', { error: err });
      setError(t('modbusControllers.errors.saveMappingsFailed'));
    } finally {
      setSavingMappings(false);
    }
  }, [expandedControllerId, mappings, t, fetchMappings, fetchControllers]);

  const handleDiscardChanges = useCallback(() => {
    if (window.confirm(t('modbusControllers.mappings.confirmDiscard'))) {
      setMappings(JSON.parse(JSON.stringify(originalMappings)));
      setHasUnsavedChanges(false);
    }
  }, [originalMappings, t]);

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
        headerName: '',
        field: 'id',
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ControllerRow>) => {
          const controller = params.data;
          if (!controller) return null;
          const isExpanded = expandedControllerId === controller.id;
          return (
            <IconButton
              data-id-ref={`modbus-expand-btn-${controller.id}`}
              size="small"
              onClick={() => handleToggleExpand(controller)}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          );
        },
      },
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
        flex: 1,
        minWidth: 120,
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
  }, [t, expandedControllerId, handleToggleExpand, handleEditController, handleDeleteController, getConnectionTypeLabel, getModbusTypeLabel, getEndiannessLabel]);

  // Detail grid (mappings) column definitions
  const mappingColumnDefs = useMemo<ColDef<MapRow>[]>(() => {
    return [
      {
        headerName: t('modbusControllers.mappings.position'),
        field: 'position',
        width: 100,
        minWidth: 80,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        sortable: true,
      },
      {
        headerName: t('modbusControllers.mappings.item'),
        field: 'itemId',
        flex: 2,
        minWidth: 200,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: modbusItems.map((item) => item.id),
        },
        valueFormatter: (params) => {
          const item = modbusItems.find((i) => i.id === params.value);
          return item?.name || t('modbusControllers.mappings.selectItem');
        },
        sortable: true,
      },
      {
        headerName: t('modbusControllers.mappings.operationType'),
        field: 'operationType',
        width: 120,
        minWidth: 100,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: [0, 1],
        },
        valueFormatter: (params) => {
          return params.value === 0
            ? t('modbusControllers.mappings.read')
            : t('modbusControllers.mappings.write');
        },
        sortable: true,
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        width: 80,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<MapRow>) => {
          const mapping = params.data;
          if (!mapping || mapping.isDeleted) return null;
          
          return (
            <Tooltip title={t('common.buttons.delete')}>
              <IconButton
                data-id-ref={`mapping-delete-btn-${mapping.id}`}
                size="small"
                color="error"
                onClick={() => handleDeleteMapping(mapping)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      },
    ];
  }, [t, modbusItems, handleDeleteMapping]);

  // Filter out deleted mappings for display
  const visibleMappings = useMemo(() => {
    return mappings.filter((m) => !m.isDeleted);
  }, [mappings]);

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

          {/* Expanded Mappings Section */}
          {expandedControllerId !== null && (
            <Card
              data-id-ref="modbus-mappings-card"
              variant="outlined"
              sx={{ mt: 2 }}
            >
              <CardHeader
                data-id-ref="modbus-mappings-header"
                title={
                  <Typography variant="h6" data-id-ref="modbus-mappings-title">
                    {t('modbusControllers.mappings.title')}
                  </Typography>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <Button
                      data-id-ref="modbus-add-mapping-btn"
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddMapping}
                    >
                      {t('modbusControllers.mappings.addMapping')}
                    </Button>
                    {hasUnsavedChanges && (
                      <>
                        <Button
                          data-id-ref="modbus-discard-mappings-btn"
                          variant="outlined"
                          size="small"
                          color="warning"
                          startIcon={<CancelIcon />}
                          onClick={handleDiscardChanges}
                        >
                          {t('modbusControllers.mappings.discardChanges')}
                        </Button>
                        <Button
                          data-id-ref="modbus-save-mappings-btn"
                          variant="contained"
                          size="small"
                          color="primary"
                          startIcon={savingMappings ? <CircularProgress size={16} /> : <SaveIcon />}
                          onClick={handleSaveMappings}
                          disabled={savingMappings}
                        >
                          {t('modbusControllers.mappings.saveChanges')}
                        </Button>
                      </>
                    )}
                  </Stack>
                }
              />
              <CardContent data-id-ref="modbus-mappings-content">
                {mappingsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : visibleMappings.length === 0 ? (
                  <Typography
                    data-id-ref="modbus-no-mappings"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    {t('modbusControllers.mappings.noMappings')}
                  </Typography>
                ) : (
                  <Box sx={{ height: 300 }}>
                    <AGGridWrapper
                      idRef="modbus-mappings"
                      rowData={visibleMappings as unknown as AGGridRowData[]}
                      columnDefs={mappingColumnDefs}
                      onGridReady={(api) => { detailGridRef.current = api; }}
                      height="100%"
                      gridOptions={{
                        domLayout: 'normal',
                        rowHeight: 48,
                        getRowId: (params) => String(params.data.id),
                        onCellValueChanged: handleMappingCellChange,
                        stopEditingWhenCellsLoseFocus: true,
                        singleClickEdit: true,
                        getRowStyle: (params) => {
                          if (params.data?.isNew) {
                            return { backgroundColor: 'rgba(76, 175, 80, 0.1)' };
                          }
                          if (params.data?.isModified) {
                            return { backgroundColor: 'rgba(255, 193, 7, 0.1)' };
                          }
                          return undefined;
                        },
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Dialogs with Suspense for lazy loading */}
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
    </Container>
  );
};

export default ModbusControllersPage;
