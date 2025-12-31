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
} from '@mui/material';
import {
  Tune as TuneIcon,
  HelpOutline as HelpOutlineIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addDeadbandMemory, editDeadbandMemory } from '../services/extendedApi';
import type { DeadbandMemoryWithItems, Item, ItemType } from '../types/api';
import { ItemTypeEnum, DeadbandType } from '../types/api';
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
  const [inputItem, setInputItem] = useState<Item | null>(null);
  const [outputItem, setOutputItem] = useState<Item | null>(null);
  const [interval, setInterval] = useState(1);
  const [isDisabled, setIsDisabled] = useState(false);

  // Analog-specific fields
  const [deadband, setDeadband] = useState(0);
  const [deadbandType, setDeadbandType] = useState<typeof DeadbandType[keyof typeof DeadbandType]>(DeadbandType.Absolute);
  const [inputMin, setInputMin] = useState(0);
  const [inputMax, setInputMax] = useState(100);

  // Digital-specific fields
  const [stabilityTime, setStabilityTime] = useState(1);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  /**
   * Detect if current input is analog or digital
   */
  const isAnalogInput = useMemo(() => {
    return inputItem ? isAnalogType(inputItem.itemType) : null;
  }, [inputItem]);

  const isDigitalInput = useMemo(() => {
    return inputItem ? isDigitalType(inputItem.itemType) : null;
  }, [inputItem]);

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
    if (!inputItem) {
      // If no input selected, show all output types
      return items.filter((item) => isOutputType(item.itemType));
    }

    // Filter to matching output type (analog→analogOut, digital→digitalOut)
    const matchingOutputType = getMatchingOutputType(inputItem.itemType);
    if (!matchingOutputType) {
      return items.filter((item) => isOutputType(item.itemType));
    }

    return items.filter((item) => item.itemType === matchingOutputType);
  }, [items, inputItem]);

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
   * Initialize form when dialog opens or memory changes
   */
  useEffect(() => {
    if (open) {
      if (editMode && deadbandMemory) {
        setName(deadbandMemory.name || '');
        setInterval(deadbandMemory.interval);
        setIsDisabled(deadbandMemory.isDisabled);
        setDeadband(deadbandMemory.deadband);
        setDeadbandType(deadbandMemory.deadbandType);
        setInputMin(deadbandMemory.inputMin);
        setInputMax(deadbandMemory.inputMax);
        setStabilityTime(deadbandMemory.stabilityTime);

        // Find items
        const foundInputItem = items.find((item) => item.id === deadbandMemory.inputItemId) || null;
        const foundOutputItem = items.find((item) => item.id === deadbandMemory.outputItemId) || null;
        setInputItem(foundInputItem);
        setOutputItem(foundOutputItem);
      } else {
        // Reset for add mode
        setName('');
        setInputItem(null);
        setOutputItem(null);
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
  }, [open, editMode, deadbandMemory, items]);

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

      if (!inputItem) {
        setError(t('deadbandMemory.errors.inputItemRequired'));
        return;
      }

      if (!outputItem) {
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
          inputItemId: inputItem.id,
          outputItemId: outputItem.id,
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
          inputItemId: inputItem.id,
          outputItemId: outputItem.id,
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
    inputItem,
    outputItem,
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

          {/* Input Item */}
          <Grid size={{ xs: 12, sm: 6 }}>
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
            <FieldHelpPopover
              anchorEl={helpAnchorEl['inputItem']}
              open={Boolean(helpAnchorEl['inputItem'])}
              onClose={handleHelpClose('inputItem')}
              fieldKey="deadbandMemory.help.inputItem"
            />
          </Grid>

          {/* Output Item */}
          <Grid size={{ xs: 12, sm: 6 }}>
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
            <FieldHelpPopover
              anchorEl={helpAnchorEl['outputItem']}
              open={Boolean(helpAnchorEl['outputItem'])}
              onClose={handleHelpClose('outputItem')}
              fieldKey="deadbandMemory.help.outputItem"
            />
          </Grid>

          {/* Mode Indicator */}
          {inputItem && (
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
