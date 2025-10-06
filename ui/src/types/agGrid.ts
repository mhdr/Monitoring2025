/**
 * AG Grid Enterprise Type Definitions
 * Types for the AG Grid React wrapper with RTL and i18n support
 * Uses official ag-grid-react types where possible
 */

import type { GridApi, ColDef, GridOptions, CsvExportParams, ExcelExportParams } from 'ag-grid-community';

// Re-export official AG Grid types for easier imports
export type AGGridApi = GridApi;
export type AGGridColumnDef = ColDef;
export type AGGridOptions = GridOptions;

// Utility types
export type AGGridRowData = Record<string, unknown>;
export type AGGridNode = Record<string, unknown>;
export type AGGridColumn = Record<string, unknown>;
export type AGGridFilterModel = Record<string, unknown>;
export type AGGridExportParams = CsvExportParams | ExcelExportParams;
export type AGGridCellParams = Record<string, unknown>;
export type AGGridRefreshParams = Record<string, unknown>;
export type AGGridCellStyle = Record<string, string | number>;

// Event parameter types
export type AGGridEventParams = Record<string, unknown>;
export type AGGridRowClickedEvent = AGGridEventParams;
export type AGGridRowSelectedEvent = AGGridEventParams;
export type AGGridSelectionChangedEvent = AGGridEventParams;
export type AGGridCellClickedEvent = AGGridEventParams;
export type AGGridCellValueChangedEvent = AGGridEventParams;
export type AGGridFilterChangedEvent = AGGridEventParams;
export type AGGridSortChangedEvent = AGGridEventParams;
export type AGGridFirstDataRenderedEvent = AGGridEventParams;
export type AGGridColumnResizedEvent = AGGridEventParams;
export type AGGridColumnVisibleEvent = AGGridEventParams;
export type AGGridColumnPinnedEvent = AGGridEventParams;
export type AGGridModelUpdatedEvent = AGGridEventParams;

// AG Grid Wrapper Props
export interface AGGridWrapperProps {
  columnDefs: AGGridColumnDef[];
  rowData?: AGGridRowData[];
  gridOptions?: Partial<AGGridOptions>;
  onGridReady?: (api: AGGridApi, columnApi: AGGridApi) => void;
  height?: string | number;
  width?: string | number;
  theme?: 'alpine' | 'balham' | 'material' | 'quartz';
  className?: string;
  containerClassName?: string;
  idRef?: string;
}

// AG Grid Locale Text Type
export interface AGGridLocaleText {
  page: string;
  more: string;
  to: string;
  of: string;
  next: string;
  last: string;
  first: string;
  previous: string;
  loadingOoo: string;
  noRowsToShow: string;
  [key: string]: string;
}

// Legacy types for backward compatibility (deprecated)
export type AGGridColumnApi = AGGridApi;
