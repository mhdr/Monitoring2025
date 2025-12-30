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
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addRateOfChangeMemory, editRateOfChangeMemory } from '../services/extendedApi';
import type { RateOfChangeMemoryWithItems, MonitoringItem, ItemType } from '../types/api';
import { ItemTypeEnum, RateCalculationMethod, RateTimeUnit } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditRateOfChangeMemoryDialog');

interface AddEditRateOfChangeMemoryDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  rateOfChangeMemory: RateOfChangeMemoryWithItems | null;
  editMode: boolean;
}

interface FormData {
  name: string;
  inputItemId: string;
  outputItemId: string;
  alarmOutputItemId: string;
  interval: number;
  isDisabled: boolean;
  calculationMethod: RateCalculationMethod;
  timeWindowSeconds: number;
  smoothingFilterAlpha: number;
  highRateThreshold: number | null;
  lowRateThreshold: number | null;
  highRateHysteresis: number;
  lowRateHysteresis: number;
  baselineSampleCount: number;
  timeUnit: RateTimeUnit;
  rateUnitDisplay: string;
  decimalPlaces: number;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const AddEditRateOfChangeMemoryDialog: React.FC<AddEditRateOfChangeMemoryDialogProps> = ({
  open,
  onClose,
  rateOfChangeMemory,
  editMode,
}) => {
  const { t } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [calculationExpanded, setCalculationExpanded] = useState(true);
  const [baselineExpanded, setBaselineExpanded] = useState(false);
  const [unitsExpanded, setUnitsExpanded] = useState(false);
  const [alarmsExpanded, setAlarmsExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemId: '',
    outputItemId: '',
    alarmOutputItemId: '',
    interval: 10,
    isDisabled: false,
    calculationMethod: RateCalculationMethod.SimpleDifference,
    timeWindowSeconds: 60,
    smoothingFilterAlpha: 0.3,
    highRateThreshold: null,
    lowRateThreshold: null,
    highRateHysteresis: 0.9,
    lowRateHysteresis: 0.9,
    baselineSampleCount: 5,
    timeUnit: RateTimeUnit.PerMinute,
    rateUnitDisplay: '',
    decimalPlaces: 2,
  });

  // Initialize form data from rate of change memory in edit mode
  useEffect(() => {
    if (editMode && rateOfChangeMemory) {
      setFormData({
        name: rateOfChangeMemory.name || '',
        inputItemId: rateOfChangeMemory.inputItemId,
        outputItemId: rateOfChangeMemory.outputItemId,
        alarmOutputItemId: rateOfChangeMemory.alarmOutputItemId || '',
        interval: rateOfChangeMemory.interval,
        isDisabled: rateOfChangeMemory.isDisabled,
        calculationMethod: rateOfChangeMemory.calculationMethod,
        timeWindowSeconds: rateOfChangeMemory.timeWindowSeconds,
        smoothingFilterAlpha: rateOfChangeMemory.smoothingFilterAlpha,
        highRateThreshold: rateOfChangeMemory.highRateThreshold ?? null,
        lowRateThreshold: rateOfChangeMemory.lowRateThreshold ?? null,
        highRateHysteresis: rateOfChangeMemory.highRateHysteresis,
        lowRateHysteresis: rateOfChangeMemory.lowRateHysteresis,
        baselineSampleCount: rateOfChangeMemory.baselineSampleCount,
        timeUnit: rateOfChangeMemory.timeUnit,
        rateUnitDisplay: rateOfChangeMemory.rateUnitDisplay || '',
        decimalPlaces: rateOfChangeMemory.decimalPlaces,
      });
    }
  }, [editMode, rateOfChangeMemory]);

  // Filter items by type
  const analogInputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput),
    [items]
  );

  const analogOutputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

  const digitalOutputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.DigitalOutput),
    [items]
  );

  // Get selected items
  const selectedInputItem = useMemo(
    () => items.find((item) => item.id === formData.inputItemId),
    [items, formData.inputItemId]
  );

  const selectedOutputItem = useMemo(
    () => items.find((item) => item.id === formData.outputItemId),
    [items, formData.outputItemId]
  );

  const selectedAlarmOutputItem = useMemo(
    () => items.find((item) => item.id === formData.alarmOutputItemId),
    [items, formData.alarmOutputItemId]
  );

  // Helper to get item label
  const getItemLabel = (item: MonitoringItem): string => {
    const name = t('language') === 'fa' ? item.nameFa || item.name : item.name;
    return `${item.pointNumber} - ${name}`;
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
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.inputItemId) {
      errors.inputItemId = t('rateOfChangeMemory.validation.inputItemRequired');
    }

    if (!formData.outputItemId) {
      errors.outputItemId = t('rateOfChangeMemory.validation.outputItemRequired');
    }

    if (formData.inputItemId === formData.outputItemId) {
      errors.outputItemId = t('rateOfChangeMemory.validation.inputOutputSame');
    }

    if (formData.interval < 1) {
      errors.interval = t('rateOfChangeMemory.validation.intervalMin');
    }

    if (formData.timeWindowSeconds < formData.interval) {
      errors.timeWindowSeconds = t('rateOfChangeMemory.validation.timeWindowMin');
    }

    // Linear regression needs minimum 5 samples
    if (formData.calculationMethod === RateCalculationMethod.LinearRegression) {
      const samplesInWindow = Math.floor(formData.timeWindowSeconds / formData.interval);
      if (samplesInWindow < 5) {
        errors.timeWindowSeconds = t('rateOfChangeMemory.validation.linearRegressionMinSamples');
      }
    }

    if (formData.smoothingFilterAlpha < 0 || formData.smoothingFilterAlpha > 1) {
      errors.smoothingFilterAlpha = t('rateOfChangeMemory.validation.smoothingAlphaRange');
    }

    if (formData.baselineSampleCount < 0) {
      errors.baselineSampleCount = t('rateOfChangeMemory.validation.baselineCountMin');
    }

    if (formData.highRateHysteresis < 0 || formData.highRateHysteresis > 1) {
      errors.highRateHysteresis = t('rateOfChangeMemory.validation.hysteresisRange');
    }

    if (formData.lowRateHysteresis < 0 || formData.lowRateHysteresis > 1) {
      errors.lowRateHysteresis = t('rateOfChangeMemory.validation.hysteresisRange');
    }

    if (formData.decimalPlaces < 0 || formData.decimalPlaces > 10) {
      errors.decimalPlaces = t('rateOfChangeMemory.validation.decimalPlacesRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setError(t('rateOfChangeMemory.errors.validationFailed'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editMode && rateOfChangeMemory) {
        const editPayload = {
          id: rateOfChangeMemory.id,
          name: formData.name || undefined,
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          alarmOutputItemId: formData.alarmOutputItemId || undefined,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          calculationMethod: formData.calculationMethod,
          timeWindowSeconds: formData.timeWindowSeconds,
          smoothingFilterAlpha: formData.smoothingFilterAlpha,
          highRateThreshold: formData.highRateThreshold ?? undefined,
          lowRateThreshold: formData.lowRateThreshold ?? undefined,
          highRateHysteresis: formData.highRateHysteresis,
          lowRateHysteresis: formData.lowRateHysteresis,
          baselineSampleCount: formData.baselineSampleCount,
          timeUnit: formData.timeUnit,
          rateUnitDisplay: formData.rateUnitDisplay || undefined,
          decimalPlaces: formData.decimalPlaces,
        };
        const response = await editRateOfChangeMemory(editPayload);
        if (response.isSuccessful) {
          logger.info('Rate of change memory updated successfully');
          onClose(true);
        } else {
          setError(response.errorMessage || t('rateOfChangeMemory.errors.saveFailed'));
        }
      } else {
        const addPayload = {
          name: formData.name || undefined,
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
          alarmOutputItemId: formData.alarmOutputItemId || undefined,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          calculationMethod: formData.calculationMethod,
          timeWindowSeconds: formData.timeWindowSeconds,
          smoothingFilterAlpha: formData.smoothingFilterAlpha,
          highRateThreshold: formData.highRateThreshold ?? undefined,
          lowRateThreshold: formData.lowRateThreshold ?? undefined,
          highRateHysteresis: formData.highRateHysteresis,
          lowRateHysteresis: formData.lowRateHysteresis,
          baselineSampleCount: formData.baselineSampleCount,
          timeUnit: formData.timeUnit,
          rateUnitDisplay: formData.rateUnitDisplay || undefined,
          decimalPlaces: formData.decimalPlaces,
        };
        const response = await addRateOfChangeMemory(addPayload);
        if (response.isSuccessful) {
          logger.info('Rate of change memory created successfully');
          onClose(true);
        } else {
          setError(response.errorMessage || t('rateOfChangeMemory.errors.saveFailed'));
        }
      }
    } catch (err) {
      logger.error(`Failed to ${editMode ? 'update' : 'create'} rate of change memory`, { error: err });
      setError(t('rateOfChangeMemory.errors.saveFailed'));
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
      data-id-ref="add-edit-rateofchange-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-rateofchange-memory-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {editMode ? t('rateOfChangeMemory.editTitle') : t('rateOfChangeMemory.addTitle')}
          </Typography>
          <IconButton onClick={handleCancel} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-rateofchange-memory-dialog-content">
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Basic Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="rateofchange-memory-basic-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('rateOfChangeMemory.sections.basic')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.basicConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="rateofchange-memory-basic-config-help-btn"
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
                data-id-ref="rateofchange-memory-basic-expand-btn"
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
                  label={t('rateOfChangeMemory.name')}
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  helperText={t('rateOfChangeMemory.nameHelp')}
                  sx={{ mb: 2 }}
                  data-id-ref="rateofchange-memory-name-input"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.name')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-name-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Autocomplete
                  fullWidth
                  options={analogInputItems}
                  value={selectedInputItem || null}
                  onChange={(_, newValue) => handleFieldChange('inputItemId', newValue?.id || '')}
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
                      label={t('rateOfChangeMemory.inputItem')}
                      error={!!formErrors.inputItemId}
                      helperText={formErrors.inputItemId || t('rateOfChangeMemory.inputItemHelp')}
                      required
                    />
                  )}
                  sx={{ mb: 2 }}
                  data-id-ref="rateofchange-memory-input-item-select"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.inputItem')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-input-item-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Autocomplete
                  fullWidth
                  options={analogOutputItems}
                  value={selectedOutputItem || null}
                  onChange={(_, newValue) => handleFieldChange('outputItemId', newValue?.id || '')}
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
                      label={t('rateOfChangeMemory.outputItem')}
                      error={!!formErrors.outputItemId}
                      helperText={formErrors.outputItemId || t('rateOfChangeMemory.outputItemHelp')}
                      required
                    />
                  )}
                  sx={{ mb: 2 }}
                  data-id-ref="rateofchange-memory-output-item-select"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.outputItem')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-output-item-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={t('rateOfChangeMemory.interval')}
                      value={formData.interval}
                      onChange={(e) => handleFieldChange('interval', Number(e.target.value))}
                      error={!!formErrors.interval}
                      helperText={formErrors.interval || t('rateOfChangeMemory.intervalHelp')}
                      InputProps={{ inputProps: { min: 1 } }}
                      data-id-ref="rateofchange-memory-interval-input"
                    />
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('rateOfChangeMemory.help.interval')}
                      sx={{ p: 0.25, mt: -3 }}
                      data-id-ref="rateofchange-memory-interval-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isDisabled}
                        onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                        data-id-ref="rateofchange-memory-disabled-switch"
                      />
                    }
                    label={t('rateOfChangeMemory.isDisabled')}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Collapse>
        </Card>

        {/* Calculation Method Section */}
        <Card sx={{ mb: 2 }} data-id-ref="rateofchange-memory-calculation-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('rateOfChangeMemory.sections.calculation')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.calculationConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="rateofchange-memory-calculation-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setCalculationExpanded(!calculationExpanded)}
                sx={{
                  transform: calculationExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={calculationExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{t('rateOfChangeMemory.calculationMethod.label')}</InputLabel>
                  <Select
                    value={formData.calculationMethod}
                    onChange={(e) => handleFieldChange('calculationMethod', Number(e.target.value))}
                    label={t('rateOfChangeMemory.calculationMethod.label')}
                    data-id-ref="rateofchange-memory-calculation-method-select"
                  >
                    <MenuItem value={RateCalculationMethod.SimpleDifference}>
                      {t('rateOfChangeMemory.calculationMethod.simpleDifference')}
                    </MenuItem>
                    <MenuItem value={RateCalculationMethod.MovingAverage}>
                      {t('rateOfChangeMemory.calculationMethod.movingAverage')}
                    </MenuItem>
                    <MenuItem value={RateCalculationMethod.WeightedAverage}>
                      {t('rateOfChangeMemory.calculationMethod.weightedAverage')}
                    </MenuItem>
                    <MenuItem value={RateCalculationMethod.LinearRegression}>
                      {t('rateOfChangeMemory.calculationMethod.linearRegression')}
                    </MenuItem>
                  </Select>
                  <FormHelperText>{t('rateOfChangeMemory.calculationMethodHelp')}</FormHelperText>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.calculationMethod')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-calculation-method-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={t('rateOfChangeMemory.timeWindow')}
                      value={formData.timeWindowSeconds}
                      onChange={(e) => handleFieldChange('timeWindowSeconds', Number(e.target.value))}
                      error={!!formErrors.timeWindowSeconds}
                      helperText={formErrors.timeWindowSeconds || t('rateOfChangeMemory.timeWindowHelp')}
                      InputProps={{ inputProps: { min: 1 } }}
                      data-id-ref="rateofchange-memory-time-window-input"
                    />
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('rateOfChangeMemory.help.timeWindow')}
                      sx={{ p: 0.25, mt: -3 }}
                      data-id-ref="rateofchange-memory-time-window-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={t('rateOfChangeMemory.smoothingAlpha')}
                      value={formData.smoothingFilterAlpha}
                      onChange={(e) => handleFieldChange('smoothingFilterAlpha', Number(e.target.value))}
                      error={!!formErrors.smoothingFilterAlpha}
                      helperText={formErrors.smoothingFilterAlpha || t('rateOfChangeMemory.smoothingAlphaHelp')}
                      InputProps={{ inputProps: { min: 0, max: 1, step: 0.05 } }}
                      data-id-ref="rateofchange-memory-smoothing-alpha-input"
                    />
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('rateOfChangeMemory.help.smoothingAlpha')}
                      sx={{ p: 0.25, mt: -3 }}
                      data-id-ref="rateofchange-memory-smoothing-alpha-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>

              {/* Show info message for Linear Regression */}
              {formData.calculationMethod === RateCalculationMethod.LinearRegression && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('rateOfChangeMemory.linearRegressionInfo', {
                    minSamples: 5,
                    currentSamples: Math.floor(formData.timeWindowSeconds / formData.interval),
                  })}
                </Alert>
              )}
            </CardContent>
          </Collapse>
        </Card>

        {/* Baseline Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="rateofchange-memory-baseline-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('rateOfChangeMemory.sections.baseline')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.baselineConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="rateofchange-memory-baseline-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setBaselineExpanded(!baselineExpanded)}
                sx={{
                  transform: baselineExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={baselineExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('rateOfChangeMemory.baselineSampleCount')}
                  value={formData.baselineSampleCount}
                  onChange={(e) => handleFieldChange('baselineSampleCount', Number(e.target.value))}
                  error={!!formErrors.baselineSampleCount}
                  helperText={formErrors.baselineSampleCount || t('rateOfChangeMemory.baselineSampleCountHelp')}
                  InputProps={{ inputProps: { min: 0 } }}
                  data-id-ref="rateofchange-memory-baseline-sample-count-input"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.baselineSampleCount')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-baseline-sample-count-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                {t('rateOfChangeMemory.baselineInfo')}
              </Alert>
            </CardContent>
          </Collapse>
        </Card>

        {/* Unit Conversion Section */}
        <Card sx={{ mb: 2 }} data-id-ref="rateofchange-memory-units-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('rateOfChangeMemory.sections.units')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.unitsConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="rateofchange-memory-units-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setUnitsExpanded(!unitsExpanded)}
                sx={{
                  transform: unitsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={unitsExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('rateOfChangeMemory.timeUnit.label')}</InputLabel>
                    <Select
                      value={formData.timeUnit}
                      onChange={(e) => handleFieldChange('timeUnit', Number(e.target.value))}
                      label={t('rateOfChangeMemory.timeUnit.label')}
                      data-id-ref="rateofchange-memory-time-unit-select"
                    >
                      <MenuItem value={RateTimeUnit.PerSecond}>
                        {t('rateOfChangeMemory.timeUnit.perSecond')}
                      </MenuItem>
                      <MenuItem value={RateTimeUnit.PerMinute}>
                        {t('rateOfChangeMemory.timeUnit.perMinute')}
                      </MenuItem>
                      <MenuItem value={RateTimeUnit.PerHour}>
                        {t('rateOfChangeMemory.timeUnit.perHour')}
                      </MenuItem>
                    </Select>
                    <FormHelperText>{t('rateOfChangeMemory.timeUnitHelp')}</FormHelperText>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={t('rateOfChangeMemory.rateUnitDisplay')}
                    value={formData.rateUnitDisplay}
                    onChange={(e) => handleFieldChange('rateUnitDisplay', e.target.value)}
                    helperText={t('rateOfChangeMemory.rateUnitDisplayHelp')}
                    placeholder="°C/min, m³/h, kPa/s"
                    data-id-ref="rateofchange-memory-rate-unit-display-input"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('rateOfChangeMemory.decimalPlaces')}
                  value={formData.decimalPlaces}
                  onChange={(e) => handleFieldChange('decimalPlaces', Number(e.target.value))}
                  error={!!formErrors.decimalPlaces}
                  helperText={formErrors.decimalPlaces || t('rateOfChangeMemory.decimalPlacesHelp')}
                  InputProps={{ inputProps: { min: 0, max: 10 } }}
                  data-id-ref="rateofchange-memory-decimal-places-input"
                />
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Alarm Configuration Section */}
        <Card data-id-ref="rateofchange-memory-alarms-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('rateOfChangeMemory.sections.alarms')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.alarmConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="rateofchange-memory-alarm-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setAlarmsExpanded(!alarmsExpanded)}
                sx={{
                  transform: alarmsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={alarmsExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Autocomplete
                  fullWidth
                  options={digitalOutputItems}
                  value={selectedAlarmOutputItem || null}
                  onChange={(_, newValue) => handleFieldChange('alarmOutputItemId', newValue?.id || '')}
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
                      label={t('rateOfChangeMemory.alarmOutputItem')}
                      helperText={t('rateOfChangeMemory.alarmOutputItemHelp')}
                    />
                  )}
                  sx={{ mb: 2 }}
                  data-id-ref="rateofchange-memory-alarm-output-item-select"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('rateOfChangeMemory.help.alarmOutputItem')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="rateofchange-memory-alarm-output-item-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
                {t('rateOfChangeMemory.highRateAlarm')}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('rateOfChangeMemory.highRateThreshold')}
                    value={formData.highRateThreshold ?? ''}
                    onChange={(e) => handleFieldChange('highRateThreshold', e.target.value ? Number(e.target.value) : null)}
                    helperText={t('rateOfChangeMemory.highRateThresholdHelp')}
                    InputProps={{ inputProps: { step: 'any' } }}
                    data-id-ref="rateofchange-memory-high-rate-threshold-input"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('rateOfChangeMemory.highRateHysteresis')}
                    value={formData.highRateHysteresis}
                    onChange={(e) => handleFieldChange('highRateHysteresis', Number(e.target.value))}
                    error={!!formErrors.highRateHysteresis}
                    helperText={formErrors.highRateHysteresis || t('rateOfChangeMemory.hysteresisHelp')}
                    InputProps={{ inputProps: { min: 0, max: 1, step: 0.05 } }}
                    data-id-ref="rateofchange-memory-high-rate-hysteresis-input"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('rateOfChangeMemory.lowRateAlarm')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('rateOfChangeMemory.lowRateThreshold')}
                    value={formData.lowRateThreshold ?? ''}
                    onChange={(e) => handleFieldChange('lowRateThreshold', e.target.value ? Number(e.target.value) : null)}
                    helperText={t('rateOfChangeMemory.lowRateThresholdHelp')}
                    InputProps={{ inputProps: { step: 'any' } }}
                    data-id-ref="rateofchange-memory-low-rate-threshold-input"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('rateOfChangeMemory.lowRateHysteresis')}
                    value={formData.lowRateHysteresis}
                    onChange={(e) => handleFieldChange('lowRateHysteresis', Number(e.target.value))}
                    error={!!formErrors.lowRateHysteresis}
                    helperText={formErrors.lowRateHysteresis || t('rateOfChangeMemory.hysteresisHelp')}
                    InputProps={{ inputProps: { min: 0, max: 1, step: 0.05 } }}
                    data-id-ref="rateofchange-memory-low-rate-hysteresis-input"
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                {t('rateOfChangeMemory.hysteresisInfo')}
              </Alert>
            </CardContent>
          </Collapse>
        </Card>

        {/* Current Rate Display (Edit Mode Only) */}
        {editMode && rateOfChangeMemory && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                {t('rateOfChangeMemory.currentRate')}: {rateOfChangeMemory.lastSmoothedRate?.toFixed(formData.decimalPlaces) ?? '—'} {formData.rateUnitDisplay}
              </Typography>
              <Typography variant="body2">
                {t('rateOfChangeMemory.baselineProgress')}: {rateOfChangeMemory.accumulatedSamples}/{formData.baselineSampleCount}
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions data-id-ref="add-edit-rateofchange-memory-dialog-actions">
        <Button onClick={handleCancel} disabled={loading} data-id-ref="rateofchange-memory-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          data-id-ref="rateofchange-memory-save-btn"
        >
          {loading ? t('common.loading') : editMode ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>

      {/* Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.basicConfiguration']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.basicConfiguration'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.basicConfiguration')}
        fieldKey="rateOfChangeMemory.help.basicConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.name']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.name'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.name')}
        fieldKey="rateOfChangeMemory.help.name"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.inputItem']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.inputItem'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.inputItem')}
        fieldKey="rateOfChangeMemory.help.inputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.outputItem']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.outputItem'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.outputItem')}
        fieldKey="rateOfChangeMemory.help.outputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.interval']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.interval'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.interval')}
        fieldKey="rateOfChangeMemory.help.interval"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.calculationConfiguration']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.calculationConfiguration'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.calculationConfiguration')}
        fieldKey="rateOfChangeMemory.help.calculationConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.calculationMethod']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.calculationMethod'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.calculationMethod')}
        fieldKey="rateOfChangeMemory.help.calculationMethod"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.timeWindow']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.timeWindow'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.timeWindow')}
        fieldKey="rateOfChangeMemory.help.timeWindow"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.smoothingAlpha']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.smoothingAlpha'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.smoothingAlpha')}
        fieldKey="rateOfChangeMemory.help.smoothingAlpha"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.baselineConfiguration']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.baselineConfiguration'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.baselineConfiguration')}
        fieldKey="rateOfChangeMemory.help.baselineConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.baselineSampleCount']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.baselineSampleCount'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.baselineSampleCount')}
        fieldKey="rateOfChangeMemory.help.baselineSampleCount"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.unitsConfiguration']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.unitsConfiguration'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.unitsConfiguration')}
        fieldKey="rateOfChangeMemory.help.unitsConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.alarmConfiguration']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.alarmConfiguration'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.alarmConfiguration')}
        fieldKey="rateOfChangeMemory.help.alarmConfiguration"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['rateOfChangeMemory.help.alarmOutputItem']}
        open={Boolean(helpAnchorEl['rateOfChangeMemory.help.alarmOutputItem'])}
        onClose={handleHelpClose('rateOfChangeMemory.help.alarmOutputItem')}
        fieldKey="rateOfChangeMemory.help.alarmOutputItem"
      />
    </Dialog>
  );
};

export default AddEditRateOfChangeMemoryDialog;
