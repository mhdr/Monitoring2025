import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Autocomplete,
  MenuItem,
  Divider,
  Chip,
  IconButton,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Tune as TuneIcon,
  HelpOutline as HelpOutlineIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Memory as MemoryIcon,
  Functions as FunctionsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addDeadbandMemory, editDeadbandMemory, getGlobalVariables } from '../services/extendedApi';
import type { DeadbandMemoryWithItems, Item, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, DeadbandType, DeadbandSourceType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditDeadbandMemoryDialog');

interface Props {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  deadbandMemory: DeadbandMemoryWithItems | null;
  editMode: boolean;
}

/**
 * Check if item type is analog (input or output)
 */
const isAnalogType = (itemType?: ItemType): boolean => {
  return itemType === ItemTypeEnum.AnalogInput || itemType === ItemTypeEnum.AnalogOutput;
};

/**
 * Check if item type is a digital type
 */
const isDigitalType = (itemType?: ItemType): boolean => {
  return itemType === ItemTypeEnum.DigitalInput || itemType === ItemTypeEnum.DigitalOutput;
};

/**
 * Check if item type is an input type
 */
const isInputType = (itemType?: ItemType): boolean => {
  return itemType === ItemTypeEnum.AnalogInput || itemType === ItemTypeEnum.DigitalInput;
};

/**
 * Check if item type is an output type
 */
const isOutputType = (itemType?: ItemType): boolean => {
  return itemType === ItemTypeEnum.AnalogOutput || itemType === ItemTypeEnum.DigitalOutput;
};

/**
 * Get matching output type for an input type
 */
const getMatchingOutputType = (inputItemType?: ItemType): ItemType | null => {
  switch (inputItemType) {
    case ItemTypeEnum.AnalogInput:
      return ItemTypeEnum.AnalogOutput;
    case ItemTypeEnum.DigitalInput:
      return ItemTypeEnum.DigitalOutput;
    default:
      return null;
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
 * Get ItemType color
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
 * AddEditDeadbandMemoryDialog Component
 * Dialog for adding or editing deadband/hysteresis memory configurations
 * Auto-detects input type and shows appropriate fields
 */
const AddEditDeadbandMemoryDialog: React.FC<Props> = ({ open, onClose, deadbandMemory, editMode }) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Form state
  const [name, setName] = useState('');
  
  // Source type toggles
  const [inputType, setInputType] = useState<number>(DeadbandSourceType.Point);
  const [outputType, setOutputType] = useState<number>(DeadbandSourceType.Point);
  
  const [inputItem, setInputItem] = useState<Item | null>(null);
  const [outputItem, setOutputItem] = useState<Item | null>(null);
  const [inputVariable, setInputVariable] = useState<GlobalVariable | null>(null);
  const [outputVariable, setOutputVariable] = useState<GlobalVariable | null>(null);
  
  const [interval, setInterval] = useState(1);
  const [isDisabled, setIsDisabled] = useState(false);

  // Analog-specific fields
  const [deadband, setDeadband] = useState(0);
  const [deadbandType, setDeadbandType] = useState<typeof DeadbandType[keyof typeof DeadbandType]>(DeadbandType.Absolute);
  const [inputMin, setInputMin] = useState(0);
  const [inputMax, setInputMax] = useState(100);

  // Digital-specific fields
  const [stabilityTime, setStabilityTime] = useState(1);

  // Global variables
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loadingGlobalVariables, setLoadingGlobalVariables] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  /**
   * Detect if current input is analog or digital
   */
  const isAnalogInput = useMemo(() => {
    if (inputType === DeadbandSourceType.GlobalVariable && inputVariable) {
      // For global variables, check the variableType: Float=1 (Analog), Boolean=0 (Digital)
      return inputVariable.variableType === 1; // Float = Analog
    }
    return inputItem ? isAnalogType(inputItem.itemType) : null;
  }, [inputItem, inputType, inputVariable]);

  const isDigitalInput = useMemo(() => {
    if (inputType === DeadbandSourceType.GlobalVariable && inputVariable) {
      // For global variables, check the variableType: Float=1 (Analog), Boolean=0 (Digital)
      return inputVariable.variableType === 0; // Boolean = Digital
    }
    return inputItem ? isDigitalType(inputItem.itemType) : null;
  }, [inputItem, inputType, inputVariable]);

  /**
   * Filter items for input selection (only input types)
   */
  const inputItems = useMemo(() => {
    return items.filter((item) => isInputType(item.itemType));
  }, [items]);

  /**
   * Filter items for output selection based on selected input type
   */
  const outputItems = useMemo(() => {
    // When output type is GlobalVariable, this filter is not used
    if (outputType === DeadbandSourceType.GlobalVariable) {
      return [];
    }

    // Check input source type and determine analog/digital
    let inputIsAnalog: boolean | null = null;
    if (inputType === DeadbandSourceType.Point && inputItem) {
      inputIsAnalog = isAnalogType(inputItem.itemType);
    } else if (inputType === DeadbandSourceType.GlobalVariable && inputVariable) {
      inputIsAnalog = inputVariable.variableType === 1;
    }

    if (inputIsAnalog === null) {
      // If no input selected, show all output types
      return items.filter((item) => isOutputType(item.itemType));
    }

    // Filter to matching output type (analog→analogOut, digital→digitalOut)
    if (inputIsAnalog) {
      // Analog input needs Analog Output
      return items.filter((item) => item.itemType === 3); // AnalogOutput = 3
    } else {
      // Digital input needs Digital Output
      return items.filter((item) => item.itemType === 2); // DigitalOutput = 2
    }
  }, [items, inputItem, inputVariable, inputType, outputType]);

  /**
   * Handle help popover
   */
  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  /**
   * Fetch global variables when dialog opens
   */
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

  /**
   * Initialize form when dialog opens or memory changes
   */
  useEffect(() => {
    if (open) {
      if (editMode && deadbandMemory) {
        setName(deadbandMemory.name || '');
        setInputType(deadbandMemory.inputType);
        setOutputType(deadbandMemory.outputType);
        setInterval(deadbandMemory.interval);
        setIsDisabled(deadbandMemory.isDisabled);
        setDeadband(deadbandMemory.deadband);
        setDeadbandType(deadbandMemory.deadbandType);
        setInputMin(deadbandMemory.inputMin);
        setInputMax(deadbandMemory.inputMax);
        setStabilityTime(deadbandMemory.stabilityTime);

        // Handle input source
        if (deadbandMemory.inputType === DeadbandSourceType.Point) {
          const foundInputItem = items.find((item) => item.id === deadbandMemory.inputReference) || null;
          setInputItem(foundInputItem);
          setInputVariable(null);
        } else {
          const foundInputVar = globalVariables.find((v) => v.name === deadbandMemory.inputReference) || null;
          setInputVariable(foundInputVar);
          setInputItem(null);
        }

        // Handle output source
        if (deadbandMemory.outputType === DeadbandSourceType.Point) {
          const foundOutputItem = items.find((item) => item.id === deadbandMemory.outputReference) || null;
          setOutputItem(foundOutputItem);
          setOutputVariable(null);
        } else {
          const foundOutputVar = globalVariables.find((v) => v.name === deadbandMemory.outputReference) || null;
          setOutputVariable(foundOutputVar);
          setOutputItem(null);
        }
      } else {
        // Reset for add mode
        setName('');
        setInputType(DeadbandSourceType.Point);
        setOutputType(DeadbandSourceType.Point);
        setInputItem(null);
        setOutputItem(null);
        setInputVariable(null);
        setOutputVariable(null);
        setInterval(1);
        setIsDisabled(false);
        setDeadband(0);
        setDeadbandType(DeadbandType.Absolute);
        setInputMin(0);
        setInputMax(100);
        setStabilityTime(1);
      }
      setError(null);
    }
  }, [open, editMode, deadbandMemory, items, globalVariables]);

  /**
   * Clear output item when input item type changes (to ensure matching types)
   */
  useEffect(() => {
    if (inputItem && outputItem) {
      const matchingOutputType = getMatchingOutputType(inputItem.itemType);
      if (matchingOutputType && outputItem.itemType !== matchingOutputType) {
        setOutputItem(null);
      }
    }
  }, [inputItem, outputItem]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!name.trim()) {
        setError(t('deadbandMemory.errors.nameRequired'));
        return;
      }

      // Validate input source
      const inputReference = inputType === DeadbandSourceType.Point 
        ? (inputItem?.id || '') 
        : (inputVariable?.name || '');
      
      if (!inputReference) {
        setError(t('deadbandMemory.errors.inputItemRequired'));
        return;
      }

      // Validate output source
      const outputReference = outputType === DeadbandSourceType.Point
        ? (outputItem?.id || '')
        : (outputVariable?.name || '');
      
      if (!outputReference) {
        setError(t('deadbandMemory.errors.outputItemRequired'));
        return;
      }

      if (interval < 1) {
        setError(t('deadbandMemory.errors.intervalMinimum'));
        return;
      }

      // Type-specific validation
      if (isAnalogInput) {
        if (deadband < 0) {
          setError(t('deadbandMemory.errors.deadbandNegative'));
          return;
        }

        if (deadbandType === DeadbandType.Percentage && deadband > 100) {
          setError(t('deadbandMemory.errors.percentageMax'));
          return;
        }

        if (inputMin >= inputMax) {
          setError(t('deadbandMemory.errors.minMaxInvalid'));
          return;
        }
      } else if (isDigitalInput) {
        if (stabilityTime < 0) {
          setError(t('deadbandMemory.errors.stabilityTimeNegative'));
          return;
        }
      }

      if (editMode && deadbandMemory) {
        // Edit existing
        const response = await editDeadbandMemory({
          id: deadbandMemory.id,
          name: name.trim(),
          inputType,
          inputReference,
          outputType,
          outputReference,
          interval,
          isDisabled,
          deadband: isAnalogInput ? deadband : 0,
          deadbandType: isAnalogInput ? deadbandType : DeadbandType.Absolute,
          inputMin: isAnalogInput ? inputMin : 0,
          inputMax: isAnalogInput ? inputMax : 100,
          stabilityTime: isDigitalInput ? stabilityTime : 0,
        });

        if (!response.isSuccessful) {
          setError(response.errorMessage || 'Failed to update deadband memory');
          return;
        }

        logger.info('Deadband memory updated successfully', { id: deadbandMemory.id });
      } else {
        // Add new
        const response = await addDeadbandMemory({
          name: name.trim(),
          inputType,
          inputReference,
          outputType,
          outputReference,
          interval,
          isDisabled,
          deadband: isAnalogInput ? deadband : 0,
          deadbandType: isAnalogInput ? deadbandType : DeadbandType.Absolute,
          inputMin: isAnalogInput ? inputMin : 0,
          inputMax: isAnalogInput ? inputMax : 100,
          stabilityTime: isDigitalInput ? stabilityTime : 0,
        });

        if (!response.isSuccessful) {
          setError(response.errorMessage || 'Failed to add deadband memory');
          return;
        }

        logger.info('Deadband memory added successfully');
      }

      onClose(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to save deadband memory', err);
    } finally {
      setLoading(false);
    }
  }, [
    name,
    inputType,
    inputItem,
    inputVariable,
    outputType,
    outputItem,
    outputVariable,
    interval,
    isDisabled,
    deadband,
    deadbandType,
    inputMin,
    inputMax,
    stabilityTime,
    isAnalogInput,
    isDigitalInput,
    editMode,
    deadbandMemory,
    onClose,
    t,
  ]);

  /**
   * Render item option in autocomplete
   */
  const renderItemOption = (props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key }, option: Item) => {
    const itemName = language === 'fa' ? option.nameFa || option.name : option.name;
    return (
      <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {itemName}
        </Typography>
        <Chip
          label={getItemTypeLabel(option.itemType, t)}
          size="small"
          color={getItemTypeColor(option.itemType)}
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
      </Box>
    );
  };

  /**
   * Get item display label
   */
  const getItemLabel = (option: Item): string => {
    return language === 'fa' ? option.nameFa || option.name || '' : option.name || '';
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-deadband-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-deadband-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon color="primary" />
          <Typography variant="h6" component="span">
            {editMode ? t('deadbandMemory.editTitle') : t('deadbandMemory.addTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="add-edit-deadband-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="add-edit-deadband-memory-error-alert">
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={t('deadbandMemory.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('name')}
                      data-id-ref="deadband-memory-name-help-btn"
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="deadband-memory-name-input"
            />
            <FieldHelpPopover
              anchorEl={helpAnchorEl['name']}
              open={Boolean(helpAnchorEl['name'])}
              onClose={handleHelpClose('name')}
              fieldKey="deadbandMemory.help.name"
            />
          </Grid>

          {/* Interval */}
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              label={t('deadbandMemory.interval')}
              type="number"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="text.secondary">s</Typography>
                    <IconButton
                      size="small"
                      onClick={handleHelpOpen('interval')}
                      data-id-ref="deadband-memory-interval-help-btn"
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="deadband-memory-interval-input"
            />
            <FieldHelpPopover
              anchorEl={helpAnchorEl['interval']}
              open={Boolean(helpAnchorEl['interval'])}
              onClose={handleHelpClose('interval')}
              fieldKey="deadbandMemory.help.interval"
            />
          </Grid>

          {/* Disabled Toggle */}
          <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!isDisabled}
                  onChange={(e) => setIsDisabled(!e.target.checked)}
                  disabled={loading}
                  data-id-ref="deadband-memory-enabled-switch"
                />
              }
              label={t('deadbandMemory.enabled')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Input Source Type */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom data-id-ref="deadband-memory-input-type-label">
              {t('deadbandMemory.inputSource')} *
            </Typography>
            <ToggleButtonGroup
              value={inputType}
              exclusive
              onChange={(_, value) => {
                if (value !== null) {
                  setInputType(value);
                  setInputItem(null);
                  setInputVariable(null);
                }
              }}
              fullWidth
              disabled={loading}
              data-id-ref="deadband-memory-input-type-toggle"
              sx={{ mb: 2 }}
            >
              <ToggleButton value={DeadbandSourceType.Point} data-id-ref="deadband-memory-input-type-point">
                <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                {t('common.point')}
              </ToggleButton>
              <ToggleButton value={DeadbandSourceType.GlobalVariable} data-id-ref="deadband-memory-input-type-globalvariable">
                <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                {t('common.globalVariable')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Input Source Selection */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <>
              {inputType === DeadbandSourceType.Point ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={inputItems}
                    value={inputItem}
                    onChange={(_, newValue) => setInputItem(newValue)}
                    getOptionLabel={getItemLabel}
                    renderOption={renderItemOption}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('deadbandMemory.inputItem')}
                      required
                      data-id-ref="deadband-memory-input-item-input"
                    />
                  )}
                  disabled={loading}
                  fullWidth
                  data-id-ref="deadband-memory-input-item-autocomplete"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('inputItem')}
                  sx={{ mt: 1 }}
                  data-id-ref="deadband-memory-input-item-help-btn"
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={globalVariables}
                    value={inputVariable}
                    onChange={(_, newValue) => setInputVariable(newValue)}
                    getOptionLabel={(option) => option.name}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.name}>
                        <Chip
                          icon={<FunctionsIcon fontSize="small" />}
                          label={option.variableType}
                          size="small"
                          sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                        />
                        {option.name}
                      </Box>
                    )}
                    isOptionEqualToValue={(option, value) => option.name === value.name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('common.globalVariable')}
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingGlobalVariables ? <CircularProgress size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        data-id-ref="deadband-memory-input-variable-input"
                      />
                    )}
                    disabled={loading || loadingGlobalVariables}
                    fullWidth
                    data-id-ref="deadband-memory-input-variable-autocomplete"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('inputVariable')}
                    sx={{ mt: 1 }}
                    data-id-ref="deadband-memory-input-variable-help-btn"
                  >
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <FieldHelpPopover
                anchorEl={helpAnchorEl['inputItem']}
                open={Boolean(helpAnchorEl['inputItem'])}
                onClose={handleHelpClose('inputItem')}
                fieldKey="deadbandMemory.help.inputItem"
              />
            </>
          </Grid>

          {/* Output Source Type */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom data-id-ref="deadband-memory-output-type-label">
              {t('deadbandMemory.outputSource')} *
            </Typography>
            <ToggleButtonGroup
              value={outputType}
              exclusive
              onChange={(_, value) => {
                if (value !== null) {
                  setOutputType(value);
                  setOutputItem(null);
                  setOutputVariable(null);
                }
              }}
              fullWidth
              disabled={loading}
              data-id-ref="deadband-memory-output-type-toggle"
              sx={{ mb: 2 }}
            >
              <ToggleButton value={DeadbandSourceType.Point} data-id-ref="deadband-memory-output-type-point">
                <MemoryIcon sx={{ mr: 1 }} fontSize="small" />
                {t('common.point')}
              </ToggleButton>
              <ToggleButton value={DeadbandSourceType.GlobalVariable} data-id-ref="deadband-memory-output-type-globalvariable">
                <FunctionsIcon sx={{ mr: 1 }} fontSize="small" />
                {t('common.globalVariable')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Output Source Selection */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <>
              {outputType === DeadbandSourceType.Point ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={outputItems}
                    value={outputItem}
                    onChange={(_, newValue) => setOutputItem(newValue)}
                  getOptionLabel={getItemLabel}
                  renderOption={renderItemOption}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('deadbandMemory.outputItem')}
                      required
                      data-id-ref="deadband-memory-output-item-input"
                    />
                  )}
                  disabled={loading}
                  fullWidth
                  data-id-ref="deadband-memory-output-item-autocomplete"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('outputItem')}
                  sx={{ mt: 1 }}
                  data-id-ref="deadband-memory-output-item-help-btn"
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={globalVariables}
                    value={outputVariable}
                    onChange={(_, newValue) => setOutputVariable(newValue)}
                    getOptionLabel={(option) => option.name}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.name}>
                        <Chip
                          icon={<FunctionsIcon fontSize="small" />}
                          label={option.variableType}
                          size="small"
                          sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                        />
                        {option.name}
                      </Box>
                    )}
                    isOptionEqualToValue={(option, value) => option.name === value.name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('common.globalVariable')}
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingGlobalVariables ? <CircularProgress size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        data-id-ref="deadband-memory-output-variable-input"
                      />
                    )}
                    disabled={loading || loadingGlobalVariables}
                    fullWidth
                    data-id-ref="deadband-memory-output-variable-autocomplete"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('outputVariable')}
                    sx={{ mt: 1 }}
                    data-id-ref="deadband-memory-output-variable-help-btn"
                  >
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <FieldHelpPopover
                anchorEl={helpAnchorEl['outputItem']}
                open={Boolean(helpAnchorEl['outputItem'])}
                onClose={handleHelpClose('outputItem')}
                fieldKey="deadbandMemory.help.outputItem"
              />
            </>
          </Grid>

          {/* Mode Indicator */}
          {(inputItem || inputVariable) && (isAnalogInput !== null || isDigitalInput !== null) && (
            <Grid size={{ xs: 12 }}>
              <Alert
                severity="info"
                icon={isAnalogInput ? <SpeedIcon /> : <TimerIcon />}
                sx={{ py: 0.5 }}
                data-id-ref="deadband-memory-mode-indicator"
              >
                <Typography variant="body2">
                  {isAnalogInput
                    ? t('deadbandMemory.modeAnalog')
                    : t('deadbandMemory.modeDigital')}
                </Typography>
              </Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Analog-specific fields */}
          {(isAnalogInput === true || (isAnalogInput === null && !isDigitalInput)) && (
            <>
              {/* Deadband Type */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t('deadbandMemory.deadbandType.label')}
                  select
                  value={deadbandType}
                  onChange={(e) => setDeadbandType(Number(e.target.value) as typeof DeadbandType[keyof typeof DeadbandType])}
                  fullWidth
                  disabled={loading || isDigitalInput === true}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={handleHelpOpen('deadbandType')}
                          data-id-ref="deadband-memory-type-help-btn"
                        >
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  data-id-ref="deadband-memory-type-select"
                >
                  <MenuItem value={DeadbandType.Absolute}>
                    {t('deadbandMemory.deadbandType.absolute')}
                  </MenuItem>
                  <MenuItem value={DeadbandType.Percentage}>
                    {t('deadbandMemory.deadbandType.percentage')}
                  </MenuItem>
                  <MenuItem value={DeadbandType.RateOfChange}>
                    {t('deadbandMemory.deadbandType.rateOfChange')}
                  </MenuItem>
                </TextField>
                <FieldHelpPopover
                  anchorEl={helpAnchorEl['deadbandType']}
                  open={Boolean(helpAnchorEl['deadbandType'])}
                  onClose={handleHelpClose('deadbandType')}
                  fieldKey="deadbandMemory.help.deadbandType"
                />
              </Grid>

              {/* Deadband Value */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t('deadbandMemory.deadband')}
                  type="number"
                  value={deadband}
                  onChange={(e) => setDeadband(parseFloat(e.target.value) || 0)}
                  fullWidth
                  disabled={loading || isDigitalInput === true}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" color="text.secondary">
                          {deadbandType === DeadbandType.Percentage ? '%' :
                           deadbandType === DeadbandType.RateOfChange ? '/s' : ''}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={handleHelpOpen('deadband')}
                          data-id-ref="deadband-memory-deadband-help-btn"
                        >
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  data-id-ref="deadband-memory-deadband-input"
                />
                <FieldHelpPopover
                  anchorEl={helpAnchorEl['deadband']}
                  open={Boolean(helpAnchorEl['deadband'])}
                  onClose={handleHelpClose('deadband')}
                  fieldKey="deadbandMemory.help.deadband"
                />
              </Grid>

              {/* Input Min (for Percentage mode) */}
              {deadbandType === DeadbandType.Percentage && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label={t('deadbandMemory.inputMin')}
                      type="number"
                      value={inputMin}
                      onChange={(e) => setInputMin(parseFloat(e.target.value) || 0)}
                      fullWidth
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={handleHelpOpen('inputMin')}
                              data-id-ref="deadband-memory-inputmin-help-btn"
                            >
                              <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      data-id-ref="deadband-memory-inputmin-input"
                    />
                    <FieldHelpPopover
                      anchorEl={helpAnchorEl['inputMin']}
                      open={Boolean(helpAnchorEl['inputMin'])}
                      onClose={handleHelpClose('inputMin')}
                      fieldKey="deadbandMemory.help.inputMin"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label={t('deadbandMemory.inputMax')}
                      type="number"
                      value={inputMax}
                      onChange={(e) => setInputMax(parseFloat(e.target.value) || 0)}
                      fullWidth
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={handleHelpOpen('inputMax')}
                              data-id-ref="deadband-memory-inputmax-help-btn"
                            >
                              <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      data-id-ref="deadband-memory-inputmax-input"
                    />
                    <FieldHelpPopover
                      anchorEl={helpAnchorEl['inputMax']}
                      open={Boolean(helpAnchorEl['inputMax'])}
                      onClose={handleHelpClose('inputMax')}
                      fieldKey="deadbandMemory.help.inputMax"
                    />
                  </Grid>
                </>
              )}
            </>
          )}

          {/* Digital-specific fields */}
          {isDigitalInput === true && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('deadbandMemory.stabilityTime')}
                type="number"
                value={stabilityTime}
                onChange={(e) => setStabilityTime(Math.max(0, parseFloat(e.target.value) || 0))}
                fullWidth
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" color="text.secondary">s</Typography>
                      <IconButton
                        size="small"
                        onClick={handleHelpOpen('stabilityTime')}
                        data-id-ref="deadband-memory-stabilitytime-help-btn"
                      >
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                data-id-ref="deadband-memory-stabilitytime-input"
              />
              <FieldHelpPopover
                anchorEl={helpAnchorEl['stabilityTime']}
                open={Boolean(helpAnchorEl['stabilityTime'])}
                onClose={handleHelpClose('stabilityTime')}
                fieldKey="deadbandMemory.help.stabilityTime"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions data-id-ref="add-edit-deadband-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="add-edit-deadband-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
          data-id-ref="add-edit-deadband-memory-submit-btn"
        >
          {editMode ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditDeadbandMemoryDialog;
