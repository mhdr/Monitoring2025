import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
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
