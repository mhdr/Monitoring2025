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
import { deletePIDMemory } from '../services/extendedApi';
import type { PIDMemoryWithItems } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeletePIDMemoryDialog');

interface DeletePIDMemoryDialogProps {
  open: boolean;
  pidMemory: PIDMemoryWithItems | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeletePIDMemoryDialog: React.FC<DeletePIDMemoryDialogProps> = ({
  open,
  pidMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPIDMemoryDisplayName = (): string => {
    if (!pidMemory) return '';
    
    if (pidMemory.name) {
      return pidMemory.name;
    }
    
    const inputName = pidMemory.inputItemName || pidMemory.inputItemId;
    const outputName = pidMemory.outputItemName || pidMemory.outputItemId;
    return `${inputName} → ${outputName}`;
  };

  const handleDelete = async () => {
    if (!pidMemory || !pidMemory.id) {
      logger.error('Cannot delete PID memory: PID memory or ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting PID memory', { id: pidMemory.id });
      const response = await deletePIDMemory({ id: pidMemory.id });

      if (response.isSuccessful) {
        logger.log('PID memory deleted successfully', { id: pidMemory.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('pidMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete PID memory', { error: err });
      setError(t('pidMemory.errors.deleteFailed'));
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
      data-id-ref="delete-pid-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-pid-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('pidMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-pid-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-pid-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-pid-memory-confirmation-text">
          {t('pidMemory.deleteMessage', {
            name: getPIDMemoryDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-pid-memory-warning">
          {t('pidMemory.deleteWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-pid-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-pid-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-pid-memory-btn"
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

export default DeletePIDMemoryDialog;
