import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteMinMaxSelectorMemory } from '../services/extendedApi';
import type { MinMaxSelectorMemory } from '../types/api';

interface Props {
  open: boolean;
  minMaxSelectorMemory: MinMaxSelectorMemory;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteMinMaxSelectorMemoryDialog: React.FC<Props> = ({
  open,
  minMaxSelectorMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await deleteMinMaxSelectorMemory({ id: minMaxSelectorMemory.id });
      if (!response.isSuccessful) {
        throw new Error(response.errorMessage || t('minMaxSelectorMemory.errors.deleteFailed'));
      }
      onClose(true);
    } catch (err: unknown) {
      console.error('Error deleting min/max selector memory:', err);
      setError(err instanceof Error ? err.message : t('minMaxSelectorMemory.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-minmax-selector-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-minmax-selector-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <Typography variant="h6">{t('minMaxSelectorMemory.deleteTitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-minmax-selector-memory-dialog-content">
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
            data-id-ref="delete-minmax-selector-memory-error"
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-minmax-selector-memory-message">
          {t('minMaxSelectorMemory.deleteConfirmation', { name: minMaxSelectorMemory.name })}
        </DialogContentText>

        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
          data-id-ref="delete-minmax-selector-memory-details"
        >
          <Typography variant="body2" color="text.secondary">
            <strong>{t('minMaxSelectorMemory.name')}:</strong> {minMaxSelectorMemory.name}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }} data-id-ref="delete-minmax-selector-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={deleting}
          data-id-ref="delete-minmax-selector-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : null}
          data-id-ref="delete-minmax-selector-memory-confirm-btn"
        >
          {deleting ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteMinMaxSelectorMemoryDialog;
