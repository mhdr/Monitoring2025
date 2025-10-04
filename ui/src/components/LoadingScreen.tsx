import React from 'react';
import type { ReactNode } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  skeleton?: ReactNode;
  variant?: 'spinner' | 'skeleton';
}

/**
 * Loading Screen Component
 * 
 * Supports two modes:
 * 1. Spinner mode (default): Shows a centered spinner with optional message
 * 2. Skeleton mode: Shows a custom skeleton component for progressive loading
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message, 
  skeleton, 
  variant = 'spinner' 
}) => {
  // If skeleton is provided or variant is explicitly 'skeleton', show skeleton
  if (skeleton || variant === 'skeleton') {
    return (
      <div
        className="loading-screen loading-screen-skeleton"
        data-id-ref="loading-screen-skeleton-container"
      >
        {skeleton}
      </div>
    );
  }

  // Default spinner mode
  return (
    <div
      className="loading-screen"
      data-id-ref="loading-screen-container"
    >
      <div className="loading-content" data-id-ref="loading-screen-content">
        <div className="spinner-border text-primary" role="status" data-id-ref="loading-screen-spinner">
          <span className="visually-hidden" data-id-ref="loading-screen-spinner-label">Loading...</span>
        </div>
        {message && (
          <p className="loading-message mt-3" data-id-ref="loading-screen-message">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
