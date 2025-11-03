import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteAlarm } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';
import type { DeleteAlarmRequestDto, AlarmDto } from '../types/api';

const logger = createLogger('DeleteAlarmDialog');

interface DeleteAlarmDialogProps {
  open: boolean;
  onClose: () => void;
  alarm: AlarmDto | null;
  itemName?: string;
  onSuccess: () => void;
}

const DeleteAlarmDialog: React.FC<DeleteAlarmDialogProps> = ({
  open,
  onClose,
  alarm,
  itemName,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!alarm || !alarm.id) {
      setError(t('alarms.delete.noAlarmId'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      logger.log('Deleting alarm:', { alarmId: alarm.id });

      const request: DeleteAlarmRequestDto = {
        id: alarm.id,
      };

      const response = await deleteAlarm(request);

      if (response.success) {
        logger.log('Alarm deleted successfully:', { alarmId: alarm.id });
        onSuccess();
        onClose();
      } else {
        const errorMessage = response.message || t('alarms.delete.errorDeletingAlarm');
        logger.error('Failed to delete alarm:', { alarmId: alarm.id, error: errorMessage });
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('Error deleting alarm:', err);
      setError(t('alarms.delete.errorDeletingAlarm'));
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  // Get alarm message based on language
  const getAlarmMessage = (): string => {
    if (!alarm) return t('unknown');
    
    if (language === 'fa') {
      return alarm.messageFa || alarm.message || t('alarms.noMessage');
    }
    return alarm.message || alarm.messageFa || t('alarms.noMessage');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-alarm-dialog"
    >
      <DialogTitle data-id-ref="delete-alarm-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" data-id-ref="delete-alarm-warning-icon" />
          <Typography variant="h6" component="span">
            {t('alarms.delete.confirmTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-alarm-dialog-content">
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            data-id-ref="delete-alarm-error-alert"
          >
            {error}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }} data-id-ref="delete-alarm-warning-text">
          {t('alarms.delete.confirmMessage')}
        </Typography>

        <Box 
          sx={{ 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
          data-id-ref="delete-alarm-details"
        >
          {itemName && (
            <Typography variant="body2" sx={{ mb: 1 }} data-id-ref="delete-alarm-item-name">
              <strong>{t('alarms.columns.itemName')}:</strong> {itemName}
            </Typography>
          )}
          
          <Typography variant="body2" sx={{ mb: 1 }} data-id-ref="delete-alarm-message">
            <strong>{t('alarms.columns.message')}:</strong> {getAlarmMessage()}
          </Typography>

          {alarm && (
            <>
              <Typography variant="body2" sx={{ mb: 1 }} data-id-ref="delete-alarm-priority">
                <strong>{t('alarms.columns.priority')}:</strong>{' '}
                {alarm.alarmPriority === 2 ? t('alarms.priority.high') : t('alarms.priority.medium')}
              </Typography>

              <Typography variant="body2" data-id-ref="delete-alarm-type">
                <strong>{t('alarms.columns.type')}:</strong>{' '}
                {alarm.alarmType === 1 ? t('alarms.type.comparative') : t('alarms.type.timeout')}
              </Typography>
            </>
          )}
        </Box>

        <Alert 
          severity="warning" 
          sx={{ mt: 2 }}
          data-id-ref="delete-alarm-warning-alert"
        >
          {t('alarms.delete.warningMessage')}
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }} data-id-ref="delete-alarm-dialog-actions">
        <Button
          onClick={handleClose}
          disabled={loading}
          data-id-ref="delete-alarm-cancel-btn"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleConfirmDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <WarningIcon />}
          data-id-ref="delete-alarm-confirm-btn"
        >
          {loading ? t('deleting') : t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAlarmDialog;
