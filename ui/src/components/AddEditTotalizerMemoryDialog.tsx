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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addTotalizerMemory, editTotalizerMemory } from '../services/extendedApi';
import type { TotalizerMemoryWithItems, MonitoringItem, ItemType } from '../types/api';
import { ItemTypeEnum, AccumulationType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditTotalizerMemoryDialog');

interface AddEditTotalizerMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  totalizerMemory: TotalizerMemoryWithItems | null;
  editMode: boolean;
}

interface FormData {
  name: string;
  inputItemId: string;
  outputItemId: string;
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
  onSuccess,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemId: '',
    outputItemId: '',
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
        inputItemId: totalizerMemory.inputItemId,
        outputItemId: totalizerMemory.outputItemId,
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

  // Get selected items
  const selectedInputItem = useMemo(
    () => items.find((item) => item.id === formData.inputItemId),
    [items, formData.inputItemId]
  );

  const selectedOutputItem = useMemo(
    () => items.find((item) => item.id === formData.outputItemId),
    [items, formData.outputItemId]
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

    // If accumulation type changes, clear input item
    if (field === 'accumulationType') {
      setFormData((prev) => ({
        ...prev,
        inputItemId: '',
      }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.inputItemId) {
      errors.inputItemId = t('totalizerMemory.validation.inputItemRequired');
    }

    if (!formData.outputItemId) {
      errors.outputItemId = t('totalizerMemory.validation.outputItemRequired');
    }

    if (formData.inputItemId === formData.outputItemId) {
      errors.outputItemId = t('totalizerMemory.validation.inputOutputSame');
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
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
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
          inputItemId: formData.inputItemId,
          outputItemId: formData.outputItemId,
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
        onSuccess();
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
    onClose();
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
            title={t('totalizerMemory.sections.basic')}
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
              <TextField
                fullWidth
                label={t('totalizerMemory.name')}
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                helperText={t('totalizerMemory.nameHelp')}
                sx={{ mb: 2 }}
                data-id-ref="totalizer-memory-name-input"
              />

              <Autocomplete
                options={inputItems}
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
                    label={t('totalizerMemory.inputItem')}
                    error={!!formErrors.inputItemId}
                    helperText={formErrors.inputItemId || t('totalizerMemory.inputItemHelp')}
                    required
                  />
                )}
                sx={{ mb: 2 }}
                data-id-ref="totalizer-memory-input-item-select"
              />

              <Autocomplete
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
                    label={t('totalizerMemory.outputItem')}
                    error={!!formErrors.outputItemId}
                    helperText={formErrors.outputItemId || t('totalizerMemory.outputItemHelp')}
                    required
                  />
                )}
                sx={{ mb: 2 }}
                data-id-ref="totalizer-memory-output-item-select"
              />

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
            </CardContent>
          </Collapse>
        </Card>

        {/* Accumulation Type Section */}
        <Card sx={{ mb: 2 }} data-id-ref="totalizer-memory-accumulation-section">
          <CardHeader
            title={t('totalizerMemory.sections.accumulation')}
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
            </CardContent>
          </Collapse>
        </Card>

        {/* Reset Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="totalizer-memory-reset-section">
          <CardHeader
            title={t('totalizerMemory.sections.resetConfig')}
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
                  <TextField
                    fullWidth
                    label={t('totalizerMemory.resetCron')}
                    value={formData.resetCron}
                    onChange={(e) => handleFieldChange('resetCron', e.target.value)}
                    error={!!formErrors.resetCron}
                    helperText={formErrors.resetCron || t('totalizerMemory.resetCronHelp')}
                    placeholder="0 0 * * *"
                    sx={{ mb: 1 }}
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
            title={t('totalizerMemory.sections.advanced')}
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
    </Dialog>
  );
};

export default AddEditTotalizerMemoryDialog;
