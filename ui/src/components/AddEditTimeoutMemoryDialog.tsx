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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
  Memory as MemoryIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addTimeoutMemory, editTimeoutMemory, getGlobalVariables } from '../services/extendedApi';
import type { TimeoutMemory, Item, ItemType, GlobalVariable } from '../types/api';
import { TimeoutSourceType } from '../types/api';
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
  inputType: number;
  inputReference: string;
  outputType: number;
  outputReference: string;
  timeout: number;
}

interface FormErrors {
  inputReference?: string;
  outputReference?: string;
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
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loadingGlobalVariables, setLoadingGlobalVariables] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  const [formData, setFormData] = useState<FormData>({
    inputType: TimeoutSourceType.Point,
    inputReference: '',
    outputType: TimeoutSourceType.Point,
    outputReference: '',
    timeout: 60, // Default 60 seconds
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Fetch global variables when dialog opens
  useEffect(() => {
    const fetchGlobalVariables = async () => {
      if (open) {
        setLoadingGlobalVariables(true);
        try {
          const response = await getGlobalVariables({});
          if (response?.globalVariables) {
            setGlobalVariables(response.globalVariables);
            logger.log('Global variables loaded', { count: response.globalVariables.length });
          }
        } catch (err) {
          logger.error('Failed to fetch global variables', { error: err });
        } finally {
          setLoadingGlobalVariables(false);
        }
      }
    };

    fetchGlobalVariables();
  }, [open]);

  // Initialize form data when dialog opens or timeoutMemory changes
  useEffect(() => {
    if (open) {
      if (editMode && timeoutMemory) {
        setFormData({
          inputType: timeoutMemory.inputType,
          inputReference: timeoutMemory.inputReference,
          outputType: timeoutMemory.outputType,
          outputReference: timeoutMemory.outputReference,
          timeout: timeoutMemory.timeout,
        });
      } else {
        setFormData({
          inputType: TimeoutSourceType.Point,
          inputReference: '',
          outputType: TimeoutSourceType.Point,
          outputReference: '',
          timeout: 60,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, timeoutMemory]);

  // Filter output items to only DigitalOutput (2) for Point type
  const outputItems = useMemo(() => {
    return items.filter((item) => item.itemType === 2);
  }, [items]);

  // Get selected input and output items/variables
  const selectedInputItem = useMemo(() => {
    if (formData.inputType === TimeoutSourceType.Point) {
      return items.find((item) => item.id === formData.inputReference) || null;
    }
    return null;
  }, [items, formData.inputType, formData.inputReference]);

  const selectedOutputItem = useMemo(() => {
    if (formData.outputType === TimeoutSourceType.Point) {
      return outputItems.find((item) => item.id === formData.outputReference) || null;
    }
    return null;
  }, [outputItems, formData.outputType, formData.outputReference]);

  const selectedInputVariable = useMemo(() => {
    if (formData.inputType === TimeoutSourceType.GlobalVariable) {
      return globalVariables.find((v) => v.name === formData.inputReference) || null;
    }
    return null;
  }, [globalVariables, formData.inputType, formData.inputReference]);

  const selectedOutputVariable = useMemo(() => {
    if (formData.outputType === TimeoutSourceType.GlobalVariable) {
      return globalVariables.find((v) => v.name === formData.outputReference) || null;
    }
    return null;
  }, [globalVariables, formData.outputType, formData.outputReference]);

  const handleInputTypeChange = (_event: React.MouseEvent<HTMLElement>, newValue: number | null) => {
    if (newValue !== null) {
      setFormData((prev) => ({ ...prev, inputType: newValue, inputReference: '' }));
      if (formErrors.inputReference) {
        setFormErrors((prev) => ({ ...prev, inputReference: undefined }));
      }
    }
  };

  const handleOutputTypeChange = (_event: React.MouseEvent<HTMLElement>, newValue: number | null) => {
    if (newValue !== null) {
      setFormData((prev) => ({ ...prev, outputType: newValue, outputReference: '' }));
      if (formErrors.outputReference) {
        setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
      }
    }
  };

  const handleInputItemChange = (_event: React.SyntheticEvent, value: Item | null) => {
    setFormData((prev) => ({ ...prev, inputReference: value?.id || '' }));
    if (formErrors.inputReference) {
      setFormErrors((prev) => ({ ...prev, inputReference: undefined }));
    }
  };

  const handleOutputItemChange = (_event: React.SyntheticEvent, value: Item | null) => {
    setFormData((prev) => ({ ...prev, outputReference: value?.id || '' }));
    if (formErrors.outputReference) {
      setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
    }
  };

  const handleInputVariableChange = (_event: React.SyntheticEvent, value: GlobalVariable | null) => {
    setFormData((prev) => ({ ...prev, inputReference: value?.name || '' }));
    if (formErrors.inputReference) {
      setFormErrors((prev) => ({ ...prev, inputReference: undefined }));
    }
  };

  const handleOutputVariableChange = (_event: React.SyntheticEvent, value: GlobalVariable | null) => {
    setFormData((prev) => ({ ...prev, outputReference: value?.name || '' }));
    if (formErrors.outputReference) {
      setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
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

    // Input source validation
    if (!formData.inputReference) {
      errors.inputReference = t('timeoutMemory.validation.inputRequired');
    }

    // Output source validation
    if (!formData.outputReference) {
      errors.outputReference = t('timeoutMemory.validation.outputRequired');
    }

    // Validate input and output sources are different (same type and reference)
    if (formData.inputType === formData.outputType && 
        formData.inputReference && 
        formData.outputReference && 
        formData.inputReference === formData.outputReference) {
      errors.outputReference = t('timeoutMemory.validation.sourcesMustBeDifferent');
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
          inputType: formData.inputType,
          inputReference: formData.inputReference,
          outputType: formData.outputType,
          outputReference: formData.outputReference,
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
          inputType: formData.inputType,
          inputReference: formData.inputReference,
          outputType: formData.outputType,
          outputReference: formData.outputReference,
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

  const getVariableLabel = (variable: GlobalVariable): string => {
    return variable.name;
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

          {/* Input Type Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom data-id-ref="timeout-memory-input-type-label">
              {t('timeoutMemory.inputType')} *
            </Typography>
            <ToggleButtonGroup
              value={formData.inputType}
              exclusive
              onChange={handleInputTypeChange}
              fullWidth
              disabled={loading}
              data-id-ref="timeout-memory-input-type-toggle"
              sx={{ mb: 2 }}
            >
              <ToggleButton value={TimeoutSourceType.Point} data-id-ref="timeout-memory-input-type-point">
                <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                {t('timeoutMemory.sourceTypePoint')}
              </ToggleButton>
              <ToggleButton value={TimeoutSourceType.GlobalVariable} data-id-ref="timeout-memory-input-type-globalvariable">
                <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                {t('timeoutMemory.sourceTypeGlobalVariable')}
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Input Item Selection (Point) */}
            {formData.inputType === TimeoutSourceType.Point && (
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
                      error={!!formErrors.inputReference}
                      helperText={formErrors.inputReference || t('timeoutMemory.inputItemHelp')}
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
            )}

            {/* Input Global Variable Selection */}
            {formData.inputType === TimeoutSourceType.GlobalVariable && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Autocomplete
                  options={globalVariables}
                  getOptionLabel={getVariableLabel}
                  value={selectedInputVariable}
                  onChange={handleInputVariableChange}
                  disabled={loading || loadingGlobalVariables}
                  data-id-ref="timeout-memory-input-variable-select"
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('timeoutMemory.inputGlobalVariable')}
                      required
                      error={!!formErrors.inputReference}
                      helperText={formErrors.inputReference || t('timeoutMemory.inputGlobalVariableHelp')}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingGlobalVariables ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {option.name}
                        </Typography>
                        <Chip
                          label={option.variableType === 0 ? t('globalVariables.type.boolean') : t('globalVariables.type.float')}
                          size="small"
                          color={option.variableType === 0 ? 'success' : 'info'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  )}
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('timeoutMemory.help.inputGlobalVariable')}
                  sx={{ p: 0.25, mt: 1 }}
                  data-id-ref="timeout-memory-input-variable-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Output Type Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom data-id-ref="timeout-memory-output-type-label">
              {t('timeoutMemory.outputType')} *
            </Typography>
            <ToggleButtonGroup
              value={formData.outputType}
              exclusive
              onChange={handleOutputTypeChange}
              fullWidth
              disabled={loading}
              data-id-ref="timeout-memory-output-type-toggle"
              sx={{ mb: 2 }}
            >
              <ToggleButton value={TimeoutSourceType.Point} data-id-ref="timeout-memory-output-type-point">
                <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                {t('timeoutMemory.sourceTypePoint')}
              </ToggleButton>
              <ToggleButton value={TimeoutSourceType.GlobalVariable} data-id-ref="timeout-memory-output-type-globalvariable">
                <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                {t('timeoutMemory.sourceTypeGlobalVariable')}
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Output Item Selection (Point) - Filtered to DigitalOutput only */}
            {formData.outputType === TimeoutSourceType.Point && (
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
                      error={!!formErrors.outputReference}
                      helperText={formErrors.outputReference || t('timeoutMemory.outputItemHelp')}
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
            )}

            {/* Output Global Variable Selection */}
            {formData.outputType === TimeoutSourceType.GlobalVariable && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Autocomplete
                  options={globalVariables}
                  getOptionLabel={getVariableLabel}
                  value={selectedOutputVariable}
                  onChange={handleOutputVariableChange}
                  disabled={loading || loadingGlobalVariables}
                  data-id-ref="timeout-memory-output-variable-select"
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('timeoutMemory.outputGlobalVariable')}
                      required
                      error={!!formErrors.outputReference}
                      helperText={formErrors.outputReference || t('timeoutMemory.outputGlobalVariableHelp')}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingGlobalVariables ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {option.name}
                        </Typography>
                        <Chip
                          label={option.variableType === 0 ? t('globalVariables.type.boolean') : t('globalVariables.type.float')}
                          size="small"
                          color={option.variableType === 0 ? 'success' : 'info'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  )}
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('timeoutMemory.help.outputGlobalVariable')}
                  sx={{ p: 0.25, mt: 1 }}
                  data-id-ref="timeout-memory-output-variable-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            )}
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
        anchorEl={helpAnchorEl['timeoutMemory.help.inputGlobalVariable']}
        open={Boolean(helpAnchorEl['timeoutMemory.help.inputGlobalVariable'])}
        onClose={handleHelpClose('timeoutMemory.help.inputGlobalVariable')}
        fieldKey="timeoutMemory.help.inputGlobalVariable"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['timeoutMemory.help.outputGlobalVariable']}
        open={Boolean(helpAnchorEl['timeoutMemory.help.outputGlobalVariable'])}
        onClose={handleHelpClose('timeoutMemory.help.outputGlobalVariable')}
        fieldKey="timeoutMemory.help.outputGlobalVariable"
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
