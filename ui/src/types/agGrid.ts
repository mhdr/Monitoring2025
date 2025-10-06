/**
 * AG Grid Enterprise Type Definitions
 * Types for the AG Grid React wrapper with RTL and i18n support
 */

// Utility types
export type AGGridRowData = Record<string, unknown>;
export type AGGridNode = Record<string, unknown>;
export type AGGridColumn = Record<string, unknown>;
export type AGGridFilterModel = Record<string, unknown>;
export interface AGGridExportParams {
  /** File name without extension */
  fileName?: string;
  /** Whether to include headers */
  includeHeaders?: boolean;
  /** Only export selected rows */
  onlySelected?: boolean;
  /** Column keys to export */
  columnKeys?: string[];
  /** Sheet name for Excel */
  sheetName?: string;
  /** Custom process callback */
  processCellCallback?: (params: Record<string, unknown>) => string | null | undefined;
  /** Suppress quotes (CSV) */
  suppressQuotes?: boolean;
  [key: string]: unknown;
}
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
  sizeColumnsToFit(): void; // ensure declared

  // Column state
  getColumnDefs(): AGGridColumnDef[] | undefined;
  applyColumnState?(state: unknown): boolean;
  getColumnState?(): unknown;
  resetColumnState?(): void;

  // Column sizing extras
  autoSizeColumns?(keys: string[], skipHeader?: boolean): void;

  // Charts
  createRangeChart?(params: Record<string, unknown>): void;
  createPivotChart?(params: Record<string, unknown>): void;
  createCrossFilterChart?(params: Record<string, unknown>): void;
  getChartModels?(): unknown[];
  restoreChart?(model: unknown): void;
  downloadChart?(params?: Record<string, unknown>): void;
  
  // Export
  exportDataAsCsv(params?: AGGridExportParams): void;
  exportDataAsExcel(params?: AGGridExportParams): void;
  getDataAsCsv?(params?: AGGridExportParams): string | undefined;
  getDataAsExcel?(params?: AGGridExportParams): Blob | undefined;
  
  // Filtering
  setFilterModel(model: AGGridFilterModel): void;
  getFilterModel(): AGGridFilterModel;
  getColumnFilterModel?(colKey: string): unknown;
  setColumnFilterModel?(colKey: string, model: unknown): Promise<void> | void;
  
  // Selection
  selectAll(): void;
  deselectAll(): void;
  getCellRanges?(): unknown[];
  addCellRange?(range: Record<string, unknown>): void;
  clearCellSelection?(): void;
  
  // Refresh
  refreshCells(params?: AGGridRefreshParams): void;
  redrawRows(params?: AGGridRefreshParams): void;
  refreshHeader?(): void;
  flashCells?(params?: Record<string, unknown>): void;
  
  // Lifecycle
  destroy(): void;
  isDestroyed?(): boolean;
  
  // Other
  showLoadingOverlay(): void;
  hideOverlay(): void;
  showNoRowsOverlay?(): void;
  getDisplayedRowCount?(): number;
  getDisplayedRowAtIndex?(index: number): AGGridNode | undefined;
  getFocusedCell?(): Record<string, unknown> | null;
  setFocusedCell?(rowIndex: number, colKey: string, rowPinned?: string | null): void;
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
  rowGroup?: boolean;
  pivot?: boolean;
  aggFunc?: string | ((values: unknown[]) => unknown);
  enableRowGroup?: boolean;
  enablePivot?: boolean;
  enableValue?: boolean;
  valueParser?: (params: AGGridCellParams) => unknown;
  filterParams?: Record<string, unknown>;
  cellEditor?: string | ((params: AGGridCellParams) => unknown);
  cellDataType?: string | boolean;
  cellRendererParams?: Record<string, unknown>;
  lockPinned?: boolean;
  menuTabs?: string[];
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
export type AGGridFirstDataRenderedEvent = AGGridEventParams;
export type AGGridColumnResizedEvent = AGGridEventParams;
export type AGGridColumnVisibleEvent = AGGridEventParams;
export type AGGridColumnPinnedEvent = AGGridEventParams;
export type AGGridModelUpdatedEvent = AGGridEventParams;
export type AGGridSelectionChangedEventSource = 'api' | string;

// Grid Options
export interface AGGridOptions {
  columnDefs?: AGGridColumnDef[];
  rowData?: AGGridRowData[];
  defaultColDef?: AGGridColumnDef;
  autoSizeStrategy?: 'fitGridWidth' | 'fitCellContents';
  suppressFieldDotNotation?: boolean;
  rowModelType?: 'clientSide' | 'infinite' | 'serverSide';
  serverSideDatasource?: unknown;
  cacheBlockSize?: number;
  maxBlocksInCache?: number;
  sideBar?: boolean | string | Record<string, unknown>;
  statusBar?: { statusPanels: Array<Record<string, unknown>> };
  suppressCellFocus?: boolean;
  undoRedoCellEditing?: boolean;
  undoRedoCellEditingLimit?: number;
  enableRangeSelection?: boolean; // Deprecated v32.2+: use cellSelection instead
  enableCharts?: boolean;
  enableFillHandle?: boolean | 'rangeSelection';
  getRowId?: (params: { data: AGGridRowData }) => string;
  masterDetail?: boolean;
  detailCellRenderer?: unknown;
  detailRowHeight?: number;
  treeData?: boolean;
  getDataPath?: (data: AGGridRowData) => string[];
  groupDefaultExpanded?: number;
  // animateRows already declared below
  suppressAggFuncInHeader?: boolean;
  pivotMode?: boolean;
  // suppressRowClickSelection declared below in Selection section
  groupDisplayType?: 'singleColumn' | 'custom' | 'multipleColumns' | 'groupRows';
  // pagination* options declared below in Pagination section
  suppressDragLeaveHidesColumns?: boolean;
  suppressMovableColumns?: boolean;
  loadingOverlayComponent?: unknown;
  noRowsOverlayComponent?: unknown;
  // overlay templates & rowSelection declared later
  groupSelectsChildren?: boolean;
  suppressRowDeselection?: boolean;
  suppressScrollOnNewData?: boolean;
  stopEditingWhenCellsLoseFocus?: boolean;
  suppressClickEdit?: boolean;
  readOnlyEdit?: boolean;
  singleClickEdit?: boolean;
  enterNavigatesVertically?: boolean;
  enterNavigatesVerticallyAfterEdit?: boolean;
  paginationNumberFormatter?: (params: { value: number }) => string | number;
  
  // Selection (v32.2+ supports both old and new formats)
  rowSelection?: 
    | 'single' 
    | 'multiple' 
    | {
        mode: 'singleRow' | 'multiRow';
        enableClickSelection?: boolean | 'enableSelection' | 'enableDeselection';
        checkboxes?: boolean | ((params: AGGridEventParams) => boolean);
        headerCheckbox?: boolean;
        isRowSelectable?: (rowNode: AGGridNode) => boolean;
        [key: string]: unknown;
      };
  suppressRowClickSelection?: boolean; // Deprecated: use rowSelection.enableClickSelection
  
  // Cell Selection (v32.2+ replaces enableRangeSelection)
  cellSelection?: boolean | {
    suppressMultiRanges?: boolean;
    enableHeaderHighlight?: boolean;
    handle?: Record<string, unknown>;
  };
  
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
  onFirstDataRendered?: (params: AGGridFirstDataRenderedEvent) => void;
  onColumnResized?: (params: AGGridColumnResizedEvent) => void;
  onColumnVisible?: (params: AGGridColumnVisibleEvent) => void;
  onColumnPinned?: (params: AGGridColumnPinnedEvent) => void;
  onModelUpdated?: (params: AGGridModelUpdatedEvent) => void;
  
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
  /** Provide a stable id reference for testing */
  idRef?: string;
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
