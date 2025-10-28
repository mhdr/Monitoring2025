import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { createLogger } from '../utils/logger';
import { writeOrAddValue } from '../services/monitoringApi';
import type { Item } from '../types/api';
import { ItemTypeEnum } from '../types/api';

const logger = createLogger('ItemCommandDialog');

interface ItemCommandDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** The item to send commands to */
  item: Item;
  /** Function to call when a command is sent successfully */
  onCommandSent?: (itemId: string, value: string) => void;
}

/**
 * Dialog component for sending commands to monitoring items.
 * Provides appropriate UI controls based on item type:
 * - Digital items: ON/OFF switch
 * - Analog items: Numeric input with validation
 */
const ItemCommandDialog: React.FC<ItemCommandDialogProps> = ({
  open,
  onClose,
  item,
  onCommandSent,
}) => {
  const { t } = useTranslation();

  // State for command values
  const [digitalValue, setDigitalValue] = useState<boolean>(false);
  const [analogValue, setAnalogValue] = useState<string>('');
  const [duration, setDuration] = useState<string>(''); // Duration in seconds (optional)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  logger.log('ItemCommandDialog render', { 
    open, 
    itemId: item.id, 
    itemType: item.itemType,
    itemName: item.name 
  });

  /**
   * Determine if this is a digital item type
   */
  const isDigitalItem = useMemo(() => {
    return item.itemType === ItemTypeEnum.DigitalInput || 
           item.itemType === ItemTypeEnum.DigitalOutput;
  }, [item.itemType]);

  /**
   * Determine if this is an analog item type
   */
  const isAnalogItem = useMemo(() => {
    return item.itemType === ItemTypeEnum.AnalogInput || 
           item.itemType === ItemTypeEnum.AnalogOutput;
  }, [item.itemType]);

  /**
   * Get the scaled range for analog items
   */
  const analogRange = useMemo(() => {
    if (!isAnalogItem) return null;
    return {
      min: item.scaleMin ?? 0,
      max: item.scaleMax ?? 100,
    };
  }, [isAnalogItem, item.scaleMin, item.scaleMax]);

  /**
   * Reset form when dialog opens/closes
   */
  useEffect(() => {
    if (open) {
      // Reset form state
      setDigitalValue(false);
      setAnalogValue('');
      setDuration('');
      setError('');
      setSuccess(false);
      setIsLoading(false);
      
      logger.log('Dialog opened, form reset', { itemId: item.id });
    }
  }, [open, item.id]);

  /**
   * Auto-close dialog after successful command
   */
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Close after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  /**
   * Validate analog input
   */
  const validateAnalogValue = useMemo(() => {
    return (value: string): string | null => {
      if (!value.trim()) {
        return t('itemCommandDialog.validation.required');
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return t('itemCommandDialog.validation.invalidNumber');
      }

      if (analogRange) {
        if (numValue < analogRange.min) {
          return t('itemCommandDialog.validation.belowMinimum', { min: analogRange.min });
        }
        if (numValue > analogRange.max) {
          return t('itemCommandDialog.validation.aboveMaximum', { max: analogRange.max });
        }
      }

      return null;
    };
  }, [t, analogRange]);

  /**
   * Validate duration input (optional field)
   */
  const validateDuration = useMemo(() => {
    return (value: string): string | null => {
      // Duration is optional, so empty is valid
      if (!value.trim()) {
        return null;
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return t('itemCommandDialog.validation.invalidNumber');
      }

      if (numValue <= 0) {
        return t('itemCommandDialog.validation.invalidDuration');
      }

      return null;
    };
  }, [t]);

  /**
   * Get the command value to send
   */
  const getCommandValue = (): string => {
    if (isDigitalItem) {
      return digitalValue ? '1' : '0';
    } else if (isAnalogItem) {
      return analogValue.trim();
    }
    return '';
  };

  /**
   * Handle sending the command
   */
  const handleSendCommand = async () => {
    try {
      setError('');
      setIsLoading(true);

      const commandValue = getCommandValue();
      
      // Validate analog input
      if (isAnalogItem) {
        const validationError = validateAnalogValue(analogValue);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Validate duration if provided
      if (duration.trim()) {
        const durationError = validateDuration(duration);
        if (durationError) {
          setError(durationError);
          return;
        }
      }

      logger.log('Sending command', {
        itemId: item.id,
        itemName: item.name,
        itemType: item.itemType,
        commandValue,
        duration: duration.trim() || 'not specified',
      });

      // Send command via API
      const response = await writeOrAddValue({
        itemId: item.id!,
        value: commandValue,
        // time is optional - backend will use current time if not provided
        // duration is optional - only include if user provided a value
        ...(duration.trim() && { duration: parseInt(duration, 10) }),
      });

      if (response.isSuccess) {
        setSuccess(true);
      } else {
        throw new Error(t('itemCommandDialog.errors.commandFailed'));
      }
      
      // Call success callback
      if (onCommandSent) {
        onCommandSent(item.id!, commandValue);
      }

      logger.log('Command sent successfully', {
        itemId: item.id,
        commandValue,
        duration: duration.trim() || 'not specified',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('itemCommandDialog.errors.sendFailed');
      setError(errorMessage);
      
      logger.error('Failed to send command', {
        itemId: item.id,
        error: err,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  /**
   * Check if form is valid and ready to submit
   */
  const canSendCommand = useMemo(() => {
    if (isLoading || success) return false;
    
    // Validate duration if provided (it's optional)
    if (duration.trim() && validateDuration(duration) !== null) {
      return false;
    }
    
    if (isDigitalItem) {
      return true; // Digital items are always valid (boolean)
    } else if (isAnalogItem) {
      return analogValue.trim() !== '' && validateAnalogValue(analogValue) === null;
    }
    
    return false;
  }, [isDigitalItem, isAnalogItem, analogValue, duration, isLoading, success, validateAnalogValue, validateDuration]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-id-ref="item-command-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
        data-id-ref="item-command-dialog-title"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" data-id-ref="item-command-dialog-title-icon" />
          <Typography variant="h6" component="span" data-id-ref="item-command-dialog-title-text">
            {t('itemCommandDialog.title')}
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          size="small"
          variant="text"
          color="inherit"
          sx={{ minWidth: 'auto', p: 0.5 }}
          data-id-ref="item-command-dialog-close-button"
        >
          <CloseIcon fontSize="small" data-id-ref="item-command-dialog-close-icon" />
        </Button>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2, pb: 2 }} data-id-ref="item-command-dialog-content">
        <Stack spacing={3}>
          {/* Item Information */}
          <Box data-id-ref="item-command-dialog-item-info">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('itemCommandDialog.itemInformation')}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                label={item.name}
                size="small"
                color="primary"
                variant="outlined"
                data-id-ref="item-command-dialog-item-name-chip"
              />
              <Chip
                label={`${t('pointNumber')}: ${item.pointNumber}`}
                size="small"
                color="default"
                variant="outlined"
                data-id-ref="item-command-dialog-point-number-chip"
              />
              {item.unit && (
                <Chip
                  label={`${t('unit')}: ${item.unit}`}
                  size="small"
                  color="default"
                  variant="outlined"
                  data-id-ref="item-command-dialog-unit-chip"
                />
              )}
            </Stack>
          </Box>

          {/* Digital Item Controls */}
          {isDigitalItem && (
            <Box data-id-ref="item-command-dialog-digital-controls">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('itemCommandDialog.digitalCommand')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={digitalValue}
                    onChange={(e) => setDigitalValue(e.target.checked)}
                    disabled={isLoading || success}
                    color="primary"
                    data-id-ref="item-command-dialog-digital-switch"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      {digitalValue ? (item.onText || t('common.on')) : (item.offText || t('common.off'))}
                    </Typography>
                    <Chip
                      label={digitalValue ? '1' : '0'}
                      size="small"
                      color={digitalValue ? 'success' : 'default'}
                      variant="filled"
                      data-id-ref="item-command-dialog-digital-value-chip"
                    />
                  </Box>
                }
                data-id-ref="item-command-dialog-digital-control"
              />
            </Box>
          )}

          {/* Analog Item Controls */}
          {isAnalogItem && (
            <Box data-id-ref="item-command-dialog-analog-controls">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('itemCommandDialog.analogCommand')}
              </Typography>
              <TextField
                fullWidth
                type="number"
                label={t('itemCommandDialog.setValue')}
                value={analogValue}
                onChange={(e) => setAnalogValue(e.target.value)}
                disabled={isLoading || success}
                error={!!validateAnalogValue(analogValue) && analogValue.trim() !== ''}
                helperText={
                  analogValue.trim() !== '' 
                    ? validateAnalogValue(analogValue) 
                    : analogRange 
                      ? t('itemCommandDialog.rangeHelper', { 
                          min: analogRange.min, 
                          max: analogRange.max 
                        })
                      : undefined
                }
                InputProps={{
                  endAdornment: item.unit ? (
                    <InputAdornment position="end">
                      <Typography variant="caption" color="text.secondary">
                        {item.unit}
                      </Typography>
                    </InputAdornment>
                  ) : undefined,
                }}
                inputProps={{
                  step: 0.1,
                  ...(analogRange && {
                    min: analogRange.min,
                    max: analogRange.max,
                  }),
                }}
                data-id-ref="item-command-dialog-analog-input"
              />
            </Box>
          )}

          {/* Duration Field (Optional) - Shown for both digital and analog items */}
          <Box data-id-ref="item-command-dialog-duration-field">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('itemCommandDialog.duration')}
              <Chip 
                label={t('itemCommandDialog.durationOptional')} 
                size="small" 
                variant="outlined" 
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                data-id-ref="item-command-dialog-duration-optional-chip"
              />
            </Typography>
            <TextField
              fullWidth
              type="number"
              label={t('itemCommandDialog.duration')}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isLoading || success}
              error={!!duration.trim() && !!validateDuration(duration)}
              helperText={
                duration.trim() && validateDuration(duration)
                  ? validateDuration(duration)
                  : t('itemCommandDialog.durationHelper')
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="text.secondary">
                      {t('seconds')}
                    </Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                step: 1,
                min: 1,
              }}
              data-id-ref="item-command-dialog-duration-input"
            />
          </Box>

          {/* Error Display */}
          {error && (
            <Alert 
              severity="error" 
              icon={<ErrorIcon />}
              data-id-ref="item-command-dialog-error-alert"
            >
              {error}
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert 
              severity="success" 
              icon={<CheckCircleIcon />}
              data-id-ref="item-command-dialog-success-alert"
            >
              {t('itemCommandDialog.commandSentSuccessfully')}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }} data-id-ref="item-command-dialog-actions">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          disabled={isLoading}
          color="inherit"
          data-id-ref="item-command-dialog-cancel-button"
        >
          {success ? t('close') : t('cancel')}
        </Button>
        
        {!success && (
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSendCommand();
            }}
            disabled={!canSendCommand}
            variant="contained"
            color="primary"
            startIcon={
              isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            data-id-ref="item-command-dialog-send-button"
          >
            {isLoading ? t('itemCommandDialog.sending') : t('itemCommandDialog.sendCommand')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ItemCommandDialog;