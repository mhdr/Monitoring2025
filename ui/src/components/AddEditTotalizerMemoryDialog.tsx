import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  IconButton,
  Autocomplete,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
  Memory as MemoryIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addTotalizerMemory, editTotalizerMemory, getGlobalVariables } from '../services/extendedApi';
import type { TotalizerMemoryWithItems, MonitoringItem, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, AccumulationType, TotalizerSourceType } from '../types/api';
import { createLogger } from '../utils/logger';
import CronExpressionInput from './CronExpressionInput';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditTotalizerMemoryDialog');

interface AddEditTotalizerMemoryDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  totalizerMemory: TotalizerMemoryWithItems | null;
  editMode: boolean;
}

interface FormData {
  name: string;
  inputType: number;
  inputReference: string;
  outputType: number;
  outputReference: string;
  interval: number;
  isDisabled: boolean;
  accumulationType: AccumulationType;
  resetOnOverflow: boolean;
  overflowThreshold: number | null;
  manualResetEnabled: boolean;
  scheduledResetEnabled: boolean;
  resetCron: string;
  units: string;
  decimalPlaces: number;
  // For edit mode
  accumulatedValue?: number;
  lastInputValue?: number | null;
  lastEventState?: boolean | null;
  lastResetTime?: string | null;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const AddEditTotalizerMemoryDialog: React.FC<AddEditTotalizerMemoryDialogProps> = ({
  open,
  onClose,
  totalizerMemory,
  editMode,
}) => {
  const { t } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [accumulationExpanded, setAccumulationExpanded] = useState(true);
  const [resetExpanded, setResetExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: null }));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loadingGlobalVariables, setLoadingGlobalVariables] = useState(false);

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

  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputType: TotalizerSourceType.Point,
    inputReference: '',
    outputType: TotalizerSourceType.Point,
    outputReference: '',
    interval: 10,
    isDisabled: false,
    accumulationType: AccumulationType.RateIntegration,
    resetOnOverflow: false,
    overflowThreshold: null,
    manualResetEnabled: true,
    scheduledResetEnabled: false,
    resetCron: '0 0 * * *', // Daily at midnight
    units: '',
    decimalPlaces: 2,
  });

  // Initialize form data from totalizer memory in edit mode
  useEffect(() => {
    if (editMode && totalizerMemory) {
      setFormData({
        name: totalizerMemory.name || '',
        inputType: totalizerMemory.inputType,
        inputReference: totalizerMemory.inputReference,
        outputType: totalizerMemory.outputType,
        outputReference: totalizerMemory.outputReference,
        interval: totalizerMemory.interval,
        isDisabled: totalizerMemory.isDisabled,
        accumulationType: totalizerMemory.accumulationType,
        resetOnOverflow: totalizerMemory.resetOnOverflow,
        overflowThreshold: totalizerMemory.overflowThreshold || null,
        manualResetEnabled: totalizerMemory.manualResetEnabled,
        scheduledResetEnabled: totalizerMemory.scheduledResetEnabled,
        resetCron: totalizerMemory.resetCron || '0 0 * * *',
        units: totalizerMemory.units || '',
        decimalPlaces: totalizerMemory.decimalPlaces,
        accumulatedValue: totalizerMemory.accumulatedValue,
        lastInputValue: totalizerMemory.lastInputValue,
        lastEventState: totalizerMemory.lastEventState,
        lastResetTime: totalizerMemory.lastResetTime,
      });
    }
  }, [editMode, totalizerMemory]);

  // Filter items by type
  const analogInputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput),
    [items]
  );

  const digitalInputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.DigitalInput),
    [items]
  );

  const analogOutputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

  // Get appropriate input items based on accumulation type
  const inputItems = useMemo(() => {
    if (formData.accumulationType === AccumulationType.RateIntegration) {
      return analogInputItems;
    } else {
      return digitalInputItems;
    }
  }, [formData.accumulationType, analogInputItems, digitalInputItems]);

  // Get selected items and variables
  const selectedInputItem = useMemo(() => {
    if (formData.inputType === TotalizerSourceType.Point) {
      return items.find((item) => item.id === formData.inputReference) || null;
    }
    return null;
  }, [items, formData.inputType, formData.inputReference]);

  const selectedOutputItem = useMemo(() => {
    if (formData.outputType === TotalizerSourceType.Point) {
      return analogOutputItems.find((item) => item.id === formData.outputReference) || null;
    }
    return null;
  }, [analogOutputItems, formData.outputType, formData.outputReference]);

  const selectedInputVariable = useMemo(() => {
    if (formData.inputType === TotalizerSourceType.GlobalVariable) {
      return globalVariables.find((v) => v.name === formData.inputReference) || null;
    }
    return null;
  }, [globalVariables, formData.inputType, formData.inputReference]);

  const selectedOutputVariable = useMemo(() => {
    if (formData.outputType === TotalizerSourceType.GlobalVariable) {
      return globalVariables.find((v) => v.name === formData.outputReference) || null;
    }
    return null;
  }, [globalVariables, formData.outputType, formData.outputReference]);

  // Helper to get item label
  const getItemLabel = (item: MonitoringItem): string => {
    const name = t('language') === 'fa' ? item.nameFa || item.name : item.name;
    return `${item.pointNumber} - ${name}`;
  };

  // Helper to get variable label
  const getVariableLabel = (variable: GlobalVariable): string => {
    return variable.name;
  };

  // Helper to get item type color
  const getItemTypeColor = (itemType: ItemType): 'primary' | 'secondary' | 'info' | 'success' => {
    switch (itemType) {
      case ItemTypeEnum.AnalogInput:
        return 'primary';
      case ItemTypeEnum.AnalogOutput:
        return 'secondary';
      case ItemTypeEnum.DigitalInput:
        return 'info';
      case ItemTypeEnum.DigitalOutput:
        return 'success';
      default:
        return 'primary';
    }
  };

  // Helper to get item type label
  const getItemTypeLabel = (itemType: ItemType): string => {
    switch (itemType) {
      case ItemTypeEnum.AnalogInput:
        return t('itemType.analogInput');
      case ItemTypeEnum.AnalogOutput:
        return t('itemType.analogOutput');
      case ItemTypeEnum.DigitalInput:
        return t('itemType.digitalInput');
      case ItemTypeEnum.DigitalOutput:
        return t('itemType.digitalOutput');
      default:
        return String(itemType);
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string | number | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // If accumulation type changes, clear input reference
    if (field === 'accumulationType') {
      setFormData((prev) => ({
        ...prev,
        inputReference: '',
      }));
    }
  };

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

  const handleInputItemChange = (_event: React.SyntheticEvent, value: MonitoringItem | null) => {
    setFormData((prev) => ({ ...prev, inputReference: value?.id || '' }));
    if (formErrors.inputReference) {
      setFormErrors((prev) => ({ ...prev, inputReference: undefined }));
    }
  };

  const handleOutputItemChange = (_event: React.SyntheticEvent, value: MonitoringItem | null) => {
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

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.inputReference) {
      errors.inputReference = t('totalizerMemory.validation.inputItemRequired');
    }

    if (!formData.outputReference) {
      errors.outputReference = t('totalizerMemory.validation.outputItemRequired');
    }

    // Validate Input != Output (same type and reference)
    if (formData.inputType === formData.outputType && formData.inputReference === formData.outputReference) {
      errors.outputReference = t('totalizerMemory.validation.inputOutputSame');
    }

    if (formData.interval < 1) {
      errors.interval = t('totalizerMemory.validation.intervalMin');
    }

    if (formData.resetOnOverflow) {
      if (!formData.overflowThreshold || formData.overflowThreshold <= 0) {
        errors.overflowThreshold = t('totalizerMemory.validation.overflowThresholdRequired');
      }
    }

    if (formData.scheduledResetEnabled) {
      if (!formData.resetCron) {
        errors.resetCron = t('totalizerMemory.validation.cronRequired');
      }
      // Basic cron validation (5 fields)
      else if (formData.resetCron.split(' ').length !== 5) {
        errors.resetCron = t('totalizerMemory.validation.cronInvalid');
      }
    }

    if (formData.decimalPlaces < 0 || formData.decimalPlaces > 10) {
      errors.decimalPlaces = t('totalizerMemory.validation.decimalPlacesRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setError(t('totalizerMemory.errors.validationFailed'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response: { isSuccessful: boolean; errorMessage?: string; id?: string };
      
      if (editMode && totalizerMemory) {
        const editPayload = {
          id: totalizerMemory.id,
          name: formData.name || undefined,
          inputType: formData.inputType,
          inputReference: formData.inputReference,
          outputType: formData.outputType,
          outputReference: formData.outputReference,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          accumulationType: formData.accumulationType,
          resetOnOverflow: formData.resetOnOverflow,
          overflowThreshold: formData.overflowThreshold || undefined,
          manualResetEnabled: formData.manualResetEnabled,
          scheduledResetEnabled: formData.scheduledResetEnabled,
          resetCron: formData.resetCron || undefined,
          units: formData.units || undefined,
          decimalPlaces: formData.decimalPlaces,
          accumulatedValue: formData.accumulatedValue || 0,
          lastInputValue: formData.lastInputValue ?? undefined,
          lastEventState: formData.lastEventState ?? undefined,
          lastResetTime: formData.lastResetTime ?? undefined,
        };
        response = await editTotalizerMemory(editPayload);
      } else {
        const addPayload = {
          name: formData.name || undefined,
          inputType: formData.inputType,
          inputReference: formData.inputReference,
          outputType: formData.outputType,
          outputReference: formData.outputReference,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          accumulationType: formData.accumulationType,
          resetOnOverflow: formData.resetOnOverflow,
          overflowThreshold: formData.overflowThreshold || undefined,
          manualResetEnabled: formData.manualResetEnabled,
          scheduledResetEnabled: formData.scheduledResetEnabled,
          resetCron: formData.resetCron || undefined,
          units: formData.units || undefined,
          decimalPlaces: formData.decimalPlaces,
        };
        response = await addTotalizerMemory(addPayload);
      }

      if (response.isSuccessful) {
        logger.info(`Totalizer memory ${editMode ? 'updated' : 'created'} successfully`);
        onClose(true);
      } else {
        setError(response.errorMessage || t('totalizerMemory.errors.saveFailed'));
      }
    } catch (err) {
      logger.error(`Failed to ${editMode ? 'update' : 'create'} totalizer memory`, { error: err });
      setError(t('totalizerMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && handleCancel()}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-totalizer-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-totalizer-memory-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {editMode ? t('totalizerMemory.editTitle') : t('totalizerMemory.addTitle')}
          </Typography>
          <IconButton onClick={handleCancel} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-totalizer-memory-dialog-content">
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Basic Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="totalizer-memory-basic-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('totalizerMemory.sections.basic')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.basicConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="totalizer-memory-basic-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setBasicExpanded(!basicExpanded)}
                sx={{
                  transform: basicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="totalizer-memory-basic-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={basicExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  fullWidth
                  label={t('totalizerMemory.name')}
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  helperText={t('totalizerMemory.nameHelp')}
                  sx={{ mb: 2 }}
                  data-id-ref="totalizer-memory-name-input"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.name')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="totalizer-memory-name-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              {/* Input Type Selection */}
              <Box>
                <Typography variant="subtitle2" gutterBottom data-id-ref="totalizer-memory-input-type-label">
                  {t('totalizerMemory.inputType')} *
                </Typography>
                <ToggleButtonGroup
                  value={formData.inputType}
                  exclusive
                  onChange={handleInputTypeChange}
                  fullWidth
                  disabled={loading}
                  data-id-ref="totalizer-memory-input-type-toggle"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value={TotalizerSourceType.Point} data-id-ref="totalizer-memory-input-type-point">
                    <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                    {t('totalizerMemory.sourceTypePoint')}
                  </ToggleButton>
                  <ToggleButton value={TotalizerSourceType.GlobalVariable} data-id-ref="totalizer-memory-input-type-globalvariable">
                    <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                    {t('totalizerMemory.sourceTypeGlobalVariable')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Input Source Selection */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {formData.inputType === TotalizerSourceType.Point ? (
                  <Autocomplete
                    fullWidth
                    options={inputItems}
                    value={selectedInputItem || null}
                    onChange={handleInputItemChange}
                    getOptionLabel={getItemLabel}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {getItemLabel(option)}
                          </Typography>
                          <Chip
                            label={getItemTypeLabel(option.itemType)}
                            size="small"
                            color={getItemTypeColor(option.itemType)}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('totalizerMemory.inputSource')}
                        error={!!formErrors.inputReference}
                        helperText={formErrors.inputReference || t('totalizerMemory.inputSourceHelp')}
                        required
                      />
                    )}
                    sx={{ mb: 2 }}
                    disabled={loading || loadingGlobalVariables}
                    data-id-ref="totalizer-memory-input-item-select"
                  />
                ) : (
                  <Autocomplete
                    fullWidth
                    options={globalVariables}
                    value={selectedInputVariable || null}
                    onChange={handleInputVariableChange}
                    getOptionLabel={getVariableLabel}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {getVariableLabel(option)}
                          </Typography>
                          <Chip
                            label={t('common.globalVariable')}
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('totalizerMemory.inputSource')}
                        error={!!formErrors.inputReference}
                        helperText={formErrors.inputReference || t('totalizerMemory.inputSourceGlobalVariableHelp')}
                        required
                      />
                    )}
                    sx={{ mb: 2 }}
                    disabled={loading || loadingGlobalVariables}
                    data-id-ref="totalizer-memory-input-variable-select"
                  />
                )}
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.inputSource')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="totalizer-memory-input-source-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              {/* Output Type Selection */}
              <Box>
                <Typography variant="subtitle2" gutterBottom data-id-ref="totalizer-memory-output-type-label">
                  {t('totalizerMemory.outputType')} *
                </Typography>
                <ToggleButtonGroup
                  value={formData.outputType}
                  exclusive
                  onChange={handleOutputTypeChange}
                  fullWidth
                  disabled={loading}
                  data-id-ref="totalizer-memory-output-type-toggle"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value={TotalizerSourceType.Point} data-id-ref="totalizer-memory-output-type-point">
                    <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                    {t('totalizerMemory.sourceTypePoint')}
                  </ToggleButton>
                  <ToggleButton value={TotalizerSourceType.GlobalVariable} data-id-ref="totalizer-memory-output-type-globalvariable">
                    <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                    {t('totalizerMemory.sourceTypeGlobalVariable')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Output Source Selection */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {formData.outputType === TotalizerSourceType.Point ? (
                  <Autocomplete
                    fullWidth
                    options={analogOutputItems}
                    value={selectedOutputItem || null}
                    onChange={handleOutputItemChange}
                    getOptionLabel={getItemLabel}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {getItemLabel(option)}
                          </Typography>
                          <Chip
                            label={getItemTypeLabel(option.itemType)}
                            size="small"
                            color={getItemTypeColor(option.itemType)}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('totalizerMemory.outputSource')}
                        error={!!formErrors.outputReference}
                        helperText={formErrors.outputReference || t('totalizerMemory.outputSourceHelp')}
                        required
                      />
                    )}
                    sx={{ mb: 2 }}
                    disabled={loading || loadingGlobalVariables}
                    data-id-ref="totalizer-memory-output-item-select"
                  />
                ) : (
                  <Autocomplete
                    fullWidth
                    options={globalVariables}
                    value={selectedOutputVariable || null}
                    onChange={handleOutputVariableChange}
                    getOptionLabel={getVariableLabel}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {getVariableLabel(option)}
                          </Typography>
                          <Chip
                            label={t('common.globalVariable')}
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('totalizerMemory.outputSource')}
                        error={!!formErrors.outputReference}
                        helperText={formErrors.outputReference || t('totalizerMemory.outputSourceGlobalVariableHelp')}
                        required
                      />
                    )}
                    sx={{ mb: 2 }}
                    disabled={loading || loadingGlobalVariables}
                    data-id-ref="totalizer-memory-output-variable-select"
                  />
                )}
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.outputSource')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="totalizer-memory-output-source-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('totalizerMemory.interval')}
                  value={formData.interval}
                  onChange={(e) => handleFieldChange('interval', Number(e.target.value))}
                  error={!!formErrors.interval}
                  helperText={formErrors.interval || t('totalizerMemory.intervalHelp')}
                  InputProps={{ inputProps: { min: 1 } }}
                  sx={{ mb: 2 }}
                  data-id-ref="totalizer-memory-interval-input"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.interval')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="totalizer-memory-interval-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isDisabled}
                      onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                      data-id-ref="totalizer-memory-disabled-switch"
                    />
                  }
                  label={t('totalizerMemory.isDisabled')}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.isDisabled')}
                  sx={{ p: 0.25 }}
                  data-id-ref="totalizer-memory-disabled-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Accumulation Type Section */}
        <Card sx={{ mb: 2 }} data-id-ref="totalizer-memory-accumulation-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('totalizerMemory.sections.accumulation')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.accumulationConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="totalizer-memory-accumulation-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setAccumulationExpanded(!accumulationExpanded)}
                sx={{
                  transform: accumulationExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={accumulationExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{t('totalizerMemory.accumulationType.label')}</InputLabel>
                  <Select
                    value={formData.accumulationType}
                    onChange={(e) => handleFieldChange('accumulationType', Number(e.target.value))}
                    label={t('totalizerMemory.accumulationType.label')}
                    data-id-ref="totalizer-memory-accumulation-type-select"
                  >
                    <MenuItem value={AccumulationType.RateIntegration}>
                      {t('totalizerMemory.accumulationType.rateIntegration')}
                    </MenuItem>
                    <MenuItem value={AccumulationType.EventCountRising}>
                      {t('totalizerMemory.accumulationType.eventCountRising')}
                    </MenuItem>
                    <MenuItem value={AccumulationType.EventCountFalling}>
                      {t('totalizerMemory.accumulationType.eventCountFalling')}
                    </MenuItem>
                    <MenuItem value={AccumulationType.EventCountBoth}>
                      {t('totalizerMemory.accumulationType.eventCountBoth')}
                    </MenuItem>
                  </Select>
                  <FormHelperText>{t('totalizerMemory.accumulationTypeHelp')}</FormHelperText>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.accumulationType')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="totalizer-memory-accumulation-type-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Reset Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="totalizer-memory-reset-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('totalizerMemory.sections.resetConfig')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.resetConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="totalizer-memory-reset-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setResetExpanded(!resetExpanded)}
                sx={{
                  transform: resetExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={resetExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.resetOnOverflow}
                    onChange={(e) => handleFieldChange('resetOnOverflow', e.target.checked)}
                    data-id-ref="totalizer-memory-reset-on-overflow-switch"
                  />
                }
                label={t('totalizerMemory.resetOnOverflow')}
                sx={{ mb: 2 }}
              />

              {formData.resetOnOverflow && (
                <TextField
                  fullWidth
                  type="number"
                  label={t('totalizerMemory.overflowThreshold')}
                  value={formData.overflowThreshold || ''}
                  onChange={(e) => handleFieldChange('overflowThreshold', Number(e.target.value) || null)}
                  error={!!formErrors.overflowThreshold}
                  helperText={formErrors.overflowThreshold || t('totalizerMemory.overflowThresholdHelp')}
                  InputProps={{ inputProps: { min: 0, step: 'any' } }}
                  sx={{ mb: 2 }}
                  data-id-ref="totalizer-memory-overflow-threshold-input"
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.manualResetEnabled}
                    onChange={(e) => handleFieldChange('manualResetEnabled', e.target.checked)}
                    data-id-ref="totalizer-memory-manual-reset-switch"
                  />
                }
                label={t('totalizerMemory.manualResetEnabled')}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.scheduledResetEnabled}
                    onChange={(e) => handleFieldChange('scheduledResetEnabled', e.target.checked)}
                    data-id-ref="totalizer-memory-scheduled-reset-switch"
                  />
                }
                label={t('totalizerMemory.scheduledResetEnabled')}
                sx={{ mb: 2 }}
              />

              {formData.scheduledResetEnabled && (
                <>
                  <CronExpressionInput
                    value={formData.resetCron}
                    onChange={(value) => handleFieldChange('resetCron', value)}
                    error={!!formErrors.resetCron}
                    helperText={formErrors.resetCron || t('totalizerMemory.resetCronHelp')}
                    label={t('totalizerMemory.resetCron')}
                    placeholder="0 0 * * *"
                    data-id-ref="totalizer-memory-reset-cron-input"
                  />
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      {t('totalizerMemory.cronExamples')}
                      <br />
                      • 0 0 * * * - {t('totalizerMemory.cronExamples.daily')}
                      <br />
                      • 0 * * * * - {t('totalizerMemory.cronExamples.hourly')}
                      <br />
                      • 0 0 1 * * - {t('totalizerMemory.cronExamples.monthly')}
                    </Typography>
                  </Alert>
                </>
              )}
            </CardContent>
          </Collapse>
        </Card>

        {/* Advanced Settings Section */}
        <Card data-id-ref="totalizer-memory-advanced-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('totalizerMemory.sections.advanced')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('totalizerMemory.help.advancedSettings')}
                  sx={{ p: 0.25 }}
                  data-id-ref="totalizer-memory-advanced-settings-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                sx={{
                  transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={advancedExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <TextField
                fullWidth
                label={t('totalizerMemory.units')}
                value={formData.units}
                onChange={(e) => handleFieldChange('units', e.target.value)}
                helperText={t('totalizerMemory.unitsHelp')}
                placeholder="kWh, m³, hours, count"
                sx={{ mb: 2 }}
                data-id-ref="totalizer-memory-units-input"
              />

              <TextField
                fullWidth
                type="number"
                label={t('totalizerMemory.decimalPlaces')}
                value={formData.decimalPlaces}
                onChange={(e) => handleFieldChange('decimalPlaces', Number(e.target.value))}
                error={!!formErrors.decimalPlaces}
                helperText={formErrors.decimalPlaces || t('totalizerMemory.decimalPlacesHelp')}
                InputProps={{ inputProps: { min: 0, max: 10 } }}
                data-id-ref="totalizer-memory-decimal-places-input"
              />

              {editMode && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      {t('totalizerMemory.currentAccumulated')}: {formData.accumulatedValue?.toFixed(formData.decimalPlaces)} {formData.units}
                    </Typography>
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Collapse>
        </Card>
      </DialogContent>

      <DialogActions data-id-ref="add-edit-totalizer-memory-dialog-actions">
        <Button onClick={handleCancel} disabled={loading} data-id-ref="totalizer-memory-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          data-id-ref="totalizer-memory-save-btn"
        >
          {loading ? t('common.loading') : editMode ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>

      {/* Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.basicConfiguration']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.basicConfiguration'])}
        onClose={handleHelpClose('totalizerMemory.help.basicConfiguration')}
        fieldKey="totalizerMemory.help.basicConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.name']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.name'])}
        onClose={handleHelpClose('totalizerMemory.help.name')}
        fieldKey="totalizerMemory.help.name"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.inputItem']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.inputItem'])}
        onClose={handleHelpClose('totalizerMemory.help.inputItem')}
        fieldKey="totalizerMemory.help.inputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.outputItem']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.outputItem'])}
        onClose={handleHelpClose('totalizerMemory.help.outputItem')}
        fieldKey="totalizerMemory.help.outputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.interval']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.interval'])}
        onClose={handleHelpClose('totalizerMemory.help.interval')}
        fieldKey="totalizerMemory.help.interval"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.isDisabled']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.isDisabled'])}
        onClose={handleHelpClose('totalizerMemory.help.isDisabled')}
        fieldKey="totalizerMemory.help.isDisabled"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.accumulationConfiguration']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.accumulationConfiguration'])}
        onClose={handleHelpClose('totalizerMemory.help.accumulationConfiguration')}
        fieldKey="totalizerMemory.help.accumulationConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.accumulationType']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.accumulationType'])}
        onClose={handleHelpClose('totalizerMemory.help.accumulationType')}
        fieldKey="totalizerMemory.help.accumulationType"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.resetConfiguration']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.resetConfiguration'])}
        onClose={handleHelpClose('totalizerMemory.help.resetConfiguration')}
        fieldKey="totalizerMemory.help.resetConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['totalizerMemory.help.advancedSettings']}
        open={Boolean(helpAnchorEl['totalizerMemory.help.advancedSettings'])}
        onClose={handleHelpClose('totalizerMemory.help.advancedSettings')}
        fieldKey="totalizerMemory.help.advancedSettings"
      />
    </Dialog>
  );
};

export default AddEditTotalizerMemoryDialog;
