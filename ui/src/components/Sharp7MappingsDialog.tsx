import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import AGGridWrapper from './AGGridWrapper';
import { getSharp7Maps, batchEditSharp7Maps } from '../services/extendedApi';
import { getItems } from '../services/monitoringApi';
import type { ControllerSharp7, MapSharp7, Item, Sharp7MapItem } from '../types/api';
import { IoOperationTypeEnum } from '../types/api';
import type { AGGridRowData } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('Sharp7MappingsDialog');

interface Sharp7MappingsDialogProps {
  open: boolean;
  controller: ControllerSharp7 | null;
  onClose: () => void;
}

interface MappingFormData {
  position: number | '';
  bit: number | '';
  itemId: string;
  operationType: number;
}

const Sharp7MappingsDialog: React.FC<Sharp7MappingsDialogProps> = ({
  open,
  controller,
  onClose,
}) => {
  const { t } = useLanguage();

  // State
  const [mappings, setMappings] = useState<MapSharp7[]>([]);
  const [sharp7Items, setSharp7Items] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inline add/edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MappingFormData>({
    position: '',
    bit: '',
    itemId: '',
    operationType: IoOperationTypeEnum.Read,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch Sharp7 items on mount
  useEffect(() => {
    const fetchSharp7Items = async () => {
      try {
        const response = await getItems();
        if (response?.items) {
          // Filter items by interface type 2 (Sharp7)
          const filteredItems = response.items.filter(
            (item) => item.interfaceType === 2
          );
          setSharp7Items(filteredItems);
          logger.log('Sharp7 items fetched', { count: filteredItems.length });
        }
      } catch (err) {
        logger.error('Failed to fetch items', { error: err });
      }
    };
    if (open) {
      fetchSharp7Items();
    }
  }, [open]);

  // Fetch mappings when controller changes
  const fetchMappings = useCallback(async () => {
    if (!controller?.id) return;

    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching mappings', { controllerId: controller.id });
      const response = await getSharp7Maps({ controllerId: controller.id });

      if (response?.data) {
        setMappings(response.data);
        logger.log('Mappings fetched', { count: response.data.length });
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('sharp7Controllers.errors.fetchMappingsFailed'));
    } finally {
      setLoading(false);
    }
  }, [controller?.id, t]);

  useEffect(() => {
    if (open && controller?.id) {
      fetchMappings();
    }
  }, [open, controller?.id, fetchMappings]);

  // Form handlers
  const handleAddNew = () => {
    setFormData({
      position: '',
      bit: '',
      itemId: '',
      operationType: IoOperationTypeEnum.Read,
    });
    setFormErrors({});
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (mapping: MapSharp7) => {
    setFormData({
      position: mapping.position,
      bit: mapping.bit ?? '',
      itemId: mapping.itemId,
      operationType: mapping.operationType ?? IoOperationTypeEnum.Read,
    });
    setFormErrors({});
    setEditingId(mapping.id);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      position: '',
      bit: '',
      itemId: '',
      operationType: IoOperationTypeEnum.Read,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.position === '' || formData.position < 0) {
      errors.position = t('sharp7Controllers.validation.positionRequired');
    }

    // Validate bit range if provided (0-7)
    if (formData.bit !== '' && (formData.bit < 0 || formData.bit > 7)) {
      errors.bit = t('sharp7Controllers.validation.bitRange');
    }

    if (!formData.itemId) {
      errors.itemId = t('sharp7Controllers.validation.itemRequired');
    }

    // Check for duplicate position+bit combination (excluding current editing item)
    const duplicate = mappings.find(
      (m) =>
        m.position === formData.position &&
        (m.bit ?? null) === (formData.bit === '' ? null : formData.bit) &&
        m.id !== editingId
    );
    if (duplicate) {
      errors.position = t('sharp7Controllers.validation.positionExists');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMapping = async () => {
    if (!validateForm() || !controller?.id) return;

    setLoading(true);
    setError(null);

    try {
      const mappingData: Sharp7MapItem = {
        id: editingId || undefined,
        position: Number(formData.position),
        bit: formData.bit === '' ? null : Number(formData.bit),
        itemId: formData.itemId,
        operationType: formData.operationType,
      };

      if (editingId) {
        // Update existing
        const response = await batchEditSharp7Maps({
          controllerId: controller.id,
          changed: [mappingData],
          added: [],
          removed: [],
        });

        if (response.isSuccessful) {
          setSuccessMessage(t('sharp7Controllers.success.mappingUpdated'));
          handleCancelForm();
          fetchMappings();
        } else {
          setError(response.errorMessage || t('sharp7Controllers.errors.updateMappingFailed'));
        }
      } else {
        // Add new
        const response = await batchEditSharp7Maps({
          controllerId: controller.id,
          changed: [],
          added: [mappingData],
          removed: [],
        });

        if (response.isSuccessful) {
          setSuccessMessage(t('sharp7Controllers.success.mappingAdded'));
          handleCancelForm();
          fetchMappings();
        } else {
          setError(response.errorMessage || t('sharp7Controllers.errors.addMappingFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save mapping', { error: err });
      setError(t('sharp7Controllers.errors.saveMappingFailed'));
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleDelete = async (mapping: MapSharp7) => {
    if (!controller?.id) return;

    if (!confirm(t('sharp7Controllers.dialogs.deleteMappingConfirm'))) return;

    setLoading(true);
    setError(null);

    try {
      const response = await batchEditSharp7Maps({
        controllerId: controller.id,
        changed: [],
        added: [],
        removed: [mapping.id],
      });

      if (response.isSuccessful) {
        setSuccessMessage(t('sharp7Controllers.success.mappingDeleted'));
        fetchMappings();
      } else {
        setError(response.errorMessage || t('sharp7Controllers.errors.deleteMappingFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete mapping', { error: err });
      setError(t('sharp7Controllers.errors.deleteMappingFailed'));
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Mapping column definitions
  const mappingColumnDefs = useMemo<ColDef<MapSharp7>[]>(() => {
    return [
      {
        headerName: t('sharp7Controllers.mappings.position'),
        field: 'position',
        width: 100,
        minWidth: 80,
        sortable: true,
      },
      {
        headerName: t('sharp7Controllers.mappings.bit'),
        field: 'bit',
        width: 80,
        minWidth: 60,
        sortable: true,
        valueFormatter: (params) => (params.value !== null && params.value !== undefined ? String(params.value) : '-'),
      },
      {
        headerName: t('sharp7Controllers.mappings.item'),
        field: 'itemId',
        flex: 2,
        minWidth: 200,
        valueFormatter: (params) => {
          const item = sharp7Items.find((i) => i.id === params.value);
          return item?.name || params.value || '';
        },
        sortable: true,
      },
      {
        headerName: t('sharp7Controllers.mappings.operationType'),
        field: 'operationType',
        width: 120,
        minWidth: 100,
        valueFormatter: (params) => {
          return params.value === IoOperationTypeEnum.Read
            ? t('sharp7Controllers.mappings.read')
            : t('sharp7Controllers.mappings.write');
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
        cellRenderer: (params: ICellRendererParams<MapSharp7>) => {
          const mapping = params.data;
          if (!mapping) return null;

          return (
            <Box
              data-id-ref={`sharp7-mapping-actions-${mapping.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <Tooltip title={t('common.buttons.edit')}>
                <IconButton
                  data-id-ref={`sharp7-mapping-edit-btn-${mapping.id}`}
                  size="small"
                  color="primary"
                  onClick={() => handleEdit(mapping)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.buttons.delete')}>
                <IconButton
                  data-id-ref={`sharp7-mapping-delete-btn-${mapping.id}`}
                  size="small"
                  color="error"
                  onClick={() => handleDelete(mapping)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ];
  }, [t, sharp7Items, handleDelete]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-id-ref="sharp7-mappings-dialog"
      PaperProps={{
        sx: {
          height: { xs: '100%', sm: '80vh' },
          maxHeight: { xs: '100%', sm: '80vh' },
        },
      }}
    >
      <DialogTitle
        data-id-ref="sharp7-mappings-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1,
        }}
      >
        <Box>
          <Typography variant="h6" component="span">
            {t('sharp7Controllers.mappings.title')}
          </Typography>
          {controller && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              component="div"
            >
              {controller.name} - {controller.ipAddress}
            </Typography>
          )}
        </Box>
        <IconButton
          data-id-ref="sharp7-mappings-close-btn"
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        data-id-ref="sharp7-mappings-dialog-content"
        sx={{ display: 'flex', flexDirection: 'column', p: 2 }}
      >
        {error && (
          <Alert
            data-id-ref="sharp7-mappings-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            data-id-ref="sharp7-mappings-success"
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ mb: 2 }}
          >
            {successMessage}
          </Alert>
        )}

        {!showForm && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 2,
            }}
          >
            <Button
              data-id-ref="sharp7-add-mapping-btn"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              {t('sharp7Controllers.mappings.addMapping')}
            </Button>
          </Box>
        )}

        {showForm && (
          <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {editingId ? t('sharp7Controllers.mappings.editMapping') : t('sharp7Controllers.mappings.addMapping')}
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  data-id-ref="sharp7-mapping-position-input"
                  label={t('sharp7Controllers.mappings.position')}
                  type="number"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value === '' ? '' : Number(e.target.value) })}
                  error={Boolean(formErrors.position)}
                  helperText={formErrors.position}
                  required
                  size="small"
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  data-id-ref="sharp7-mapping-bit-input"
                  label={t('sharp7Controllers.mappings.bit')}
                  type="number"
                  value={formData.bit}
                  onChange={(e) => setFormData({ ...formData, bit: e.target.value === '' ? '' : Number(e.target.value) })}
                  error={Boolean(formErrors.bit)}
                  helperText={formErrors.bit || t('sharp7Controllers.mappings.bitHelper')}
                  size="small"
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0, max: 7 }}
                />
              </Stack>
              <FormControl fullWidth size="small" error={Boolean(formErrors.itemId)}>
                <InputLabel>{t('sharp7Controllers.mappings.item')}</InputLabel>
                <Select
                  data-id-ref="sharp7-mapping-item-select"
                  value={formData.itemId}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, itemId: e.target.value })}
                  label={t('sharp7Controllers.mappings.item')}
                >
                  {sharp7Items.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>{t('sharp7Controllers.mappings.operationType')}</InputLabel>
                <Select
                  data-id-ref="sharp7-mapping-operation-select"
                  value={formData.operationType}
                  onChange={(e: SelectChangeEvent<number>) => setFormData({ ...formData, operationType: Number(e.target.value) })}
                  label={t('sharp7Controllers.mappings.operationType')}
                >
                  <MenuItem value={IoOperationTypeEnum.Read}>{t('sharp7Controllers.mappings.read')}</MenuItem>
                  <MenuItem value={IoOperationTypeEnum.Write}>{t('sharp7Controllers.mappings.write')}</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  data-id-ref="sharp7-mapping-cancel-btn"
                  onClick={handleCancelForm}
                  size="small"
                >
                  {t('common.buttons.cancel')}
                </Button>
                <Button
                  data-id-ref="sharp7-mapping-save-btn"
                  variant="contained"
                  onClick={handleSaveMapping}
                  disabled={loading}
                  size="small"
                >
                  {t('common.buttons.save')}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

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
              data-id-ref="sharp7-no-mappings"
              color="text.secondary"
            >
              {t('sharp7Controllers.mappings.noMappings')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 300 }}>
            <AGGridWrapper
              idRef="sharp7-mappings"
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

      <DialogActions data-id-ref="sharp7-mappings-dialog-actions">
        <Button
          data-id-ref="sharp7-mappings-close-action-btn"
          onClick={onClose}
        >
          {t('common.buttons.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Sharp7MappingsDialog;
