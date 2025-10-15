/**
 * Lazy AG Grid Component
 * Dynamically imports AG Grid only when needed
 * This reduces initial bundle size by ~5MB
 */

import { lazy, Suspense, forwardRef } from 'react';
import type { ComponentType } from 'react';
import LoadingScreen from './LoadingScreen';
import type { AGGridWrapperProps, AGGridApi } from '../types/agGrid';

// Lazy load the AG Grid wrapper
const AGGridWrapperLazy = lazy(() => import('./AGGridWrapper'));

/**
 * Lazy AG Grid Wrapper with loading fallback and ref forwarding
 * Use this component instead of direct AGGridWrapper import for better performance
 */
export const LazyAGGrid = forwardRef<AGGridApi, AGGridWrapperProps>((props, ref) => {
  return (
    <Suspense fallback={<LoadingScreen message="Loading grid..." />}>
      <AGGridWrapperLazy ref={ref as React.Ref<AGGridApi>} {...props} />
    </Suspense>
  );
});

LazyAGGrid.displayName = 'LazyAGGrid';

// Export type for convenience
export type LazyAGGridComponent = ComponentType<AGGridWrapperProps>;

export default LazyAGGrid;
