/**
 * AG Grid Enterprise Type Definitions
 * Types for the AG Grid React wrapper with RTL and i18n support
 */

// Utility types
export type AGGridRowData = Record<string, unknown>;
export type AGGridNode = Record<string, unknown>;
export type AGGridColumn = Record<string, unknown>;
export type AGGridFilterModel = Record<string, unknown>;
export type AGGridExportParams = Record<string, unknown>;
export type AGGridCellParams = Record<string, unknown>;
export type AGGridRefreshParams = Record<string, unknown>;
export type AGGridCellStyle = Record<string, string | number>;

// Global AG Grid types
export interface AGGridApi {
  // Core API (legacy)
  setRowData(rowData: AGGridRowData[]): void;
  
  // Modern API (v31+)
  setGridOption<K extends keyof AGGridOptions>(key: K, value: AGGridOptions[K]): void;
  updateGridOptions(options: Partial<AGGridOptions>): void;
  
  getSelectedRows(): AGGridRowData[];
  getSelectedNodes(): AGGridNode[];
  sizeColumnsToFit(): void;
  autoSizeAllColumns(skipHeader?: boolean): void;
  
  // Export
  exportDataAsCsv(params?: AGGridExportParams): void;
  exportDataAsExcel(params?: AGGridExportParams): void;
  
  // Filtering
  setFilterModel(model: AGGridFilterModel): void;
  getFilterModel(): AGGridFilterModel;
  
  // Selection
  selectAll(): void;
  deselectAll(): void;
  
  // Refresh
  refreshCells(params?: AGGridRefreshParams): void;
  redrawRows(params?: AGGridRefreshParams): void;
  
  // Lifecycle
  destroy(): void;
  
  // Other
  showLoadingOverlay(): void;
  hideOverlay(): void;
}

export interface AGGridColumnApi {
  setColumnVisible(key: string, visible: boolean): void;
  setColumnsVisible(keys: string[], visible: boolean): void;
  autoSizeAllColumns(skipHeader?: boolean): void;
  getAllColumns(): AGGridColumn[];
  getColumn(key: string): AGGridColumn | null;
}

// Column Definition
export interface AGGridColumnDef {
  field?: string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  sortable?: boolean;
  filter?: boolean | string;
  resizable?: boolean;
  editable?: boolean;
  cellRenderer?: string | ((params: AGGridCellParams) => string | HTMLElement);
  cellClass?: string | string[] | ((params: AGGridCellParams) => string | string[]);
  headerClass?: string | string[];
  valueFormatter?: (params: AGGridCellParams) => string;
  valueGetter?: (params: AGGridCellParams) => unknown;
  valueSetter?: (params: AGGridCellParams) => boolean;
  cellStyle?: AGGridCellStyle | ((params: AGGridCellParams) => AGGridCellStyle);
  headerCheckboxSelection?: boolean;
  checkboxSelection?: boolean;
  pinned?: 'left' | 'right' | null;
  hide?: boolean;
  suppressSizeToFit?: boolean;
  tooltipField?: string;
  tooltipValueGetter?: (params: AGGridCellParams) => string;
  [key: string]: unknown;
}

// Event parameter types
export type AGGridEventParams = Record<string, unknown>;
export type AGGridRowClickedEvent = AGGridEventParams;
export type AGGridRowSelectedEvent = AGGridEventParams;
export type AGGridSelectionChangedEvent = AGGridEventParams;
export type AGGridCellClickedEvent = AGGridEventParams;
export type AGGridCellValueChangedEvent = AGGridEventParams;
export type AGGridFilterChangedEvent = AGGridEventParams;
export type AGGridSortChangedEvent = AGGridEventParams;

// Grid Options
export interface AGGridOptions {
  columnDefs?: AGGridColumnDef[];
  rowData?: AGGridRowData[];
  defaultColDef?: AGGridColumnDef;
  
  // Selection
  rowSelection?: 'single' | 'multiple';
  suppressRowClickSelection?: boolean;
  
  // Pagination
  pagination?: boolean;
  paginationPageSize?: number;
  paginationAutoPageSize?: boolean;
  
  // Sorting
  sortingOrder?: ('asc' | 'desc' | null)[];
  
  // Filtering
  enableFilter?: boolean;
  floatingFilter?: boolean;
  
  // Animation
  animateRows?: boolean;
  
  // RTL Support
  enableRtl?: boolean;
  
  // Localization
  localeText?: Record<string, string>;
  
  // Events
  onGridReady?: (params: { api: AGGridApi; columnApi: AGGridColumnApi }) => void;
  onRowClicked?: (params: AGGridRowClickedEvent) => void;
  onRowSelected?: (params: AGGridRowSelectedEvent) => void;
  onSelectionChanged?: (params: AGGridSelectionChangedEvent) => void;
  onCellClicked?: (params: AGGridCellClickedEvent) => void;
  onCellValueChanged?: (params: AGGridCellValueChangedEvent) => void;
  onFilterChanged?: (params: AGGridFilterChangedEvent) => void;
  onSortChanged?: (params: AGGridSortChangedEvent) => void;
  
  // Overlay
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  
  // Other
  suppressMenuHide?: boolean;
  suppressContextMenu?: boolean;
  enableCellTextSelection?: boolean;
  ensureDomOrder?: boolean;
  [key: string]: unknown;
}

// AG Grid Wrapper Props
export interface AGGridWrapperProps {
  columnDefs: AGGridColumnDef[];
  rowData?: AGGridRowData[];
  gridOptions?: Partial<AGGridOptions>;
  onGridReady?: (api: AGGridApi, columnApi: AGGridColumnApi) => void;
  height?: string | number;
  width?: string | number;
  theme?: 'alpine' | 'balham' | 'material' | 'quartz';
  className?: string;
  containerClassName?: string;
}

// AG Grid Locale Text Type
export interface AGGridLocaleText {
  // Pagination
  page: string;
  more: string;
  to: string;
  of: string;
  next: string;
  last: string;
  first: string;
  previous: string;
  
  // Loading and Empty
  loadingOoo: string;
  noRowsToShow: string;
  
  // Selection
  enabled: string;
  disabled: string;
  
  // Columns
  pinColumn: string;
  pinLeft: string;
  pinRight: string;
  noPin: string;
  autosizeThiscolumn: string;
  autosizeAllColumns: string;
  groupBy: string;
  ungroupBy: string;
  resetColumns: string;
  expandAll: string;
  collapseAll: string;
  
  // Clipboard
  copy: string;
  ctrlC: string;
  copyWithHeaders: string;
  paste: string;
  ctrlV: string;
  
  // Export
  export: string;
  csvExport: string;
  excelExport: string;
  
  // Aggregation
  sum: string;
  min: string;
  max: string;
  none: string;
  count: string;
  avg: string;
  filteredRows: string;
  selectedRows: string;
  totalRows: string;
  totalAndFilteredRows: string;
  
  // Filter
  filterOoo: string;
  equals: string;
  notEqual: string;
  lessThan: string;
  greaterThan: string;
  lessThanOrEqual: string;
  greaterThanOrEqual: string;
  inRange: string;
  contains: string;
  notContains: string;
  startsWith: string;
  endsWith: string;
  blank: string;
  notBlank: string;
  andCondition: string;
  orCondition: string;
  applyFilter: string;
  clearFilter: string;
  
  // Menu
  columns: string;
  filters: string;
  
  // Sort
  sortAscending: string;
  sortDescending: string;
  
  // Group
  group: string;
}
