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
  IconButton,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpOutlineIcon,
  Memory as MemoryIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addAverageMemory, editAverageMemory, getGlobalVariables } from '../services/extendedApi';
import type { AverageMemory, MonitoringItem, OutlierMethod, MovingAverageType, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, MovingAverageType as MovingAverageTypeEnum, TimeoutSourceType } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditAverageMemoryDialog');

interface AddEditAverageMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  averageMemory: AverageMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  name: string;
  inputItemIds: string[]; // Source references like ["P:guid1", "GV:name1", "P:guid2"]
  outputType: TimeoutSourceType; // 0 = Point, 1 = GlobalVariable
  outputReference: string;
  interval: number;
  isDisabled: boolean;
  weights: number[];
  ignoreStale: boolean;
  staleTimeout: number;
  enableOutlierDetection: boolean;
  outlierMethod: OutlierMethod;
  outlierThreshold: number;
  minimumInputs: number;
  // Moving Average fields
  averageType: MovingAverageType;
  windowSize: number;
  alpha: number;
  useLinearWeights: boolean;
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
    outputType: TimeoutSourceType.Point,
    outputReference: '',
    interval: 10,
    isDisabled: false,
    weights: [],
    ignoreStale: true,
    staleTimeout: 60,
    enableOutlierDetection: false,
    outlierMethod: 1, // IQR
    outlierThreshold: 1.5,
    minimumInputs: 1,
    // Moving Average defaults
    averageType: MovingAverageTypeEnum.Simple,
    windowSize: 10,
    alpha: 0.2,
    useLinearWeights: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWeights, setUseWeights] = useState(false);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loadingGlobalVariables, setLoadingGlobalVariables] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl(prev => ({ ...prev, [fieldKey]: null }));
  };

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

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (editMode && averageMemory) {
        let inputIds: string[] = [];
        try {
          inputIds = JSON.parse(averageMemory.inputItemIds);
          // Parse existing source references - support both old (unprefixed GUIDs) and new format (prefixed)
          inputIds = inputIds.map(id => {
            if (id.startsWith('P:') || id.startsWith('GV:')) {
              return id; // Already prefixed
            }
            // Backward compatibility: Treat unprefixed as Point GUID
            return `P:${id}`;
          });
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

        // Parse output fields - support new format with backward compatibility
        let outputType = TimeoutSourceType.Point;
        let outputReference = '';
        if ((averageMemory as any).outputType !== undefined && (averageMemory as any).outputReference !== undefined) {
          outputType = (averageMemory as any).outputType;
          const rawOutputRef = (averageMemory as any).outputReference;
          
          // Strip prefix if present (P: or GV:)
          if (rawOutputRef.startsWith('P:')) {
            outputReference = rawOutputRef.substring(2); // Remove "P:" prefix
          } else if (rawOutputRef.startsWith('GV:')) {
            outputReference = rawOutputRef.substring(3); // Remove "GV:" prefix
          } else {
            // No prefix, use as-is (backward compatibility)
            outputReference = rawOutputRef;
          }
        } else if ((averageMemory as any).outputItemId) {
          // Backward compatibility: old format had outputItemId
          outputType = TimeoutSourceType.Point;
          outputReference = (averageMemory as any).outputItemId;
        }

        setFormData({
          name: averageMemory.name || '',
          inputItemIds: inputIds,
          outputType,
          outputReference,
          interval: averageMemory.interval,
          isDisabled: averageMemory.isDisabled,
          weights: weights.length > 0 ? weights : inputIds.map(() => 1.0),
          ignoreStale: averageMemory.ignoreStale,
          staleTimeout: averageMemory.staleTimeout,
          enableOutlierDetection: averageMemory.enableOutlierDetection,
          outlierMethod: averageMemory.outlierMethod,
          outlierThreshold: averageMemory.outlierThreshold,
          minimumInputs: averageMemory.minimumInputs,
          // Moving Average fields
          averageType: averageMemory.averageType ?? MovingAverageTypeEnum.Simple,
          windowSize: averageMemory.windowSize ?? 10,
          alpha: averageMemory.alpha ?? 0.2,
          useLinearWeights: averageMemory.useLinearWeights ?? true,
        });
      } else {
        // Reset to defaults for add mode
        setFormData({
          name: '',
          inputItemIds: [],
          outputType: TimeoutSourceType.Point,
          outputReference: '',
          interval: 10,
          isDisabled: false,
          weights: [],
          ignoreStale: true,
          staleTimeout: 60,
          enableOutlierDetection: false,
          outlierMethod: 1,
          outlierThreshold: 1.5,
          minimumInputs: 1,
          // Moving Average defaults
          averageType: MovingAverageTypeEnum.Simple,
          windowSize: 10,
          alpha: 0.2,
          useLinearWeights: true,
        });
        setUseWeights(false);
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, averageMemory]);

  // Filter analog items only (for inputs - can be AI or AO)
  const analogItems = useMemo(
    () => items.filter((item) => item.itemType === 3 || item.itemType === 4), // AnalogInput or AnalogOutput
    [items]
  );

  // Filter analog output items only (for outputs when Point type selected)
  const analogOutputItems = useMemo(
    () => items.filter((item) => item.itemType === 3 || item.itemType === 4), // AI or AO
    [items]
  );

  // Filter Float global variables only (for outputs when GlobalVariable type selected)
  const floatGlobalVariables = useMemo(
    () => globalVariables.filter((v) => v.variableType === 1), // Float type
    [globalVariables]
  );

  // Get item label
  const getItemLabel = (item: MonitoringItem) => {
    return `${item.pointNumber} - ${language === 'fa' ? item.nameFa : item.name}`;
  };

  // Get variable label
  const getVariableLabel = (variable: GlobalVariable): string => {
    return variable.name;
  };

  // Parse source reference to get type and ID/name
  const parseSourceReference = (ref: string): { type: 'Point' | 'GlobalVariable'; value: string } => {
    if (ref.startsWith('P:')) {
      return { type: 'Point', value: ref.substring(2) };
    } else if (ref.startsWith('GV:')) {
      return { type: 'GlobalVariable', value: ref.substring(3) };
    }
    // Backward compatibility: Unprefixed assumed to be Point
    return { type: 'Point', value: ref };
  };

  // Create unified options for input Autocomplete (Points + Global Variables)
  interface UnifiedSourceOption {
    type: 'Point' | 'GlobalVariable';
    reference: string;
    label: string;
    data: MonitoringItem | GlobalVariable;
  }

  const unifiedInputOptions = useMemo((): UnifiedSourceOption[] => {
    const pointOptions: UnifiedSourceOption[] = analogItems.map(item => ({
      type: 'Point' as const,
      reference: `P:${item.id}`,
      label: getItemLabel(item),
      data: item,
    }));

    const gvOptions: UnifiedSourceOption[] = globalVariables
      .filter(v => v.variableType === 1) // Float only for averaging
      .map(v => ({
        type: 'GlobalVariable' as const,
        reference: `GV:${v.name}`,
        label: v.name,
        data: v,
      }));

    return [...pointOptions, ...gvOptions];
  }, [analogItems, globalVariables, language]);

  // Get selected input sources
  const selectedInputSources = useMemo(() => {
    return formData.inputItemIds.map(ref => 
      unifiedInputOptions.find(opt => opt.reference === ref)
    ).filter(Boolean) as UnifiedSourceOption[];
  }, [formData.inputItemIds, unifiedInputOptions]);

  // Validation
  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (formData.inputItemIds.length === 0) {
      errors.inputItemIds = t('averageMemory.validation.inputItemsRequired');
    }

    if (!formData.outputReference) {
      errors.outputReference = t('averageMemory.validation.outputItemRequired');
    }

    // Check circular reference: output should not be in inputs
    if (formData.outputReference) {
      const outputRef = formData.outputType === TimeoutSourceType.Point 
        ? `P:${formData.outputReference}` 
        : `GV:${formData.outputReference}`;
      if (formData.inputItemIds.includes(outputRef)) {
        errors.outputReference = t('averageMemory.validation.outputInInputs');
      }
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
      // Format outputReference with prefix based on outputType
      const outputReference =
        formData.outputType === 0 // Point
          ? `P:${formData.outputReference}`
          : `GV:${formData.outputReference}`; // GlobalVariable

      const payload = {
        name: formData.name || null,
        inputItemIds: JSON.stringify(formData.inputItemIds),
        outputType: formData.outputType,
        outputReference,
        outputItemId: null, // For backward compatibility
        interval: formData.interval,
        isDisabled: formData.isDisabled,
        weights: useWeights ? JSON.stringify(formData.weights) : null,
        ignoreStale: formData.ignoreStale,
        staleTimeout: formData.staleTimeout,
        enableOutlierDetection: formData.enableOutlierDetection,
        outlierMethod: formData.outlierMethod,
        outlierThreshold: formData.outlierThreshold,
        minimumInputs: formData.minimumInputs,
        // Moving Average fields
        averageType: formData.averageType,
        windowSize: formData.windowSize,
        alpha: formData.alpha,
        useLinearWeights: formData.useLinearWeights,
      };

      if (editMode && averageMemory) {
        const response = await editAverageMemory({ ...payload, id: averageMemory.id });
        if (response.isSuccessful) {
          logger.log('Average memory updated successfully', { id: averageMemory.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('averageMemory.errors.saveFailed'));
        }
      } else {
        const response = await addAverageMemory(payload);
        if (response.isSuccessful) {
          logger.log('Average memory created successfully', { id: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('averageMemory.errors.saveFailed'));
        }
      }
    } catch (err: unknown) {
      logger.error('Failed to save average memory:', err);
      setError(t('averageMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle input items change
  const handleInputItemsChange = (_: unknown, value: UnifiedSourceOption[]) => {
    const newRefs = value.map((opt) => opt.reference);
    setFormData((prev) => {
      const newWeights = newRefs.map((ref) => {
        const oldIndex = prev.inputItemIds.indexOf(ref);
        return oldIndex >= 0 ? prev.weights[oldIndex] || 1.0 : 1.0;
      });
      return {
        ...prev,
        inputItemIds: newRefs,
        weights: newWeights,
      };
    });
    if (formErrors.inputItemIds) {
      setFormErrors((prev) => ({ ...prev, inputItemIds: undefined }));
    }
  };

  // Handle output type change
  const handleOutputTypeChange = (_event: React.MouseEvent<HTMLElement>, newValue: number | null) => {
    if (newValue !== null && (newValue === 0 || newValue === 1)) {
      setFormData((prev) => ({ ...prev, outputType: newValue as TimeoutSourceType, outputReference: '' }));
      if (formErrors.outputReference) {
        setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
      }
    }
  };

  // Handle output item change (Point)
  const handleOutputItemChange = (_event: React.SyntheticEvent, value: MonitoringItem | null) => {
    setFormData((prev) => ({ ...prev, outputReference: value?.id || '' }));
    if (formErrors.outputReference) {
      setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
    }
  };

  // Handle output variable change (Global Variable)
  const handleOutputVariableChange = (_event: React.SyntheticEvent, value: GlobalVariable | null) => {
    setFormData((prev) => ({ ...prev, outputReference: value?.name || '' }));
    if (formErrors.outputReference) {
      setFormErrors((prev) => ({ ...prev, outputReference: undefined }));
    }
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label={t('averageMemory.name')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              error={!!formErrors.name}
              helperText={formErrors.name}
              data-id-ref="average-memory-name-input"
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('averageMemory.help.name')}
              sx={{ p: 0.25, mt: -3 }}
              data-id-ref="average-memory-name-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Input Sources (Points AND Global Variables) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Autocomplete
              multiple
              options={unifiedInputOptions}
              groupBy={(option) => option.type === 'Point' ? t('averageMemory.sourceGroup.points') : t('averageMemory.sourceGroup.globalVariables')}
              getOptionLabel={(option) => option.label}
              value={selectedInputSources}
              onChange={handleInputItemsChange}
              loading={loadingGlobalVariables}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('averageMemory.inputSources')}
                  error={!!formErrors.inputItemIds}
                  helperText={formErrors.inputItemIds || t('averageMemory.inputSourcesHelp')}
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
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const isPoint = option.type === 'Point';
                  const chipProps = getTagProps({ index });
                  return (
                    <Chip
                      {...chipProps}
                      label={option.label}
                      size="small"
                      key={option.reference}
                      icon={isPoint ? <MemoryIcon /> : <FunctionsIcon />}
                      color={isPoint ? 'primary' : 'secondary'}
                    />
                  );
                })
              }
              renderOption={(props, option) => {
                const isPoint = option.type === 'Point';
                return (
                  <Box component="li" {...props} key={option.reference}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {isPoint ? <MemoryIcon fontSize="small" /> : <FunctionsIcon fontSize="small" />}
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {option.label}
                      </Typography>
                      {isPoint ? (
                        <Chip
                          label={getItemTypeLabel((option.data as MonitoringItem).itemType, t)}
                          size="small"
                          color={getItemTypeColor((option.data as MonitoringItem).itemType)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ) : (
                        <Chip
                          label="Float"
                          size="small"
                          color="info"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                );
              }}
              isOptionEqualToValue={(option, value) => option.reference === value.reference}
              data-id-ref="average-memory-input-sources-select"
              fullWidth
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen('averageMemory.help.inputSources')}
              sx={{ p: 0.25, mt: -3 }}
              data-id-ref="average-memory-input-sources-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Output Type Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom data-id-ref="average-memory-output-type-label">
              {t('averageMemory.outputType')} *
            </Typography>
            <ToggleButtonGroup
              value={formData.outputType}
              exclusive
              onChange={handleOutputTypeChange}
              fullWidth
              disabled={loading}
              data-id-ref="average-memory-output-type-toggle"
              sx={{ mb: 2 }}
            >
              <ToggleButton value={TimeoutSourceType.Point} data-id-ref="average-memory-output-type-point">
                <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                {t('averageMemory.sourceTypePoint')}
              </ToggleButton>
              <ToggleButton value={TimeoutSourceType.GlobalVariable} data-id-ref="average-memory-output-type-globalvariable">
                <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                {t('averageMemory.sourceTypeGlobalVariable')}
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Output Item Selection (Point) */}
            {formData.outputType === TimeoutSourceType.Point && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Autocomplete
                  options={analogOutputItems}
                  getOptionLabel={getItemLabel}
                  value={analogOutputItems.find((item) => item.id === formData.outputReference) || null}
                  onChange={handleOutputItemChange}
                  disabled={loading}
                  data-id-ref="average-memory-output-item-select"
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('averageMemory.outputItem')}
                      required
                      error={!!formErrors.outputReference}
                      helperText={formErrors.outputReference || t('averageMemory.outputItemHelp')}
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
                  onClick={handleHelpOpen('averageMemory.help.outputItem')}
                  sx={{ p: 0.25, mt: 1 }}
                  data-id-ref="average-memory-output-item-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            )}

            {/* Output Global Variable Selection */}
            {formData.outputType === TimeoutSourceType.GlobalVariable && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Autocomplete
                  options={floatGlobalVariables}
                  getOptionLabel={getVariableLabel}
                  value={floatGlobalVariables.find((v) => v.name === formData.outputReference) || null}
                  onChange={handleOutputVariableChange}
                  disabled={loading || loadingGlobalVariables}
                  data-id-ref="average-memory-output-variable-select"
                  sx={{ flex: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('averageMemory.outputGlobalVariable')}
                      required
                      error={!!formErrors.outputReference}
                      helperText={formErrors.outputReference || t('averageMemory.outputGlobalVariableHelp')}
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
                          label="Float"
                          size="small"
                          color="info"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  )}
                  isOptionEqualToValue={(option, value) => option.name === value.name}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('averageMemory.help.outputGlobalVariable')}
                  sx={{ p: 0.25, mt: 1 }}
                  data-id-ref="average-memory-output-variable-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Interval */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            <IconButton
              size="small"
              onClick={handleHelpOpen('averageMemory.help.interval')}
              sx={{ p: 0.25, mt: -3 }}
              data-id-ref="average-memory-interval-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Minimum Inputs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            <IconButton
              size="small"
              onClick={handleHelpOpen('averageMemory.help.minimumInputs')}
              sx={{ p: 0.25, mt: -3 }}
              data-id-ref="average-memory-minimum-inputs-help-btn"
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          <Divider />

          {/* Moving Average Configuration */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography>{t('averageMemory.movingAverageConfig')}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpOpen('averageMemory.help.movingAverageConfig')(e);
                  }}
                  sx={{ p: 0.25 }}
                  data-id-ref="average-memory-moving-avg-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  {t('averageMemory.movingAverageNote')}
                </Alert>

                {/* Average Type */}
                <FormControl fullWidth>
                  <InputLabel>{t('averageMemory.averageType.label')}</InputLabel>
                  <Select
                    value={formData.averageType}
                    label={t('averageMemory.averageType.label')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        averageType: Number(e.target.value) as MovingAverageType,
                      }))
                    }
                    data-id-ref="average-memory-type-select"
                  >
                    <MenuItem value={MovingAverageTypeEnum.Simple}>
                      {t('averageMemory.averageType.simple')}
                    </MenuItem>
                    <MenuItem value={MovingAverageTypeEnum.Exponential}>
                      {t('averageMemory.averageType.exponential')}
                    </MenuItem>
                    <MenuItem value={MovingAverageTypeEnum.Weighted}>
                      {t('averageMemory.averageType.weighted')}
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Window Size - for SMA and WMA */}
                {(formData.averageType === MovingAverageTypeEnum.Simple ||
                  formData.averageType === MovingAverageTypeEnum.Weighted) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      type="number"
                      label={t('averageMemory.windowSize')}
                      value={formData.windowSize}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          windowSize: Math.max(2, Math.min(1000, Number(e.target.value))),
                        }))
                      }
                      fullWidth
                      error={!!formErrors.windowSize}
                      helperText={formErrors.windowSize || t('averageMemory.windowSizeHelp')}
                      inputProps={{ min: 2, max: 1000 }}
                      data-id-ref="average-memory-window-size-input"
                    />
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('averageMemory.help.windowSize')}
                      sx={{ p: 0.25, mt: -3 }}
                      data-id-ref="average-memory-window-size-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                )}

                {/* Alpha - for EMA */}
                {formData.averageType === MovingAverageTypeEnum.Exponential && (
                  <Box sx={{ px: 1 }}>
                    <Typography gutterBottom>
                      {t('averageMemory.alpha')}: {formData.alpha.toFixed(2)}
                    </Typography>
                    <Slider
                      value={formData.alpha}
                      onChange={(_, value) =>
                        setFormData((prev) => ({
                          ...prev,
                          alpha: value as number,
                        }))
                      }
                      min={0.01}
                      max={1.0}
                      step={0.01}
                      marks={[
                        { value: 0.01, label: '0.01' },
                        { value: 0.2, label: '0.2' },
                        { value: 0.5, label: '0.5' },
                        { value: 1.0, label: '1.0' },
                      ]}
                      valueLabelDisplay="auto"
                      data-id-ref="average-memory-alpha-slider"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('averageMemory.alphaHelp')}
                    </Typography>
                  </Box>
                )}

                {/* Use Linear Weights - for WMA */}
                {formData.averageType === MovingAverageTypeEnum.Weighted && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.useLinearWeights}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            useLinearWeights: e.target.checked,
                          }))
                        }
                        data-id-ref="average-memory-use-linear-weights-switch"
                      />
                    }
                    label={t('averageMemory.useLinearWeights')}
                  />
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography>{t('averageMemory.weightedAverage')}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpOpen('averageMemory.help.weightedAverage')(e);
                  }}
                  sx={{ p: 0.25 }}
                  data-id-ref="average-memory-weighted-avg-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
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
                    {formData.inputItemIds.map((ref, index) => {
                      const parsed = parseSourceReference(ref);
                      let sourceLabel = ref;
                      if (parsed.type === 'Point') {
                        const item = items.find((i) => i.id === parsed.value);
                        sourceLabel = item ? getItemLabel(item) : parsed.value;
                      } else {
                        sourceLabel = parsed.value; // Global Variable name
                      }
                      return (
                        <Box key={ref} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
                            {parsed.type === 'Point' ? <MemoryIcon fontSize="small" /> : <FunctionsIcon fontSize="small" />}
                            <Typography variant="body2" noWrap>
                              {sourceLabel}
                            </Typography>
                          </Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography>{t('averageMemory.staleInputHandling')}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpOpen('averageMemory.help.staleInputHandling')(e);
                  }}
                  sx={{ p: 0.25 }}
                  data-id-ref="average-memory-stale-handling-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('averageMemory.help.staleTimeout')}
                      sx={{ p: 0.25, mt: -3 }}
                      data-id-ref="average-memory-stale-timeout-help-btn"
                    >
                      <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Outlier Detection */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography>{t('averageMemory.outlierDetection')}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpOpen('averageMemory.help.outlierDetection')(e);
                  }}
                  sx={{ p: 0.25 }}
                  data-id-ref="average-memory-outlier-detection-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
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

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                      <IconButton
                        size="small"
                        onClick={handleHelpOpen('averageMemory.help.outlierThreshold')}
                        sx={{ p: 0.25, mt: -3 }}
                        data-id-ref="average-memory-outlier-threshold-help-btn"
                      >
                        <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      </IconButton>
                    </Box>
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

      {/* Field Help Popovers */}
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.name']}
        open={Boolean(helpAnchorEl['averageMemory.help.name'])}
        onClose={handleHelpClose('averageMemory.help.name')}
        fieldKey="averageMemory.help.name"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.inputSources']}
        open={Boolean(helpAnchorEl['averageMemory.help.inputSources'])}
        onClose={handleHelpClose('averageMemory.help.inputSources')}
        fieldKey="averageMemory.help.inputSources"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.outputItem']}
        open={Boolean(helpAnchorEl['averageMemory.help.outputItem'])}
        onClose={handleHelpClose('averageMemory.help.outputItem')}
        fieldKey="averageMemory.help.outputItem"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.outputGlobalVariable']}
        open={Boolean(helpAnchorEl['averageMemory.help.outputGlobalVariable'])}
        onClose={handleHelpClose('averageMemory.help.outputGlobalVariable')}
        fieldKey="averageMemory.help.outputGlobalVariable"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.interval']}
        open={Boolean(helpAnchorEl['averageMemory.help.interval'])}
        onClose={handleHelpClose('averageMemory.help.interval')}
        fieldKey="averageMemory.help.interval"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.minimumInputs']}
        open={Boolean(helpAnchorEl['averageMemory.help.minimumInputs'])}
        onClose={handleHelpClose('averageMemory.help.minimumInputs')}
        fieldKey="averageMemory.help.minimumInputs"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.weightedAverage']}
        open={Boolean(helpAnchorEl['averageMemory.help.weightedAverage'])}
        onClose={handleHelpClose('averageMemory.help.weightedAverage')}
        fieldKey="averageMemory.help.weightedAverage"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.staleInputHandling']}
        open={Boolean(helpAnchorEl['averageMemory.help.staleInputHandling'])}
        onClose={handleHelpClose('averageMemory.help.staleInputHandling')}
        fieldKey="averageMemory.help.staleInputHandling"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.staleTimeout']}
        open={Boolean(helpAnchorEl['averageMemory.help.staleTimeout'])}
        onClose={handleHelpClose('averageMemory.help.staleTimeout')}
        fieldKey="averageMemory.help.staleTimeout"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.outlierDetection']}
        open={Boolean(helpAnchorEl['averageMemory.help.outlierDetection'])}
        onClose={handleHelpClose('averageMemory.help.outlierDetection')}
        fieldKey="averageMemory.help.outlierDetection"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.outlierThreshold']}
        open={Boolean(helpAnchorEl['averageMemory.help.outlierThreshold'])}
        onClose={handleHelpClose('averageMemory.help.outlierThreshold')}
        fieldKey="averageMemory.help.outlierThreshold"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.movingAverageConfig']}
        open={Boolean(helpAnchorEl['averageMemory.help.movingAverageConfig'])}
        onClose={handleHelpClose('averageMemory.help.movingAverageConfig')}
        fieldKey="averageMemory.help.movingAverageConfig"
      />
      <FieldHelpPopover
        anchorEl={helpAnchorEl['averageMemory.help.windowSize']}
        open={Boolean(helpAnchorEl['averageMemory.help.windowSize'])}
        onClose={handleHelpClose('averageMemory.help.windowSize')}
        fieldKey="averageMemory.help.windowSize"
      />
    </Dialog>
  );
};

export default AddEditAverageMemoryDialog;
