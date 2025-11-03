import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { addAlarm } from '../services/monitoringApi';
import type {
  AddAlarmRequestDto,
  AddAlarmResponseDto,
  AlarmType,
  AlarmPriority,
  CompareType,
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddAlarmDialog');

// Constants matching backend enums
const AlarmTypeEnum = {
  Comparative: 1,
  Timeout: 2,
} as const;

const AlarmPriorityEnum = {
  Warning: 1,
  Alarm: 2,
} as const;

const CompareTypeEnum = {
  Equal: 1,
  NotEqual: 2,
  Higher: 3,
  Lower: 4,
  Between: 5,
} as const;

interface AddAlarmDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName?: string;
  onSuccess?: () => void;
}

interface AddAlarmFormData {
  alarmType: AlarmType;
  alarmPriority: AlarmPriority;
  compareType: CompareType;
  isDisabled: boolean;
  alarmDelay: number;
  message: string;
  value1: string;
  value2: string;
  timeout: number | null;
}

const AddAlarmDialog: React.FC<AddAlarmDialogProps> = ({
  open,
  onClose,
  itemId,
  itemName,
  onSuccess,
}) => {
  const { t } = useLanguage();
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<AddAlarmFormData>({
    alarmType: AlarmTypeEnum.Comparative,
    alarmPriority: AlarmPriorityEnum.Alarm,
    compareType: CompareTypeEnum.Higher,
    isDisabled: false,
    alarmDelay: 5,
    message: '',
    value1: '',
    value2: '',
    timeout: null,
  });

  // Check if value2 field should be shown (only for Between comparison)
  const showValue2 = useMemo(() => {
    return formData.compareType === CompareTypeEnum.Between;
  }, [formData.compareType]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Message validation (optional, but if provided max 500 chars)
    if (formData.message && formData.message.length > 500) {
      errors.message = t('addAlarmDialog.validation.messageTooLong');
    }

    // Value1 validation (required for Comparative alarms)
    if (formData.alarmType === AlarmTypeEnum.Comparative) {
      if (!formData.value1 || formData.value1.trim() === '') {
        errors.value1 = t('addAlarmDialog.validation.value1Required');
      } else if (formData.value1.length > 100) {
        errors.value1 = t('addAlarmDialog.validation.value1TooLong');
      }

      // Value2 validation (required for Between comparison)
      if (formData.compareType === CompareTypeEnum.Between) {
        if (!formData.value2 || formData.value2.trim() === '') {
          errors.value2 = t('addAlarmDialog.validation.value2Required');
        } else if (formData.value2.length > 100) {
          errors.value2 = t('addAlarmDialog.validation.value2TooLong');
        }
      }
    }

    // Alarm delay validation (0-3600 seconds)
    if (formData.alarmDelay < 0 || formData.alarmDelay > 3600) {
      errors.alarmDelay = t('addAlarmDialog.validation.alarmDelayRange');
    }

    // Timeout validation (0-86400 seconds = 24 hours, if provided)
    if (formData.timeout !== null && (formData.timeout < 0 || formData.timeout > 86400)) {
      errors.timeout = t('addAlarmDialog.validation.timeoutRange');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setSaveError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const request: AddAlarmRequestDto = {
        itemId,
        isDisabled: formData.isDisabled,
        alarmDelay: formData.alarmDelay,
        message: formData.message || null,
        value1: formData.value1 || null,
        value2: formData.value2 || null,
        timeout: formData.timeout,
        alarmType: formData.alarmType,
        alarmPriority: formData.alarmPriority,
        compareType: formData.compareType,
      };

      logger.log('Adding alarm:', request);
      const response: AddAlarmResponseDto = await addAlarm(request);

      if (response.isSuccessful) {
        logger.log('Alarm added successfully:', response);
        onSuccess?.();
        handleClose();
      } else {
        logger.error('Failed to add alarm:', response);
        setSaveError(response.message || t('addAlarmDialog.errors.addFailed'));
      }
    } catch (err) {
      logger.error('Error adding alarm:', err);
      setSaveError(t('addAlarmDialog.errors.addFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      // Reset form
      setFormData({
        alarmType: AlarmTypeEnum.Comparative,
        alarmPriority: AlarmPriorityEnum.Alarm,
        compareType: CompareTypeEnum.Higher,
        isDisabled: false,
        alarmDelay: 5,
        message: '',
        value1: '',
        value2: '',
        timeout: null,
      });
      setFieldErrors({});
      setSaveError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-id-ref="add-alarm-dialog"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        data-id-ref="add-alarm-dialog-title"
      >
        <Typography variant="h6" component="span">
          {t('addAlarmDialog.title')}
        </Typography>
        <IconButton
          edge="end"
          onClick={handleClose}
          disabled={isSaving}
          aria-label={t('close')}
          data-id-ref="add-alarm-dialog-close-btn"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers data-id-ref="add-alarm-dialog-content">
        {itemName && (
          <>
            <Box sx={{ mb: 2 }} data-id-ref="add-alarm-item-info">
              <Typography variant="body2" color="text.secondary">
                {t('addAlarmDialog.itemName')}: <strong>{itemName}</strong>
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="add-alarm-error-alert">
            {saveError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Alarm Type */}
          <FormControl fullWidth data-id-ref="add-alarm-type-field">
            <InputLabel id="alarm-type-label">{t('addAlarmDialog.fields.alarmType')}</InputLabel>
            <Select
              labelId="alarm-type-label"
              value={formData.alarmType}
              label={t('addAlarmDialog.fields.alarmType')}
              onChange={(e) => setFormData({ ...formData, alarmType: e.target.value as AlarmType })}
              disabled={isSaving}
            >
              <MenuItem value={AlarmTypeEnum.Comparative}>{t('alarms.type.comparative')}</MenuItem>
              <MenuItem value={AlarmTypeEnum.Timeout}>{t('alarms.type.timeout')}</MenuItem>
            </Select>
          </FormControl>

          {/* Alarm Priority */}
          <FormControl fullWidth data-id-ref="add-alarm-priority-field">
            <InputLabel id="alarm-priority-label">{t('addAlarmDialog.fields.alarmPriority')}</InputLabel>
            <Select
              labelId="alarm-priority-label"
              value={formData.alarmPriority}
              label={t('addAlarmDialog.fields.alarmPriority')}
              onChange={(e) => setFormData({ ...formData, alarmPriority: e.target.value as AlarmPriority })}
              disabled={isSaving}
            >
              <MenuItem value={AlarmPriorityEnum.Warning}>{t('alarms.priority.medium')}</MenuItem>
              <MenuItem value={AlarmPriorityEnum.Alarm}>{t('alarms.priority.high')}</MenuItem>
            </Select>
          </FormControl>

          {/* Compare Type */}
          {formData.alarmType === AlarmTypeEnum.Comparative && (
            <FormControl fullWidth data-id-ref="add-alarm-compare-type-field">
              <InputLabel id="compare-type-label">{t('addAlarmDialog.fields.compareType')}</InputLabel>
              <Select
                labelId="compare-type-label"
                value={formData.compareType}
                label={t('addAlarmDialog.fields.compareType')}
                onChange={(e) => setFormData({ ...formData, compareType: e.target.value as CompareType })}
                disabled={isSaving}
              >
                <MenuItem value={CompareTypeEnum.Equal}>{t('alarms.condition.equal')}</MenuItem>
                <MenuItem value={CompareTypeEnum.NotEqual}>{t('alarms.condition.notEqual')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Higher}>{t('alarms.condition.greaterThan')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Lower}>{t('alarms.condition.lessThan')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Between}>{t('alarms.condition.between')}</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Value 1 */}
          {formData.alarmType === AlarmTypeEnum.Comparative && (
            <TextField
              fullWidth
              label={t('addAlarmDialog.fields.value1')}
              value={formData.value1}
              onChange={(e) => setFormData({ ...formData, value1: e.target.value })}
              error={Boolean(fieldErrors.value1)}
              helperText={fieldErrors.value1 || t('addAlarmDialog.hints.value1')}
              disabled={isSaving}
              data-id-ref="add-alarm-value1-field"
            />
          )}

          {/* Value 2 (only for Between comparison) */}
          {formData.alarmType === AlarmTypeEnum.Comparative && showValue2 && (
            <TextField
              fullWidth
              label={t('addAlarmDialog.fields.value2')}
              value={formData.value2}
              onChange={(e) => setFormData({ ...formData, value2: e.target.value })}
              error={Boolean(fieldErrors.value2)}
              helperText={fieldErrors.value2 || t('addAlarmDialog.hints.value2')}
              disabled={isSaving}
              data-id-ref="add-alarm-value2-field"
            />
          )}

          {/* Alarm Delay */}
          <TextField
            fullWidth
            type="number"
            label={t('addAlarmDialog.fields.alarmDelay')}
            value={formData.alarmDelay}
            onChange={(e) => setFormData({ ...formData, alarmDelay: parseInt(e.target.value) || 0 })}
            error={Boolean(fieldErrors.alarmDelay)}
            helperText={fieldErrors.alarmDelay || t('addAlarmDialog.hints.alarmDelay')}
            disabled={isSaving}
            inputProps={{ min: 0, max: 3600 }}
            data-id-ref="add-alarm-delay-field"
          />

          {/* Message */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('addAlarmDialog.fields.message')}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            error={Boolean(fieldErrors.message)}
            helperText={fieldErrors.message || t('addAlarmDialog.hints.message')}
            disabled={isSaving}
            data-id-ref="add-alarm-message-field"
          />

          {/* Timeout */}
          <TextField
            fullWidth
            type="number"
            label={t('addAlarmDialog.fields.timeout')}
            value={formData.timeout ?? ''}
            onChange={(e) => setFormData({ ...formData, timeout: e.target.value ? parseInt(e.target.value) : null })}
            error={Boolean(fieldErrors.timeout)}
            helperText={fieldErrors.timeout || t('addAlarmDialog.hints.timeout')}
            disabled={isSaving}
            inputProps={{ min: 0, max: 86400 }}
            data-id-ref="add-alarm-timeout-field"
          />

          {/* Is Disabled */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDisabled}
                onChange={(e) => setFormData({ ...formData, isDisabled: e.target.checked })}
                disabled={isSaving}
                data-id-ref="add-alarm-disabled-switch"
              />
            }
            label={t('addAlarmDialog.fields.isDisabled')}
            data-id-ref="add-alarm-disabled-field"
          />
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="add-alarm-dialog-actions">
        <Button
          onClick={handleClose}
          disabled={isSaving}
          data-id-ref="add-alarm-cancel-btn"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={isSaving}
          data-id-ref="add-alarm-save-btn"
        >
          {isSaving ? t('saving') : t('add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAlarmDialog;
