/**
 * AG Grid Integration - Main Export File
 * Exports all AG Grid components, hooks, and types for easy import
 * Now uses official ag-grid-react npm packages
 */

// Main Component
export { AGGridWrapper } from './components/AGGridWrapper';
export { default as AGGrid } from './components/AGGridWrapper';

// Hooks
export { useAGGrid, useAGGridPreload } from './hooks/useAGGrid';

// Types
export type {
  AGGridApi,
  AGGridColumnApi,
  AGGridColumnDef,
  AGGridOptions,
  AGGridWrapperProps,
  AGGridRowData,
  AGGridNode,
  AGGridColumn,
  AGGridFilterModel,
  AGGridExportParams,
  AGGridCellParams,
  AGGridRefreshParams,
  AGGridCellStyle,
  AGGridEventParams,
  AGGridRowClickedEvent,
  AGGridRowSelectedEvent,
  AGGridSelectionChangedEvent,
  AGGridCellClickedEvent,
  AGGridCellValueChangedEvent,
  AGGridFilterChangedEvent,
  AGGridSortChangedEvent,
  AGGridLocaleText,
} from './types/agGrid';
