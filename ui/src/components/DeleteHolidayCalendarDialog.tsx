import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteHolidayCalendar } from '../services/extendedApi';
import type { HolidayCalendar } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteHolidayCalendarDialog');

interface DeleteHolidayCalendarDialogProps {
  open: boolean;
  calendar: HolidayCalendar | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteHolidayCalendarDialog: React.FC<DeleteHolidayCalendarDialogProps> = ({
  open,
  calendar,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!calendar || !calendar.id) {
      logger.error('Cannot delete calendar: calendar or calendar ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting holiday calendar', { calendarId: calendar.id, name: calendar.name });
      const response = await deleteHolidayCalendar({ id: calendar.id });

      if (response.isSuccessful) {
        logger.log('Holiday calendar deleted successfully', { calendarId: calendar.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('holidayCalendar.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete holiday calendar', { error: err });
      setError(t('holidayCalendar.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-holiday-calendar-dialog"
    >
      <DialogTitle data-id-ref="delete-holiday-calendar-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('holidayCalendar.deleteCalendar')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-holiday-calendar-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-holiday-calendar-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-holiday-calendar-confirmation-text">
          {t('holidayCalendar.deleteConfirmation', {
            name: calendar?.name || '',
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-holiday-calendar-warning">
          {t('holidayCalendar.deleteWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-holiday-calendar-dialog-actions">
        <Button
          data-id-ref="cancel-delete-holiday-calendar-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-holiday-calendar-btn"
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('loading') : t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteHolidayCalendarDialog;
