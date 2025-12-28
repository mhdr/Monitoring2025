import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  Autocomplete,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addPIDMemory, editPIDMemory, getPotentialParentPIDs } from '../services/extendedApi';
import type { PIDMemoryWithItems, MonitoringItem, ItemType, AddPIDMemoryRequestDto, EditPIDMemoryRequestDto, PotentialParentPID } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditPIDMemoryDialog');

interface AddEditPIDMemoryDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  pidMemory: PIDMemoryWithItems | null;
  editMode: boolean;
}

interface FormData {
  name: string;
  inputItemId: string;
  outputItemId: string;
  kp: number;
  ki: number;
  kd: number;
  outputMin: number;
  outputMax: number;
  interval: number;
  isDisabled: boolean;
  // Dual-mode fields
  useSetPointItem: boolean;
  setPoint: number;
  setPointId: string;
  useIsAutoItem: boolean;
  isAuto: boolean;
  isAutoId: string;
  useManualValueItem: boolean;
  manualValue: number;
  manualValueId: string;
  useReverseOutputItem: boolean;
  reverseOutput: boolean;
  reverseOutputId: string;
  // Hysteresis Control
  useDigitalOutputItem: boolean;
  digitalOutputItemId: string;
  hysteresisHighThreshold: number;
  hysteresisLowThreshold: number;
  // Cascade Control
  useParentPID: boolean;
  parentPIDId: string;
  cascadeLevel: number;
  // Advanced
  derivativeFilterAlpha: number;
  maxOutputSlewRate: number;
  deadZone: number;
  feedForward: number;
}

interface FormErrors {
  [key: string]: string | undefined;
}

/**
 * Get ItemType color for badge
 */
const getItemTypeColor = (itemType: ItemType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return 'info';
    case ItemTypeEnum.DigitalOutput:
      return 'success';
    case ItemTypeEnum.AnalogInput:
      return 'primary';
    case ItemTypeEnum.AnalogOutput:
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
    case ItemTypeEnum.DigitalInput:
      return t('itemType.digitalInput');
    case ItemTypeEnum.DigitalOutput:
      return t('itemType.digitalOutput');
    case ItemTypeEnum.AnalogInput:
      return t('itemType.analogInput');
    case ItemTypeEnum.AnalogOutput:
      return t('itemType.analogOutput');
    default:
      return String(itemType);
  }
};

/**
 * Add/Edit PID Memory Dialog Component
 */
const AddEditPIDMemoryDialog: React.FC<AddEditPIDMemoryDialogProps> = ({ open, onClose, pidMemory, editMode }) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [tuningExpanded, setTuningExpanded] = useState(true);
  const [cascadeExpanded, setCascadeExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [hysteresisExpanded, setHysteresisExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});
  
  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: event.currentTarget }));
  };
  
  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: null }));
  };

  // Potential parent PIDs for cascade control
  const [potentialParents, setPotentialParents] = useState<PotentialParentPID[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemId: '',
    outputItemId: '',
    kp: 1.0,
    ki: 0.1,
    kd: 0.05,
    outputMin: 0.0,
    outputMax: 100.0,
    interval: 10,
    isDisabled: false,
    useSetPointItem: false,
    setPoint: 0.0,
    setPointId: '',
    useIsAutoItem: false,
    isAuto: true,
    isAutoId: '',
    useManualValueItem: false,
    manualValue: 0.0,
    manualValueId: '',
    useReverseOutputItem: false,
    reverseOutput: false,
    reverseOutputId: '',
    useDigitalOutputItem: false,
    digitalOutputItemId: '',
    hysteresisHighThreshold: 75.0,
    hysteresisLowThreshold: 25.0,
    useParentPID: false,
    parentPIDId: '',
    cascadeLevel: 0,
    derivativeFilterAlpha: 1.0,
    maxOutputSlewRate: 100.0,
    deadZone: 0.0,
    feedForward: 0.0,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form data when dialog opens or pidMemory changes
  useEffect(() => {
    if (open) {
      if (editMode && pidMemory) {
        setFormData({
          name: pidMemory.name || '',
          inputItemId: pidMemory.inputItemId,
          outputItemId: pidMemory.outputItemId,
          kp: pidMemory.kp,
          ki: pidMemory.ki,
          kd: pidMemory.kd,
          outputMin: pidMemory.outputMin,
          outputMax: pidMemory.outputMax,
          interval: pidMemory.interval,
          isDisabled: pidMemory.isDisabled,
          useSetPointItem: !!pidMemory.setPointId,
          setPoint: pidMemory.setPoint ?? 0.0,
          setPointId: pidMemory.setPointId ?? '',
          useIsAutoItem: !!pidMemory.isAutoId,
          isAuto: pidMemory.isAuto,
          isAutoId: pidMemory.isAutoId ?? '',
          useManualValueItem: !!pidMemory.manualValueId,
          manualValue: pidMemory.manualValue ?? 0.0,
          manualValueId: pidMemory.manualValueId ?? '',
          useReverseOutputItem: !!pidMemory.reverseOutputId,
          reverseOutput: pidMemory.reverseOutput,
          reverseOutputId: pidMemory.reverseOutputId ?? '',
          useDigitalOutputItem: !!pidMemory.digitalOutputItemId,
          digitalOutputItemId: pidMemory.digitalOutputItemId ?? '',
          hysteresisHighThreshold: pidMemory.hysteresisHighThreshold,
          hysteresisLowThreshold: pidMemory.hysteresisLowThreshold,
          useParentPID: !!pidMemory.parentPIDId,
          parentPIDId: pidMemory.parentPIDId ?? '',
          cascadeLevel: pidMemory.cascadeLevel ?? 0,
          derivativeFilterAlpha: pidMemory.derivativeFilterAlpha,
          maxOutputSlewRate: pidMemory.maxOutputSlewRate,
          deadZone: pidMemory.deadZone,
          feedForward: pidMemory.feedForward,
        });
      } else {
        // Reset to defaults for add mode
        setFormData({
          name: '',
          inputItemId: '',
          outputItemId: '',
          kp: 1.0,
          ki: 0.1,
          kd: 0.05,
          outputMin: 0.0,
          outputMax: 100.0,
          interval: 10,
          isDisabled: false,
          useSetPointItem: false,
          setPoint: 0.0,
          setPointId: '',
          useIsAutoItem: false,
          isAuto: true,
          isAutoId: '',
          useManualValueItem: false,
          manualValue: 0.0,
          manualValueId: '',
          useReverseOutputItem: false,
          reverseOutput: false,
          reverseOutputId: '',
          useDigitalOutputItem: false,
          digitalOutputItemId: '',
          hysteresisHighThreshold: 75.0,
          hysteresisLowThreshold: 25.0,
          useParentPID: false,
          parentPIDId: '',
          cascadeLevel: 0,
          derivativeFilterAlpha: 1.0,
          maxOutputSlewRate: 100.0,
          deadZone: 0.0,
          feedForward: 0.0,
        });
      }
      setFormErrors({});
      setSaveError(null);
    }
  }, [open, editMode, pidMemory]);

  // Fetch potential parent PIDs when cascade level changes
  useEffect(() => {
    const fetchParents = async () => {
      if (!open || formData.cascadeLevel === 0) {
        setPotentialParents([]);
        return;
      }

      setLoadingParents(true);
      try {
        const response = await getPotentialParentPIDs({
          currentPidId: editMode && pidMemory ? pidMemory.id : null,
          desiredCascadeLevel: formData.cascadeLevel,
        });
        setPotentialParents(response.potentialParents);
      } catch (error) {
        logger.error('Failed to fetch potential parent PIDs', error);
        setPotentialParents([]);
      } finally {
        setLoadingParents(false);
      }
    };

    fetchParents();
  }, [open, formData.cascadeLevel, editMode, pidMemory]);

  // Filter items by type
  const analogInputItems = useMemo(() => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput), [items]);
  const analogOutputItems = useMemo(() => items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput), [items]);
  const analogItems = useMemo(() => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput || item.itemType === ItemTypeEnum.AnalogOutput), [items]);
  const digitalItems = useMemo(() => items.filter((item) => item.itemType === ItemTypeEnum.DigitalInput || item.itemType === ItemTypeEnum.DigitalOutput), [items]);
  const digitalOutputItems = useMemo(() => items.filter((item) => item.itemType === ItemTypeEnum.DigitalOutput), [items]);

  // Get selected items
  const selectedInputItem = useMemo(() => items.find((item) => item.id === formData.inputItemId) || null, [items, formData.inputItemId]);
  const selectedOutputItem = useMemo(() => items.find((item) => item.id === formData.outputItemId) || null, [items, formData.outputItemId]);
  const selectedSetPointItem = useMemo(() => items.find((item) => item.id === formData.setPointId) || null, [items, formData.setPointId]);
  const selectedIsAutoItem = useMemo(() => items.find((item) => item.id === formData.isAutoId) || null, [items, formData.isAutoId]);
  const selectedManualValueItem = useMemo(() => items.find((item) => item.id === formData.manualValueId) || null, [items, formData.manualValueId]);
  const selectedReverseOutputItem = useMemo(() => items.find((item) => item.id === formData.reverseOutputId) || null, [items, formData.reverseOutputId]);
  const selectedDigitalOutputItem = useMemo(() => items.find((item) => item.id === formData.digitalOutputItemId) || null, [items, formData.digitalOutputItemId]);

  /**
   * Get item label for display
   */
  const getItemLabel = (item: MonitoringItem): string => {
    const name = language === 'fa' ? item.nameFa : item.name;
    return `${item.pointNumber} - ${name}`;
  };

  /**
   * Handle field changes
   */
  const handleFieldChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.inputItemId) errors.inputItemId = t('pidMemory.validation.inputItemRequired');
    if (!formData.outputItemId) errors.outputItemId = t('pidMemory.validation.outputItemRequired');
    if (formData.inputItemId === formData.outputItemId) errors.outputItemId = t('pidMemory.validation.itemsMustBeDifferent');
    if (formData.interval < 1) errors.interval = t('pidMemory.validation.intervalMin');
    if (formData.outputMin >= formData.outputMax) errors.outputMax = t('pidMemory.validation.outputMaxGreater');
    if (formData.derivativeFilterAlpha < 0 || formData.derivativeFilterAlpha > 1) errors.derivativeFilterAlpha = t('pidMemory.validation.derivativeFilterRange');
    if (formData.maxOutputSlewRate < 0) errors.maxOutputSlewRate = t('pidMemory.validation.maxOutputSlewRateMin');
    if (formData.deadZone < 0) errors.deadZone = t('pidMemory.validation.deadZoneMin');
    
    // Hysteresis validation
    if (formData.hysteresisLowThreshold >= formData.hysteresisHighThreshold) {
      errors.hysteresisLowThreshold = t('pidMemory.validation.hysteresisLowLessThanHigh');
    }
    if (formData.hysteresisLowThreshold < formData.outputMin) {
      errors.hysteresisLowThreshold = t('pidMemory.validation.hysteresisLowOutOfRange');
    }
    if (formData.hysteresisHighThreshold > formData.outputMax) {
      errors.hysteresisHighThreshold = t('pidMemory.validation.hysteresisHighOutOfRange');
    }

    // Cascade validation
    if (formData.useParentPID) {
      if (!formData.parentPIDId) {
        errors.parentPIDId = t('pidMemory.validation.parentPIDRequired');
      }
      if (!formData.useSetPointItem || !formData.setPointId) {
        errors.setPointId = t('pidMemory.validation.cascadeRequiresSetpointItem');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editMode && pidMemory) {
        const requestData: EditPIDMemoryRequestDto = {
          id: pidMemory.id,
          name: formData.name || null,
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          kp: formData.kp,
          ki: formData.ki,
          kd: formData.kd,
          outputMin: formData.outputMin,
          outputMax: formData.outputMax,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          setPoint: formData.useSetPointItem ? null : formData.setPoint,
          setPointId: formData.useSetPointItem ? (formData.setPointId || null) : null,
          derivativeFilterAlpha: formData.derivativeFilterAlpha,
          maxOutputSlewRate: formData.maxOutputSlewRate,
          deadZone: formData.deadZone,
          feedForward: formData.feedForward,
          isAuto: formData.isAuto,
          isAutoId: formData.useIsAutoItem ? (formData.isAutoId || null) : null,
          manualValue: formData.useManualValueItem ? null : formData.manualValue,
          manualValueId: formData.useManualValueItem ? (formData.manualValueId || null) : null,
          reverseOutput: formData.reverseOutput,
          reverseOutputId: formData.useReverseOutputItem ? (formData.reverseOutputId || null) : null,
          digitalOutputItemId: formData.useDigitalOutputItem ? (formData.digitalOutputItemId || null) : null,
          hysteresisHighThreshold: formData.hysteresisHighThreshold,
          hysteresisLowThreshold: formData.hysteresisLowThreshold,
          parentPIDId: formData.useParentPID ? (formData.parentPIDId || null) : null,
          cascadeLevel: formData.useParentPID ? formData.cascadeLevel : 0,
        };

        const response = await editPIDMemory(requestData);

        if (response.isSuccessful) {
          logger.info('PID memory updated successfully', { id: pidMemory.id });
          onClose(true);
        } else {
          setSaveError(response.errorMessage || t('pidMemory.errors.updateFailed'));
          logger.error('Failed to update PID memory', { error: response.errorMessage });
        }
      } else {
        const requestData: AddPIDMemoryRequestDto = {
          name: formData.name || null,
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          kp: formData.kp,
          ki: formData.ki,
          kd: formData.kd,
          outputMin: formData.outputMin,
          outputMax: formData.outputMax,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          setPoint: formData.useSetPointItem ? null : formData.setPoint,
          setPointId: formData.useSetPointItem ? (formData.setPointId || null) : null,
          derivativeFilterAlpha: formData.derivativeFilterAlpha,
          maxOutputSlewRate: formData.maxOutputSlewRate,
          deadZone: formData.deadZone,
          feedForward: formData.feedForward,
          isAuto: formData.isAuto,
          isAutoId: formData.useIsAutoItem ? (formData.isAutoId || null) : null,
          manualValue: formData.useManualValueItem ? null : formData.manualValue,
          manualValueId: formData.useManualValueItem ? (formData.manualValueId || null) : null,
          reverseOutput: formData.reverseOutput,
          reverseOutputId: formData.useReverseOutputItem ? (formData.reverseOutputId || null) : null,
          digitalOutputItemId: formData.useDigitalOutputItem ? (formData.digitalOutputItemId || null) : null,
          hysteresisHighThreshold: formData.hysteresisHighThreshold,
          hysteresisLowThreshold: formData.hysteresisLowThreshold,
          parentPIDId: formData.useParentPID ? (formData.parentPIDId || null) : null,
          cascadeLevel: formData.useParentPID ? formData.cascadeLevel : 0,
        };

        const response = await addPIDMemory(requestData);

        if (response.isSuccessful) {
          logger.info('PID memory created successfully', { id: response.id });
          onClose(true);
        } else {
          setSaveError(response.errorMessage || t('pidMemory.errors.createFailed'));
          logger.error('Failed to create PID memory', { error: response.errorMessage });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('pidMemory.errors.unknownError');
      setSaveError(errorMessage);
      logger.error('Exception during save', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose(false)} 
      maxWidth="md" 
      fullWidth
      data-id-ref="pid-memory-dialog"
    >
      <DialogTitle data-id-ref="pid-memory-dialog-title">
        {editMode ? t('pidMemory.editTitle') : t('pidMemory.addTitle')}
      </DialogTitle>

      <DialogContent dividers data-id-ref="pid-memory-dialog-content">
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="pid-memory-dialog-error">
            {saveError}
          </Alert>
        )}

        {/* Basic Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="pid-memory-basic-section">
          <CardHeader
            title={t('pidMemory.sections.basic')}
            action={
              <IconButton
                onClick={() => setBasicExpanded(!basicExpanded)}
                sx={{
                  transform: basicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="pid-memory-basic-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={basicExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label={t('pidMemory.name')}
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  disabled={isSaving}
                  helperText={t('pidMemory.nameHelp')}
                  data-id-ref="pid-memory-name-input"
                />

                <Autocomplete
                  options={analogInputItems}
                  getOptionLabel={getItemLabel}
                  value={selectedInputItem}
                  onChange={(_, newValue) => handleFieldChange('inputItemId', newValue?.id || '')}
                  disabled={isSaving}
                  data-id-ref="pid-memory-input-item-select"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('pidMemory.inputItem')}
                      required
                      error={!!formErrors.inputItemId}
                      helperText={formErrors.inputItemId || t('pidMemory.inputItemHelp')}
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

                <Autocomplete
                  options={analogOutputItems}
                  getOptionLabel={getItemLabel}
                  value={selectedOutputItem}
                  onChange={(_, newValue) => handleFieldChange('outputItemId', newValue?.id || '')}
                  disabled={isSaving}
                  data-id-ref="pid-memory-output-item-select"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('pidMemory.outputItem')}
                      required
                      error={!!formErrors.outputItemId}
                      helperText={formErrors.outputItemId || t('pidMemory.outputItemHelp')}
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

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t('pidMemory.interval')}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleHelpOpen('pidMemory.help.interval')}
                        sx={{ p: 0.25 }}
                        data-id-ref="pid-memory-interval-help-btn"
                      >
                        <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.interval}
                      onChange={(e) => handleFieldChange('interval', parseInt(e.target.value) || 1)}
                      disabled={isSaving}
                      required
                      error={!!formErrors.interval}
                      helperText={formErrors.interval || t('pidMemory.intervalHelp')}
                      inputProps={{ min: 1, step: 1 }}
                      data-id-ref="pid-memory-interval-input"
                    />
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isDisabled}
                        onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-disabled-switch"
                      />
                    }
                    label={t('pidMemory.isDisabled')}
                    data-id-ref="pid-memory-disabled-field"
                  />
                </Box>

                {/* SetPoint - Dual Mode */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.setpointConfiguration')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.setpointMode')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-setpoint-mode-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useSetPointItem}
                        onChange={(e) => handleFieldChange('useSetPointItem', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-setpoint-item-switch"
                      />
                    }
                    label={t('pidMemory.useSetPointItem')}
                    data-id-ref="pid-memory-use-setpoint-item-field"
                  />
                  {formData.useSetPointItem ? (
                    <Autocomplete
                      options={analogItems}
                      getOptionLabel={getItemLabel}
                      value={selectedSetPointItem}
                      onChange={(_, newValue) => handleFieldChange('setPointId', newValue?.id || '')}
                      disabled={isSaving}
                      data-id-ref="pid-memory-setpoint-item-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.setPointItem')}
                          helperText={t('pidMemory.setPointItemHelp')}
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
                  ) : (
                    <TextField
                      fullWidth
                      label={t('pidMemory.setPoint')}
                      type="number"
                      value={formData.setPoint}
                      onChange={(e) => handleFieldChange('setPoint', parseFloat(e.target.value) || 0)}
                      disabled={isSaving}
                      helperText={t('pidMemory.setPointHelp')}
                      inputProps={{ step: 0.1 }}
                      data-id-ref="pid-memory-setpoint-input"
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* PID Tuning Section */}
        <Card sx={{ mb: 2 }} data-id-ref="pid-memory-tuning-section">
          <CardHeader
            title={t('pidMemory.sections.tuning')}
            action={
              <IconButton
                onClick={() => setTuningExpanded(!tuningExpanded)}
                sx={{
                  transform: tuningExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="pid-memory-tuning-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={tuningExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* PID Gains with Help */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.sections.tuning')} (Kp, Ki, Kd)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.pidGains')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-pid-gains-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label={t('pidMemory.kp')}
                    type="number"
                    value={formData.kp}
                    onChange={(e) => handleFieldChange('kp', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    required
                    helperText={t('pidMemory.kpHelp')}
                    inputProps={{ step: 0.01 }}
                    data-id-ref="pid-memory-kp-input"
                  />
                  <TextField
                    fullWidth
                    label={t('pidMemory.ki')}
                    type="number"
                    value={formData.ki}
                    onChange={(e) => handleFieldChange('ki', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    required
                    helperText={t('pidMemory.kiHelp')}
                    inputProps={{ step: 0.01 }}
                    data-id-ref="pid-memory-ki-input"
                  />
                  <TextField
                    fullWidth
                    label={t('pidMemory.kd')}
                    type="number"
                    value={formData.kd}
                    onChange={(e) => handleFieldChange('kd', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    required
                    helperText={t('pidMemory.kdHelp')}
                    inputProps={{ step: 0.01 }}
                    data-id-ref="pid-memory-kd-input"
                  />
                </Box>

                {/* Output Range with Help */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.outputRange')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.outputRange')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-output-range-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label={t('pidMemory.outputMin')}
                    type="number"
                    value={formData.outputMin}
                    onChange={(e) => handleFieldChange('outputMin', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    required
                    helperText={t('pidMemory.outputMinHelp')}
                    inputProps={{ step: 0.1 }}
                    data-id-ref="pid-memory-output-min-input"
                  />
                  <TextField
                    fullWidth
                    label={t('pidMemory.outputMax')}
                    type="number"
                    value={formData.outputMax}
                    onChange={(e) => handleFieldChange('outputMax', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    required
                    error={!!formErrors.outputMax}
                    helperText={formErrors.outputMax || t('pidMemory.outputMaxHelp')}
                    inputProps={{ step: 0.1 }}
                    data-id-ref="pid-memory-output-max-input"
                  />
                </Box>

                {/* Dead Zone with Help */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <TextField
                    fullWidth
                    label={t('pidMemory.deadZone')}
                    type="number"
                    value={formData.deadZone}
                    onChange={(e) => handleFieldChange('deadZone', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    error={!!formErrors.deadZone}
                    helperText={formErrors.deadZone || t('pidMemory.deadZoneHelp')}
                    inputProps={{ min: 0, step: 0.1 }}
                    data-id-ref="pid-memory-dead-zone-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.deadZone')}
                    sx={{ p: 0.25, mt: -3 }}
                    data-id-ref="pid-memory-dead-zone-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* IsAuto - Dual Mode */}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.modeSettings')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.isAuto')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-is-auto-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useIsAutoItem}
                        onChange={(e) => handleFieldChange('useIsAutoItem', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-is-auto-item-switch"
                      />
                    }
                    label={t('pidMemory.useIsAutoItem')}
                    data-id-ref="pid-memory-use-is-auto-item-field"
                  />
                  {formData.useIsAutoItem ? (
                    <Autocomplete
                      options={digitalItems}
                      getOptionLabel={getItemLabel}
                      value={selectedIsAutoItem}
                      onChange={(_, newValue) => handleFieldChange('isAutoId', newValue?.id || '')}
                      disabled={isSaving}
                      data-id-ref="pid-memory-is-auto-item-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.isAutoItem')}
                          helperText={t('pidMemory.isAutoItemHelp')}
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
                  ) : (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isAuto}
                          onChange={(e) => handleFieldChange('isAuto', e.target.checked)}
                          disabled={isSaving}
                          data-id-ref="pid-memory-is-auto-switch"
                        />
                      }
                      label={t('pidMemory.isAuto')}
                      data-id-ref="pid-memory-is-auto-field"
                    />
                  )}
                </Box>

                {/* ManualValue - Dual Mode */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.manualModeConfiguration')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.manualMode')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-manual-mode-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useManualValueItem}
                        onChange={(e) => handleFieldChange('useManualValueItem', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-manual-value-item-switch"
                      />
                    }
                    label={t('pidMemory.useManualValueItem')}
                    data-id-ref="pid-memory-use-manual-value-item-field"
                  />
                  {formData.useManualValueItem ? (
                    <Autocomplete
                      options={analogItems}
                      getOptionLabel={getItemLabel}
                      value={selectedManualValueItem}
                      onChange={(_, newValue) => handleFieldChange('manualValueId', newValue?.id || '')}
                      disabled={isSaving}
                      data-id-ref="pid-memory-manual-value-item-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.manualValueItem')}
                          helperText={t('pidMemory.manualValueItemHelp')}
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
                  ) : (
                    <TextField
                      fullWidth
                      label={t('pidMemory.manualValue')}
                      type="number"
                      value={formData.manualValue}
                      onChange={(e) => handleFieldChange('manualValue', parseFloat(e.target.value) || 0)}
                      disabled={isSaving}
                      helperText={t('pidMemory.manualValueHelp')}
                      inputProps={{ step: 0.1 }}
                      data-id-ref="pid-memory-manual-value-input"
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Advanced Settings Section */}
        <Card data-id-ref="pid-memory-advanced-section">
          <CardHeader
            title={t('pidMemory.sections.advanced')}
            action={
              <IconButton
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                sx={{
                  transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="pid-memory-advanced-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={advancedExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Derivative Filter with Help */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    fullWidth
                    label={t('pidMemory.derivativeFilterAlpha')}
                    type="number"
                    value={formData.derivativeFilterAlpha}
                    onChange={(e) => handleFieldChange('derivativeFilterAlpha', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    error={!!formErrors.derivativeFilterAlpha}
                    helperText={formErrors.derivativeFilterAlpha || t('pidMemory.derivativeFilterAlphaHelp')}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    data-id-ref="pid-memory-derivative-filter-alpha-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.derivativeFilter')}
                    sx={{ p: 0.25, mt: -3 }}
                    data-id-ref="pid-memory-derivative-filter-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Max Output Slew Rate with Help */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    fullWidth
                    label={t('pidMemory.maxOutputSlewRate')}
                    type="number"
                    value={formData.maxOutputSlewRate}
                    onChange={(e) => handleFieldChange('maxOutputSlewRate', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    error={!!formErrors.maxOutputSlewRate}
                    helperText={formErrors.maxOutputSlewRate || t('pidMemory.maxOutputSlewRateHelp')}
                    inputProps={{ min: 0, step: 0.1 }}
                    data-id-ref="pid-memory-max-output-slew-rate-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.slewRate')}
                    sx={{ p: 0.25, mt: -3 }}
                    data-id-ref="pid-memory-slew-rate-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {t('pidMemory.feedForward')}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('pidMemory.help.feedForward')}
                      sx={{ p: 0.25 }}
                      data-id-ref="pid-memory-feed-forward-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.feedForward}
                    onChange={(e) => handleFieldChange('feedForward', parseFloat(e.target.value) || 0)}
                    disabled={isSaving}
                    helperText={t('pidMemory.feedForwardHelp')}
                    inputProps={{ step: 0.1 }}
                    data-id-ref="pid-memory-feed-forward-input"
                  />
                </Box>

                {/* ReverseOutput - Dual Mode */}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('pidMemory.reverseOutputSettings')}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.reverseOutput')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-reverse-output-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useReverseOutputItem}
                        onChange={(e) => handleFieldChange('useReverseOutputItem', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-reverse-output-item-switch"
                      />
                    }
                    label={t('pidMemory.useReverseOutputItem')}
                    data-id-ref="pid-memory-use-reverse-output-item-field"
                  />
                  {formData.useReverseOutputItem ? (
                    <Autocomplete
                      options={digitalItems}
                      getOptionLabel={getItemLabel}
                      value={selectedReverseOutputItem}
                      onChange={(_, newValue) => handleFieldChange('reverseOutputId', newValue?.id || '')}
                      disabled={isSaving}
                      data-id-ref="pid-memory-reverse-output-item-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.reverseOutputItem')}
                          helperText={t('pidMemory.reverseOutputItemHelp')}
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
                  ) : (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.reverseOutput}
                          onChange={(e) => handleFieldChange('reverseOutput', e.target.checked)}
                          disabled={isSaving}
                          data-id-ref="pid-memory-reverse-output-switch"
                        />
                      }
                      label={t('pidMemory.reverseOutput')}
                      data-id-ref="pid-memory-reverse-output-field"
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Cascade Control Section */}
        <Card data-id-ref="pid-memory-cascade-section">
          <CardHeader
            title={t('pidMemory.cascadeControl.title')}
            action={
              <IconButton
                onClick={() => setCascadeExpanded(!cascadeExpanded)}
                sx={{
                  transform: cascadeExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="pid-memory-cascade-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={cascadeExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('pidMemory.cascadeControl.info')}
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useParentPID}
                        onChange={(e) => {
                          const useParent = e.target.checked;
                          handleFieldChange('useParentPID', useParent);
                          if (!useParent) {
                            handleFieldChange('parentPIDId', '');
                            handleFieldChange('cascadeLevel', 0);
                          } else {
                            // Default to level 2 (inner PID) when enabling cascade
                            handleFieldChange('cascadeLevel', 2);
                          }
                        }}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-parent-pid-switch"
                      />
                    }
                    label={t('pidMemory.cascadeControl.useParentPID')}
                    data-id-ref="pid-memory-use-parent-pid-field"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.useParentPID')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-cascade-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {formData.useParentPID && (
                  <>
                    <TextField
                      fullWidth
                      label={t('pidMemory.cascadeControl.cascadeLevel')}
                      value={formData.cascadeLevel}
                      disabled
                      helperText={t('pidMemory.cascadeControl.cascadeLevelHelp')}
                      data-id-ref="pid-memory-cascade-level-display"
                    />

                    <Autocomplete
                      options={potentialParents}
                      getOptionLabel={(option) => option.name || option.id}
                      value={potentialParents.find((p) => p.id === formData.parentPIDId) || null}
                      onChange={(_, newValue) => handleFieldChange('parentPIDId', newValue?.id || '')}
                      disabled={isSaving || loadingParents}
                      loading={loadingParents}
                      data-id-ref="pid-memory-parent-pid-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.cascadeControl.parentPID')}
                          helperText={t('pidMemory.cascadeControl.parentPIDHelp')}
                          error={!!formErrors.parentPIDId}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingParents ? <CircularProgress color="inherit" size={20} /> : null}
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
                              label={`Level ${option.cascadeLevel}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                        </Box>
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                    />

                    {formData.parentPIDId && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {t('pidMemory.cascadeControl.setpointWarning')}
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Hysteresis Control Section */}
        <Card data-id-ref="pid-memory-hysteresis-section">
          <CardHeader
            title={t('pidMemory.sections.hysteresis')}
            action={
              <IconButton
                onClick={() => setHysteresisExpanded(!hysteresisExpanded)}
                sx={{
                  transform: hysteresisExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="pid-memory-hysteresis-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={hysteresisExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('pidMemory.hysteresisInfo')}
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useDigitalOutputItem}
                        onChange={(e) => handleFieldChange('useDigitalOutputItem', e.target.checked)}
                        disabled={isSaving}
                        data-id-ref="pid-memory-use-digital-output-switch"
                      />
                    }
                    label={t('pidMemory.useDigitalOutput')}
                    data-id-ref="pid-memory-use-digital-output-field"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('pidMemory.help.useDigitalOutput')}
                    sx={{ p: 0.25 }}
                    data-id-ref="pid-memory-hysteresis-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {formData.useDigitalOutputItem && (
                  <>
                    <Autocomplete
                      options={digitalOutputItems}
                      getOptionLabel={getItemLabel}
                      value={selectedDigitalOutputItem}
                      onChange={(_, newValue) => handleFieldChange('digitalOutputItemId', newValue?.id || '')}
                      disabled={isSaving}
                      data-id-ref="pid-memory-digital-output-item-select"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('pidMemory.digitalOutputItem')}
                          helperText={t('pidMemory.digitalOutputItemHelp')}
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

                    {/* Hysteresis Thresholds with Help */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('pidMemory.hysteresisThresholds')}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleHelpOpen('pidMemory.help.hysteresisThresholds')}
                        sx={{ p: 0.25 }}
                        data-id-ref="pid-memory-hysteresis-thresholds-help-btn"
                      >
                        <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      </IconButton>
                    </Box>

                    <TextField
                      fullWidth
                      label={t('pidMemory.hysteresisHighThreshold')}
                      type="number"
                      value={formData.hysteresisHighThreshold}
                      onChange={(e) => handleFieldChange('hysteresisHighThreshold', parseFloat(e.target.value) || 0)}
                      disabled={isSaving}
                      error={!!formErrors.hysteresisHighThreshold}
                      helperText={
                        formErrors.hysteresisHighThreshold || 
                        t('pidMemory.hysteresisHighThresholdHelp', { 
                          min: formData.outputMin, 
                          max: formData.outputMax 
                        })
                      }
                      inputProps={{ 
                        min: formData.outputMin, 
                        max: formData.outputMax,
                        step: 1 
                      }}
                      data-id-ref="pid-memory-hysteresis-high-threshold-input"
                    />

                    <TextField
                      fullWidth
                      label={t('pidMemory.hysteresisLowThreshold')}
                      type="number"
                      value={formData.hysteresisLowThreshold}
                      onChange={(e) => handleFieldChange('hysteresisLowThreshold', parseFloat(e.target.value) || 0)}
                      disabled={isSaving}
                      error={!!formErrors.hysteresisLowThreshold}
                      helperText={
                        formErrors.hysteresisLowThreshold || 
                        t('pidMemory.hysteresisLowThresholdHelp', { 
                          min: formData.outputMin, 
                          max: formData.outputMax 
                        })
                      }
                      inputProps={{ 
                        min: formData.outputMin, 
                        max: formData.outputMax,
                        step: 1 
                      }}
                      data-id-ref="pid-memory-hysteresis-low-threshold-input"
                    />
                  </>
                )}
              </Box>
            </CardContent>
          </Collapse>
        </Card>
      </DialogContent>

      <DialogActions data-id-ref="pid-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={isSaving}
          startIcon={<CloseIcon />}
          data-id-ref="pid-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          data-id-ref="pid-memory-save-btn"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>

      {/* Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.interval']}
        open={Boolean(helpAnchorEl['pidMemory.help.interval'])}
        onClose={handleHelpClose('pidMemory.help.interval')}
        fieldKey="pidMemory.help.interval"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.reverseOutput']}
        open={Boolean(helpAnchorEl['pidMemory.help.reverseOutput'])}
        onClose={handleHelpClose('pidMemory.help.reverseOutput')}
        fieldKey="pidMemory.help.reverseOutput"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.isAuto']}
        open={Boolean(helpAnchorEl['pidMemory.help.isAuto'])}
        onClose={handleHelpClose('pidMemory.help.isAuto')}
        fieldKey="pidMemory.help.isAuto"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.outputRange']}
        open={Boolean(helpAnchorEl['pidMemory.help.outputRange'])}
        onClose={handleHelpClose('pidMemory.help.outputRange')}
        fieldKey="pidMemory.help.outputRange"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.deadZone']}
        open={Boolean(helpAnchorEl['pidMemory.help.deadZone'])}
        onClose={handleHelpClose('pidMemory.help.deadZone')}
        fieldKey="pidMemory.help.deadZone"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.feedForward']}
        open={Boolean(helpAnchorEl['pidMemory.help.feedForward'])}
        onClose={handleHelpClose('pidMemory.help.feedForward')}
        fieldKey="pidMemory.help.feedForward"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.useParentPID']}
        open={Boolean(helpAnchorEl['pidMemory.help.useParentPID'])}
        onClose={handleHelpClose('pidMemory.help.useParentPID')}
        fieldKey="pidMemory.help.useParentPID"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.useDigitalOutput']}
        open={Boolean(helpAnchorEl['pidMemory.help.useDigitalOutput'])}
        onClose={handleHelpClose('pidMemory.help.useDigitalOutput')}
        fieldKey="pidMemory.help.useDigitalOutput"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.dualMode']}
        open={Boolean(helpAnchorEl['pidMemory.help.dualMode'])}
        onClose={handleHelpClose('pidMemory.help.dualMode')}
        fieldKey="pidMemory.help.dualMode"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.pidGains']}
        open={Boolean(helpAnchorEl['pidMemory.help.pidGains'])}
        onClose={handleHelpClose('pidMemory.help.pidGains')}
        fieldKey="pidMemory.help.pidGains"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.derivativeFilter']}
        open={Boolean(helpAnchorEl['pidMemory.help.derivativeFilter'])}
        onClose={handleHelpClose('pidMemory.help.derivativeFilter')}
        fieldKey="pidMemory.help.derivativeFilter"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.slewRate']}
        open={Boolean(helpAnchorEl['pidMemory.help.slewRate'])}
        onClose={handleHelpClose('pidMemory.help.slewRate')}
        fieldKey="pidMemory.help.slewRate"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.setpointMode']}
        open={Boolean(helpAnchorEl['pidMemory.help.setpointMode'])}
        onClose={handleHelpClose('pidMemory.help.setpointMode')}
        fieldKey="pidMemory.help.setpointMode"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.manualMode']}
        open={Boolean(helpAnchorEl['pidMemory.help.manualMode'])}
        onClose={handleHelpClose('pidMemory.help.manualMode')}
        fieldKey="pidMemory.help.manualMode"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['pidMemory.help.hysteresisThresholds']}
        open={Boolean(helpAnchorEl['pidMemory.help.hysteresisThresholds'])}
        onClose={handleHelpClose('pidMemory.help.hysteresisThresholds')}
        fieldKey="pidMemory.help.hysteresisThresholds"
      />
    </Dialog>
  );
};

export default AddEditPIDMemoryDialog;
