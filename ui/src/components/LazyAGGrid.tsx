/**
 * AG Grid Component (formerly lazy-loaded, now direct import for internal networks)
 * Re-exports AGGridWrapper directly without lazy loading
 * This file exists for backward compatibility with existing imports
 */

import { forwardRef } from 'react';
import type { ComponentType } from 'react';
import AGGridWrapper from './AGGridWrapper';
import type { AGGridWrapperProps, AGGridApi } from '../types/agGrid';

/**
 * AG Grid Wrapper with ref forwarding
 * Direct import without lazy loading for optimal performance on internal networks
 */
export const LazyAGGrid = forwardRef<AGGridApi, AGGridWrapperProps>((props, ref) => {
  return <AGGridWrapper ref={ref as React.Ref<AGGridApi>} {...props} />;
});

LazyAGGrid.displayName = 'LazyAGGrid';

// Export type for convenience
export type LazyAGGridComponent = ComponentType<AGGridWrapperProps>;

export default LazyAGGrid;
