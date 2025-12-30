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
  Stack,
  Autocomplete,
  Box,
  Chip,
  Typography,
  IconButton,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addTimeoutMemory, editTimeoutMemory } from '../services/extendedApi';
import type { TimeoutMemory, Item, ItemType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditTimeoutMemoryDialog');

interface AddEditTimeoutMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  timeoutMemory: TimeoutMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  inputItemId: string;
  outputItemId: string;
  timeout: number;
}

interface FormErrors {
  inputItemId?: string;
  outputItemId?: string;
  timeout?: string;
}

/**
 * Get ItemType color for badge
 */
const getItemTypeColor = (itemType: ItemType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (itemType) {
    case 1: // DigitalInput
      return 'info';
    case 2: // DigitalOutput
      return 'success';
    case 3: // AnalogInput
      return 'primary';
    case 4: // AnalogOutput
      return 'secondary';
    default:
      return 'default';
  }
};

/**
 * Get ItemType label
 */
const getItemTypeLabel = (itemType: ItemType, t: (key: string) => string): string => {
  switch (itemType) {
    case 1:
      return t('itemType.digitalInput');
    case 2:
      return t('itemType.digitalOutput');
    case 3:
      return t('itemType.analogInput');
    case 4:
      return t('itemType.analogOutput');
    default:
      return String(itemType);
  }
};

const AddEditTimeoutMemoryDialog: React.FC<AddEditTimeoutMemoryDialogProps> = ({
  open,
  editMode,
  timeoutMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  const [formData, setFormData] = useState<FormData>({
    inputItemId: '',
    outputItemId: '',
    timeout: 60, // Default 60 seconds
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or timeoutMemory changes
  useEffect(() => {
    if (open) {
      if (editMode && timeoutMemory) {
        setFormData({
          inputItemId: timeoutMemory.inputItemId,
          outputItemId: timeoutMemory.outputItemId,
          timeout: timeoutMemory.timeout,
        });
      } else {
        setFormData({
          inputItemId: '',
          outputItemId: '',
          timeout: 60,
        });
      }
      setFormErrors({});
      setError(null);
      setDuplicateWarning(null);
    }
  }, [open, editMode, timeoutMemory]);

  // Filter output items to only DigitalOutput (2)
  const outputItems = useMemo(() => {
    return items.filter((item) => item.itemType === 2);
  }, [items]);

  // Get selected input and output items
  const selectedInputItem = useMemo(() => {
    return items.find((item) => item.id === formData.inputItemId) || null;
  }, [items, formData.inputItemId]);

  const selectedOutputItem = useMemo(() => {
    return outputItems.find((item) => item.id === formData.outputItemId) || null;
  }, [outputItems, formData.outputItemId]);

  // Check for duplicate InputItemId (excluding current edit)
  useEffect(() => {
    if (formData.inputItemId) {
      // In a real implementation, we'd fetch existing timeout memories and check for duplicates
      // For now, just clear the warning when input changes
      setDuplicateWarning(null);
    }
  }, [formData.inputItemId]);

  const handleInputItemChange = (_event: React.SyntheticEvent, value: Item | null) => {
    setFormData((prev) => ({ ...prev, inputItemId: value?.id || '' }));
    if (formErrors.inputItemId) {
      setFormErrors((prev) => ({ ...prev, inputItemId: undefined }));
    }
  };

  const handleOutputItemChange = (_event: React.SyntheticEvent, value: Item | null) => {
    setFormData((prev) => ({ ...prev, outputItemId: value?.id || '' }));
    if (formErrors.outputItemId) {
      setFormErrors((prev) => ({ ...prev, outputItemId: undefined }));
    }
  };

  const handleTimeoutChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 0 : Number(event.target.value);
    setFormData((prev) => ({ ...prev, timeout: value }));
    if (formErrors.timeout) {
      setFormErrors((prev) => ({ ...prev, timeout: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    // Input item validation
    if (!formData.inputItemId) {
      errors.inputItemId = t('timeoutMemory.validation.inputItemRequired');
    }

    // Output item validation
    if (!formData.outputItemId) {
      errors.outputItemId = t('timeoutMemory.validation.outputItemRequired');
    }

    // Validate input and output items are different
    if (formData.inputItemId && formData.outputItemId && formData.inputItemId === formData.outputItemId) {
      errors.outputItemId = t('timeoutMemory.validation.itemsMustBeDifferent');
    }

    // Timeout validation
    if (!formData.timeout || formData.timeout <= 0) {
      errors.timeout = t('timeoutMemory.validation.timeoutRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editMode && timeoutMemory) {
        // Edit existing timeout memory
        logger.log('Editing timeout memory', { id: timeoutMemory.id });
        const response = await editTimeoutMemory({
          id: timeoutMemory.id,
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          timeout: formData.timeout,
        });

        if (response.isSuccessful) {
          logger.log('Timeout memory edited successfully', { id: timeoutMemory.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('timeoutMemory.errors.updateFailed'));
        }
      } else {
        // Create new timeout memory
        logger.log('Creating timeout memory');
        const response = await addTimeoutMemory({
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          timeout: formData.timeout,
        });

        if (response.isSuccessful) {
          logger.log('Timeout memory created successfully', { id: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('timeoutMemory.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save timeout memory', { error: err });
      setError(editMode ? t('timeoutMemory.errors.updateFailed') : t('timeoutMemory.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  const getItemLabel = (item: Item): string => {
    const name = language === 'fa' && item.nameFa ? item.nameFa : item.name;
    return `${item.pointNumber} - ${name}`;
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && handleCancel()}
      maxWidth="sm"
      fullWidth
      data-id-ref="timeout-memory-dialog"
    >
      <DialogTitle data-id-ref="timeout-memory-dialog-title">
        {editMode ? t('timeoutMemory.editTitle') : t('timeoutMemory.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="timeout-memory-dialog-content">
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" data-id-ref="timeout-memory-error-alert">
              {error}
            </Alert>
          )}

          {duplicateWarning && (
            <Alert severity="warning" data-id-ref="timeout-memory-duplicate-warning">
              {duplicateWarning}
            </Alert>
          )}

          {/* Input Item Selection */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Autocomplete
              options={items}
              getOptionLabel={getItemLabel}
              value={selectedInputItem}
              onChange={handleInputItemChange}
              disabled={loading}
              data-id-ref="timeout-memory-input-item-select"
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('timeoutMemory.inputItem')}
                  required
                  error={!!formErrors.inputItemId}
                  helperText={formErrors.inputItemId || t('timeoutMemory.inputItemHelp')}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {getItemLabel(option)}
                    </Typography>
                    <Chip
                      label={getItemTypeLabel(option.itemType, t)}
                      size="small"
                      color={getItemTypeColor(option.itemType)}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('timeoutMemory.help.inputItem')}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref="timeout-memory-input-item-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
          {/* Output Item Selection - Filtered to DigitalOutput only */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Autocomplete
              options={outputItems}
              getOptionLabel={getItemLabel}
              value={selectedOutputItem}
              onChange={handleOutputItemChange}
              disabled={loading}
              data-id-ref="timeout-memory-output-item-select"
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('timeoutMemory.outputItem')}
                  required
                  error={!!formErrors.outputItemId}
                  helperText={formErrors.outputItemId || t('timeoutMemory.outputItemHelp')}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {getItemLabel(option)}
                    </Typography>
                    <Chip
                      label={getItemTypeLabel(option.itemType, t)}
                      size="small"
                      color={getItemTypeColor(option.itemType)}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('timeoutMemory.help.outputItem')}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref="timeout-memory-output-item-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
          {/* Timeout Input */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <TextField
              label={t('timeoutMemory.timeout')}
              type="number"
              value={formData.timeout}
              onChange={handleTimeoutChange}
              disabled={loading}
              required
              error={!!formErrors.timeout}
              helperText={formErrors.timeout || t('timeoutMemory.timeoutHelp')}
              data-id-ref="timeout-memory-timeout-input"
              inputProps={{
                min: 1,
                step: 1,
              }}
              fullWidth
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('timeoutMemory.help.timeout')}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref="timeout-memory-timeout-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions data-id-ref="timeout-memory-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          data-id-ref="timeout-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="timeout-memory-submit-btn"
          startIcon={loading && <CircularProgress size={20} />}
        >
          {editMode ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>

      {/* Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['timeoutMemory.help.inputItem']}
        open={Boolean(helpAnchorEl['timeoutMemory.help.inputItem'])}
        onClose={handleHelpClose('timeoutMemory.help.inputItem')}
        fieldKey="timeoutMemory.help.inputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['timeoutMemory.help.outputItem']}
        open={Boolean(helpAnchorEl['timeoutMemory.help.outputItem'])}
        onClose={handleHelpClose('timeoutMemory.help.outputItem')}
        fieldKey="timeoutMemory.help.outputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['timeoutMemory.help.timeout']}
        open={Boolean(helpAnchorEl['timeoutMemory.help.timeout'])}
        onClose={handleHelpClose('timeoutMemory.help.timeout')}
        fieldKey="timeoutMemory.help.timeout"
      />
    </Dialog>
  );
};

export default AddEditTimeoutMemoryDialog;
