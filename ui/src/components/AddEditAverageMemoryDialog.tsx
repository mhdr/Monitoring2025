import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Alert,
  Box,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addAverageMemory, editAverageMemory } from '../services/extendedApi';
import type { AverageMemory, MonitoringItem, OutlierMethod, ItemType } from '../types/api';
import { ItemTypeEnum } from '../types/api';

interface AddEditAverageMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  averageMemory: AverageMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  name: string;
  inputItemIds: string[];
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  weights: number[];
  ignoreStale: boolean;
  staleTimeout: number;
  enableOutlierDetection: boolean;
  outlierMethod: OutlierMethod;
  outlierThreshold: number;
  minimumInputs: number;
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

const AddEditAverageMemoryDialog: React.FC<AddEditAverageMemoryDialogProps> = ({
  open,
  editMode,
  averageMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemIds: [],
    outputItemId: '',
    interval: 10,
    isDisabled: false,
    weights: [],
    ignoreStale: true,
    staleTimeout: 60,
    enableOutlierDetection: false,
    outlierMethod: 1, // IQR
    outlierThreshold: 1.5,
    minimumInputs: 1,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWeights, setUseWeights] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (editMode && averageMemory) {
        let inputIds: string[] = [];
        try {
          inputIds = JSON.parse(averageMemory.inputItemIds);
        } catch {
          inputIds = [];
        }

        let weights: number[] = [];
        if (averageMemory.weights) {
          try {
            weights = JSON.parse(averageMemory.weights);
            setUseWeights(true);
          } catch {
            weights = [];
            setUseWeights(false);
          }
        } else {
          setUseWeights(false);
        }

        setFormData({
          name: averageMemory.name || '',
          inputItemIds: inputIds,
          outputItemId: averageMemory.outputItemId,
          interval: averageMemory.interval,
          isDisabled: averageMemory.isDisabled,
          weights: weights.length > 0 ? weights : inputIds.map(() => 1.0),
          ignoreStale: averageMemory.ignoreStale,
          staleTimeout: averageMemory.staleTimeout,
          enableOutlierDetection: averageMemory.enableOutlierDetection,
          outlierMethod: averageMemory.outlierMethod,
          outlierThreshold: averageMemory.outlierThreshold,
          minimumInputs: averageMemory.minimumInputs,
        });
      } else {
        // Reset to defaults for add mode
        setFormData({
          name: '',
          inputItemIds: [],
          outputItemId: '',
          interval: 10,
          isDisabled: false,
          weights: [],
          ignoreStale: true,
          staleTimeout: 60,
          enableOutlierDetection: false,
          outlierMethod: 1,
          outlierThreshold: 1.5,
          minimumInputs: 1,
        });
        setUseWeights(false);
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, averageMemory]);

  // Filter analog items only
  const analogItems = useMemo(
    () => items.filter((item) => item.itemType === 3 || item.itemType === 4), // AnalogInput or AnalogOutput
    [items]
  );

  // Get item label
  const getItemLabel = (item: MonitoringItem) => {
    return `${item.pointNumber} - ${language === 'fa' ? item.nameFa : item.name}`;
  };

  // Validation
  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (formData.inputItemIds.length === 0) {
      errors.inputItemIds = t('averageMemory.validation.inputItemsRequired');
    }

    if (!formData.outputItemId) {
      errors.outputItemId = t('averageMemory.validation.outputItemRequired');
    }

    if (formData.inputItemIds.includes(formData.outputItemId)) {
      errors.outputItemId = t('averageMemory.validation.outputInInputs');
    }

    if (formData.interval <= 0) {
      errors.interval = t('averageMemory.validation.intervalPositive');
    }

    if (formData.staleTimeout <= 0) {
      errors.staleTimeout = t('averageMemory.validation.staleTimeoutPositive');
    }

    if (formData.outlierThreshold <= 0) {
      errors.outlierThreshold = t('averageMemory.validation.outlierThresholdPositive');
    }

    if (formData.minimumInputs < 1 || formData.minimumInputs > formData.inputItemIds.length) {
      errors.minimumInputs = t('averageMemory.validation.minimumInputsRange');
    }

    if (useWeights) {
      if (formData.weights.length !== formData.inputItemIds.length) {
        errors.weights = t('averageMemory.validation.weightsCountMismatch');
      }
      if (formData.weights.some((w) => w <= 0)) {
        errors.weights = t('averageMemory.validation.weightsPositive');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name || null,
        inputItemIds: JSON.stringify(formData.inputItemIds),
        outputItemId: formData.outputItemId,
        interval: formData.interval,
        isDisabled: formData.isDisabled,
        weights: useWeights ? JSON.stringify(formData.weights) : null,
        ignoreStale: formData.ignoreStale,
        staleTimeout: formData.staleTimeout,
        enableOutlierDetection: formData.enableOutlierDetection,
        outlierMethod: formData.outlierMethod,
        outlierThreshold: formData.outlierThreshold,
        minimumInputs: formData.minimumInputs,
      };

      const response = editMode && averageMemory
        ? await editAverageMemory({ ...payload, id: averageMemory.id })
        : await addAverageMemory(payload);

      if (response.isSuccessful) {
        onClose(true); // shouldRefresh = true
      } else {
        setError(response.errorMessage || t('averageMemory.errors.saveFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to save average memory:', err);
      setError(t('averageMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle input items change
  const handleInputItemsChange = (_: unknown, value: MonitoringItem[]) => {
    const newIds = value.map((item) => item.id);
    setFormData((prev) => {
      const newWeights = newIds.map((id) => {
        const oldIndex = prev.inputItemIds.indexOf(id);
        return oldIndex >= 0 ? prev.weights[oldIndex] || 1.0 : 1.0;
      });
      return {
        ...prev,
        inputItemIds: newIds,
        weights: newWeights,
      };
    });
  };

  // Handle weight change
  const handleWeightChange = (index: number, value: number) => {
    setFormData((prev) => {
      const newWeights = [...prev.weights];
      newWeights[index] = value;
      return { ...prev, weights: newWeights };
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-average-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-average-memory-dialog-title">
        {editMode ? t('averageMemory.editTitle') : t('averageMemory.addTitle')}
      </DialogTitle>
      <DialogContent data-id-ref="add-edit-average-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Name */}
          <TextField
            label={t('averageMemory.name')}
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
            error={!!formErrors.name}
            helperText={formErrors.name}
            data-id-ref="average-memory-name-input"
          />

          {/* Input Items */}
          <Autocomplete
            multiple
            options={analogItems}
            getOptionLabel={getItemLabel}
            value={analogItems.filter((item) => formData.inputItemIds.includes(item.id))}
            onChange={handleInputItemsChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('averageMemory.inputItems')}
                error={!!formErrors.inputItemIds}
                helperText={formErrors.inputItemIds || t('averageMemory.inputItemsHelp')}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={getItemLabel(option)}
                  {...getTagProps({ index })}
                  size="small"
                  key={option.id}
                />
              ))
            }
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
            data-id-ref="average-memory-input-items-select"
          />

          {/* Output Item */}
          <Autocomplete
            options={analogItems.filter((item) => !formData.inputItemIds.includes(item.id))}
            getOptionLabel={getItemLabel}
            value={analogItems.find((item) => item.id === formData.outputItemId) || null}
            onChange={(_, value) =>
              setFormData((prev) => ({ ...prev, outputItemId: value?.id || '' }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('averageMemory.outputItem')}
                error={!!formErrors.outputItemId}
                helperText={formErrors.outputItemId || t('averageMemory.outputItemHelp')}
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
            data-id-ref="average-memory-output-item-select"
          />

          {/* Interval */}
          <TextField
            type="number"
            label={t('averageMemory.interval')}
            value={formData.interval}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, interval: Number(e.target.value) }))
            }
            fullWidth
            error={!!formErrors.interval}
            helperText={formErrors.interval || t('averageMemory.intervalHelp')}
            InputProps={{ endAdornment: <Typography variant="body2">s</Typography> }}
            data-id-ref="average-memory-interval-input"
          />

          {/* Minimum Inputs */}
          <TextField
            type="number"
            label={t('averageMemory.minimumInputs')}
            value={formData.minimumInputs}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, minimumInputs: Number(e.target.value) }))
            }
            fullWidth
            error={!!formErrors.minimumInputs}
            helperText={formErrors.minimumInputs || t('averageMemory.minimumInputsHelp')}
            data-id-ref="average-memory-minimum-inputs-input"
          />

          {/* Disabled Switch */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDisabled}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isDisabled: e.target.checked }))
                }
                data-id-ref="average-memory-disabled-switch"
              />
            }
            label={t('averageMemory.isDisabled')}
          />

          <Divider />

          {/* Weighted Average */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{t('averageMemory.weightedAverage')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useWeights}
                      onChange={(e) => setUseWeights(e.target.checked)}
                      data-id-ref="average-memory-use-weights-switch"
                    />
                  }
                  label={t('averageMemory.useWeights')}
                />

                {useWeights && formData.inputItemIds.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {formData.inputItemIds.map((id, index) => {
                      const item = items.find((i) => i.id === id);
                      const itemLabel = item ? getItemLabel(item) : id;
                      return (
                        <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                            {itemLabel}
                          </Typography>
                          <TextField
                            type="number"
                            value={formData.weights[index] || 1.0}
                            onChange={(e) => handleWeightChange(index, Number(e.target.value))}
                            size="small"
                            sx={{ width: 100 }}
                            inputProps={{ step: 0.1, min: 0.1 }}
                            data-id-ref={`average-memory-weight-input-${index}`}
                          />
                        </Box>
                      );
                    })}
                    {formErrors.weights && (
                      <Alert severity="error">{formErrors.weights}</Alert>
                    )}
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Stale Input Handling */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{t('averageMemory.staleInputHandling')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.ignoreStale}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ignoreStale: e.target.checked }))
                      }
                      data-id-ref="average-memory-ignore-stale-switch"
                    />
                  }
                  label={t('averageMemory.ignoreStale')}
                />

                {formData.ignoreStale && (
                  <TextField
                    type="number"
                    label={t('averageMemory.staleTimeout')}
                    value={formData.staleTimeout}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, staleTimeout: Number(e.target.value) }))
                    }
                    fullWidth
                    error={!!formErrors.staleTimeout}
                    helperText={formErrors.staleTimeout || t('averageMemory.staleTimeoutHelp')}
                    InputProps={{ endAdornment: <Typography variant="body2">s</Typography> }}
                    data-id-ref="average-memory-stale-timeout-input"
                  />
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Outlier Detection */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{t('averageMemory.outlierDetection')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.enableOutlierDetection}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          enableOutlierDetection: e.target.checked,
                        }))
                      }
                      data-id-ref="average-memory-enable-outlier-detection-switch"
                    />
                  }
                  label={t('averageMemory.enableOutlierDetection')}
                />

                {formData.enableOutlierDetection && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>{t('averageMemory.outlierMethod.label')}</InputLabel>
                      <Select
                        value={formData.outlierMethod}
                        label={t('averageMemory.outlierMethod.label')}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            outlierMethod: Number(e.target.value) as OutlierMethod,
                          }))
                        }
                        data-id-ref="average-memory-outlier-method-select"
                      >
                        <MenuItem value={1}>{t('averageMemory.outlierMethod.iqr')}</MenuItem>
                        <MenuItem value={2}>{t('averageMemory.outlierMethod.zScore')}</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      type="number"
                      label={t('averageMemory.outlierThreshold')}
                      value={formData.outlierThreshold}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          outlierThreshold: Number(e.target.value),
                        }))
                      }
                      fullWidth
                      error={!!formErrors.outlierThreshold}
                      helperText={
                        formErrors.outlierThreshold ||
                        (formData.outlierMethod === 1
                          ? t('averageMemory.outlierThresholdHelpIQR')
                          : t('averageMemory.outlierThresholdHelpZScore'))
                      }
                      inputProps={{ step: 0.1, min: 0.1 }}
                      data-id-ref="average-memory-outlier-threshold-input"
                    />
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions data-id-ref="add-edit-average-memory-dialog-actions">
        <Button onClick={() => onClose(false)} disabled={loading} data-id-ref="cancel-average-memory-btn">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="save-average-memory-btn"
        >
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditAverageMemoryDialog;
