import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  AccountTree as BranchIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { deleteIfMemory } from '../services/extendedApi';
import type { IfMemory, MonitoringItem } from '../types/api';
import { IfMemoryOutputType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteIfMemoryDialog');

interface ConditionalBranchInfo {
  id: string;
  order: number;
  condition: string;
  outputValue: number;
  name?: string;
}

interface DeleteIfMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ifMemory: IfMemory | null;
}

/**
 * Parse branches JSON string to extract branch info
 */
const parseBranches = (branchesJson: string): ConditionalBranchInfo[] => {
  try {
    const parsed = JSON.parse(branchesJson || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((b, index) => ({
      id: b.id || `branch-${index}`,
      order: b.order ?? index,
      condition: b.condition || '',
      outputValue: b.outputValue ?? 0,
      name: b.name,
    }));
  } catch {
    return [];
  }
};

const DeleteIfMemoryDialog: React.FC<DeleteIfMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  ifMemory,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get output item details
  const outputItem = useMemo((): MonitoringItem | undefined => {
    if (!ifMemory) return undefined;
    return items.find((item) => item.id === ifMemory.outputItemId);
  }, [ifMemory, items]);

  // Get item label
  const getItemLabel = useCallback(
    (item: MonitoringItem): string => {
      const name = language === 'fa' ? item.nameFa || item.name : item.name;
      return `${item.pointNumber} - ${name}`;
    },
    [language]
  );

  // Parse branches for display
  const branches = useMemo(() => {
    if (!ifMemory) return [];
    return parseBranches(ifMemory.branches);
  }, [ifMemory]);

  // Get output type label
  const getOutputTypeLabel = useCallback(
    (outputType: number): string => {
      return outputType === IfMemoryOutputType.Digital
        ? t('ifMemory.outputTypes.digital')
        : t('ifMemory.outputTypes.analog');
    },
    [t]
  );

  const handleDelete = async () => {
    if (!ifMemory) return;

    setLoading(true);
    setError(null);

    try {
      const response = await deleteIfMemory({ id: ifMemory.id });

      if (response.isSuccessful) {
        logger.info('IF memory deleted successfully', { id: ifMemory.id });
        onSuccess();
        onClose();
      } else {
        setError(response.errorMessage || t('ifMemory.errors.deleteFailed'));
        logger.error('Failed to delete IF memory', response.errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to delete IF memory', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  if (!ifMemory) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="delete-if-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-if-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6">{t('ifMemory.deleteTitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="delete-if-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="delete-if-memory-error-alert">
            {error}
          </Alert>
        )}

        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
          data-id-ref="delete-if-memory-warning-alert"
        >
          <Typography variant="body1" fontWeight="medium">
            {t('ifMemory.deleteWarning')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('ifMemory.deleteConfirmation')}
          </Typography>
        </Alert>

        {/* IF Memory Info */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack spacing={1.5}>
            {/* Name */}
            {ifMemory.name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BranchIcon fontSize="small" color="primary" />
                <Typography variant="body1" fontWeight="medium">
                  {ifMemory.name}
                </Typography>
              </Box>
            )}

            {/* Output Item */}
            {outputItem && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('ifMemory.fields.outputItem')}:
                </Typography>
                <Typography variant="body1">{getItemLabel(outputItem)}</Typography>
              </Box>
            )}

            {/* Output Type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('ifMemory.fields.outputType')}:
              </Typography>
              <Chip
                label={getOutputTypeLabel(ifMemory.outputType)}
                size="small"
                color={ifMemory.outputType === IfMemoryOutputType.Digital ? 'info' : 'secondary'}
              />
            </Box>

            {/* Branches count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('ifMemory.branchesCount')}:
              </Typography>
              <Chip label={branches.length} size="small" color="primary" />
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Branches preview */}
            {branches.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('ifMemory.branchesPreview')}:
                </Typography>
                <Stack spacing={0.5}>
                  {branches.slice(0, 3).map((branch, index) => (
                    <Box
                      key={branch.id}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      data-id-ref={`delete-if-memory-branch-preview-${index}`}
                    >
                      <Chip
                        label={index === 0 ? 'IF' : 'ELSE IF'}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 60 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'background.paper',
                          px: 1,
                          py: 0.5,
                          borderRadius: 0.5,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {branch.condition || t('ifMemory.emptyCondition')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        → {branch.outputValue}
                      </Typography>
                    </Box>
                  ))}
                  {branches.length > 3 && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      + {branches.length - 3} {t('common.more')}...
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* Default Value */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="ELSE" size="small" variant="outlined" color="secondary" />
              <Typography variant="body2">{t('ifMemory.fields.defaultValue')}:</Typography>
              <Typography variant="body1" fontWeight="medium">
                {ifMemory.defaultValue}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="delete-if-memory-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          startIcon={<CloseIcon />}
          data-id-ref="delete-if-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          data-id-ref="delete-if-memory-delete-btn"
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteIfMemoryDialog;
