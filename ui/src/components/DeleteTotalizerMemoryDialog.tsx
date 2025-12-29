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
import { deleteTotalizerMemory } from '../services/extendedApi';
import type { TotalizerMemoryWithItems } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteTotalizerMemoryDialog');

interface DeleteTotalizerMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  totalizerMemory: TotalizerMemoryWithItems;
}

const DeleteTotalizerMemoryDialog: React.FC<DeleteTotalizerMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  totalizerMemory,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTotalizerMemoryDisplayName = (): string => {
    if (totalizerMemory.name) {
      return totalizerMemory.name;
    }
    
    const inputName = totalizerMemory.inputItemName || totalizerMemory.inputItemId;
    const outputName = totalizerMemory.outputItemName || totalizerMemory.outputItemId;
    return `${inputName} → ${outputName}`;
  };

  const handleDelete = async () => {
    if (!totalizerMemory || !totalizerMemory.id) {
      logger.error('Cannot delete totalizer memory: ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('Deleting totalizer memory', { id: totalizerMemory.id });
      const response = await deleteTotalizerMemory({ id: totalizerMemory.id });

      if (response.isSuccessful) {
        logger.info('Totalizer memory deleted successfully', { id: totalizerMemory.id });
        onSuccess();
      } else {
        setError(response.errorMessage || t('totalizerMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete totalizer memory', { error: err });
      setError(t('totalizerMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && handleCancel()}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-totalizer-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-totalizer-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('totalizerMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-totalizer-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-totalizer-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-totalizer-memory-confirmation-text">
          {t('totalizerMemory.deleteMessage', {
            name: getTotalizerMemoryDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-totalizer-memory-warning">
          <Typography variant="body2">
            {t('totalizerMemory.deleteWarning')}
          </Typography>
          {totalizerMemory.accumulatedValue > 0 && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
              {t('totalizerMemory.deleteAccumulatedValue', {
                value: totalizerMemory.accumulatedValue.toFixed(totalizerMemory.decimalPlaces),
                units: totalizerMemory.units || '',
              })}
            </Typography>
          )}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-totalizer-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-totalizer-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-totalizer-memory-btn"
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

export default DeleteTotalizerMemoryDialog;
