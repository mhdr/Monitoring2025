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
import { deleteStatisticalMemory } from '../services/extendedApi';
import type { StatisticalMemory, StatisticalWindowType } from '../types/api';
import { StatisticalWindowType as StatisticalWindowTypeEnum } from '../types/api';

interface StatisticalMemoryWithItems extends StatisticalMemory {
  inputItemName?: string;
  outputMinItemName?: string;
  outputMaxItemName?: string;
  outputAvgItemName?: string;
  outputStdDevItemName?: string;
  outputRangeItemName?: string;
  outputMedianItemName?: string;
  outputCVItemName?: string;
  percentileOutputNames?: Array<{ percentile: number; outputItemName: string }>;
}

interface DeleteStatisticalMemoryDialogProps {
  open: boolean;
  statisticalMemory: StatisticalMemoryWithItems;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteStatisticalMemoryDialog: React.FC<DeleteStatisticalMemoryDialogProps> = ({
  open,
  statisticalMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await deleteStatisticalMemory({ id: statisticalMemory.id });
      if (response.isSuccessful) {
        onClose(true); // shouldRefresh = true
      } else {
        setError(response.errorMessage || t('statisticalMemory.errors.deleteFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to delete statistical memory:', err);
      setError(t('statisticalMemory.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getWindowTypeLabel = (windowType: StatisticalWindowType): string => {
    switch (windowType) {
      case StatisticalWindowTypeEnum.Rolling:
        return t('statisticalMemory.windowType.rolling');
      case StatisticalWindowTypeEnum.Tumbling:
        return t('statisticalMemory.windowType.tumbling');
      default:
        return String(windowType);
    }
  };

  // Get configured output names as chips
  const getOutputChips = () => {
    const chips: Array<{ label: string; color: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }> = [];
    
    if (statisticalMemory.outputMinItemId) chips.push({ label: t('statisticalMemory.outputTypes.min'), color: 'primary' });
    if (statisticalMemory.outputMaxItemId) chips.push({ label: t('statisticalMemory.outputTypes.max'), color: 'primary' });
    if (statisticalMemory.outputAvgItemId) chips.push({ label: t('statisticalMemory.outputTypes.avg'), color: 'secondary' });
    if (statisticalMemory.outputStdDevItemId) chips.push({ label: t('statisticalMemory.outputTypes.stddev'), color: 'info' });
    if (statisticalMemory.outputRangeItemId) chips.push({ label: t('statisticalMemory.outputTypes.range'), color: 'warning' });
    if (statisticalMemory.outputMedianItemId) chips.push({ label: t('statisticalMemory.outputTypes.median'), color: 'success' });
    if (statisticalMemory.outputCVItemId) chips.push({ label: t('statisticalMemory.outputTypes.cv'), color: 'error' });
    
    // Add percentiles
    if (statisticalMemory.percentileOutputNames && statisticalMemory.percentileOutputNames.length > 0) {
      statisticalMemory.percentileOutputNames.forEach((p) => {
        chips.push({ label: `P${p.percentile}`, color: 'secondary' });
      });
    }

    return chips;
  };

  const outputChips = getOutputChips();

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-statistical-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-statistical-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          {t('statisticalMemory.deleteTitle')}
        </Box>
      </DialogTitle>
      <DialogContent data-id-ref="delete-statistical-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          {t('statisticalMemory.deleteMessage')}
        </Typography>

        <List dense sx={{ mt: 2, bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
          {statisticalMemory.name && (
            <ListItem data-id-ref="delete-statistical-memory-name-item">
              <ListItemText
                primary={t('statisticalMemory.name')}
                secondary={statisticalMemory.name}
              />
            </ListItem>
          )}
          <ListItem data-id-ref="delete-statistical-memory-input-item">
            <ListItemText
              primary={t('statisticalMemory.inputItem')}
              secondary={statisticalMemory.inputItemName || '-'}
            />
          </ListItem>
          <ListItem data-id-ref="delete-statistical-memory-window-item">
            <ListItemText
              primary={t('statisticalMemory.windowType')}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={getWindowTypeLabel(statisticalMemory.windowType)}
                    size="small"
                    color={statisticalMemory.windowType === StatisticalWindowTypeEnum.Rolling ? 'info' : 'warning'}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t('statisticalMemory.windowSize')}: {statisticalMemory.windowSize}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          <ListItem data-id-ref="delete-statistical-memory-outputs-item">
            <ListItemText
              primary={t('statisticalMemory.outputs')}
              secondary={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {outputChips.length > 0 ? (
                    outputChips.map((chip, idx) => (
                      <Chip
                        key={idx}
                        label={chip.label}
                        size="small"
                        color={chip.color}
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
          <ListItem data-id-ref="delete-statistical-memory-interval-item">
            <ListItemText
              primary={t('statisticalMemory.interval')}
              secondary={`${statisticalMemory.interval}s`}
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-statistical-memory-warning">
          {t('statisticalMemory.deleteWarning')}
        </Alert>
      </DialogContent>
      <DialogActions data-id-ref="delete-statistical-memory-dialog-actions">
        <Button
          onClick={() => onClose(false)}
          disabled={loading}
          data-id-ref="cancel-delete-statistical-memory-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
          data-id-ref="confirm-delete-statistical-memory-btn"
        >
          {loading ? t('common.deleting') : t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteStatisticalMemoryDialog;
