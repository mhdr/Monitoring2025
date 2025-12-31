import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Chip,
  Typography,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
  Stack,
  Autocomplete,
  Checkbox,
  Grid,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addStatisticalMemory, editStatisticalMemory } from '../services/extendedApi';
import type { StatisticalMemory, StatisticalWindowType, PercentileConfig, MonitoringItem, ItemType } from '../types/api';
import { ItemTypeEnum, StatisticalWindowType as StatisticalWindowTypeEnum } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

interface AddEditStatisticalMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  statisticalMemory: StatisticalMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface PercentileConfigForm {
  id: string;
  percentile: number;
  outputItemId: string;
}

interface FormData {
  name: string;
  inputItemId: string;
  interval: number;
  duration: number;
  isDisabled: boolean;
  // Window settings
  windowSize: number;
  windowType: StatisticalWindowType;
  minSamples: number;
  // Output items
  outputMinEnabled: boolean;
  outputMinItemId: string;
  outputMaxEnabled: boolean;
  outputMaxItemId: string;
  outputAvgEnabled: boolean;
  outputAvgItemId: string;
  outputStdDevEnabled: boolean;
  outputStdDevItemId: string;
  outputRangeEnabled: boolean;
  outputRangeItemId: string;
  outputMedianEnabled: boolean;
  outputMedianItemId: string;
  outputCVEnabled: boolean;
  outputCVItemId: string;
  // Percentiles
  percentiles: PercentileConfigForm[];
}

interface FormErrors {
  name?: string;
  inputItemId?: string;
  interval?: string;
  duration?: string;
  windowSize?: string;
  minSamples?: string;
  outputs?: string;
  outputMinItemId?: string;
  outputMaxItemId?: string;
  outputAvgItemId?: string;
  outputStdDevItemId?: string;
  outputRangeItemId?: string;
  outputMedianItemId?: string;
  outputCVItemId?: string;
  percentiles?: { [key: number]: { percentile?: string; outputItemId?: string } };
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

const AddEditStatisticalMemoryDialog: React.FC<AddEditStatisticalMemoryDialogProps> = ({
  open,
  editMode,
  statisticalMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [outputsExpanded, setOutputsExpanded] = useState(true);
  const [percentilesExpanded, setPercentilesExpanded] = useState(false);
  const [windowExpanded, setWindowExpanded] = useState(true);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemId: '',
    interval: 10,
    duration: 10,
    isDisabled: false,
    windowSize: 100,
    windowType: StatisticalWindowTypeEnum.Rolling,
    minSamples: 2,
    outputMinEnabled: false,
    outputMinItemId: '',
    outputMaxEnabled: false,
    outputMaxItemId: '',
    outputAvgEnabled: false,
    outputAvgItemId: '',
    outputStdDevEnabled: false,
    outputStdDevItemId: '',
    outputRangeEnabled: false,
    outputRangeItemId: '',
    outputMedianEnabled: false,
    outputMedianItemId: '',
    outputCVEnabled: false,
    outputCVItemId: '',
    percentiles: [],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Filter items by type - analog items for input
  const analogItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput || item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

  // Analog outputs for output fields
  const analogOutputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

  // Get item label
  const getItemLabel = useCallback((item: MonitoringItem) => {
    return `${item.pointNumber} - ${language === 'fa' ? item.nameFa : item.name}`;
  }, [language]);

  // Get item by ID
  const getItemById = useCallback((itemId: string): MonitoringItem | null => {
    return items.find((item) => item.id === itemId) || null;
  }, [items]);

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (editMode && statisticalMemory) {
        let percentiles: PercentileConfigForm[] = [];
        try {
          const parsed = JSON.parse(statisticalMemory.percentilesConfig || '[]') as PercentileConfig[];
          percentiles = parsed.map((p) => ({
            id: generateTempId(),
            percentile: p.percentile,
            outputItemId: p.outputItemId,
          }));
        } catch {
          percentiles = [];
        }

        setFormData({
          name: statisticalMemory.name || '',
          inputItemId: statisticalMemory.inputItemId,
          interval: statisticalMemory.interval,
          duration: statisticalMemory.duration ?? 10,
          isDisabled: statisticalMemory.isDisabled,
          windowSize: statisticalMemory.windowSize,
          windowType: statisticalMemory.windowType,
          minSamples: statisticalMemory.minSamples,
          outputMinEnabled: !!statisticalMemory.outputMinItemId,
          outputMinItemId: statisticalMemory.outputMinItemId || '',
          outputMaxEnabled: !!statisticalMemory.outputMaxItemId,
          outputMaxItemId: statisticalMemory.outputMaxItemId || '',
          outputAvgEnabled: !!statisticalMemory.outputAvgItemId,
          outputAvgItemId: statisticalMemory.outputAvgItemId || '',
          outputStdDevEnabled: !!statisticalMemory.outputStdDevItemId,
          outputStdDevItemId: statisticalMemory.outputStdDevItemId || '',
          outputRangeEnabled: !!statisticalMemory.outputRangeItemId,
          outputRangeItemId: statisticalMemory.outputRangeItemId || '',
          outputMedianEnabled: !!statisticalMemory.outputMedianItemId,
          outputMedianItemId: statisticalMemory.outputMedianItemId || '',
          outputCVEnabled: !!statisticalMemory.outputCVItemId,
          outputCVItemId: statisticalMemory.outputCVItemId || '',
          percentiles,
        });
        // Expand percentiles section if there are any
        if (percentiles.length > 0) {
          setPercentilesExpanded(true);
        }
      } else {
        // Reset to defaults for add mode
        setFormData({
          name: '',
          inputItemId: '',
          interval: 10,
          duration: 10,
          isDisabled: false,
          windowSize: 100,
          windowType: StatisticalWindowTypeEnum.Rolling,
          minSamples: 2,
          outputMinEnabled: false,
          outputMinItemId: '',
          outputMaxEnabled: false,
          outputMaxItemId: '',
          outputAvgEnabled: false,
          outputAvgItemId: '',
          outputStdDevEnabled: false,
          outputStdDevItemId: '',
          outputRangeEnabled: false,
          outputRangeItemId: '',
          outputMedianEnabled: false,
          outputMedianItemId: '',
          outputCVEnabled: false,
          outputCVItemId: '',
          percentiles: [],
        });
        setPercentilesExpanded(false);
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, statisticalMemory]);

  // Add new percentile
  const handleAddPercentile = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      percentiles: [
        ...prev.percentiles,
        {
          id: generateTempId(),
          percentile: 95,
          outputItemId: '',
        },
      ],
    }));
  }, []);

  // Remove percentile
  const handleRemovePercentile = useCallback((percentileId: string) => {
    setFormData((prev) => ({
      ...prev,
      percentiles: prev.percentiles.filter((p) => p.id !== percentileId),
    }));
  }, []);

  // Update percentile field
  const handlePercentileChange = useCallback((percentileId: string, field: keyof PercentileConfigForm, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      percentiles: prev.percentiles.map((p) =>
        p.id === percentileId ? { ...p, [field]: value } : p
      ),
    }));
  }, []);

  // Count configured outputs
  const countConfiguredOutputs = useCallback((): number => {
    let count = 0;
    if (formData.outputMinEnabled && formData.outputMinItemId) count++;
    if (formData.outputMaxEnabled && formData.outputMaxItemId) count++;
    if (formData.outputAvgEnabled && formData.outputAvgItemId) count++;
    if (formData.outputStdDevEnabled && formData.outputStdDevItemId) count++;
    if (formData.outputRangeEnabled && formData.outputRangeItemId) count++;
    if (formData.outputMedianEnabled && formData.outputMedianItemId) count++;
    if (formData.outputCVEnabled && formData.outputCVItemId) count++;
    // Add valid percentiles
    count += formData.percentiles.filter((p) => p.percentile >= 0 && p.percentile <= 100 && p.outputItemId).length;
    return count;
  }, [formData]);

  // Collect all configured output item IDs for duplicate validation
  const collectOutputItemIds = useCallback((): string[] => {
    const ids: string[] = [];
    if (formData.outputMinEnabled && formData.outputMinItemId) ids.push(formData.outputMinItemId);
    if (formData.outputMaxEnabled && formData.outputMaxItemId) ids.push(formData.outputMaxItemId);
    if (formData.outputAvgEnabled && formData.outputAvgItemId) ids.push(formData.outputAvgItemId);
    if (formData.outputStdDevEnabled && formData.outputStdDevItemId) ids.push(formData.outputStdDevItemId);
    if (formData.outputRangeEnabled && formData.outputRangeItemId) ids.push(formData.outputRangeItemId);
    if (formData.outputMedianEnabled && formData.outputMedianItemId) ids.push(formData.outputMedianItemId);
    if (formData.outputCVEnabled && formData.outputCVItemId) ids.push(formData.outputCVItemId);
    formData.percentiles.forEach((p) => {
      if (p.outputItemId) ids.push(p.outputItemId);
    });
    return ids;
  }, [formData]);

  // Validation
  const validate = (): boolean => {
    const errors: FormErrors = { percentiles: {} };

    // Input item required
    if (!formData.inputItemId) {
      errors.inputItemId = t('statisticalMemory.validation.inputItemRequired');
    }

    // Interval must be positive
    if (formData.interval <= 0) {
      errors.interval = t('statisticalMemory.validation.intervalPositive');
    }

    // Duration must be non-negative
    if (formData.duration < 0) {
      errors.duration = t('statisticalMemory.validation.durationInvalid');
    }

    // Window size must be 10-10000
    if (formData.windowSize < 10 || formData.windowSize > 10000) {
      errors.windowSize = t('statisticalMemory.validation.windowSizeRange');
    }

    // Min samples must be >= 2
    if (formData.minSamples < 2) {
      errors.minSamples = t('statisticalMemory.validation.minSamplesMinimum');
    }

    // Min samples cannot exceed window size
    if (formData.minSamples > formData.windowSize) {
      errors.minSamples = t('statisticalMemory.validation.minSamplesExceedsWindow');
    }

    // At least one output must be configured
    if (countConfiguredOutputs() === 0) {
      errors.outputs = t('statisticalMemory.validation.atLeastOneOutput');
    }

    // Validate each enabled output has a selected item
    if (formData.outputMinEnabled && !formData.outputMinItemId) {
      errors.outputMinItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputMaxEnabled && !formData.outputMaxItemId) {
      errors.outputMaxItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputAvgEnabled && !formData.outputAvgItemId) {
      errors.outputAvgItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputStdDevEnabled && !formData.outputStdDevItemId) {
      errors.outputStdDevItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputRangeEnabled && !formData.outputRangeItemId) {
      errors.outputRangeItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputMedianEnabled && !formData.outputMedianItemId) {
      errors.outputMedianItemId = t('statisticalMemory.validation.outputItemRequired');
    }
    if (formData.outputCVEnabled && !formData.outputCVItemId) {
      errors.outputCVItemId = t('statisticalMemory.validation.outputItemRequired');
    }

    // Validate percentiles
    formData.percentiles.forEach((p, index) => {
      const pErrors: { percentile?: string; outputItemId?: string } = {};
      if (p.percentile < 0 || p.percentile > 100) {
        pErrors.percentile = t('statisticalMemory.validation.percentileRange');
      }
      if (!p.outputItemId) {
        pErrors.outputItemId = t('statisticalMemory.validation.outputItemRequired');
      }
      if (Object.keys(pErrors).length > 0) {
        errors.percentiles![index] = pErrors;
      }
    });

    // Check for duplicate output items
    const outputIds = collectOutputItemIds();
    const uniqueIds = new Set(outputIds);
    if (uniqueIds.size !== outputIds.length) {
      errors.outputs = t('statisticalMemory.validation.duplicateOutputItems');
    }

    // Clean up empty nested errors
    if (Object.keys(errors.percentiles || {}).length === 0) {
      delete errors.percentiles;
    }

    setFormErrors(errors);
    const hasErrors = Object.keys(errors).filter(
      (k) => k !== 'percentiles' || Object.keys(errors.percentiles || {}).length > 0
    ).length > 0;
    return !hasErrors;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      // Convert percentiles to API format
      const percentileConfigs: PercentileConfig[] = formData.percentiles
        .filter((p) => p.percentile >= 0 && p.percentile <= 100 && p.outputItemId)
        .map((p) => ({
          percentile: p.percentile,
          outputItemId: p.outputItemId,
        }));

      const payload = {
        name: formData.name || null,
        inputItemId: formData.inputItemId,
        interval: formData.interval,
        duration: formData.duration,
        isDisabled: formData.isDisabled,
        windowSize: formData.windowSize,
        windowType: formData.windowType,
        minSamples: formData.minSamples,
        outputMinItemId: formData.outputMinEnabled && formData.outputMinItemId ? formData.outputMinItemId : null,
        outputMaxItemId: formData.outputMaxEnabled && formData.outputMaxItemId ? formData.outputMaxItemId : null,
        outputAvgItemId: formData.outputAvgEnabled && formData.outputAvgItemId ? formData.outputAvgItemId : null,
        outputStdDevItemId: formData.outputStdDevEnabled && formData.outputStdDevItemId ? formData.outputStdDevItemId : null,
        outputRangeItemId: formData.outputRangeEnabled && formData.outputRangeItemId ? formData.outputRangeItemId : null,
        outputMedianItemId: formData.outputMedianEnabled && formData.outputMedianItemId ? formData.outputMedianItemId : null,
        outputCVItemId: formData.outputCVEnabled && formData.outputCVItemId ? formData.outputCVItemId : null,
        percentilesConfig: JSON.stringify(percentileConfigs),
      };

      const response = editMode && statisticalMemory
        ? await editStatisticalMemory({ ...payload, id: statisticalMemory.id })
        : await addStatisticalMemory(payload);

      if (response.isSuccessful) {
        onClose(true);
      } else {
        setError(response.errorMessage || t('statisticalMemory.errors.saveFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to save statistical memory:', err);
      setError(t('statisticalMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Get window type label
  const getWindowTypeLabel = (windowType: StatisticalWindowType): string => {
    switch (windowType) {
      case StatisticalWindowTypeEnum.Rolling:
        return t('statisticalMemory.windowType.rolling');
      case StatisticalWindowTypeEnum.Tumbling:
        return t('statisticalMemory.windowType.tumbling');
      default:
        return String(windowType);
    }
  };

  // Render output field with checkbox and autocomplete
  const renderOutputField = (
    fieldKey: string,
    enabledKey: keyof FormData,
    itemIdKey: keyof FormData,
    label: string,
    helpKey: string,
    errorKey: keyof FormErrors
  ) => {
    const enabled = formData[enabledKey] as boolean;
    const itemId = formData[itemIdKey] as string;
    const selectedItem = getItemById(itemId);
    const fieldError = formErrors[errorKey] as string | undefined;

    return (
      <Grid size={{ xs: 12, sm: 6 }} key={fieldKey}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            border: 1,
            borderColor: enabled ? 'primary.main' : 'divider',
            borderRadius: 1,
            backgroundColor: enabled ? 'action.selected' : 'transparent',
          }}
          data-id-ref={`statistical-memory-output-${fieldKey}-container`}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: enabled ? 1 : 0 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enabled}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      [enabledKey]: e.target.checked,
                      [itemIdKey]: e.target.checked ? prev[itemIdKey] : '',
                    }));
                  }}
                  size="small"
                  data-id-ref={`statistical-memory-output-${fieldKey}-checkbox`}
                />
              }
              label={<Typography variant="body2" fontWeight={enabled ? 'medium' : 'normal'}>{label}</Typography>}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(helpKey)}
              sx={{ p: 0.25, ml: 'auto' }}
              data-id-ref={`statistical-memory-output-${fieldKey}-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
          {enabled && (
            <Autocomplete
              options={analogOutputItems}
              getOptionLabel={getItemLabel}
              value={selectedItem}
              onChange={(_, value) => {
                setFormData((prev) => ({
                  ...prev,
                  [itemIdKey]: value?.id || '',
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={t('statisticalMemory.selectOutputItem')}
                  error={!!fieldError}
                  helperText={fieldError}
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
              fullWidth
              data-id-ref={`statistical-memory-output-${fieldKey}-select`}
            />
          )}
        </Paper>
      </Grid>
    );
  };

  // Render percentile configuration
  const renderPercentile = (percentile: PercentileConfigForm, index: number) => {
    const pErrors = formErrors.percentiles?.[index] || {};
    const selectedItem = getItemById(percentile.outputItemId);

    return (
      <Paper
        key={percentile.id}
        elevation={1}
        sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}
        data-id-ref={`statistical-memory-percentile-${index}`}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="medium">
            {t('statisticalMemory.percentileLabel', { index: index + 1 })}
          </Typography>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemovePercentile(percentile.id)}
              data-id-ref={`statistical-memory-percentile-${index}-delete-btn`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label={t('statisticalMemory.percentileValue')}
              type="number"
              value={percentile.percentile}
              onChange={(e) => handlePercentileChange(percentile.id, 'percentile', Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              fullWidth
              size="small"
              error={!!pErrors.percentile}
              helperText={pErrors.percentile || t('statisticalMemory.percentileValueHelp')}
              InputProps={{
                inputProps: { min: 0, max: 100, step: 0.1 },
              }}
              data-id-ref={`statistical-memory-percentile-${index}-value-input`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('statisticalMemory.help.percentileValue')}
              sx={{ p: 0.25 }}
              data-id-ref={`statistical-memory-percentile-${index}-value-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Autocomplete
              options={analogOutputItems}
              getOptionLabel={getItemLabel}
              value={selectedItem}
              onChange={(_, value) => handlePercentileChange(percentile.id, 'outputItemId', value?.id || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('statisticalMemory.percentileOutputItem')}
                  size="small"
                  error={!!pErrors.outputItemId}
                  helperText={pErrors.outputItemId}
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
              fullWidth
              data-id-ref={`statistical-memory-percentile-${index}-output-select`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('statisticalMemory.help.percentileOutput')}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref={`statistical-memory-percentile-${index}-output-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
        </Stack>
      </Paper>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-statistical-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-statistical-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon color="primary" />
          {editMode ? t('statisticalMemory.editTitle') : t('statisticalMemory.addTitle')}
        </Box>
      </DialogTitle>
      <DialogContent data-id-ref="add-edit-statistical-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* General outputs error */}
        {formErrors.outputs && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {formErrors.outputs}
          </Alert>
        )}

        {/* Basic Settings Section */}
        <Card sx={{ mb: 2 }} data-id-ref="statistical-memory-basic-section">
          <CardHeader
            title={t('statisticalMemory.sections.basic')}
            action={
              <IconButton
                onClick={() => setBasicExpanded(!basicExpanded)}
                sx={{ transform: basicExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                data-id-ref="statistical-memory-basic-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
            sx={{ py: 1, cursor: 'pointer' }}
            onClick={() => setBasicExpanded(!basicExpanded)}
          />
          <Collapse in={basicExpanded}>
            <CardContent>
              <Stack spacing={2}>
                {/* Name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('statisticalMemory.name')}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    size="small"
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    data-id-ref="statistical-memory-name-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.name')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-name-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Input Item */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={analogItems}
                    getOptionLabel={getItemLabel}
                    value={getItemById(formData.inputItemId)}
                    onChange={(_, value) => setFormData((prev) => ({ ...prev, inputItemId: value?.id || '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('statisticalMemory.inputItem')}
                        error={!!formErrors.inputItemId}
                        helperText={formErrors.inputItemId}
                        size="small"
                        required
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
                    fullWidth
                    data-id-ref="statistical-memory-input-item-select"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.inputItem')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="statistical-memory-input-item-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Interval */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('statisticalMemory.interval')}
                    type="number"
                    value={formData.interval}
                    onChange={(e) => setFormData((prev) => ({ ...prev, interval: Math.max(1, parseInt(e.target.value) || 1) }))}
                    fullWidth
                    size="small"
                    error={!!formErrors.interval}
                    helperText={formErrors.interval || t('statisticalMemory.intervalHelp')}
                    InputProps={{
                      inputProps: { min: 1 },
                      endAdornment: <Typography variant="caption" color="text.secondary">s</Typography>,
                    }}
                    data-id-ref="statistical-memory-interval-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.interval')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-interval-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Duration */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('statisticalMemory.duration')}
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: Math.max(0, parseInt(e.target.value) || 0) }))}
                    fullWidth
                    size="small"
                    error={!!formErrors.duration}
                    helperText={formErrors.duration || t('statisticalMemory.durationHelp')}
                    InputProps={{
                      inputProps: { min: 0 },
                      endAdornment: <Typography variant="caption" color="text.secondary">s</Typography>,
                    }}
                    data-id-ref="statistical-memory-duration-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.duration')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-duration-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Disabled Toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isDisabled}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isDisabled: e.target.checked }))}
                        data-id-ref="statistical-memory-disabled-toggle"
                      />
                    }
                    label={t('statisticalMemory.isDisabled')}
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.isDisabled')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-disabled-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        {/* Window Settings Section */}
        <Card sx={{ mb: 2 }} data-id-ref="statistical-memory-window-section">
          <CardHeader
            title={t('statisticalMemory.sections.window')}
            action={
              <IconButton
                onClick={() => setWindowExpanded(!windowExpanded)}
                sx={{ transform: windowExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                data-id-ref="statistical-memory-window-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
            sx={{ py: 1, cursor: 'pointer' }}
            onClick={() => setWindowExpanded(!windowExpanded)}
          />
          <Collapse in={windowExpanded}>
            <CardContent>
              <Stack spacing={2}>
                {/* Window Size */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('statisticalMemory.windowSize')}
                    type="number"
                    value={formData.windowSize}
                    onChange={(e) => setFormData((prev) => ({ ...prev, windowSize: Math.max(10, Math.min(10000, parseInt(e.target.value) || 10)) }))}
                    fullWidth
                    size="small"
                    error={!!formErrors.windowSize}
                    helperText={formErrors.windowSize || t('statisticalMemory.windowSizeHelp')}
                    InputProps={{
                      inputProps: { min: 10, max: 10000 },
                    }}
                    data-id-ref="statistical-memory-window-size-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.windowSize')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-window-size-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Window Type */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('statisticalMemory.windowType.label')}</InputLabel>
                    <Select
                      value={formData.windowType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, windowType: e.target.value as StatisticalWindowType }))}
                      label={t('statisticalMemory.windowType.label')}
                      data-id-ref="statistical-memory-window-type-select"
                    >
                      <MenuItem value={StatisticalWindowTypeEnum.Rolling}>
                        {getWindowTypeLabel(StatisticalWindowTypeEnum.Rolling)}
                      </MenuItem>
                      <MenuItem value={StatisticalWindowTypeEnum.Tumbling}>
                        {getWindowTypeLabel(StatisticalWindowTypeEnum.Tumbling)}
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.windowType')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-window-type-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Min Samples */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('statisticalMemory.minSamples')}
                    type="number"
                    value={formData.minSamples}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minSamples: Math.max(2, parseInt(e.target.value) || 2) }))}
                    fullWidth
                    size="small"
                    error={!!formErrors.minSamples}
                    helperText={formErrors.minSamples || t('statisticalMemory.minSamplesHelp')}
                    InputProps={{
                      inputProps: { min: 2 },
                    }}
                    data-id-ref="statistical-memory-min-samples-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('statisticalMemory.help.minSamples')}
                    sx={{ p: 0.25 }}
                    data-id-ref="statistical-memory-min-samples-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        {/* Outputs Section */}
        <Card sx={{ mb: 2 }} data-id-ref="statistical-memory-outputs-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('statisticalMemory.sections.outputs')}
                <Chip
                  label={countConfiguredOutputs()}
                  size="small"
                  color={countConfiguredOutputs() > 0 ? 'primary' : 'default'}
                />
              </Box>
            }
            action={
              <IconButton
                onClick={() => setOutputsExpanded(!outputsExpanded)}
                sx={{ transform: outputsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                data-id-ref="statistical-memory-outputs-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
            sx={{ py: 1, cursor: 'pointer' }}
            onClick={() => setOutputsExpanded(!outputsExpanded)}
          />
          <Collapse in={outputsExpanded}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('statisticalMemory.outputsDescription')}
              </Typography>
              <Grid container spacing={2}>
                {renderOutputField('min', 'outputMinEnabled', 'outputMinItemId', t('statisticalMemory.outputTypes.min'), 'statisticalMemory.help.outputMin', 'outputMinItemId')}
                {renderOutputField('max', 'outputMaxEnabled', 'outputMaxItemId', t('statisticalMemory.outputTypes.max'), 'statisticalMemory.help.outputMax', 'outputMaxItemId')}
                {renderOutputField('avg', 'outputAvgEnabled', 'outputAvgItemId', t('statisticalMemory.outputTypes.avg'), 'statisticalMemory.help.outputAvg', 'outputAvgItemId')}
                {renderOutputField('stddev', 'outputStdDevEnabled', 'outputStdDevItemId', t('statisticalMemory.outputTypes.stddev'), 'statisticalMemory.help.outputStdDev', 'outputStdDevItemId')}
                {renderOutputField('range', 'outputRangeEnabled', 'outputRangeItemId', t('statisticalMemory.outputTypes.range'), 'statisticalMemory.help.outputRange', 'outputRangeItemId')}
                {renderOutputField('median', 'outputMedianEnabled', 'outputMedianItemId', t('statisticalMemory.outputTypes.median'), 'statisticalMemory.help.outputMedian', 'outputMedianItemId')}
                {renderOutputField('cv', 'outputCVEnabled', 'outputCVItemId', t('statisticalMemory.outputTypes.cv'), 'statisticalMemory.help.outputCV', 'outputCVItemId')}
              </Grid>
            </CardContent>
          </Collapse>
        </Card>

        {/* Percentiles Section */}
        <Card sx={{ mb: 2 }} data-id-ref="statistical-memory-percentiles-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('statisticalMemory.sections.percentiles')}
                {formData.percentiles.length > 0 && (
                  <Chip
                    label={formData.percentiles.length}
                    size="small"
                    color="secondary"
                  />
                )}
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddPercentile();
                    setPercentilesExpanded(true);
                  }}
                  data-id-ref="statistical-memory-add-percentile-btn"
                >
                  {t('statisticalMemory.addPercentile')}
                </Button>
                <IconButton
                  onClick={() => setPercentilesExpanded(!percentilesExpanded)}
                  sx={{ transform: percentilesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                  data-id-ref="statistical-memory-percentiles-expand-btn"
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            }
            sx={{ py: 1, cursor: 'pointer' }}
            onClick={() => setPercentilesExpanded(!percentilesExpanded)}
          />
          <Collapse in={percentilesExpanded}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('statisticalMemory.percentilesDescription')}
              </Typography>
              {formData.percentiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('statisticalMemory.noPercentiles')}
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddPercentile}
                    sx={{ mt: 1 }}
                    data-id-ref="statistical-memory-add-first-percentile-btn"
                  >
                    {t('statisticalMemory.addPercentile')}
                  </Button>
                </Box>
              ) : (
                formData.percentiles.map((p, index) => renderPercentile(p, index))
              )}
            </CardContent>
          </Collapse>
        </Card>

        {/* Help Popovers */}
        {Object.entries(helpAnchorEl).map(([fieldKey, anchorEl]) => (
          <FieldHelpPopover
            key={fieldKey}
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleHelpClose(fieldKey)}
            fieldKey={fieldKey}
          />
        ))}
      </DialogContent>
      <DialogActions data-id-ref="add-edit-statistical-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="cancel-statistical-memory-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="save-statistical-memory-btn"
        >
          {loading ? <CircularProgress size={20} /> : (editMode ? t('common.save') : t('common.add'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditStatisticalMemoryDialog;
