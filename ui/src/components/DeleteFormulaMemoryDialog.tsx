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
import { deleteFormulaMemory } from '../services/extendedApi';
import type { FormulaMemory } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteFormulaMemoryDialog');

interface DeleteFormulaMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  formulaMemory: FormulaMemory;
}

const DeleteFormulaMemoryDialog: React.FC<DeleteFormulaMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  formulaMemory,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFormulaMemoryDisplayName = (): string => {
    if (formulaMemory.name) {
      return formulaMemory.name;
    }
    // Truncate expression for display if too long
    const expression = formulaMemory.expression || '';
    return expression.length > 40 ? `${expression.substring(0, 40)}...` : expression;
  };

  const handleDelete = async () => {
    if (!formulaMemory || !formulaMemory.id) {
      logger.error('Cannot delete formula memory: ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('Deleting formula memory', { id: formulaMemory.id });
      const response = await deleteFormulaMemory({ id: formulaMemory.id });

      if (response.isSuccessful) {
        logger.info('Formula memory deleted successfully', { id: formulaMemory.id });
        onSuccess();
      } else {
        setError(response.errorMessage || t('formulaMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete formula memory', { error: err });
      setError(t('formulaMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-formula-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-formula-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">{t('formulaMemory.deleteTitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-formula-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-formula-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-formula-memory-confirmation-text">
          {t('formulaMemory.deleteMessage', {
            name: getFormulaMemoryDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-formula-memory-warning">
          <Typography variant="body2">{t('formulaMemory.deleteWarning')}</Typography>
        </Alert>

        {/* Show expression preview */}
        {formulaMemory.expression && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
            data-id-ref="delete-formula-memory-expression-preview"
          >
            <Typography variant="caption" color="text.secondary">
              {t('formulaMemory.expression')}:
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-word' }}
            >
              {formulaMemory.expression}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions data-id-ref="delete-formula-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-formula-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-formula-memory-btn"
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

export default DeleteFormulaMemoryDialog;
