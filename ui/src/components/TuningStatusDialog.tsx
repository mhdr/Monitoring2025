import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Cancel as AbortIcon,
  Close as CloseIcon,
  Check as ApplyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import {
  getPIDTuningStatus,
  abortPIDTuning,
  applyTunedParameters,
} from '../services/extendedApi';
import type {
  PIDTuningSession,
  TuningStatus,
  GetPIDTuningStatusRequestDto,
  AbortPIDTuningRequestDto,
  ApplyTunedParametersRequestDto,
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('TuningStatusDialog');

interface TuningStatusDialogProps {
  open: boolean;
  pidMemoryId: string | null;
  onClose: (applied: boolean) => void;
}

/**
 * Dialog for monitoring PID auto-tuning progress and viewing results
 */
const TuningStatusDialog: React.FC<TuningStatusDialogProps> = ({
  open,
  pidMemoryId,
  onClose,
}) => {
  const { t } = useLanguage();

  // State
  const [session, setSession] = useState<PIDTuningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aborting, setAborting] = useState(false);
  const [applying, setApplying] = useState(false);

  /**
   * Fetch tuning status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!pidMemoryId) return;

    setLoading(true);
    setError(null);

    try {
      const requestData: GetPIDTuningStatusRequestDto = { pidMemoryId };
      const response = await getPIDTuningStatus(requestData);

      if (response.isSuccessful && response.session) {
        setSession(response.session);
      } else {
        setError(response.errorMessage || t('pidMemory.autoTuning.fetchStatusFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch tuning status', err);
      setError(t('pidMemory.autoTuning.fetchStatusFailed'));
    } finally {
      setLoading(false);
    }
  }, [pidMemoryId, t]);

  /**
   * Auto-refresh status while tuning is active
   * NOTE: We intentionally omit 'session' from deps to avoid infinite loop.
   * The session state is checked inside the interval using functional setState pattern.
   */
  useEffect(() => {
    if (!open || !pidMemoryId) return;

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const intervalId = setInterval(() => {
      // Use functional setState to read current session state without adding it to deps
      // This avoids infinite loop where session change -> effect runs -> fetchStatus -> session change
      setSession(currentSession => {
        if (currentSession && isActiveTuning(currentSession.status)) {
          fetchStatus();
        }
        return currentSession; // Return unchanged to avoid unnecessary re-render
      });
    }, 2000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pidMemoryId, fetchStatus]);

  /**
   * Check if tuning is currently active
   */
  const isActiveTuning = (status: TuningStatus): boolean => {
    return status === 1 || status === 2 || status === 3; // Initializing, RelayTest, AnalyzingData
  };

  /**
   * Handle abort tuning
   */
  const handleAbort = async () => {
    if (!pidMemoryId) return;

    setAborting(true);
    setError(null);

    try {
      const requestData: AbortPIDTuningRequestDto = { pidMemoryId };
      const response = await abortPIDTuning(requestData);

      if (response.isSuccessful) {
        logger.info('Tuning aborted', { pidMemoryId });
        await fetchStatus(); // Refresh status
      } else {
        setError(response.errorMessage || t('pidMemory.autoTuning.abortFailed'));
      }
    } catch (err) {
      logger.error('Failed to abort tuning', err);
      setError(t('pidMemory.autoTuning.abortFailed'));
    } finally {
      setAborting(false);
    }
  };

  /**
   * Handle apply tuned parameters
   */
  const handleApply = async () => {
    if (!session || !session.id) return;

    setApplying(true);
    setError(null);

    try {
      const requestData: ApplyTunedParametersRequestDto = {
        sessionId: session.id,
        applyKp: true,
        applyKi: true,
        applyKd: true,
      };
      const response = await applyTunedParameters(requestData);

      if (response.isSuccessful) {
        logger.info('Tuned parameters applied', { sessionId: session.id });
        onClose(true);
      } else {
        setError(response.errorMessage || t('pidMemory.autoTuning.applyFailed'));
      }
    } catch (err) {
      logger.error('Failed to apply tuned parameters', err);
      setError(t('pidMemory.autoTuning.applyFailed'));
    } finally {
      setApplying(false);
    }
  };

  /**
   * Get status chip color
   */
  const getStatusColor = (status: TuningStatus): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 0: return 'default'; // Idle
      case 1: return 'primary'; // Initializing
      case 2: return 'primary'; // RelayTest
      case 3: return 'primary'; // AnalyzingData
      case 4: return 'success'; // Completed
      case 5: return 'warning'; // Aborted
      case 6: return 'error'; // Failed
      default: return 'default';
    }
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status: TuningStatus): string => {
    const statusMap: Record<number, string> = {
      0: t('pidMemory.autoTuning.statusIdle'),
      1: t('pidMemory.autoTuning.statusInitializing'),
      2: t('pidMemory.autoTuning.statusRelayTest'),
      3: t('pidMemory.autoTuning.statusAnalyzing'),
      4: t('pidMemory.autoTuning.statusCompleted'),
      5: t('pidMemory.autoTuning.statusAborted'),
      6: t('pidMemory.autoTuning.statusFailed'),
    };
    return statusMap[status] || t('common.unknown');
  };

  /**
   * Calculate progress percentage
   */
  const getProgress = (): number => {
    if (!session) return 0;

    switch (session.status) {
      case 0: return 0; // Idle
      case 1: return 10; // Initializing
      case 2: return 50; // RelayTest - approximate middle
      case 3: return 90; // AnalyzingData
      case 4: return 100; // Completed
      case 5: return 100; // Aborted
      case 6: return 100; // Failed
      default: return 0;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="tuning-status-dialog"
    >
      <DialogTitle data-id-ref="tuning-status-dialog-title">
        {t('pidMemory.autoTuning.statusTitle')}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Loading Spinner */}
          {loading && !session && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Session Info */}
          {session && (
            <>
              {/* Status Badge */}
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip
                  label={getStatusLabel(session.status)}
                  color={getStatusColor(session.status)}
                  icon={
                    session.status === 4 ? <SuccessIcon /> :
                      session.status === 6 ? <ErrorIcon /> :
                        session.status === 5 ? <AbortIcon /> : undefined
                  }
                  data-id-ref="tuning-status-chip"
                />
                <Typography variant="caption" color="text.secondary">
                  {session.id?.substring(0, 8)}
                </Typography>
              </Box>

              {/* Progress Bar */}
              {isActiveTuning(session.status) && (
                <Box mb={3}>
                  <LinearProgress
                    variant="determinate"
                    value={getProgress()}
                    sx={{ height: 8, borderRadius: 4 }}
                    data-id-ref="tuning-progress-bar"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {t('pidMemory.autoTuning.processing')}
                  </Typography>
                </Box>
              )}

              {/* Configuration Card */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('pidMemory.autoTuning.configuration')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('pidMemory.autoTuning.relayAmplitude')}
                      </Typography>
                      <Typography variant="body2">{session.relayAmplitude}%</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('pidMemory.autoTuning.relayHysteresis')}
                      </Typography>
                      <Typography variant="body2">{session.relayHysteresis}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('pidMemory.autoTuning.minCycles')}
                      </Typography>
                      <Typography variant="body2">{session.minCycles}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('pidMemory.autoTuning.maxCycles')}
                      </Typography>
                      <Typography variant="body2">{session.maxCycles}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Results Card (Only for Completed) */}
              {session.status === 4 && (
                <Card variant="outlined" sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('pidMemory.autoTuning.results')}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="inherit">
                          {t('pidMemory.autoTuning.confidenceScore')}
                        </Typography>
                        <Typography variant="h6">{((session.confidenceScore || 0) * 100).toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="inherit">Kp</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {session.calculatedKp?.toFixed(4) || '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="inherit">Ki</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {session.calculatedKi?.toFixed(4) || '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="inherit">Kd</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {session.calculatedKd?.toFixed(4) || '-'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="inherit">
                            {t('pidMemory.autoTuning.ultimatePeriod')}
                          </Typography>
                          <Typography variant="body2">{session.ultimatePeriod?.toFixed(2)} s</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="inherit">
                            {t('pidMemory.autoTuning.criticalGain')}
                          </Typography>
                          <Typography variant="body2">{session.criticalGain?.toFixed(4)}</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {session.status === 6 && session.errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }} data-id-ref="tuning-error-alert">
                  {session.errorMessage}
                </Alert>
              )}

              {/* Aborted Message */}
              {session.status === 5 && (
                <Alert severity="warning" sx={{ mb: 2 }} data-id-ref="tuning-aborted-alert">
                  {t('pidMemory.autoTuning.status.aborted')}
                </Alert>
              )}
            </>
          )}

          {/* General Error */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} data-id-ref="tuning-status-error-alert">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {/* Refresh Button */}
        <Button
          onClick={fetchStatus}
          disabled={loading}
          startIcon={<RefreshIcon />}
          data-id-ref="tuning-status-refresh-btn"
        >
          {t('common.refresh')}
        </Button>

        {/* Abort Button (Only for active tuning) */}
        {session && isActiveTuning(session.status) && (
          <Button
            onClick={handleAbort}
            disabled={aborting}
            color="error"
            startIcon={aborting ? <CircularProgress size={20} /> : <AbortIcon />}
            data-id-ref="tuning-status-abort-btn"
          >
            {aborting ? t('common.processing') : t('pidMemory.autoTuning.abortButton')}
          </Button>
        )}

        {/* Apply Button (Only for completed) */}
        {session && session.status === 4 && (
          <Button
            onClick={handleApply}
            variant="contained"
            color="success"
            disabled={applying}
            startIcon={applying ? <CircularProgress size={20} /> : <ApplyIcon />}
            data-id-ref="tuning-status-apply-btn"
          >
            {applying ? t('common.processing') : t('pidMemory.autoTuning.applyButton')}
          </Button>
        )}

        {/* Close Button */}
        <Button
          onClick={() => onClose(false)}
          startIcon={<CloseIcon />}
          data-id-ref="tuning-status-close-btn"
        >
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TuningStatusDialog;
