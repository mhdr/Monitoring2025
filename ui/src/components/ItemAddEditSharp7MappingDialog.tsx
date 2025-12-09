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
  Typography,
  Box,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { batchEditSharp7Maps } from '../services/extendedApi';
import type {
  MapSharp7WithController,
  ControllerSharp7,
  IoOperationType,
  BatchEditSharp7MapsRequestDto,
  Sharp7MapItem,
} from '../types/api';
import { DataTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ItemAddEditSharp7MappingDialog');

interface ItemAddEditSharp7MappingDialogProps {
  open: boolean;
  editMode: boolean;
  mapping: MapSharp7WithController | null;
  itemId: string;
  itemName: string;
  controllers: ControllerSharp7[];
  existingPositionsByController: Map<string, number[]>;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

interface FormData {
  controllerId: string;
  position: number;
  bit: number | null;
  operationType: IoOperationType;
}

interface FormErrors {
  controllerId?: string;
  position?: string;
  bit?: string;
}

const ItemAddEditSharp7MappingDialog: React.FC<ItemAddEditSharp7MappingDialogProps> = ({
  open,
  editMode,
  mapping,
  itemId,
  itemName,
  controllers,
  existingPositionsByController,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    controllerId: '',
    position: 0,
    bit: null,
    operationType: 1 as IoOperationType,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or mapping changes
  useEffect(() => {
    if (open) {
      if (editMode && mapping) {
        setFormData({
          controllerId: mapping.controllerId,
          position: mapping.position,
          bit: mapping.bit ?? null,
          operationType: mapping.operationType ?? (1 as IoOperationType),
        });
      } else {
        // For new mapping, default to first controller if available
        const defaultControllerId = controllers.length > 0 ? controllers[0].id : '';
        const existingPositions = existingPositionsByController.get(defaultControllerId) || [];
        const nextPosition = existingPositions.length > 0 
          ? Math.max(...existingPositions) + 1 
          : 0;
        setFormData({
          controllerId: defaultControllerId,
          position: nextPosition,
          bit: null,
          operationType: 1 as IoOperationType,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, mapping, controllers, existingPositionsByController]);

  // Selected controller for Autocomplete
  const selectedController = useMemo(() => {
    return controllers.find((c) => c.id === formData.controllerId) || null;
  }, [controllers, formData.controllerId]);

  // Check if bit field should be shown (only for Bit/Boolean data type)
  const showBitField = useMemo(() => {
    return selectedController?.dataType === DataTypeEnum.Bit;
  }, [selectedController]);

  // Get existing positions for the selected controller
  const existingPositions = useMemo(() => {
    return existingPositionsByController.get(formData.controllerId) || [];
  }, [existingPositionsByController, formData.controllerId]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.controllerId) {
      errors.controllerId = t('itemSharp7Mappings.validation.controllerRequired');
    }

    if (formData.position < 0) {
      errors.position = t('sharp7Controllers.validation.positionMin');
    }

    // Check for duplicate position (excluding current mapping in edit mode)
    const isDuplicate = existingPositions.some((pos) => {
      if (editMode && mapping && mapping.position === pos && mapping.controllerId === formData.controllerId) {
        // In edit mode on same controller, skip the current mapping's position
        return false;
      }
      return pos === formData.position;
    });

    if (isDuplicate) {
      errors.position = t('sharp7Controllers.validation.duplicatePosition');
    }

    // Validate bit field if it's for a Bit data type
    if (showBitField && formData.bit !== null) {
      if (formData.bit < 0 || formData.bit > 7) {
        errors.bit = t('itemSharp7Mappings.validation.bitRange');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const mapItem: Sharp7MapItem = {
        position: formData.position,
        bit: showBitField ? formData.bit : null,
        itemId: itemId,
        operationType: formData.operationType,
      };

      let request: BatchEditSharp7MapsRequestDto;

      if (editMode && mapping) {
        // Check if controller changed - this requires delete from old + add to new
        if (mapping.controllerId !== formData.controllerId) {
          // Delete from old controller
          const deleteRequest: BatchEditSharp7MapsRequestDto = {
            controllerId: mapping.controllerId,
            added: [],
            changed: [],
            removed: [mapping.id],
          };
          await batchEditSharp7Maps(deleteRequest);

          // Add to new controller
          request = {
            controllerId: formData.controllerId,
            added: [mapItem],
            changed: [],
            removed: [],
          };
        } else {
          // Edit existing mapping on same controller
          mapItem.id = mapping.id;
          request = {
            controllerId: formData.controllerId,
            added: [],
            changed: [mapItem],
            removed: [],
          };
        }
        logger.log('Updating mapping', { mappingId: mapping.id, controllerChanged: mapping.controllerId !== formData.controllerId });
      } else {
        // Add new mapping
        request = {
          controllerId: formData.controllerId,
          added: [mapItem],
          changed: [],
          removed: [],
        };
        logger.log('Adding new mapping');
      }

      const response = await batchEditSharp7Maps(request);

      if (response.isSuccessful) {
        const successMessage = editMode
          ? t('sharp7Controllers.success.mappingUpdated')
          : t('sharp7Controllers.success.mappingCreated');
        logger.log(editMode ? 'Mapping updated' : 'Mapping created');
        onSuccess(successMessage);
        onClose(true);
      } else {
        setError(response.errorMessage || t('sharp7Controllers.errors.saveMappingsFailed'));
      }
    } catch (err) {
      logger.error('Failed to save mapping', { error: err });
      setError(t('sharp7Controllers.errors.saveMappingsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setFormErrors({});
    onClose(false);
  };

  const handleControllerChange = (_event: React.SyntheticEvent, newValue: ControllerSharp7 | null) => {
    const newControllerId = newValue?.id || '';
    // Update position to next available for new controller
    const positions = existingPositionsByController.get(newControllerId) || [];
    const nextPosition = positions.length > 0 ? Math.max(...positions) + 1 : 0;
    
    // Clear bit value when switching to non-Bit controller
    const shouldClearBit = newValue?.dataType !== DataTypeEnum.Bit;
    
    setFormData((prev) => ({
      ...prev,
      controllerId: newControllerId,
      position: nextPosition,
      bit: shouldClearBit ? null : prev.bit,
    }));
    if (formErrors.controllerId) {
      setFormErrors((prev) => ({ ...prev, controllerId: undefined }));
    }
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

  const handleBitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? null : parseInt(event.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      bit: value === null || isNaN(value) ? null : value,
    }));
    if (formErrors.bit) {
      setFormErrors((prev) => ({ ...prev, bit: undefined }));
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
      data-id-ref="item-add-edit-sharp7-mapping-dialog"
    >
      <DialogTitle data-id-ref="item-add-edit-sharp7-mapping-dialog-title">
        {editMode
          ? t('sharp7Controllers.mappings.dialogs.editTitle')
          : t('sharp7Controllers.mappings.dialogs.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="item-add-edit-sharp7-mapping-dialog-content">
        {error && (
          <Alert
            data-id-ref="item-add-edit-sharp7-mapping-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2, mt: 1 }}
          >
            {error}
          </Alert>
        )}

        {/* Show item name as read-only info */}
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t('sharp7Controllers.mappings.item')}
          </Typography>
          <Typography variant="body2" data-id-ref="item-sharp7-mapping-item-name">
            {itemName}
          </Typography>
        </Box>

        <Autocomplete
          data-id-ref="item-sharp7-mapping-controller-autocomplete"
          options={controllers}
          value={selectedController}
          onChange={handleControllerChange}
          getOptionLabel={(option) => `${option.name} (${option.ipAddress} - DB${option.dbAddress})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              data-id-ref="item-sharp7-mapping-controller-input"
              label={t('itemSharp7Mappings.controllerName')}
              error={!!formErrors.controllerId}
              helperText={formErrors.controllerId}
              margin="normal"
            />
          )}
          fullWidth
          disabled={editMode} // Don't allow changing controller in edit mode to keep it simple
        />

        <TextField
          data-id-ref="item-sharp7-mapping-position-input"
          label={t('sharp7Controllers.mappings.position')}
          type="number"
          value={formData.position}
          onChange={handlePositionChange}
          error={!!formErrors.position}
          helperText={formErrors.position}
          fullWidth
          margin="normal"
          inputProps={{ min: 0 }}
        />

        {showBitField && (
          <TextField
            data-id-ref="item-sharp7-mapping-bit-input"
            label={t('itemSharp7Mappings.bit')}
            type="number"
            value={formData.bit ?? ''}
            onChange={handleBitChange}
            error={!!formErrors.bit}
            helperText={formErrors.bit || t('itemSharp7Mappings.bitHelperText')}
            fullWidth
            margin="normal"
            inputProps={{ min: 0, max: 7 }}
          />
        )}

        <FormControl
          data-id-ref="item-sharp7-mapping-operation-type-control"
          fullWidth
          margin="normal"
        >
          <InputLabel>{t('sharp7Controllers.mappings.operationType')}</InputLabel>
          <Select
            data-id-ref="item-sharp7-mapping-operation-type-select"
            value={formData.operationType}
            onChange={handleOperationTypeChange}
            label={t('sharp7Controllers.mappings.operationType')}
          >
            <MenuItem value={1}>{t('sharp7Controllers.mappings.read')}</MenuItem>
            <MenuItem value={2}>{t('sharp7Controllers.mappings.write')}</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions data-id-ref="item-add-edit-sharp7-mapping-dialog-actions">
        <Button
          data-id-ref="item-sharp7-cancel-mapping-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="item-sharp7-save-mapping-btn"
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || controllers.length === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemAddEditSharp7MappingDialog;
