/**
 * SyncPage Component
 * Displays data synchronization progress with individual progress bars for groups and items
 * Redirects to intended destination after successful sync or provides retry options on failure
 */

import React, { useEffect, useState } from 'react';
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
  const getProgressBarClass = () => {
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
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'success':
        return <i className="bi bi-check-circle-fill text-success" />;
      case 'error':
        return <i className="bi bi-x-circle-fill text-danger" />;
      case 'loading':
        return <div className="spinner-border spinner-border-sm text-primary" role="status" />;
      default:
        return <i className="bi bi-circle text-muted" />;
    }
  };

  const getStatusMessage = () => {
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
  };

  return (
    <div className="sync-progress-item" data-id-ref={`sync-progress-${title.toLowerCase()}`}>
      <div className="d-flex align-items-center mb-2">
        <div className="sync-status-icon me-3">
          {getStatusIcon()}
        </div>
        <div className="flex-grow-1">
          <h6 className="mb-1 fw-semibold">{title}</h6>
          <p className="mb-0 text-muted small">{getStatusMessage()}</p>
        </div>
      </div>
      
      <div className="progress sync-progress-bar">
        <div
          className={`progress-bar ${getProgressBarClass()}`}
          role="progressbar"
          style={{ width: `${progress.progress}%` }}
          aria-valuenow={progress.progress}
          aria-valuemin={0}
          aria-valuemax={100}
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
    if (syncState.isCompleted && !isRedirecting) {
      setIsRedirecting(true);
      
      // Add a small delay to show completion state before redirecting
      const redirectTimer = setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [syncState.isCompleted, isRedirecting, navigate, redirectTo]);

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    retryFailed();
  };

  /**
   * Handle skip and continue button click
   */
  const handleSkipAndContinue = () => {
    navigate(redirectTo, { replace: true });
  };

  /**
   * Calculate overall progress percentage
   */
  const overallProgress = Math.round((syncState.groups.progress + syncState.items.progress) / 2);

  return (
    <div className="sync-page" data-id-ref="sync-page">
      <div className="container-fluid h-100">
        <div className="row h-100 justify-content-center align-items-center">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="sync-card card shadow-lg border-0">
              <div className="card-body p-4 p-md-5">
                
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="sync-logo mb-3">
                    <i className="bi bi-arrow-clockwise sync-icon" />
                  </div>
                  <h2 className="sync-title mb-2">{t('sync.title')}</h2>
                  <p className="text-muted sync-subtitle">{t('sync.subtitle')}</p>
                </div>

                {/* Overall Progress */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-medium">{t('sync.title')}</span>
                    <span className="badge bg-primary">{overallProgress}%</span>
                  </div>
                  <div className="progress sync-overall-progress">
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${overallProgress}%` }}
                      aria-valuenow={overallProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>

                {/* Individual Progress Bars */}
                <div className="sync-progress-list">
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
                </div>

                {/* Status Messages */}
                <div className="sync-status-messages mt-4">
                  {syncState.overall === 'syncing' && !syncState.hasErrors && (
                    <div className="alert alert-info d-flex align-items-center" data-id-ref="sync-status-syncing">
                      <div className="spinner-border spinner-border-sm me-2" role="status" />
                      <span>{t('sync.completing')}</span>
                    </div>
                  )}
                  
                  {syncState.isCompleted && (
                    <div className="alert alert-success d-flex align-items-center" data-id-ref="sync-status-completed">
                      <i className="bi bi-check-circle-fill me-2" />
                      <span>{isRedirecting ? t('sync.redirecting') : t('sync.completing')}</span>
                    </div>
                  )}
                  
                  {syncState.hasErrors && (
                    <div className="alert alert-danger" data-id-ref="sync-status-error">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        <span>Some data failed to synchronize</span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button 
                          type="button" 
                          className="btn btn-outline-danger btn-sm"
                          onClick={handleRetry}
                          data-id-ref="sync-retry-button"
                          disabled={syncState.overall === 'syncing'}
                        >
                          <i className="bi bi-arrow-clockwise me-1" />
                          {t('sync.retry')}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm"
                          onClick={handleSkipAndContinue}
                          data-id-ref="sync-skip-button"
                        >
                          <i className="bi bi-skip-forward me-1" />
                          {t('sync.skipAndContinue')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncPage;