import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteDeadbandMemory } from '../services/extendedApi';
import type { DeadbandMemoryWithItems } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteDeadbandMemoryDialog');

interface Props {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  deadbandMemory: DeadbandMemoryWithItems;
}

/**
 * DeleteDeadbandMemoryDialog Component
 * Confirmation dialog for deleting a deadband memory configuration
 */
const DeleteDeadbandMemoryDialog: React.FC<Props> = ({ open, onClose, deadbandMemory }) => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle delete confirmation
   */
  const handleDelete = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await deleteDeadbandMemory({ id: deadbandMemory.id });

      if (!response.isSuccessful) {
        setError(response.errorMessage || 'Failed to delete deadband memory');
        return;
      }

      logger.info('Deadband memory deleted successfully', { id: deadbandMemory.id });
      onClose(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to delete deadband memory', err);
    } finally {
      setLoading(false);
    }
  }, [deadbandMemory.id, onClose]);

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-deadband-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-deadband-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6" component="span">
            {t('deadbandMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="delete-deadband-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="delete-deadband-memory-error-alert">
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <WarningIcon color="warning" sx={{ fontSize: 48, mt: 0.5 }} />
          <Box>
            <Typography variant="body1" gutterBottom>
              {t('deadbandMemory.deleteConfirmation')}
            </Typography>
            <Typography variant="h6" color="error.main" sx={{ mt: 1 }}>
              {deadbandMemory.name || t('common.unnamed')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('deadbandMemory.deleteWarning')}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="delete-deadband-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="delete-deadband-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          data-id-ref="delete-deadband-memory-confirm-btn"
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDeadbandMemoryDialog;
