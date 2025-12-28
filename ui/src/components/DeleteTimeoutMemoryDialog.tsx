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
import { deleteTimeoutMemory } from '../services/extendedApi';
import type { TimeoutMemory } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteTimeoutMemoryDialog');

interface DeleteTimeoutMemoryDialogProps {
  open: boolean;
  timeoutMemory: (TimeoutMemory & { inputItemName?: string; outputItemName?: string }) | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteTimeoutMemoryDialog: React.FC<DeleteTimeoutMemoryDialogProps> = ({
  open,
  timeoutMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTimeoutMemoryDisplayName = (): string => {
    if (!timeoutMemory) return '';
    const inputName = timeoutMemory.inputItemName || timeoutMemory.inputItemId;
    const outputName = timeoutMemory.outputItemName || timeoutMemory.outputItemId;
    return `${inputName} → ${outputName}`;
  };

  const handleDelete = async () => {
    if (!timeoutMemory || !timeoutMemory.id) {
      logger.error('Cannot delete timeout memory: timeout memory or ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting timeout memory', { id: timeoutMemory.id });
      const response = await deleteTimeoutMemory({ id: timeoutMemory.id });

      if (response.isSuccessful) {
        logger.log('Timeout memory deleted successfully', { id: timeoutMemory.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('timeoutMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete timeout memory', { error: err });
      setError(t('timeoutMemory.errors.deleteFailed'));
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
      onClose={() => !loading && handleCancel()}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-timeout-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-timeout-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('timeoutMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-timeout-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-timeout-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-timeout-memory-confirmation-text">
          {t('timeoutMemory.deleteMessage', {
            name: getTimeoutMemoryDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-timeout-memory-warning">
          {t('timeoutMemory.deleteWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-timeout-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-timeout-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-timeout-memory-btn"
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteTimeoutMemoryDialog;
