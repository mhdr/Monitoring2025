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
import { deleteComparisonMemory } from '../services/extendedApi';
import type { ComparisonMemory } from '../types/api';

interface DeleteComparisonMemoryDialogProps {
  open: boolean;
  comparisonMemory: ComparisonMemory & {
    outputItemName?: string;
    parsedGroups?: Array<{ name?: string | null; inputItemNames?: string[] }>;
  };
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteComparisonMemoryDialog: React.FC<DeleteComparisonMemoryDialogProps> = ({
  open,
  comparisonMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await deleteComparisonMemory({ id: comparisonMemory.id });
      if (response.isSuccessful) {
        onClose(true); // shouldRefresh = true
      } else {
        setError(response.errorMessage || t('comparisonMemory.errors.deleteFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to delete comparison memory:', err);
      setError(t('comparisonMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getGroupOperatorLabel = (op: number): string => {
    switch (op) {
      case 1:
        return t('comparisonMemory.groupOperator.and');
      case 2:
        return t('comparisonMemory.groupOperator.or');
      case 3:
        return t('comparisonMemory.groupOperator.xor');
      default:
        return String(op);
    }
  };

  // Calculate total input count from parsed groups
  const totalInputCount = comparisonMemory.parsedGroups?.reduce(
    (acc, group) => acc + (group.inputItemNames?.length || 0),
    0
  ) || 0;

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-comparison-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-comparison-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          {t('comparisonMemory.deleteTitle')}
        </Box>
      </DialogTitle>
      <DialogContent data-id-ref="delete-comparison-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          {t('comparisonMemory.deleteMessage')}
        </Typography>

        <List dense sx={{ mt: 2, bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
          {comparisonMemory.name && (
            <ListItem>
              <ListItemText
                primary={t('comparisonMemory.name')}
                secondary={comparisonMemory.name}
              />
            </ListItem>
          )}
          <ListItem>
            <ListItemText
              primary={t('comparisonMemory.outputItem')}
              secondary={comparisonMemory.outputItemName || '-'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t('comparisonMemory.groupOperator')}
              secondary={getGroupOperatorLabel(comparisonMemory.groupOperator)}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t('comparisonMemory.sections.groups')}
              secondary={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  <Chip
                    label={`${comparisonMemory.parsedGroups?.length || 0} ${t('comparisonMemory.sections.groups').toLowerCase()}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${totalInputCount} ${t('comparisonMemory.inputItems').toLowerCase()}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              }
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('comparisonMemory.deleteWarning')}
        </Alert>
      </DialogContent>
      <DialogActions data-id-ref="delete-comparison-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="cancel-delete-comparison-memory-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
          data-id-ref="confirm-delete-comparison-memory-btn"
        >
          {loading ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteComparisonMemoryDialog;
