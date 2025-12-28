import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Slider,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { startPIDTuning } from '../services/extendedApi';
import type { PIDMemoryWithItems, StartPIDTuningRequestDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('StartPIDTuningDialog');

interface StartPIDTuningDialogProps {
  open: boolean;
  pidMemory: PIDMemoryWithItems | null;
  onClose: (started: boolean) => void;
}

/**
 * Dialog for starting PID auto-tuning session
 */
const StartPIDTuningDialog: React.FC<StartPIDTuningDialogProps> = ({
  open,
  pidMemory,
  onClose,
}) => {
  const { t } = useLanguage();
  
  // Form state
  const [relayAmplitude, setRelayAmplitude] = useState<number>(20);
  const [relayHysteresis, setRelayHysteresis] = useState<number>(0.5);
  const [minCycles, setMinCycles] = useState<number>(3);
  const [maxCycles, setMaxCycles] = useState<number>(10);
  const [maxAmplitude, setMaxAmplitude] = useState<number>(10);
  const [timeout, setTimeout] = useState<number>(600);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission
   */
  const handleStart = async () => {
    if (!pidMemory) return;

    setError(null);
    setLoading(true);

    try {
      const requestData: StartPIDTuningRequestDto = {
        pidMemoryId: pidMemory.id,
        relayAmplitude,
        relayHysteresis,
        minCycles,
        maxCycles,
        maxAmplitude,
        timeout,
      };

      const response = await startPIDTuning(requestData);

      if (response.isSuccessful) {
        logger.info('Auto-tuning started', { pidMemoryId: pidMemory.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('pidMemory.autoTuning.startFailed'));
      }
    } catch (err) {
      logger.error('Failed to start auto-tuning', err);
      setError(t('pidMemory.autoTuning.startFailed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!loading) {
      onClose(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-id-ref="start-pid-tuning-dialog"
    >
      <DialogTitle data-id-ref="start-pid-tuning-dialog-title">
        {t('pidMemory.autoTuning.startTitle')}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* PID Info */}
          {pidMemory && (
            <Alert severity="info" sx={{ mb: 3 }} data-id-ref="start-pid-tuning-info-alert">
              <Typography variant="body2" fontWeight="bold">
                {pidMemory.name || `PID ${pidMemory.id.substring(0, 8)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('pidMemory.inputItem')}: {pidMemory.inputItemName || t('common.unknown')} → 
                {t('pidMemory.outputItem')}: {pidMemory.outputItemName || t('common.unknown')}
              </Typography>
            </Alert>
          )}

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('pidMemory.autoTuning.description')}
          </Typography>

          {/* Warning */}
          <Alert severity="warning" sx={{ mb: 3 }} data-id-ref="start-pid-tuning-warning-alert">
            {t('pidMemory.autoTuning.warning')}
          </Alert>

          {/* Configuration Form */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 3, mb: 2 }}>
            {t('pidMemory.autoTuning.configuration')}
          </Typography>

          <Stack spacing={3}>
            {/* Relay Amplitude */}
            <Box>
              <Typography variant="body2" gutterBottom>
                {t('pidMemory.autoTuning.relayAmplitude')}: {relayAmplitude}%
              </Typography>
              <Slider
                value={relayAmplitude}
                onChange={(_, value) => setRelayAmplitude(value as number)}
                min={10}
                max={50}
                step={5}
                marks
                valueLabelDisplay="auto"
                disabled={loading}
                data-id-ref="start-pid-tuning-relay-amplitude-slider"
              />
              <Typography variant="caption" color="text.secondary">
                {t('pidMemory.autoTuning.relayAmplitudeHelp')}
              </Typography>
            </Box>

            {/* Relay Hysteresis & Min Cycles */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('pidMemory.autoTuning.relayHysteresis')}
                type="number"
                value={relayHysteresis}
                onChange={(e) => setRelayHysteresis(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                disabled={loading}
                helperText={t('pidMemory.autoTuning.relayHysteresisHelp')}
                data-id-ref="start-pid-tuning-hysteresis-input"
              />
              <TextField
                fullWidth
                label={t('pidMemory.autoTuning.minCycles')}
                type="number"
                value={minCycles}
                onChange={(e) => setMinCycles(parseInt(e.target.value) || 3)}
                inputProps={{ min: 2, max: maxCycles }}
                disabled={loading}
                helperText={t('pidMemory.autoTuning.minCyclesHelp')}
                data-id-ref="start-pid-tuning-min-cycles-input"
              />
            </Box>

            {/* Max Cycles & Max Amplitude */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('pidMemory.autoTuning.maxCycles')}
                type="number"
                value={maxCycles}
                onChange={(e) => setMaxCycles(parseInt(e.target.value) || 10)}
                inputProps={{ min: minCycles, max: 20 }}
                disabled={loading}
                helperText={t('pidMemory.autoTuning.maxCyclesHelp')}
                data-id-ref="start-pid-tuning-max-cycles-input"
              />
              <TextField
                fullWidth
                label={t('pidMemory.autoTuning.maxAmplitude')}
                type="number"
                value={maxAmplitude}
                onChange={(e) => setMaxAmplitude(parseFloat(e.target.value) || 10)}
                inputProps={{ min: 5, max: 50, step: 1 }}
                disabled={loading}
                helperText={t('pidMemory.autoTuning.maxAmplitudeHelp')}
                data-id-ref="start-pid-tuning-max-amplitude-input"
              />
            </Box>

            {/* Timeout */}
            <Box>
              <Typography variant="body2" gutterBottom>
                {t('pidMemory.autoTuning.timeout')}: {timeout} {t('pidMemory.autoTuning.seconds')}
              </Typography>
              <Slider
                value={timeout}
                onChange={(_, value) => setTimeout(value as number)}
                min={60}
                max={1800}
                step={60}
                marks={[
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' },
                  { value: 600, label: '10m' },
                  { value: 900, label: '15m' },
                  { value: 1800, label: '30m' },
                ]}
                valueLabelDisplay="auto"
                disabled={loading}
                data-id-ref="start-pid-tuning-timeout-slider"
              />
              <Typography variant="caption" color="text.secondary">
                {t('pidMemory.autoTuning.timeoutHelp')}
              </Typography>
            </Box>
          </Stack>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} data-id-ref="start-pid-tuning-error-alert">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
          startIcon={<CloseIcon />}
          data-id-ref="start-pid-tuning-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          color="primary"
          disabled={loading || !pidMemory}
          startIcon={loading ? <CircularProgress size={20} /> : <StartIcon />}
          data-id-ref="start-pid-tuning-start-btn"
        >
          {loading ? t('common.processing') : t('pidMemory.autoTuning.startButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StartPIDTuningDialog;
