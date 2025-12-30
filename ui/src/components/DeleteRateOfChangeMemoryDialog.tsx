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
import { deleteRateOfChangeMemory } from '../services/extendedApi';
import type { RateOfChangeMemoryWithItems } from '../types/api';
import { RateCalculationMethod, RateTimeUnit } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteRateOfChangeMemoryDialog');

interface DeleteRateOfChangeMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rateOfChangeMemory: RateOfChangeMemoryWithItems;
}

/**
 * Get calculation method label
 */
const getCalculationMethodLabel = (method: number, t: (key: string) => string): string => {
  switch (method) {
    case RateCalculationMethod.SimpleDifference:
      return t('rateOfChangeMemory.calculationMethod.simpleDifference');
    case RateCalculationMethod.MovingAverage:
      return t('rateOfChangeMemory.calculationMethod.movingAverage');
    case RateCalculationMethod.WeightedAverage:
      return t('rateOfChangeMemory.calculationMethod.weightedAverage');
    case RateCalculationMethod.LinearRegression:
      return t('rateOfChangeMemory.calculationMethod.linearRegression');
    default:
      return String(method);
  }
};

/**
 * Get time unit label
 */
const getTimeUnitLabel = (unit: number, t: (key: string) => string): string => {
  switch (unit) {
    case RateTimeUnit.PerSecond:
      return t('rateOfChangeMemory.timeUnit.perSecond');
    case RateTimeUnit.PerMinute:
      return t('rateOfChangeMemory.timeUnit.perMinute');
    case RateTimeUnit.PerHour:
      return t('rateOfChangeMemory.timeUnit.perHour');
    default:
      return String(unit);
  }
};

const DeleteRateOfChangeMemoryDialog: React.FC<DeleteRateOfChangeMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  rateOfChangeMemory,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRateOfChangeMemoryDisplayName = (): string => {
    if (rateOfChangeMemory.name) {
      return rateOfChangeMemory.name;
    }
    
    const inputName = rateOfChangeMemory.inputItemName || rateOfChangeMemory.inputItemId;
    const outputName = rateOfChangeMemory.outputItemName || rateOfChangeMemory.outputItemId;
    return `${inputName} → ${outputName}`;
  };

  const handleDelete = async () => {
    if (!rateOfChangeMemory || !rateOfChangeMemory.id) {
      logger.error('Cannot delete rate of change memory: ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('Deleting rate of change memory', { id: rateOfChangeMemory.id });
      const response = await deleteRateOfChangeMemory({ id: rateOfChangeMemory.id });

      if (response.isSuccessful) {
        logger.info('Rate of change memory deleted successfully', { id: rateOfChangeMemory.id });
        onSuccess();
      } else {
        setError(response.errorMessage || t('rateOfChangeMemory.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete rate of change memory', { error: err });
      setError(t('rateOfChangeMemory.errors.deleteFailed'));
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
      data-id-ref="delete-rateofchange-memory-dialog"
    >
      <DialogTitle data-id-ref="delete-rateofchange-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('rateOfChangeMemory.deleteTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-rateofchange-memory-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-rateofchange-memory-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-rateofchange-memory-confirmation-text">
          {t('rateOfChangeMemory.deleteMessage', {
            name: getRateOfChangeMemoryDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="info" sx={{ mt: 2 }} data-id-ref="delete-rateofchange-memory-info">
          <Typography variant="body2">
            <strong>{t('rateOfChangeMemory.calculationMethod.label')}:</strong> {getCalculationMethodLabel(rateOfChangeMemory.calculationMethod, t)}
          </Typography>
          <Typography variant="body2">
            <strong>{t('rateOfChangeMemory.timeUnit.label')}:</strong> {rateOfChangeMemory.rateUnitDisplay || getTimeUnitLabel(rateOfChangeMemory.timeUnit, t)}
          </Typography>
          {rateOfChangeMemory.lastSmoothedRate !== null && rateOfChangeMemory.lastSmoothedRate !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{t('rateOfChangeMemory.currentRate')}:</strong> {rateOfChangeMemory.lastSmoothedRate.toFixed(rateOfChangeMemory.decimalPlaces)} {rateOfChangeMemory.rateUnitDisplay}
            </Typography>
          )}
        </Alert>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-rateofchange-memory-warning">
          <Typography variant="body2">
            {t('rateOfChangeMemory.deleteWarning')}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-rateofchange-memory-dialog-actions">
        <Button
          data-id-ref="cancel-delete-rateofchange-memory-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-rateofchange-memory-btn"
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

export default DeleteRateOfChangeMemoryDialog;
