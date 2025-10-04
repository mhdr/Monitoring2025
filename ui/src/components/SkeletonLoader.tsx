import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Skeleton Loader Component
 * Displays a placeholder animation while content is loading
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width = '100%',
  height,
  className = '',
}) => {
  const defaultHeight = variant === 'text' ? '1rem' : variant === 'circular' ? '40px' : '100px';
  const effectiveHeight = height || defaultHeight;

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof effectiveHeight === 'number' ? `${effectiveHeight}px` : effectiveHeight,
  };

  return (
    <div
      className={`skeleton-loader skeleton-${variant} ${className}`}
      style={style}
      data-id-ref={`skeleton-loader-${variant}`}
    />
  );
};

export default SkeletonLoader;
