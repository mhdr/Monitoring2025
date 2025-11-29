import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import AGGridWrapper from './AGGridWrapper';
import { getModbusMaps } from '../services/extendedApi';
import { getItems } from '../services/monitoringApi';
import type { ControllerModbus, MapModbus, Item } from '../types/api';
import { IoOperationTypeEnum } from '../types/api';
import type { AGGridRowData } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusMappingsDialog');

// Lazy load dialog components
const AddEditModbusMappingDialog = lazy(() => import('./AddEditModbusMappingDialog'));
const DeleteModbusMappingDialog = lazy(() => import('./DeleteModbusMappingDialog'));

interface ModbusMappingsDialogProps {
  open: boolean;
  controller: ControllerModbus | null;
  onClose: () => void;
}

const ModbusMappingsDialog: React.FC<ModbusMappingsDialogProps> = ({
  open,
  controller,
  onClose,
}) => {
  const { t } = useLanguage();

  // State
  const [mappings, setMappings] = useState<MapModbus[]>([]);
  const [modbusItems, setModbusItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mapping dialog states
  const [addEditMappingDialogOpen, setAddEditMappingDialogOpen] = useState(false);
  const [deleteMappingDialogOpen, setDeleteMappingDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MapModbus | null>(null);
  const [mappingEditMode, setMappingEditMode] = useState(false);

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
    if (open) {
      fetchModbusItems();
    }
  }, [open]);

  // Fetch mappings when controller changes
  const fetchMappings = useCallback(async () => {
    if (!controller?.id) return;

    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching mappings', { controllerId: controller.id });
      const response = await getModbusMaps({ controllerId: controller.id });

      if (response?.data) {
        setMappings(response.data);
        logger.log('Mappings fetched', { count: response.data.length });
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('modbusControllers.errors.fetchMappingsFailed'));
    } finally {
      setLoading(false);
    }
  }, [controller?.id, t]);

  useEffect(() => {
    if (open && controller?.id) {
      fetchMappings();
    }
  }, [open, controller?.id, fetchMappings]);

  // Mapping dialog handlers
  const handleAddMapping = useCallback(() => {
    setSelectedMapping(null);
    setMappingEditMode(false);
    setAddEditMappingDialogOpen(true);
  }, []);

  const handleEditMapping = useCallback((mapping: MapModbus) => {
    setSelectedMapping(mapping);
    setMappingEditMode(true);
    setAddEditMappingDialogOpen(true);
  }, []);

  const handleDeleteMapping = useCallback((mapping: MapModbus) => {
    setSelectedMapping(mapping);
    setDeleteMappingDialogOpen(true);
  }, []);

  const handleMappingDialogClose = (shouldRefresh: boolean) => {
    setAddEditMappingDialogOpen(false);
    setDeleteMappingDialogOpen(false);
    setSelectedMapping(null);
    setMappingEditMode(false);

    if (shouldRefresh) {
      fetchMappings();
    }
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Get existing positions for validation
  const existingPositions = useMemo(() => {
    return mappings.map((m) => m.position);
  }, [mappings]);

  // Mapping column definitions
  const mappingColumnDefs = useMemo<ColDef<MapModbus>[]>(() => {
    return [
      {
        headerName: t('modbusControllers.mappings.position'),
        field: 'position',
        width: 100,
        minWidth: 80,
        sortable: true,
      },
      {
        headerName: t('modbusControllers.mappings.item'),
        field: 'itemId',
        flex: 2,
        minWidth: 200,
        valueFormatter: (params) => {
          const item = modbusItems.find((i) => i.id === params.value);
          return item?.name || params.value || '';
        },
        sortable: true,
      },
      {
        headerName: t('modbusControllers.mappings.operationType'),
        field: 'operationType',
        width: 120,
        minWidth: 100,
        valueFormatter: (params) => {
          return params.value === IoOperationTypeEnum.Read
            ? t('modbusControllers.mappings.read')
            : t('modbusControllers.mappings.write');
        },
        sortable: true,
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        width: 120,
        minWidth: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<MapModbus>) => {
          const mapping = params.data;
          if (!mapping) return null;

          return (
            <Box
              data-id-ref={`mapping-actions-${mapping.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <Tooltip title={t('common.buttons.edit')}>
                <IconButton
                  data-id-ref={`mapping-edit-btn-${mapping.id}`}
                  size="small"
                  color="primary"
                  onClick={() => handleEditMapping(mapping)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
            </Box>
          );
        },
      },
    ];
  }, [t, modbusItems, handleEditMapping, handleDeleteMapping]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        data-id-ref="modbus-mappings-dialog"
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '80vh' },
            maxHeight: { xs: '100%', sm: '80vh' },
          },
        }}
      >
        <DialogTitle
          data-id-ref="modbus-mappings-dialog-title"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
          }}
        >
          <Box>
            <Typography variant="h6" component="span">
              {t('modbusControllers.mappings.title')}
            </Typography>
            {controller && (
              <Typography
                variant="subtitle2"
                color="text.secondary"
                component="div"
              >
                {controller.name} - {controller.ipAddress}:{controller.port}
              </Typography>
            )}
          </Box>
          <IconButton
            data-id-ref="modbus-mappings-close-btn"
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          data-id-ref="modbus-mappings-dialog-content"
          sx={{ display: 'flex', flexDirection: 'column', p: 2 }}
        >
          {error && (
            <Alert
              data-id-ref="modbus-mappings-error"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="modbus-mappings-success"
              severity="success"
              onClose={() => setSuccessMessage(null)}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 2,
            }}
          >
            <Button
              data-id-ref="modbus-add-mapping-btn"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddMapping}
            >
              {t('modbusControllers.mappings.addMapping')}
            </Button>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          ) : mappings.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Typography
                data-id-ref="modbus-no-mappings"
                color="text.secondary"
              >
                {t('modbusControllers.mappings.noMappings')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 300 }}>
              <AGGridWrapper
                idRef="modbus-mappings"
                rowData={mappings as unknown as AGGridRowData[]}
                columnDefs={mappingColumnDefs}
                height="100%"
                gridOptions={{
                  domLayout: 'normal',
                  rowHeight: 48,
                  getRowId: (params) => String(params.data.id),
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions data-id-ref="modbus-mappings-dialog-actions">
          <Button
            data-id-ref="modbus-mappings-close-action-btn"
            onClick={onClose}
          >
            {t('common.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mapping CRUD Dialogs */}
      <Suspense fallback={null}>
        {addEditMappingDialogOpen && controller && (
          <AddEditModbusMappingDialog
            open={addEditMappingDialogOpen}
            editMode={mappingEditMode}
            mapping={selectedMapping}
            controllerId={controller.id}
            modbusItems={modbusItems}
            existingPositions={existingPositions}
            onClose={handleMappingDialogClose}
            onSuccess={handleSuccess}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {deleteMappingDialogOpen && controller && (
          <DeleteModbusMappingDialog
            open={deleteMappingDialogOpen}
            mapping={selectedMapping}
            controllerId={controller.id}
            modbusItems={modbusItems}
            onClose={handleMappingDialogClose}
            onSuccess={handleSuccess}
          />
        )}
      </Suspense>
    </>
  );
};

export default ModbusMappingsDialog;
