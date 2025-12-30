import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteScheduleMemory } from '../services/extendedApi';
import type { ScheduleMemory } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteScheduleMemoryDialog');

interface DeleteScheduleMemoryDialogProps {
  open: boolean;
  scheduleMemory: ScheduleMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteScheduleMemoryDialog: React.FC<DeleteScheduleMemoryDialogProps> = ({
  open,
  scheduleMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!scheduleMemory) return;

    setLoading(true);
    setError(null);

    try {
      const response = await deleteScheduleMemory({ id: scheduleMemory.id });

      if (response.isSuccessful) {
        logger.log('Schedule memory deleted successfully', { id: scheduleMemory.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('scheduleMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete schedule memory', { error: err });
      setError(t('scheduleMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!scheduleMemory) return '';
    if (scheduleMemory.name) return scheduleMemory.name;
    // Return truncated ID if no name is available
    return scheduleMemory.id.substring(0, 8);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-schedule-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-schedule-memory-dialog-title">
        {t('scheduleMemory.deleteTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="delete-schedule-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="delete-schedule-memory-error-alert">
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <WarningIcon color="warning" sx={{ fontSize: 40, mt: 0.5 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              {t('scheduleMemory.deleteConfirmation')}
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {getDisplayName()}
            </Typography>
            {scheduleMemory && scheduleMemory.scheduleBlocks && scheduleMemory.scheduleBlocks.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('scheduleMemory.deleteBlocksWarning', { count: scheduleMemory.scheduleBlocks.length })}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="delete-schedule-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="delete-schedule-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          data-id-ref="delete-schedule-memory-confirm-btn"
          startIcon={loading && <CircularProgress size={20} />}
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteScheduleMemoryDialog;
