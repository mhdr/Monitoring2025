import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteAverageMemory } from '../services/extendedApi';
import type { AverageMemory } from '../types/api';

interface DeleteAverageMemoryDialogProps {
  open: boolean;
  averageMemory: AverageMemory & { inputItemNames?: string[]; outputItemName?: string };
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteAverageMemoryDialog: React.FC<DeleteAverageMemoryDialogProps> = ({
  open,
  averageMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await deleteAverageMemory({ id: averageMemory.id });
      if (response.isSuccessful) {
        onClose(true); // shouldRefresh = true
      } else {
        setError(response.errorMessage || t('averageMemory.errors.deleteFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to delete average memory:', err);
      setError(t('averageMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-average-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-average-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          {t('averageMemory.deleteTitle')}
        </Box>
      </DialogTitle>
      <DialogContent data-id-ref="delete-average-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          {t('averageMemory.deleteMessage')}
        </Typography>

        <List dense sx={{ mt: 2, bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
          {averageMemory.name && (
            <ListItem>
              <ListItemText
                primary={t('averageMemory.name')}
                secondary={averageMemory.name}
              />
            </ListItem>
          )}
          <ListItem>
            <ListItemText
              primary={t('averageMemory.inputItems')}
              secondary={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {averageMemory.inputItemNames && averageMemory.inputItemNames.length > 0 ? (
                    averageMemory.inputItemNames.map((name, idx) => (
                      <Chip key={idx} label={name} size="small" />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t('averageMemory.outputItem')}
              secondary={averageMemory.outputItemName || '-'}
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('averageMemory.deleteWarning')}
        </Alert>
      </DialogContent>
      <DialogActions data-id-ref="delete-average-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="cancel-delete-average-memory-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
          data-id-ref="confirm-delete-average-memory-btn"
        >
          {loading ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAverageMemoryDialog;
