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
import { deleteWriteActionMemory } from '../services/extendedApi';
import type { WriteActionMemory } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteWriteActionMemoryDialog');

interface DeleteWriteActionMemoryDialogProps {
  open: boolean;
  writeActionMemory: (WriteActionMemory & { 
    inputItemName?: string; 
    outputItemName?: string;
    sourceItemName?: string;
  }) | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteWriteActionMemoryDialog: React.FC<DeleteWriteActionMemoryDialogProps> = ({
  open,
  writeActionMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWriteActionMemoryDisplayName = (): string => {
    if (!writeActionMemory) return '';
    
    if (writeActionMemory.name) {
      return writeActionMemory.name;
    }
    
    const inputName = writeActionMemory.inputItemName || writeActionMemory.inputItemId.substring(0, 8);
    const outputName = writeActionMemory.outputItemName || writeActionMemory.outputItemId.substring(0, 8);
    return `${inputName} → ${outputName}`;
  };

  const handleDelete = async () => {
    if (!writeActionMemory || !writeActionMemory.id) {
      logger.error('Cannot delete write action memory: write action memory or ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting write action memory', { id: writeActionMemory.id });
      const response = await deleteWriteActionMemory({ id: writeActionMemory.id });

      if (response.isSuccessful) {
        logger.log('Write action memory deleted successfully', { id: writeActionMemory.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('writeActionMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete write action memory', { error: err });
      setError(t('writeActionMemory.errors.deleteFailed'));
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
      data-id-ref="delete-write-action-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-write-action-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('writeActionMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-write-action-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-write-action-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-write-action-memory-confirmation-text">
          {t('writeActionMemory.deleteMessage', {
            name: getWriteActionMemoryDisplayName(),
          })}
        </DialogContentText>

        {writeActionMemory && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>{t('writeActionMemory.executionStatus')}:</strong>{' '}
              {writeActionMemory.currentExecutionCount}
              {writeActionMemory.maxExecutionCount 
                ? ` / ${writeActionMemory.maxExecutionCount}` 
                : ` (${t('writeActionMemory.continuous')})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>{t('writeActionMemory.interval')}:</strong>{' '}
              {writeActionMemory.interval}s
            </Typography>
          </Box>
        )}

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-write-action-memory-warning">
          {t('writeActionMemory.deleteWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-write-action-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-write-action-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-write-action-memory-btn"
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

export default DeleteWriteActionMemoryDialog;
