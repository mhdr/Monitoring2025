import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Warning, Refresh, Replay } from '@mui/icons-material';
import { createLogger } from '../utils/logger';
import './LazyErrorBoundary.css';

const logger = createLogger('LazyErrorBoundary');

interface LazyErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary Component for Lazy-Loaded Routes
 * 
 * Catches errors during lazy component loading (chunk loading failures)
 * and provides retry functionality with user feedback.
 */
class LazyErrorBoundary extends Component<LazyErrorBoundaryProps, LazyErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<LazyErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    logger.error('LazyErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Check if it's a chunk loading error
    const isChunkLoadError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module');

    // Auto-retry chunk loading errors (up to maxRetries)
    if (isChunkLoadError && this.state.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = (): void => {
    // Force reload the page to get fresh chunks
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with retry functionality
      const isChunkError = 
        this.state.error?.message.includes('Loading chunk') ||
        this.state.error?.message.includes('Failed to fetch');

      return (
        <div 
          className="lazy-error-boundary" 
          data-id-ref="lazy-error-boundary-container"
        >
          <div 
            className="error-content" 
            data-id-ref="lazy-error-boundary-content"
          >
              <div 
                className="error-icon mb-3" 
                data-id-ref="lazy-error-boundary-icon-container"
              >
                <Warning className="text-warning" style={{ fontSize: '3rem' }} data-id-ref="lazy-error-boundary-icon" />
              </div>            <h3 
              className="error-title mb-3" 
              data-id-ref="lazy-error-boundary-title"
            >
              {isChunkError ? 'Loading Error' : 'Something Went Wrong'}
            </h3>
            
            <p 
              className="error-message mb-4" 
              data-id-ref="lazy-error-boundary-message"
            >
              {isChunkError 
                ? 'Failed to load this page. This might be due to a network issue or an outdated cache.'
                : 'An unexpected error occurred while loading this component.'}
            </p>

            {this.state.retryCount > 0 && this.state.retryCount < this.maxRetries && (
              <p 
                className="retry-info text-muted mb-3" 
                data-id-ref="lazy-error-boundary-retry-info"
              >
                Retry attempt {this.state.retryCount} of {this.maxRetries}...
              </p>
            )}

            {this.state.retryCount >= this.maxRetries && (
              <p 
                className="retry-failed text-danger mb-3" 
                data-id-ref="lazy-error-boundary-retry-failed"
              >
                Automatic retry failed. Please try reloading the page.
              </p>
            )}

            <div 
              className="error-actions" 
              data-id-ref="lazy-error-boundary-actions"
            >
              <button
                className="btn btn-primary me-2"
                onClick={this.handleRetry}
                data-id-ref="lazy-error-boundary-retry-button"
              >
                <Refresh className="me-2" data-id-ref="lazy-error-boundary-retry-icon" />
                Try Again
              </button>
              
              <button
                className="btn btn-outline-secondary"
                onClick={this.handleReload}
                data-id-ref="lazy-error-boundary-reload-button"
              >
                <Replay className="me-2" data-id-ref="lazy-error-boundary-reload-icon" />
                Reload Page
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details 
                className="error-details mt-4" 
                data-id-ref="lazy-error-boundary-details"
              >
                <summary 
                  className="text-muted" 
                  data-id-ref="lazy-error-boundary-details-summary"
                >
                  Error Details (Development Only)
                </summary>
                <pre 
                  className="mt-2 p-3 bg-light rounded text-start" 
                  data-id-ref="lazy-error-boundary-details-content"
                >
                  <code>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </code>
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyErrorBoundary;
