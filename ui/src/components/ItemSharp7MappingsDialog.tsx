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
import { getSharp7MappingsByItemId, getSharp7Controllers } from '../services/extendedApi';
import type { MapSharp7WithController, ControllerSharp7, Item } from '../types/api';
import { IoOperationTypeEnum, DataTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ItemSharp7MappingsDialog');

// Lazy load dialog components
const ItemAddEditSharp7MappingDialog = lazy(() => import('./ItemAddEditSharp7MappingDialog'));
const ItemDeleteSharp7MappingDialog = lazy(() => import('./ItemDeleteSharp7MappingDialog'));

interface ItemSharp7MappingsDialogProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onMappingsChange?: (count: number) => void;
}

const ItemSharp7MappingsDialog: React.FC<ItemSharp7MappingsDialogProps> = ({
  open,
  item,
  onClose,
  onMappingsChange,
}) => {
  const { t } = useLanguage();

  // State
  const [mappings, setMappings] = useState<MapSharp7WithController[]>([]);
  const [controllers, setControllers] = useState<ControllerSharp7[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mapping dialog states
  const [addEditMappingDialogOpen, setAddEditMappingDialogOpen] = useState(false);
  const [deleteMappingDialogOpen, setDeleteMappingDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MapSharp7WithController | null>(null);
  const [mappingEditMode, setMappingEditMode] = useState(false);

  // Fetch controllers on mount
  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const response = await getSharp7Controllers();
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
      const response = await getSharp7MappingsByItemId({ itemId: item.id });

      if (response?.data) {
        setMappings(response.data);
        logger.log('Mappings fetched', { count: response.data.length });
        onMappingsChange?.(response.data.length);
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('itemSharp7Mappings.errors.fetchMappingsFailed'));
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

  const handleEditMapping = useCallback((mapping: MapSharp7WithController) => {
    setSelectedMapping(mapping);
    setMappingEditMode(true);
    setAddEditMappingDialogOpen(true);
  }, []);

  const handleDeleteMapping = useCallback((mapping: MapSharp7WithController) => {
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

  // Helper function to format data type display
  const getDataTypeLabel = useCallback((dataType: number) => {
    switch (dataType) {
      case DataTypeEnum.Bit:
        return t('sharp7Controllers.dataType.bit');
      case DataTypeEnum.Real:
        return t('sharp7Controllers.dataType.real');
      case DataTypeEnum.Integer:
        return t('sharp7Controllers.dataType.integer');
      default:
        return '';
    }
  }, [t]);

  // Actions template for Syncfusion Grid
  const actionsTemplate = useCallback((props: MapSharp7WithController) => {
    return (
      <Box
        data-id-ref={`item-sharp7-mapping-actions-${props.id}`}
        sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
      >
        <Tooltip title={t('common.buttons.edit')}>
          <IconButton
            data-id-ref={`item-sharp7-mapping-edit-btn-${props.id}`}
            size="small"
            color="primary"
            onClick={() => handleEditMapping(props)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.buttons.delete')}>
          <IconButton
            data-id-ref={`item-sharp7-mapping-delete-btn-${props.id}`}
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
      controllerDisplay: `${mapping.controllerName} (${mapping.ipAddress} - DB${mapping.dbAddress})`,
      dataTypeName: mapping.dataType ? getDataTypeLabel(mapping.dataType) : '',
      bitDisplay: mapping.bit != null ? mapping.bit.toString() : 'N/A',
      operationTypeName: mapping.operationType === IoOperationTypeEnum.Read
        ? t('sharp7Controllers.mappings.read')
        : t('sharp7Controllers.mappings.write'),
    }));
  }, [mappings, t, getDataTypeLabel]);

  // Mapping column definitions for Syncfusion Grid
  const mappingColumnDefs = useMemo<SyncfusionColumnDef[]>(() => {
    return [
      {
        field: 'controllerDisplay',
        headerText: t('itemSharp7Mappings.controllerName'),
        width: 200,
        minWidth: 180,
        allowSorting: true,
      },
      {
        field: 'dataTypeName',
        headerText: t('itemSharp7Mappings.dataType'),
        width: 110,
        minWidth: 100,
        allowSorting: true,
      },
      {
        field: 'position',
        headerText: t('sharp7Controllers.mappings.position'),
        width: 100,
        minWidth: 80,
        allowSorting: true,
      },
      {
        field: 'bitDisplay',
        headerText: t('itemSharp7Mappings.bit'),
        width: 80,
        minWidth: 70,
        allowSorting: true,
      },
      {
        field: 'operationTypeName',
        headerText: t('sharp7Controllers.mappings.operationType'),
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
        data-id-ref="item-sharp7-mappings-dialog"
        PaperProps={{
          sx: {
            height: { xs: '100%', sm: '70vh' },
            maxHeight: { xs: '100%', sm: '70vh' },
          },
        }}
      >
        <DialogTitle
          data-id-ref="item-sharp7-mappings-dialog-title"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
          }}
        >
          <Box>
            <Typography variant="h6" component="span">
              {t('itemSharp7Mappings.title')}
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
            data-id-ref="item-sharp7-mappings-close-btn"
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          data-id-ref="item-sharp7-mappings-dialog-content"
          sx={{ display: 'flex', flexDirection: 'column', p: 2 }}
        >
          {error && (
            <Alert
              data-id-ref="item-sharp7-mappings-error"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="item-sharp7-mappings-success"
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
              data-id-ref="item-sharp7-add-mapping-btn"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddMapping}
              disabled={controllers.length === 0}
            >
              {t('sharp7Controllers.mappings.addMapping')}
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
                data-id-ref="item-sharp7-no-mappings"
                color="text.secondary"
              >
                {t('itemSharp7Mappings.noMappings')}
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
                data-id-ref="item-sharp7-mappings-grid"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions data-id-ref="item-sharp7-mappings-dialog-actions">
          <Button
            data-id-ref="item-sharp7-mappings-close-action-btn"
            onClick={onClose}
          >
            {t('common.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mapping CRUD Dialogs */}
      <Suspense fallback={null}>
        {addEditMappingDialogOpen && item && (
          <ItemAddEditSharp7MappingDialog
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
          <ItemDeleteSharp7MappingDialog
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

export default ItemSharp7MappingsDialog;
