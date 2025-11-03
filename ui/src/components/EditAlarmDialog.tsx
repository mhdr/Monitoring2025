import React, { useState, useMemo, useEffect } from 'react';
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
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { editAlarm } from '../services/monitoringApi';
import type {
  EditAlarmRequestDto,
  EditAlarmResponseDto,
  AlarmType,
  AlarmPriority,
  CompareType,
  AlarmDto,
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('EditAlarmDialog');

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

interface EditAlarmDialogProps {
  open: boolean;
  onClose: () => void;
  alarm: AlarmDto;
  itemName?: string;
  onSuccess?: () => void;
}

interface EditAlarmFormData {
  alarmType: AlarmType;
  alarmPriority: AlarmPriority;
  compareType: CompareType;
  isDisabled: boolean;
  alarmDelay: number;
  message: string;
  messageFa: string;
  value1: string;
  value2: string;
  timeout: number | null;
}

const EditAlarmDialog: React.FC<EditAlarmDialogProps> = ({
  open,
  onClose,
  alarm,
  itemName,
  onSuccess,
}) => {
  const { t } = useLanguage();
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [formData, setFormData] = useState<EditAlarmFormData>({
    alarmType: alarm.alarmType || AlarmTypeEnum.Comparative,
    alarmPriority: alarm.alarmPriority || AlarmPriorityEnum.Alarm,
    compareType: alarm.compareType || CompareTypeEnum.Higher,
    isDisabled: alarm.isDisabled || false,
    alarmDelay: alarm.alarmDelay || 5,
    message: alarm.message || '',
    messageFa: alarm.messageFa || '',
    value1: alarm.value1 || '',
    value2: alarm.value2 || '',
    timeout: alarm.timeout || null,
  });

  // Update form data when alarm prop changes
  useEffect(() => {
    if (alarm) {
      const newFormData = {
        alarmType: alarm.alarmType || AlarmTypeEnum.Comparative,
        alarmPriority: alarm.alarmPriority || AlarmPriorityEnum.Alarm,
        compareType: alarm.compareType || CompareTypeEnum.Higher,
        isDisabled: alarm.isDisabled || false,
        alarmDelay: alarm.alarmDelay || 5,
        message: alarm.message || '',
        messageFa: alarm.messageFa || '',
        value1: alarm.value1 || '',
        value2: alarm.value2 || '',
        timeout: alarm.timeout || null,
      };
      setFormData(newFormData);
      logger.log('Initialized form with alarm data:', { alarm, formData: newFormData });
    }
  }, [alarm]);

  // Check if value2 field should be shown (only for Between comparison)
  const showValue2 = useMemo(() => {
    return formData.compareType === CompareTypeEnum.Between;
  }, [formData.compareType]);

  // Check if timeout field should be shown (only for Timeout alarm type)
  const showTimeout = useMemo(() => {
    return formData.alarmType === AlarmTypeEnum.Timeout;
  }, [formData.alarmType]);

  // Check if comparison fields should be shown (only for Comparative alarm type)
  const showComparisonFields = useMemo(() => {
    return formData.alarmType === AlarmTypeEnum.Comparative;
  }, [formData.alarmType]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Message validation (optional, but if provided max 500 chars)
    if (formData.message && formData.message.length > 500) {
      errors.message = t('editAlarmDialog.validation.messageTooLong');
    }

    // MessageFa validation (optional, but if provided max 500 chars)
    if (formData.messageFa && formData.messageFa.length > 500) {
      errors.messageFa = t('editAlarmDialog.validation.messageFaTooLong');
    }

    // Value1 validation (required for Comparative alarms)
    if (formData.alarmType === AlarmTypeEnum.Comparative) {
      if (!formData.value1 || formData.value1.trim() === '') {
        errors.value1 = t('editAlarmDialog.validation.value1Required');
      } else if (formData.value1.length > 100) {
        errors.value1 = t('editAlarmDialog.validation.value1TooLong');
      }

      // Value2 validation (required for Between comparison)
      if (formData.compareType === CompareTypeEnum.Between) {
        if (!formData.value2 || formData.value2.trim() === '') {
          errors.value2 = t('editAlarmDialog.validation.value2Required');
        } else if (formData.value2.length > 100) {
          errors.value2 = t('editAlarmDialog.validation.value2TooLong');
        }
      }
    }

    // Timeout validation (required for Timeout alarms)
    if (formData.alarmType === AlarmTypeEnum.Timeout) {
      if (formData.timeout === null || formData.timeout <= 0) {
        errors.timeout = t('editAlarmDialog.validation.timeoutRequired');
      } else if (formData.timeout > 86400) {
        errors.timeout = t('editAlarmDialog.validation.timeoutRange');
      }
    }

    // Alarm delay validation (0-3600 seconds)
    if (formData.alarmDelay < 0 || formData.alarmDelay > 3600) {
      errors.alarmDelay = t('editAlarmDialog.validation.alarmDelayRange');
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
      const request: EditAlarmRequestDto = {
        id: alarm.id!,
        itemId: alarm.itemId!,
        isDisabled: formData.isDisabled,
        alarmDelay: formData.alarmDelay,
        message: formData.message || null,
        messageFa: formData.messageFa || null,
        value1: formData.value1 || null,
        value2: formData.value2 || null,
        timeout: formData.timeout,
        alarmType: formData.alarmType,
        alarmPriority: formData.alarmPriority,
        compareType: formData.compareType,
      };

      logger.log('Editing alarm:', request);
      const response: EditAlarmResponseDto = await editAlarm(request);

      if (response.success) {
        logger.log('Alarm edited successfully:', response);
        
        // Show success snackbar
        setSnackbar({
          open: true,
          message: response.message || t('editAlarmDialog.success.updated'),
          severity: 'success',
        });
        
        // Call onSuccess callback
        onSuccess?.();
        
        // Auto-close dialog after 1 second
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        logger.error('Failed to edit alarm:', response);
        setSaveError(response.message || t('editAlarmDialog.errors.updateFailed'));
      }
    } catch (err) {
      logger.error('Error editing alarm:', err);
      setSaveError(t('editAlarmDialog.errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setFieldErrors({});
      setSaveError(null);
      setSnackbar({ open: false, message: '', severity: 'success' });
      onClose();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-id-ref="edit-alarm-dialog"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        data-id-ref="edit-alarm-dialog-title"
      >
        <Typography variant="h6" component="span">
          {t('editAlarmDialog.title')}
        </Typography>
        <IconButton
          edge="end"
          onClick={handleClose}
          disabled={isSaving}
          aria-label={t('close')}
          data-id-ref="edit-alarm-dialog-close-btn"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers data-id-ref="edit-alarm-dialog-content">
        {itemName && (
          <>
            <Box sx={{ mb: 2 }} data-id-ref="edit-alarm-item-info">
              <Typography variant="body2" color="text.secondary">
                {t('editAlarmDialog.itemName')}: <strong>{itemName}</strong>
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="edit-alarm-error-alert">
            {saveError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Alarm Type */}
          <FormControl fullWidth data-id-ref="edit-alarm-type-field">
            <InputLabel id="alarm-type-label">{t('editAlarmDialog.fields.alarmType')}</InputLabel>
            <Select
              labelId="alarm-type-label"
              value={formData.alarmType}
              label={t('editAlarmDialog.fields.alarmType')}
              onChange={(e) => setFormData({ ...formData, alarmType: e.target.value as AlarmType })}
              disabled={isSaving}
            >
              <MenuItem value={AlarmTypeEnum.Comparative}>{t('alarms.type.comparative')}</MenuItem>
              <MenuItem value={AlarmTypeEnum.Timeout}>{t('alarms.type.timeout')}</MenuItem>
            </Select>
          </FormControl>

          {/* Alarm Priority */}
          <FormControl fullWidth data-id-ref="edit-alarm-priority-field">
            <InputLabel id="alarm-priority-label">{t('editAlarmDialog.fields.alarmPriority')}</InputLabel>
            <Select
              labelId="alarm-priority-label"
              value={formData.alarmPriority}
              label={t('editAlarmDialog.fields.alarmPriority')}
              onChange={(e) => setFormData({ ...formData, alarmPriority: e.target.value as AlarmPriority })}
              disabled={isSaving}
            >
              <MenuItem value={AlarmPriorityEnum.Warning}>{t('alarms.priority.warning')}</MenuItem>
              <MenuItem value={AlarmPriorityEnum.Alarm}>{t('alarms.priority.alarm')}</MenuItem>
            </Select>
          </FormControl>

          {/* Compare Type (only for Comparative alarms) */}
          {showComparisonFields && (
            <FormControl fullWidth data-id-ref="edit-alarm-compare-type-field">
              <InputLabel id="compare-type-label">{t('editAlarmDialog.fields.compareType')}</InputLabel>
              <Select
                labelId="compare-type-label"
                value={formData.compareType}
                label={t('editAlarmDialog.fields.compareType')}
                onChange={(e) => setFormData({ ...formData, compareType: e.target.value as CompareType })}
                disabled={isSaving}
              >
                <MenuItem value={CompareTypeEnum.Equal}>{t('alarms.condition.equal')}</MenuItem>
                <MenuItem value={CompareTypeEnum.NotEqual}>{t('alarms.condition.notEqual')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Higher}>{t('alarms.condition.higher')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Lower}>{t('alarms.condition.lower')}</MenuItem>
                <MenuItem value={CompareTypeEnum.Between}>{t('alarms.condition.between')}</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Value 1 (only for Comparative alarms) */}
          {showComparisonFields && (
            <TextField
              fullWidth
              label={t('editAlarmDialog.fields.value1')}
              value={formData.value1}
              onChange={(e) => setFormData({ ...formData, value1: e.target.value })}
              error={Boolean(fieldErrors.value1)}
              helperText={fieldErrors.value1 || t('editAlarmDialog.hints.value1')}
              disabled={isSaving}
              data-id-ref="edit-alarm-value1-field"
            />
          )}

          {/* Value 2 (only for Between comparison) */}
          {showComparisonFields && showValue2 && (
            <TextField
              fullWidth
              label={t('editAlarmDialog.fields.value2')}
              value={formData.value2}
              onChange={(e) => setFormData({ ...formData, value2: e.target.value })}
              error={Boolean(fieldErrors.value2)}
              helperText={fieldErrors.value2 || t('editAlarmDialog.hints.value2')}
              disabled={isSaving}
              data-id-ref="edit-alarm-value2-field"
            />
          )}

          {/* Alarm Delay */}
          <TextField
            fullWidth
            type="number"
            label={t('editAlarmDialog.fields.alarmDelay')}
            value={formData.alarmDelay}
            onChange={(e) => setFormData({ ...formData, alarmDelay: parseInt(e.target.value) || 0 })}
            error={Boolean(fieldErrors.alarmDelay)}
            helperText={fieldErrors.alarmDelay || t('editAlarmDialog.hints.alarmDelay')}
            disabled={isSaving}
            inputProps={{ min: 0, max: 3600 }}
            data-id-ref="edit-alarm-delay-field"
          />

          {/* Message */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('editAlarmDialog.fields.message')}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            error={Boolean(fieldErrors.message)}
            helperText={fieldErrors.message || t('editAlarmDialog.hints.message')}
            disabled={isSaving}
            data-id-ref="edit-alarm-message-field"
          />

          {/* Message Farsi */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('editAlarmDialog.fields.messageFa')}
            value={formData.messageFa}
            onChange={(e) => setFormData({ ...formData, messageFa: e.target.value })}
            error={Boolean(fieldErrors.messageFa)}
            helperText={fieldErrors.messageFa || t('editAlarmDialog.hints.messageFa')}
            disabled={isSaving}
            data-id-ref="edit-alarm-message-fa-field"
          />

          {/* Timeout (only for Timeout alarm type) */}
          {showTimeout && (
            <TextField
              fullWidth
              type="number"
              label={t('editAlarmDialog.fields.timeout')}
              value={formData.timeout ?? ''}
              onChange={(e) => setFormData({ ...formData, timeout: e.target.value ? parseInt(e.target.value) : null })}
              error={Boolean(fieldErrors.timeout)}
              helperText={fieldErrors.timeout || t('editAlarmDialog.hints.timeout')}
              disabled={isSaving}
              inputProps={{ min: 1, max: 86400 }}
              data-id-ref="edit-alarm-timeout-field"
            />
          )}

          {/* Is Disabled */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDisabled}
                onChange={(e) => setFormData({ ...formData, isDisabled: e.target.checked })}
                disabled={isSaving}
                data-id-ref="edit-alarm-disabled-switch"
              />
            }
            label={t('editAlarmDialog.fields.isDisabled')}
            data-id-ref="edit-alarm-disabled-field"
          />
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="edit-alarm-dialog-actions">
        <Button
          onClick={handleClose}
          disabled={isSaving}
          data-id-ref="edit-alarm-cancel-btn"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
          data-id-ref="edit-alarm-save-btn"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </DialogActions>

      {/* Snackbar for success/error feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-id-ref="edit-alarm-dialog-snackbar"
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          data-id-ref="edit-alarm-dialog-snackbar-alert"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default EditAlarmDialog;
