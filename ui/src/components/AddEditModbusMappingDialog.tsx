import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { batchEditModbusMaps } from '../services/extendedApi';
import type {
  MapModbus,
  Item,
  IoOperationType,
  BatchEditModbusMapsRequestDto,
  ModbusMapItem,
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditModbusMappingDialog');

interface AddEditModbusMappingDialogProps {
  open: boolean;
  editMode: boolean;
  mapping: MapModbus | null;
  controllerId: string;
  modbusItems: Item[];
  existingPositions: number[];
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

interface FormData {
  position: number;
  itemId: string;
  operationType: IoOperationType;
}

interface FormErrors {
  position?: string;
  itemId?: string;
}

const AddEditModbusMappingDialog: React.FC<AddEditModbusMappingDialogProps> = ({
  open,
  editMode,
  mapping,
  controllerId,
  modbusItems,
  existingPositions,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    position: 0,
    itemId: '',
    operationType: 0 as IoOperationType,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or mapping changes
  useEffect(() => {
    if (open) {
      if (editMode && mapping) {
        setFormData({
          position: mapping.position,
          itemId: mapping.itemId,
          operationType: mapping.operationType ?? (0 as IoOperationType),
        });
      } else {
        // For new mapping, suggest next available position
        const nextPosition = existingPositions.length > 0 
          ? Math.max(...existingPositions) + 1 
          : 0;
        setFormData({
          position: nextPosition,
          itemId: '',
          operationType: 0 as IoOperationType,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, mapping, existingPositions]);

  // Selected item for Autocomplete
  const selectedItem = useMemo(() => {
    return modbusItems.find((item) => item.id === formData.itemId) || null;
  }, [modbusItems, formData.itemId]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (formData.position < 0) {
      errors.position = t('modbusControllers.validation.positionMin');
    }

    // Check for duplicate position (excluding current mapping in edit mode)
    const isDuplicate = existingPositions.some((pos, index) => {
      if (editMode && mapping) {
        // In edit mode, exclude the current mapping's position
        const currentIndex = existingPositions.indexOf(mapping.position);
        if (index === currentIndex) return false;
      }
      return pos === formData.position;
    });

    if (isDuplicate) {
      errors.position = t('modbusControllers.validation.duplicatePosition');
    }

    if (!formData.itemId) {
      errors.itemId = t('modbusControllers.validation.itemRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const mapItem: ModbusMapItem = {
        position: formData.position,
        itemId: formData.itemId,
        operationType: formData.operationType,
      };

      let request: BatchEditModbusMapsRequestDto;

      if (editMode && mapping) {
        // Edit existing mapping
        mapItem.id = mapping.id;
        request = {
          controllerId,
          added: [],
          changed: [mapItem],
          removed: [],
        };
        logger.log('Updating mapping', { mappingId: mapping.id });
      } else {
        // Add new mapping
        request = {
          controllerId,
          added: [mapItem],
          changed: [],
          removed: [],
        };
        logger.log('Adding new mapping');
      }

      const response = await batchEditModbusMaps(request);

      if (response.isSuccessful) {
        const successMessage = editMode
          ? t('modbusControllers.success.mappingUpdated')
          : t('modbusControllers.success.mappingCreated');
        logger.log(editMode ? 'Mapping updated' : 'Mapping created');
        onSuccess(successMessage);
        onClose(true);
      } else {
        setError(response.errorMessage || t('modbusControllers.errors.saveMappingsFailed'));
      }
    } catch (err) {
      logger.error('Failed to save mapping', { error: err });
      setError(t('modbusControllers.errors.saveMappingsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setFormErrors({});
    onClose(false);
  };

  const handlePositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      position: isNaN(value) ? 0 : value,
    }));
    if (formErrors.position) {
      setFormErrors((prev) => ({ ...prev, position: undefined }));
    }
  };

  const handleItemChange = (_event: React.SyntheticEvent, newValue: Item | null) => {
    setFormData((prev) => ({
      ...prev,
      itemId: newValue?.id || '',
    }));
    if (formErrors.itemId) {
      setFormErrors((prev) => ({ ...prev, itemId: undefined }));
    }
  };

  const handleOperationTypeChange = (event: SelectChangeEvent<number>) => {
    setFormData((prev) => ({
      ...prev,
      operationType: event.target.value as IoOperationType,
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="add-edit-modbus-mapping-dialog"
    >
      <DialogTitle data-id-ref="add-edit-modbus-mapping-dialog-title">
        {editMode
          ? t('modbusControllers.mappings.dialogs.editTitle')
          : t('modbusControllers.mappings.dialogs.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-modbus-mapping-dialog-content">
        {error && (
          <Alert
            data-id-ref="add-edit-modbus-mapping-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2, mt: 1 }}
          >
            {error}
          </Alert>
        )}

        <TextField
          data-id-ref="modbus-mapping-position-input"
          label={t('modbusControllers.mappings.position')}
          type="number"
          value={formData.position}
          onChange={handlePositionChange}
          error={!!formErrors.position}
          helperText={formErrors.position}
          fullWidth
          margin="normal"
          inputProps={{ min: 0 }}
        />

        <Autocomplete
          data-id-ref="modbus-mapping-item-autocomplete"
          options={modbusItems}
          value={selectedItem}
          onChange={handleItemChange}
          getOptionLabel={(option) => option.name || ''}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              data-id-ref="modbus-mapping-item-input"
              label={t('modbusControllers.mappings.item')}
              error={!!formErrors.itemId}
              helperText={formErrors.itemId}
              margin="normal"
            />
          )}
          fullWidth
          sx={{ mt: 1 }}
        />

        <FormControl
          data-id-ref="modbus-mapping-operation-type-control"
          fullWidth
          margin="normal"
        >
          <InputLabel>{t('modbusControllers.mappings.operationType')}</InputLabel>
          <Select
            data-id-ref="modbus-mapping-operation-type-select"
            value={formData.operationType}
            onChange={handleOperationTypeChange}
            label={t('modbusControllers.mappings.operationType')}
          >
            <MenuItem value={0}>{t('modbusControllers.mappings.read')}</MenuItem>
            <MenuItem value={1}>{t('modbusControllers.mappings.write')}</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions data-id-ref="add-edit-modbus-mapping-dialog-actions">
        <Button
          data-id-ref="cancel-modbus-mapping-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="save-modbus-mapping-btn"
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditModbusMappingDialog;
