/**
 * Lazy AG Grid Component
 * Dynamically imports AG Grid only when needed
 * This reduces initial bundle size by ~5MB
 */

import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import LoadingScreen from './LoadingScreen';
import type { AGGridWrapperProps } from '../types/agGrid';

// Lazy load the AG Grid wrapper
const AGGridWrapperLazy = lazy(() => import('./AGGridWrapper'));

/**
 * Lazy AG Grid Wrapper with loading fallback
 * Use this component instead of direct AGGridWrapper import for better performance
 */
export const LazyAGGrid = (props: AGGridWrapperProps) => {
  return (
    <Suspense fallback={<LoadingScreen message="Loading grid..." />}>
      <AGGridWrapperLazy {...props} />
    </Suspense>
  );
};

// Export type for convenience
export type LazyAGGridComponent = ComponentType<AGGridWrapperProps>;

export default LazyAGGrid;
