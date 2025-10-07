/**
 * SyncPage Component
 * Displays data synchronization progress with individual progress bars for groups and items
 * Redirects to intended destination after successful sync or provides retry options on failure
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useDataSync } from '../hooks/useDataSync';
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
  const getProgressBarClass = useCallback(() => {
    switch (progress.status) {
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-danger';
      case 'loading':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }, [progress.status]);

  const getStatusIcon = useCallback(() => {
    switch (progress.status) {
      case 'success':
        return <i className="bi bi-check-circle-fill text-success" data-id-ref={`progress-icon-success-${title.toLowerCase()}`} aria-label="Success" />;
      case 'error':
        return <i className="bi bi-x-circle-fill text-danger" data-id-ref={`progress-icon-error-${title.toLowerCase()}`} aria-label="Error" />;
      case 'loading':
        return <div className="spinner-border spinner-border-sm text-primary" role="status" data-id-ref={`progress-icon-loading-${title.toLowerCase()}`} aria-label="Loading" />;
      default:
        return <i className="bi bi-circle text-muted" data-id-ref={`progress-icon-idle-${title.toLowerCase()}`} aria-label="Waiting" />;
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
    <div className="sync-progress-item" data-id-ref={`sync-progress-${title.toLowerCase()}`} role="region" aria-labelledby={`progress-title-${title.toLowerCase()}`}>
      <div className="d-flex align-items-center mb-2" data-id-ref={`progress-header-${title.toLowerCase()}`}>
        <div className="sync-status-icon me-3" data-id-ref={`progress-icon-container-${title.toLowerCase()}`} aria-hidden="true">
          {getStatusIcon()}
        </div>
        <div className="flex-grow-1" data-id-ref={`progress-content-${title.toLowerCase()}`}>
          <h6 className="mb-1 fw-semibold" data-id-ref={`progress-title-${title.toLowerCase()}`} id={`progress-title-${title.toLowerCase()}`}>{title}</h6>
          <p className="mb-0 text-muted small" data-id-ref={`progress-message-${title.toLowerCase()}`} id={`progress-message-${title.toLowerCase()}`}>{getStatusMessage()}</p>
        </div>
      </div>
      
      <div className="progress sync-progress-bar" data-id-ref={`progress-bar-container-${title.toLowerCase()}`} role="progressbar" aria-labelledby={`progress-title-${title.toLowerCase()}`} aria-describedby={`progress-message-${title.toLowerCase()}`}>
        <div
          className={`progress-bar ${getProgressBarClass()}`}
          style={{ width: `${progress.progress}%` }}
          aria-valuenow={progress.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          data-id-ref={`progress-bar-${title.toLowerCase()}`}
        />
      </div>
    </div>
  );
};

/**
 * Main synchronization page component
 */
const SyncPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncState, startSync, retryFailed } = useDataSync();
  
  // Get the intended redirect URL from query params, default to dashboard
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  // State for handling redirect delay
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Ref to track if redirect has been initiated (prevents double-redirect)
  const redirectInitiatedRef = React.useRef(false);
  
  // Ref to store the redirect timer ID (persists through StrictMode re-renders)
  const redirectTimerRef = React.useRef<number | null>(null);

  /**
   * Start sync process on component mount
   */
  useEffect(() => {
    startSync();
  }, [startSync]);

  /**
   * Handle successful sync completion
   */
  useEffect(() => {
    // Only initiate redirect once when sync completes
    if (syncState.isCompleted && !redirectInitiatedRef.current) {
      redirectInitiatedRef.current = true;
      setIsRedirecting(true);
      
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
    return Math.round((syncState.groups.progress + syncState.items.progress) / 2);
  }, [syncState.groups.progress, syncState.items.progress]);

  return (
    <div className="sync-page" data-id-ref="sync-page" role="main" aria-live="polite">
      <div className="container-fluid h-100" data-id-ref="sync-page-container">
        <div className="row h-100 justify-content-center align-items-center" data-id-ref="sync-page-row">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5" data-id-ref="sync-page-col">
            <section className="sync-card card shadow-lg border-0" data-id-ref="sync-card" aria-labelledby="sync-title" aria-describedby="sync-subtitle">
              <div className="card-body p-4 p-md-5" data-id-ref="sync-card-body">
                
                {/* Header */}
                <header className="text-center mb-4" data-id-ref="sync-header">
                  <div className="sync-logo mb-3" data-id-ref="sync-logo" aria-hidden="true">
                    <i className="bi bi-arrow-clockwise sync-icon" data-id-ref="sync-icon" />
                  </div>
                  <h1 className="sync-title mb-2" data-id-ref="sync-title" id="sync-title">{t('sync.title')}</h1>
                  <p className="text-muted sync-subtitle" data-id-ref="sync-subtitle" id="sync-subtitle">{t('sync.subtitle')}</p>
                </header>

                {/* Overall Progress */}
                <section className="mb-4" data-id-ref="sync-overall-progress-section" aria-labelledby="overall-progress-label">
                  <div className="d-flex justify-content-between align-items-center mb-2" data-id-ref="sync-overall-progress-header">
                    <span className="fw-medium" data-id-ref="sync-overall-progress-label" id="overall-progress-label">{t('sync.title')}</span>
                    <span className="badge bg-primary" data-id-ref="sync-overall-progress-badge" aria-label={`${overallProgress} percent complete`}>{overallProgress}%</span>
                  </div>
                  <div className="progress sync-overall-progress" data-id-ref="sync-overall-progress-container" role="progressbar" aria-labelledby="overall-progress-label" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${overallProgress}%` }}
                      data-id-ref="sync-overall-progress-bar"
                    />
                  </div>
                </section>

                {/* Individual Progress Bars */}
                <section className="sync-progress-list" data-id-ref="sync-progress-list" aria-label="Individual synchronization progress">
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
                </section>

                {/* Status Messages */}
                <section className="sync-status-messages mt-4" data-id-ref="sync-status-messages" aria-label="Synchronization status messages">
                  {syncState.overall === 'syncing' && !syncState.hasErrors && (
                    <div className="alert alert-info d-flex align-items-center" data-id-ref="sync-status-syncing" role="status" aria-live="polite">
                      <div className="spinner-border spinner-border-sm me-2" role="status" data-id-ref="sync-status-syncing-spinner" aria-label="Synchronizing" />
                      <span data-id-ref="sync-status-syncing-text">{t('sync.completing')}</span>
                    </div>
                  )}
                  
                  {syncState.isCompleted && (
                    <div className="alert alert-success d-flex align-items-center" data-id-ref="sync-status-completed" role="status" aria-live="polite">
                      <i className="bi bi-check-circle-fill me-2" data-id-ref="sync-status-completed-icon" aria-label="Completed successfully" />
                      <span data-id-ref="sync-status-completed-text">{isRedirecting ? t('sync.redirecting') : t('sync.completing')}</span>
                    </div>
                  )}
                  
                  {syncState.hasErrors && (
                    <div className="alert alert-danger" data-id-ref="sync-status-error" role="alert" aria-live="assertive">
                      <div className="d-flex align-items-center mb-2" data-id-ref="sync-status-error-header">
                        <i className="bi bi-exclamation-triangle-fill me-2" data-id-ref="sync-status-error-icon" aria-label="Error" />
                        <span data-id-ref="sync-status-error-text">{t('sync.errors.synchronizationFailed')}</span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap" data-id-ref="sync-status-error-actions">
                        <button 
                          type="button" 
                          className="btn btn-outline-danger btn-sm"
                          onClick={handleRetry}
                          data-id-ref="sync-retry-button"
                          disabled={syncState.overall === 'syncing'}
                          aria-label="Retry failed synchronization operations"
                        >
                          <i className="bi bi-arrow-clockwise me-1" data-id-ref="sync-retry-button-icon" aria-hidden="true" />
                          {t('sync.retry')}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={handleSkipAndContinue}
                          data-id-ref="sync-skip-button"
                          aria-label="Skip synchronization and continue to dashboard"
                        >
                          <i className="bi bi-skip-forward me-1" data-id-ref="sync-skip-button-icon" aria-hidden="true" />
                          {t('sync.skipAndContinue')}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncPage;