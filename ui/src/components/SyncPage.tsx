/**
 * SyncPage Component
 * Displays data synchronization progress with individual progress bars for groups and items
 * Redirects to intended destination after successful sync or provides retry options on failure
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Alert, 
  Button,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon, 
  Circle as CircleIcon,
  Refresh as RefreshIcon,
  SkipNext as SkipNextIcon,
  Autorenew as AutorenewIcon,
  CheckCircle as CheckCircleFillIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useDataSync } from '../hooks/useDataSync';
import { useAppDispatch } from '../hooks/useRedux';
import { clearDataSyncStatus } from '../store/slices/monitoringSlice';
import type { SyncProgress } from '../hooks/useDataSync';
import './SyncPage.css';

/**
 * Individual progress bar component for sync operations
 */
interface ProgressBarProps {
  /** Progress title */
  title: string;
  /** Progress description */
  description: string;
  /** Current progress state */
  progress: SyncProgress;
  /** Success message to show when completed */
  successMessage: string;
  /** Error message to show when failed */
  errorMessage: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  description,
  progress,
  successMessage,
  errorMessage
}) => {
  const getProgressBarColor = useCallback((): 'success' | 'error' | 'primary' | 'secondary' => {
    switch (progress.status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'loading':
        return 'primary';
      default:
        return 'secondary';
    }
  }, [progress.status]);

  const getStatusIcon = useCallback(() => {
    switch (progress.status) {
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main' }} data-id-ref={`progress-icon-success-${title.toLowerCase()}`} aria-label="Success" />;
      case 'error':
        return <CancelIcon sx={{ color: 'error.main' }} data-id-ref={`progress-icon-error-${title.toLowerCase()}`} aria-label="Error" />;
      case 'loading':
        return <CircularProgress size={20} sx={{ color: 'primary.main' }} data-id-ref={`progress-icon-loading-${title.toLowerCase()}`} aria-label="Loading" />;
      default:
        return <CircleIcon sx={{ color: 'text.disabled' }} data-id-ref={`progress-icon-idle-${title.toLowerCase()}`} aria-label="Waiting" />;
    }
  }, [progress.status, title]);

  const getStatusMessage = useCallback(() => {
    switch (progress.status) {
      case 'success':
        return successMessage;
      case 'error':
        return progress.error || errorMessage;
      case 'loading':
        return description;
      default:
        return description;
    }
  }, [progress.status, progress.error, successMessage, errorMessage, description]);

  return (
    <Box 
      className="sync-progress-item" 
      sx={{ mb: 2 }}
      data-id-ref={`sync-progress-${title.toLowerCase()}`} 
      role="region" 
      aria-labelledby={`progress-title-${title.toLowerCase()}`}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} data-id-ref={`progress-header-${title.toLowerCase()}`}>
        <Box 
          className="sync-status-icon" 
          data-id-ref={`progress-icon-container-${title.toLowerCase()}`} 
          aria-hidden="true"
        >
          {getStatusIcon()}
        </Box>
        <Box sx={{ flexGrow: 1 }} data-id-ref={`progress-content-${title.toLowerCase()}`}>
          <Typography 
            variant="subtitle2" 
            sx={{ fontWeight: 600, mb: 0 }} 
            data-id-ref={`progress-title-${title.toLowerCase()}`} 
            id={`progress-title-${title.toLowerCase()}`}
          >
            {title}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ color: 'text.secondary', display: 'block' }} 
            data-id-ref={`progress-message-${title.toLowerCase()}`} 
            id={`progress-message-${title.toLowerCase()}`}
          >
            {getStatusMessage()}
          </Typography>
        </Box>
      </Stack>
      
      <LinearProgress 
        variant="determinate" 
        value={progress.progress} 
        color={getProgressBarColor()}
        className="sync-progress-bar"
        data-id-ref={`progress-bar-${title.toLowerCase()}`}
        aria-labelledby={`progress-title-${title.toLowerCase()}`}
        aria-describedby={`progress-message-${title.toLowerCase()}`}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
};

/**
 * Main synchronization page component
 */
const SyncPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncState, startSync, retryFailed } = useDataSync();
  const dispatch = useAppDispatch();
  
  // Get the intended redirect URL from query params, default to dashboard
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  // Check if this is a forced sync (initiated from navbar)
  const isForceSync = searchParams.get('force') === 'true';
  
  // State for handling redirect delay
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Ref to track if redirect has been initiated (prevents double-redirect)
  const redirectInitiatedRef = React.useRef(false);
  
  // Ref to store the redirect timer ID (persists through StrictMode re-renders)
  const redirectTimerRef = React.useRef<number | null>(null);

  /**
   * Start sync process on component mount
   * If this is a forced sync, clear the existing sync status first
   */
  useEffect(() => {
    if (isForceSync) {
      // Clear the existing sync status to force a fresh sync
      dispatch(clearDataSyncStatus());
    }
    startSync();
  }, [startSync, isForceSync, dispatch]);

  /**
   * Handle successful sync completion
   */
  useEffect(() => {
    // Only initiate redirect once when sync completes
    if (syncState.isCompleted && !redirectInitiatedRef.current) {
      redirectInitiatedRef.current = true;
      setIsRedirecting(true);
      
      // Invalidate Service Worker API cache after successful sync
      import('../services/cacheCoordinationService').then(({ invalidateApiCache }) => {
        invalidateApiCache().catch((error) => {
          console.warn('[Sync] Failed to invalidate cache:', error);
        });
      });
      
      // Clear any existing timer (in case of multiple effect runs)
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      
      // Add a small delay to show completion state before redirecting
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1500);
    }
    
    // Cleanup: DO NOT clear timer if redirect has been initiated
    // This prevents StrictMode from canceling the redirect
    return () => {
      // Only clear timer if we haven't started redirecting
      // (i.e., component is unmounting before sync completed)
      if (redirectTimerRef.current && !redirectInitiatedRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [syncState.isCompleted, navigate, redirectTo]);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    retryFailed();
  }, [retryFailed]);

  /**
   * Handle skip and continue button click
   */
  const handleSkipAndContinue = useCallback(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  /**
   * Calculate overall progress percentage
   */
  const overallProgress = useMemo(() => {
    return Math.round((syncState.groups.progress + syncState.items.progress + syncState.alarms.progress) / 3);
  }, [syncState.groups.progress, syncState.items.progress, syncState.alarms.progress]);

  return (
    <Box 
      className="sync-page" 
      data-id-ref="sync-page" 
      role="main" 
      aria-live="polite"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        padding: { xs: 2, sm: 3, md: 4 }
      }}
    >
      <Container 
        maxWidth="md" 
        data-id-ref="sync-page-container"
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        <Box 
          sx={{ 
            width: '100%', 
            maxWidth: { xs: '100%', sm: '90%', md: '75%', lg: '60%', xl: '50%' } 
          }} 
          data-id-ref="sync-page-col"
        >
          <Card 
            component="section"
            className="sync-card"
            elevation={8}
            data-id-ref="sync-card" 
            aria-labelledby="sync-title" 
            aria-describedby="sync-subtitle"
            sx={{
              borderRadius: { xs: 2, md: 3 },
              overflow: 'hidden'
            }}
          >
            <CardContent 
              data-id-ref="sync-card-body"
              sx={{ 
                padding: { xs: 3, md: 4 } 
              }}
            >
              
              {/* Header */}
              <Box 
                component="header" 
                sx={{ textAlign: 'center', mb: 3 }} 
                data-id-ref="sync-header"
              >
                <Box 
                  className="sync-logo" 
                  sx={{ mb: 2 }} 
                  data-id-ref="sync-logo" 
                  aria-hidden="true"
                >
                  <AutorenewIcon 
                    className="sync-icon" 
                    data-id-ref="sync-icon"
                    sx={{ 
                      fontSize: { xs: 48, md: 64 }, 
                      color: 'primary.main',
                      animation: syncState.overall === 'syncing' ? 'spin 2s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} 
                  />
                </Box>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  className="sync-title" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 600,
                    fontSize: { xs: '1.5rem', md: '2rem' } 
                  }} 
                  data-id-ref="sync-title" 
                  id="sync-title"
                >
                  {t('sync.title')}
                </Typography>
                <Typography 
                  variant="body2" 
                  className="sync-subtitle" 
                  sx={{ 
                    color: 'text.secondary', 
                    mb: 0 
                  }} 
                  data-id-ref="sync-subtitle" 
                  id="sync-subtitle"
                >
                  {t('sync.subtitle')}
                </Typography>
              </Box>

              {/* Overall Progress */}
              <Box 
                component="section" 
                sx={{ mb: 3 }} 
                data-id-ref="sync-overall-progress-section" 
                aria-labelledby="overall-progress-label"
              >
                <Stack 
                  direction="row" 
                  justifyContent="space-between" 
                  alignItems="center" 
                  sx={{ mb: 2 }} 
                  data-id-ref="sync-overall-progress-header"
                >
                  <Typography 
                    variant="body1" 
                    sx={{ fontWeight: 500 }} 
                    data-id-ref="sync-overall-progress-label" 
                    id="overall-progress-label"
                  >
                    {t('sync.title')}
                  </Typography>
                  <Chip 
                    label={`${overallProgress}%`} 
                    color="primary" 
                    size="small"
                    data-id-ref="sync-overall-progress-badge" 
                    aria-label={`${overallProgress} percent complete`}
                  />
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={overallProgress} 
                  className="sync-overall-progress"
                  data-id-ref="sync-overall-progress-bar"
                  aria-labelledby="overall-progress-label"
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </Box>

              {/* Individual Progress Bars */}
              <Box 
                component="section" 
                className="sync-progress-list" 
                data-id-ref="sync-progress-list" 
                aria-label="Individual synchronization progress"
              >
                <ProgressBar
                  title={t('sync.groups.title')}
                  description={t('sync.groups.description')}
                  progress={syncState.groups}
                  successMessage={t('sync.groups.success')}
                  errorMessage={t('sync.groups.error')}
                />
                
                <ProgressBar
                  title={t('sync.items.title')}
                  description={t('sync.items.description')}
                  progress={syncState.items}
                  successMessage={t('sync.items.success')}
                  errorMessage={t('sync.items.error')}
                />
                
                <ProgressBar
                  title={t('sync.alarms.title')}
                  description={t('sync.alarms.description')}
                  progress={syncState.alarms}
                  successMessage={t('sync.alarms.success')}
                  errorMessage={t('sync.alarms.error')}
                />
              </Box>

              {/* Status Messages */}
              <Box 
                component="section" 
                className="sync-status-messages" 
                sx={{ mt: 3 }} 
                data-id-ref="sync-status-messages" 
                aria-label="Synchronization status messages"
              >
                {syncState.overall === 'syncing' && !syncState.hasErrors && (
                  <Alert 
                    severity="info" 
                    icon={<CircularProgress size={20} />}
                    data-id-ref="sync-status-syncing" 
                    role="status" 
                    aria-live="polite"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Typography variant="body2" data-id-ref="sync-status-syncing-text">
                      {t('sync.completing')}
                    </Typography>
                  </Alert>
                )}
                
                {syncState.isCompleted && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircleFillIcon />}
                    data-id-ref="sync-status-completed" 
                    role="status" 
                    aria-live="polite"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Typography variant="body2" data-id-ref="sync-status-completed-text">
                      {isRedirecting ? t('sync.redirecting') : t('sync.completing')}
                    </Typography>
                  </Alert>
                )}
                
                {syncState.hasErrors && (
                  <Alert 
                    severity="error" 
                    data-id-ref="sync-status-error" 
                    role="alert" 
                    aria-live="assertive"
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} data-id-ref="sync-status-error-header">
                      <WarningIcon data-id-ref="sync-status-error-icon" aria-label="Error" />
                      <Typography variant="body2" data-id-ref="sync-status-error-text">
                        {t('sync.errors.synchronizationFailed')}
                      </Typography>
                    </Stack>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={1} 
                      data-id-ref="sync-status-error-actions"
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <Button 
                        variant="outlined" 
                        color="error"
                        size="small"
                        onClick={handleRetry}
                        data-id-ref="sync-retry-button"
                        disabled={syncState.overall === 'syncing'}
                        aria-label="Retry failed synchronization operations"
                        startIcon={<RefreshIcon data-id-ref="sync-retry-button-icon" aria-hidden="true" />}
                      >
                        {t('sync.retry')}
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary"
                        size="small"
                        onClick={handleSkipAndContinue}
                        data-id-ref="sync-skip-button"
                        aria-label="Skip synchronization and continue to dashboard"
                        startIcon={<SkipNextIcon data-id-ref="sync-skip-button-icon" aria-hidden="true" />}
                      >
                        {t('sync.skipAndContinue')}
                      </Button>
                    </Stack>
                  </Alert>
                )}
              </Box>

            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default SyncPage;