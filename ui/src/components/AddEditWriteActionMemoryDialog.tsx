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
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Checkbox,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addWriteActionMemory, editWriteActionMemory } from '../services/extendedApi';
import type { WriteActionMemory, Item, ItemType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditWriteActionMemoryDialog');

interface AddEditWriteActionMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  writeActionMemory: WriteActionMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

type OutputValueMode = 'static' | 'dynamic';

interface FormData {
  name: string;
  inputItemId: string;
  outputItemId: string;
  outputValueMode: OutputValueMode;
  outputValue: string;
  outputValueSourceItemId: string;
  interval: number;
  duration: number;
  maxExecutionCount: string; // String to handle empty/null state in UI
  isDisabled: boolean;
  resetExecutionCount: boolean;
}

interface FormErrors {
  name?: string;
  inputItemId?: string;
  outputItemId?: string;
  outputValue?: string;
  outputValueSourceItemId?: string;
  interval?: string;
  duration?: string;
  maxExecutionCount?: string;
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

const AddEditWriteActionMemoryDialog: React.FC<AddEditWriteActionMemoryDialogProps> = ({
  open,
  editMode,
  writeActionMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemId: '',
    outputItemId: '',
    outputValueMode: 'static',
    outputValue: '',
    outputValueSourceItemId: '',
    interval: 1,
    duration: 10,
    maxExecutionCount: '', // Empty = continuous
    isDisabled: false,
    resetExecutionCount: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or writeActionMemory changes
  useEffect(() => {
    if (open) {
      if (editMode && writeActionMemory) {
        // Determine mode based on which field is set
        const mode: OutputValueMode = writeActionMemory.outputValue !== null && writeActionMemory.outputValue !== undefined
          ? 'static'
          : 'dynamic';

        setFormData({
          name: writeActionMemory.name || '',
          inputItemId: writeActionMemory.inputItemId,
          outputItemId: writeActionMemory.outputItemId,
          outputValueMode: mode,
          outputValue: writeActionMemory.outputValue || '',
          outputValueSourceItemId: writeActionMemory.outputValueSourceItemId || '',
          interval: writeActionMemory.interval,
          duration: writeActionMemory.duration,
          maxExecutionCount: writeActionMemory.maxExecutionCount?.toString() || '',
          isDisabled: writeActionMemory.isDisabled,
          resetExecutionCount: false,
        });
      } else {
        setFormData({
          name: '',
          inputItemId: '',
          outputItemId: '',
          outputValueMode: 'static',
          outputValue: '',
          outputValueSourceItemId: '',
          interval: 1,
          duration: 10,
          maxExecutionCount: '',
          isDisabled: false,
          resetExecutionCount: false,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, writeActionMemory]);

  // Filter output items to only DigitalOutput (2) and AnalogOutput (4)
  const outputItems = useMemo(() => {
    return items.filter((item) => item.itemType === 2 || item.itemType === 4);
  }, [items]);

  // Get selected items
  const selectedInputItem = useMemo(() => {
    return items.find((item) => item.id === formData.inputItemId) || null;
  }, [items, formData.inputItemId]);

  const selectedOutputItem = useMemo(() => {
    return outputItems.find((item) => item.id === formData.outputItemId) || null;
  }, [outputItems, formData.outputItemId]);

  const selectedSourceItem = useMemo(() => {
    return items.find((item) => item.id === formData.outputValueSourceItemId) || null;
  }, [items, formData.outputValueSourceItemId]);

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

  const handleSourceItemChange = (_event: React.SyntheticEvent, value: Item | null) => {
    setFormData((prev) => ({ ...prev, outputValueSourceItemId: value?.id || '' }));
    if (formErrors.outputValueSourceItemId) {
      setFormErrors((prev) => ({ ...prev, outputValueSourceItemId: undefined }));
    }
  };

  const handleOutputValueModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.value as OutputValueMode;
    setFormData((prev) => ({ ...prev, outputValueMode: mode }));
    // Clear errors for both fields when switching modes
    setFormErrors((prev) => ({
      ...prev,
      outputValue: undefined,
      outputValueSourceItemId: undefined,
    }));
  };

  const handleTextFieldChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumberFieldChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 0 : Number(event.target.value);
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    // Input item validation
    if (!formData.inputItemId) {
      errors.inputItemId = t('writeActionMemory.validation.inputItemRequired');
    }

    // Output item validation
    if (!formData.outputItemId) {
      errors.outputItemId = t('writeActionMemory.validation.outputItemRequired');
    }

    // Validate input and output items are different
    if (formData.inputItemId && formData.outputItemId && formData.inputItemId === formData.outputItemId) {
      errors.outputItemId = t('writeActionMemory.validation.itemsMustBeDifferent');
    }

    // Output value mode validation
    if (formData.outputValueMode === 'static') {
      if (!formData.outputValue || formData.outputValue.trim() === '') {
        errors.outputValue = t('writeActionMemory.validation.outputValueRequired');
      }
    } else {
      if (!formData.outputValueSourceItemId) {
        errors.outputValueSourceItemId = t('writeActionMemory.validation.sourceItemRequired');
      }
      // Validate source item is different from input and output
      if (formData.outputValueSourceItemId) {
        if (formData.outputValueSourceItemId === formData.inputItemId) {
          errors.outputValueSourceItemId = t('writeActionMemory.validation.sourceCannotBeInput');
        }
        if (formData.outputValueSourceItemId === formData.outputItemId) {
          errors.outputValueSourceItemId = t('writeActionMemory.validation.sourceCannotBeOutput');
        }
      }
    }

    // Interval validation
    if (!formData.interval || formData.interval <= 0) {
      errors.interval = t('writeActionMemory.validation.intervalRequired');
    }

    // Duration validation
    if (formData.duration < 0) {
      errors.duration = t('writeActionMemory.validation.durationInvalid');
    }

    // MaxExecutionCount validation (if provided, must be > 0)
    if (formData.maxExecutionCount && formData.maxExecutionCount !== '') {
      const count = Number(formData.maxExecutionCount);
      if (isNaN(count) || count <= 0) {
        errors.maxExecutionCount = t('writeActionMemory.validation.maxExecutionCountInvalid');
      }
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
      const requestData = {
        name: formData.name || undefined,
        inputItemId: formData.inputItemId,
        outputItemId: formData.outputItemId,
        outputValue: formData.outputValueMode === 'static' ? formData.outputValue : null,
        outputValueSourceItemId: formData.outputValueMode === 'dynamic' ? formData.outputValueSourceItemId : null,
        interval: formData.interval,
        duration: formData.duration,
        maxExecutionCount: formData.maxExecutionCount && formData.maxExecutionCount !== '' 
          ? Number(formData.maxExecutionCount) 
          : null,
        isDisabled: formData.isDisabled,
      };

      if (editMode && writeActionMemory) {
        // Edit existing write action memory
        logger.log('Editing write action memory', { id: writeActionMemory.id });
        const response = await editWriteActionMemory({
          ...requestData,
          id: writeActionMemory.id,
          resetExecutionCount: formData.resetExecutionCount,
        });

        if (response.isSuccessful) {
          logger.log('Write action memory edited successfully', { id: writeActionMemory.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('writeActionMemory.errors.updateFailed'));
        }
      } else {
        // Create new write action memory
        logger.log('Creating write action memory');
        const response = await addWriteActionMemory(requestData);

        if (response.isSuccessful) {
          logger.log('Write action memory created successfully', { id: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('writeActionMemory.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save write action memory', { error: err });
      setError(editMode ? t('writeActionMemory.errors.updateFailed') : t('writeActionMemory.errors.createFailed'));
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
      maxWidth="md"
      fullWidth
      data-id-ref="write-action-memory-dialog"
    >
      <DialogTitle data-id-ref="write-action-memory-dialog-title">
        {editMode ? t('writeActionMemory.editTitle') : t('writeActionMemory.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="write-action-memory-dialog-content">
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" data-id-ref="write-action-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Basic Configuration Card */}
          <Card variant="outlined" data-id-ref="write-action-memory-basic-card">
            <CardContent>
              <Typography variant="h6" gutterBottom data-id-ref="write-action-memory-basic-title">
                {t('writeActionMemory.basicConfig')}
              </Typography>

              <Stack spacing={2}>
                {/* Name (Optional) */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    label={t('writeActionMemory.name')}
                    value={formData.name}
                    onChange={handleTextFieldChange('name')}
                    disabled={loading}
                    error={!!formErrors.name}
                    helperText={formErrors.name || t('writeActionMemory.nameHelp')}
                    data-id-ref="write-action-memory-name-input"
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('writeActionMemory.help.name')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-name-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Input Item Selection */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={items}
                    getOptionLabel={getItemLabel}
                    value={selectedInputItem}
                    onChange={handleInputItemChange}
                    disabled={loading}
                    data-id-ref="write-action-memory-input-item-select"
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('writeActionMemory.inputItem')}
                        required
                        error={!!formErrors.inputItemId}
                        helperText={formErrors.inputItemId || t('writeActionMemory.inputItemHelp')}
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
                    onClick={handleHelpOpen('writeActionMemory.help.inputItem')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-input-item-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Interval */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    label={t('writeActionMemory.interval')}
                    type="number"
                    value={formData.interval}
                    onChange={handleNumberFieldChange('interval')}
                    disabled={loading}
                    required
                    error={!!formErrors.interval}
                    helperText={formErrors.interval || t('writeActionMemory.intervalHelp')}
                    data-id-ref="write-action-memory-interval-input"
                    inputProps={{
                      min: 1,
                      step: 1,
                    }}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('writeActionMemory.help.interval')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-interval-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Write Action Configuration Card */}
          <Card variant="outlined" data-id-ref="write-action-memory-config-card">
            <CardContent>
              <Typography variant="h6" gutterBottom data-id-ref="write-action-memory-config-title">
                {t('writeActionMemory.writeActionConfig')}
              </Typography>

              <Stack spacing={2}>
                {/* Output Item Selection */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={outputItems}
                    getOptionLabel={getItemLabel}
                    value={selectedOutputItem}
                    onChange={handleOutputItemChange}
                    disabled={loading}
                    data-id-ref="write-action-memory-output-item-select"
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('writeActionMemory.outputItem')}
                        required
                        error={!!formErrors.outputItemId}
                        helperText={formErrors.outputItemId || t('writeActionMemory.outputItemHelp')}
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
                    onClick={handleHelpOpen('writeActionMemory.help.outputItem')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-output-item-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Output Value Mode Selection */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <FormControl component="fieldset" sx={{ flex: 1 }}>
                    <FormLabel component="legend" data-id-ref="write-action-memory-mode-label">
                      {t('writeActionMemory.outputValueMode')} *
                    </FormLabel>
                    <RadioGroup
                      row
                      value={formData.outputValueMode}
                      onChange={handleOutputValueModeChange}
                      data-id-ref="write-action-memory-mode-radio-group"
                    >
                      <FormControlLabel
                        value="static"
                        control={<Radio data-id-ref="write-action-memory-mode-static-radio" />}
                        label={t('writeActionMemory.staticMode')}
                        disabled={loading}
                      />
                      <FormControlLabel
                        value="dynamic"
                        control={<Radio data-id-ref="write-action-memory-mode-dynamic-radio" />}
                        label={t('writeActionMemory.dynamicMode')}
                        disabled={loading}
                      />
                    </RadioGroup>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('writeActionMemory.help.outputValueMode')}
                    sx={{ p: 0.25, mt: 2 }}
                    data-id-ref="write-action-memory-mode-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Conditional: Static Value OR Source Item */}
                {formData.outputValueMode === 'static' ? (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <TextField
                      label={t('writeActionMemory.staticValue')}
                      value={formData.outputValue}
                      onChange={handleTextFieldChange('outputValue')}
                      disabled={loading}
                      required
                      error={!!formErrors.outputValue}
                      helperText={formErrors.outputValue || t('writeActionMemory.staticValueHelp')}
                      data-id-ref="write-action-memory-static-value-input"
                      fullWidth
                    />
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('writeActionMemory.help.staticValue')}
                      sx={{ p: 0.25, mt: 1 }}
                      data-id-ref="write-action-memory-static-value-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Autocomplete
                      options={items}
                      getOptionLabel={getItemLabel}
                      value={selectedSourceItem}
                      onChange={handleSourceItemChange}
                      disabled={loading}
                      data-id-ref="write-action-memory-source-item-select"
                      sx={{ flex: 1 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('writeActionMemory.sourceItem')}
                          required
                          error={!!formErrors.outputValueSourceItemId}
                          helperText={formErrors.outputValueSourceItemId || t('writeActionMemory.sourceItemHelp')}
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
                      onClick={handleHelpOpen('writeActionMemory.help.sourceItem')}
                      sx={{ p: 0.25, mt: 1 }}
                      data-id-ref="write-action-memory-source-item-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                )}

                {/* Duration */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    label={t('writeActionMemory.duration')}
                    type="number"
                    value={formData.duration}
                    onChange={handleNumberFieldChange('duration')}
                    disabled={loading}
                    required
                    error={!!formErrors.duration}
                    helperText={formErrors.duration || t('writeActionMemory.durationHelp')}
                    data-id-ref="write-action-memory-duration-input"
                    inputProps={{
                      min: 0,
                      step: 1,
                    }}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('writeActionMemory.help.duration')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-duration-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Execution Control Card */}
          <Card variant="outlined" data-id-ref="write-action-memory-execution-card">
            <CardContent>
              <Typography variant="h6" gutterBottom data-id-ref="write-action-memory-execution-title">
                {t('writeActionMemory.executionControl')}
              </Typography>

              <Stack spacing={2}>
                {/* Max Execution Count */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    label={t('writeActionMemory.maxExecutionCount')}
                    type="number"
                    value={formData.maxExecutionCount}
                    onChange={handleTextFieldChange('maxExecutionCount')}
                    disabled={loading}
                    error={!!formErrors.maxExecutionCount}
                    helperText={formErrors.maxExecutionCount || t('writeActionMemory.maxExecutionCountHelp')}
                    data-id-ref="write-action-memory-max-execution-input"
                    inputProps={{
                      min: 1,
                      step: 1,
                    }}
                    placeholder={t('writeActionMemory.continuousExecution')}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('writeActionMemory.help.maxExecutionCount')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="write-action-memory-max-execution-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Current Execution Count (Edit Mode Only) */}
                {editMode && writeActionMemory && (
                  <Box>
                    <TextField
                      label={t('writeActionMemory.currentExecutionCount')}
                      value={writeActionMemory.currentExecutionCount}
                      disabled
                      data-id-ref="write-action-memory-current-execution-display"
                      fullWidth
                      helperText={t('writeActionMemory.currentExecutionCountHelp')}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.resetExecutionCount}
                          onChange={(e) => setFormData((prev) => ({ ...prev, resetExecutionCount: e.target.checked }))}
                          disabled={loading}
                          data-id-ref="write-action-memory-reset-count-checkbox"
                        />
                      }
                      label={t('writeActionMemory.resetExecutionCount')}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                )}

                {/* Is Disabled */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isDisabled}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isDisabled: e.target.checked }))}
                      disabled={loading}
                      data-id-ref="write-action-memory-disabled-checkbox"
                    />
                  }
                  label={t('writeActionMemory.isDisabled')}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions data-id-ref="write-action-memory-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          data-id-ref="write-action-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="write-action-memory-submit-btn"
          startIcon={loading && <CircularProgress size={20} />}
        >
          {editMode ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>

      {/* Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.name']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.name'])}
        onClose={handleHelpClose('writeActionMemory.help.name')}
        fieldKey="writeActionMemory.help.name"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.inputItem']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.inputItem'])}
        onClose={handleHelpClose('writeActionMemory.help.inputItem')}
        fieldKey="writeActionMemory.help.inputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.interval']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.interval'])}
        onClose={handleHelpClose('writeActionMemory.help.interval')}
        fieldKey="writeActionMemory.help.interval"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.outputItem']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.outputItem'])}
        onClose={handleHelpClose('writeActionMemory.help.outputItem')}
        fieldKey="writeActionMemory.help.outputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.outputValueMode']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.outputValueMode'])}
        onClose={handleHelpClose('writeActionMemory.help.outputValueMode')}
        fieldKey="writeActionMemory.help.outputValueMode"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.staticValue']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.staticValue'])}
        onClose={handleHelpClose('writeActionMemory.help.staticValue')}
        fieldKey="writeActionMemory.help.staticValue"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.sourceItem']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.sourceItem'])}
        onClose={handleHelpClose('writeActionMemory.help.sourceItem')}
        fieldKey="writeActionMemory.help.sourceItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.duration']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.duration'])}
        onClose={handleHelpClose('writeActionMemory.help.duration')}
        fieldKey="writeActionMemory.help.duration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['writeActionMemory.help.maxExecutionCount']}
        open={Boolean(helpAnchorEl['writeActionMemory.help.maxExecutionCount'])}
        onClose={handleHelpClose('writeActionMemory.help.maxExecutionCount')}
        fieldKey="writeActionMemory.help.maxExecutionCount"
      />
    </Dialog>
  );
};

export default AddEditWriteActionMemoryDialog;
