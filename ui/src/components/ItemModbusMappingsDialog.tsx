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
import { useLanguage } from '../hooks/useLanguage';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getModbusMappingsByItemId, getModbusControllers } from '../services/extendedApi';
import type { MapModbusWithController, ControllerModbus, Item } from '../types/api';
import { IoOperationTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ItemModbusMappingsDialog');

// Lazy load dialog components
const ItemAddEditModbusMappingDialog = lazy(() => import('./ItemAddEditModbusMappingDialog'));
const ItemDeleteModbusMappingDialog = lazy(() => import('./ItemDeleteModbusMappingDialog'));

interface ItemModbusMappingsDialogProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onMappingsChange?: (count: number) => void;
}

const ItemModbusMappingsDialog: React.FC<ItemModbusMappingsDialogProps> = ({
  open,
  item,
  onClose,
  onMappingsChange,
}) => {
  const { t } = useLanguage();

  // State
  const [mappings, setMappings] = useState<MapModbusWithController[]>([]);
  const [controllers, setControllers] = useState<ControllerModbus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mapping dialog states
  const [addEditMappingDialogOpen, setAddEditMappingDialogOpen] = useState(false);
  const [deleteMappingDialogOpen, setDeleteMappingDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MapModbusWithController | null>(null);
  const [mappingEditMode, setMappingEditMode] = useState(false);

  // Fetch controllers on mount
  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const response = await getModbusControllers();
        if (response?.data) {
          setControllers(response.data);
          logger.log('Controllers fetched', { count: response.data.length });
        }
      } catch (err) {
        logger.error('Failed to fetch controllers', { error: err });
      }
    };
    if (open) {
      fetchControllers();
    }
  }, [open]);

  // Fetch mappings when item changes
  const fetchMappings = useCallback(async () => {
    if (!item?.id) return;

    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching mappings for item', { itemId: item.id });
      const response = await getModbusMappingsByItemId({ itemId: item.id });

      if (response?.data) {
        setMappings(response.data);
        logger.log('Mappings fetched', { count: response.data.length });
        onMappingsChange?.(response.data.length);
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('itemModbusMappings.errors.fetchMappingsFailed'));
    } finally {
      setLoading(false);
    }
  }, [item?.id, t, onMappingsChange]);

  useEffect(() => {
    if (open && item?.id) {
      fetchMappings();
    }
  }, [open, item?.id, fetchMappings]);

  // Get existing positions per controller for validation
  const existingPositionsByController = useMemo(() => {
    const posMap = new Map<string, number[]>();
    mappings.forEach((m) => {
      const positions = posMap.get(m.controllerId) || [];
      positions.push(m.position);
      posMap.set(m.controllerId, positions);
    });
    return posMap;
  }, [mappings]);

  // Mapping dialog handlers
  const handleAddMapping = useCallback(() => {
    setSelectedMapping(null);
    setMappingEditMode(false);
    setAddEditMappingDialogOpen(true);
  }, []);

  const handleEditMapping = useCallback((mapping: MapModbusWithController) => {
    setSelectedMapping(mapping);
    setMappingEditMode(true);
    setAddEditMappingDialogOpen(true);
  }, []);

  const handleDeleteMapping = useCallback((mapping: MapModbusWithController) => {
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

  // Actions template for Syncfusion Grid
  const actionsTemplate = useCallback((props: MapModbusWithController) => {
    return (
      <Box
        data-id-ref={`item-mapping-actions-${props.id}`}
        sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
      >
        <Tooltip title={t('common.buttons.edit')}>
          <IconButton
            data-id-ref={`item-mapping-edit-btn-${props.id}`}
            size="small"
            color="primary"
            onClick={() => handleEditMapping(props)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.buttons.delete')}>
          <IconButton
            data-id-ref={`item-mapping-delete-btn-${props.id}`}
            size="small"
            color="error"
            onClick={() => handleDeleteMapping(props)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }, [t, handleEditMapping, handleDeleteMapping]);

  // Prepare row data with derived fields for Syncfusion Grid
  const rowData = useMemo(() => {
    return mappings.map((mapping) => ({
      ...mapping,
      controllerDisplay: `${mapping.controllerName} (${mapping.ipAddress}:${mapping.port})`,
      operationTypeName: mapping.operationType === IoOperationTypeEnum.Read
        ? t('modbusControllers.mappings.read')
        : t('modbusControllers.mappings.write'),
    }));
  }, [mappings, t]);

  // Mapping column definitions for Syncfusion Grid
  const mappingColumnDefs = useMemo<SyncfusionColumnDef[]>(() => {
    return [
      {
        field: 'controllerDisplay',
        headerText: t('itemModbusMappings.controllerName'),
        width: 200,
        minWidth: 150,
        allowSorting: true,
      },
      {
        field: 'position',
        headerText: t('modbusControllers.mappings.position'),
        width: 100,
        minWidth: 80,
        allowSorting: true,
      },
      {
        field: 'operationTypeName',
        headerText: t('modbusControllers.mappings.operationType'),
        width: 120,
        minWidth: 100,
        allowSorting: true,
      },
      {
        field: 'id',
        headerText: t('common.actions'),
        width: 120,
        minWidth: 120,
        allowSorting: false,
        allowFiltering: false,
        template: actionsTemplate,
      },
    ];
  }, [t, actionsTemplate]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        data-id-ref="item-modbus-mappings-dialog"
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '70vh' },
            maxHeight: { xs: '100%', sm: '70vh' },
          },
        }}
      >
        <DialogTitle
          data-id-ref="item-modbus-mappings-dialog-title"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
          }}
        >
          <Box>
            <Typography variant="h6" component="span">
              {t('itemModbusMappings.title')}
            </Typography>
            {item && (
              <Typography
                variant="subtitle2"
                color="text.secondary"
                component="div"
              >
                {item.pointNumber} - {item.name}
              </Typography>
            )}
          </Box>
          <IconButton
            data-id-ref="item-modbus-mappings-close-btn"
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          data-id-ref="item-modbus-mappings-dialog-content"
          sx={{ display: 'flex', flexDirection: 'column', p: 2 }}
        >
          {error && (
            <Alert
              data-id-ref="item-modbus-mappings-error"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="item-modbus-mappings-success"
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
              data-id-ref="item-modbus-add-mapping-btn"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddMapping}
              disabled={controllers.length === 0}
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
                data-id-ref="item-modbus-no-mappings"
                color="text.secondary"
              >
                {t('itemModbusMappings.noMappings')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 200 }}>
              <SyncfusionGridWrapper
                dataSource={rowData}
                columns={mappingColumnDefs}
                height="100%"
                allowPaging={false}
                allowSorting={true}
                allowResizing={true}
                data-id-ref="item-modbus-mappings-grid"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions data-id-ref="item-modbus-mappings-dialog-actions">
          <Button
            data-id-ref="item-modbus-mappings-close-action-btn"
            onClick={onClose}
          >
            {t('common.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mapping CRUD Dialogs */}
      <Suspense fallback={null}>
        {addEditMappingDialogOpen && item && (
          <ItemAddEditModbusMappingDialog
            open={addEditMappingDialogOpen}
            editMode={mappingEditMode}
            mapping={selectedMapping}
            itemId={item.id}
            itemName={`${item.pointNumber} - ${item.name}`}
            controllers={controllers}
            existingPositionsByController={existingPositionsByController}
            onClose={handleMappingDialogClose}
            onSuccess={handleSuccess}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {deleteMappingDialogOpen && item && (
          <ItemDeleteModbusMappingDialog
            open={deleteMappingDialogOpen}
            mapping={selectedMapping}
            onClose={handleMappingDialogClose}
            onSuccess={handleSuccess}
          />
        )}
      </Suspense>
    </>
  );
};

export default ItemModbusMappingsDialog;
