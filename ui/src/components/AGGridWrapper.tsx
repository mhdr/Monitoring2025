/**
 * AG Grid React Wrapper Component
 * Provides a React component wrapper for AG Grid Enterprise with:
 * - Lazy loading (loaded only when needed)
 * - RTL support (Persian/Arabic)
 * - i18n localization
 * - Theme integration
 * - TypeScript support
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { loadAGGrid } from '../utils/agGridLoader';
import type {
  AGGridApi,
  AGGridColumnApi,
  AGGridWrapperProps,
  AGGridOptions,
} from '../types/agGrid';
import './AGGridWrapper.css';

// AG Grid v33+ Theming API: Import theme objects
// These are lazy-loaded when the grid initializes
let themeQuartz: unknown | null = null;
let themeBalham: unknown | null = null;
let themeAlpine: unknown | null = null;
let themeMaterial: unknown | null = null;

/**
 * AG Grid Wrapper Component
 */
export const AGGridWrapper = forwardRef<AGGridApi, AGGridWrapperProps>(({ 
  columnDefs,
  rowData = [],
  gridOptions = {},
  onGridReady,
  height = '500px',
  width = '100%',
  theme = 'quartz',
  className = '',
  containerClassName = '',
  idRef,
}, ref) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridApiRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  const gridInstanceRef = useRef<unknown>(null); // Store grid instance for cleanup
  const initialRowDataRef = useRef(rowData); // Capture initial rowData
  
  const [isLoading, setIsLoading] = useState(false); // Start as false, will be set to true when initialization starts
  const [error, setError] = useState<string | null>(null);
  const [gridReady, setGridReady] = useState(false);

  // Check if RTL is needed
  const isRTL = language === 'fa';

  // Expose api via ref early (will update when api ref assigned)
  useImperativeHandle(ref, () => (gridApiRef.current ?? ({} as AGGridApi)), []);

  /**
   * Get theme object for v33+ Theming API
   * Themes are imported from window.agGrid after library loads
   */
  const getThemeObject = useCallback((themeName: string): unknown => {
    if (!window.agGrid) {
      console.warn('[AGGrid] AG Grid not loaded yet, cannot get theme');
      return null;
    }

    // Cache theme objects for reuse
    const agGrid = window.agGrid as unknown as { [key: string]: unknown };
    
    switch (themeName) {
      case 'quartz':
        if (!themeQuartz && agGrid.themeQuartz) {
          themeQuartz = agGrid.themeQuartz;
        }
        return themeQuartz;
      case 'balham':
        if (!themeBalham && agGrid.themeBalham) {
          themeBalham = agGrid.themeBalham;
        }
        return themeBalham;
      case 'alpine':
        if (!themeAlpine && agGrid.themeAlpine) {
          themeAlpine = agGrid.themeAlpine;
        }
        return themeAlpine;
      case 'material':
        if (!themeMaterial && agGrid.themeMaterial) {
          themeMaterial = agGrid.themeMaterial;
        }
        return themeMaterial;
      default:
        console.warn(`[AGGrid] Unknown theme: ${themeName}, defaulting to quartz`);
        if (!themeQuartz && agGrid.themeQuartz) {
          themeQuartz = agGrid.themeQuartz;
        }
        return themeQuartz;
    }
  }, []);

  /**
   * Get localized text for AG Grid
   */
  const getLocaleText = useCallback((): Record<string, string> => {
    return {
      // Pagination
      page: t('agGrid.page'),
      pageSize: t('agGrid.pageSize'),
      more: t('agGrid.more'),
      to: t('agGrid.to'),
      of: t('agGrid.of'),
      next: t('agGrid.next'),
      last: t('agGrid.last'),
      first: t('agGrid.first'),
      previous: t('agGrid.previous'),
      
      // Loading and Empty
      loadingOoo: t('agGrid.loadingOoo'),
      noRowsToShow: t('agGrid.noRowsToShow'),
      
      // Selection
      enabled: t('agGrid.enabled'),
      disabled: t('agGrid.disabled'),
      
      // Columns
      pinColumn: t('agGrid.pinColumn'),
      pinLeft: t('agGrid.pinLeft'),
      pinRight: t('agGrid.pinRight'),
      noPin: t('agGrid.noPin'),
      autosizeThiscolumn: t('agGrid.autosizeThiscolumn'),
      autosizeAllColumns: t('agGrid.autosizeAllColumns'),
      groupBy: t('agGrid.groupBy'),
      ungroupBy: t('agGrid.ungroupBy'),
      resetColumns: t('agGrid.resetColumns'),
      expandAll: t('agGrid.expandAll'),
      collapseAll: t('agGrid.collapseAll'),
      
      // Clipboard
      copy: t('agGrid.copy'),
      ctrlC: t('agGrid.ctrlC'),
      copyWithHeaders: t('agGrid.copyWithHeaders'),
      paste: t('agGrid.paste'),
      ctrlV: t('agGrid.ctrlV'),
      
      // Export
      export: t('agGrid.export'),
      csvExport: t('agGrid.csvExport'),
      excelExport: t('agGrid.excelExport'),
      
      // Aggregation
      sum: t('agGrid.sum'),
      min: t('agGrid.min'),
      max: t('agGrid.max'),
      none: t('agGrid.none'),
      count: t('agGrid.count'),
      avg: t('agGrid.avg'),
      filteredRows: t('agGrid.filteredRows'),
      selectedRows: t('agGrid.selectedRows'),
      totalRows: t('agGrid.totalRows'),
      totalAndFilteredRows: t('agGrid.totalAndFilteredRows'),
      
      // Filter
      filterOoo: t('agGrid.filterOoo'),
      equals: t('agGrid.equals'),
      notEqual: t('agGrid.notEqual'),
      lessThan: t('agGrid.lessThan'),
      greaterThan: t('agGrid.greaterThan'),
      lessThanOrEqual: t('agGrid.lessThanOrEqual'),
      greaterThanOrEqual: t('agGrid.greaterThanOrEqual'),
      inRange: t('agGrid.inRange'),
      contains: t('agGrid.contains'),
      notContains: t('agGrid.notContains'),
      startsWith: t('agGrid.startsWith'),
      endsWith: t('agGrid.endsWith'),
      blank: t('agGrid.blank'),
      notBlank: t('agGrid.notBlank'),
      andCondition: t('agGrid.andCondition'),
      orCondition: t('agGrid.orCondition'),
      applyFilter: t('agGrid.applyFilter'),
      clearFilter: t('agGrid.clearFilter'),
      
      // Menu
      columns: t('agGrid.columns'),
      filters: t('agGrid.filters'),
      
      // Sort
      sortAscending: t('agGrid.sortAscending'),
      sortDescending: t('agGrid.sortDescending'),
      
      // Group
      group: t('agGrid.group'),
      
      // Pivot & Charts
      pivotMode: t('agGrid.pivotMode'),
      pivotChart: t('agGrid.pivotChart'),
      chartRange: t('agGrid.chartRange'),
      
      // Aria Labels
      ariaHidden: t('agGrid.ariaHidden'),
      ariaVisible: t('agGrid.ariaVisible'),
      ariaChecked: t('agGrid.ariaChecked'),
      ariaUnchecked: t('agGrid.ariaUnchecked'),
      ariaIndeterminate: t('agGrid.ariaIndeterminate'),
      ariaDefaultListName: t('agGrid.ariaDefaultListName'),
      ariaColumnSelectAll: t('agGrid.ariaColumnSelectAll'),
      ariaInputEditor: t('agGrid.ariaInputEditor'),
      ariaDateFilterInput: t('agGrid.ariaDateFilterInput'),
      ariaFilterList: t('agGrid.ariaFilterList'),
      ariaFilterInput: t('agGrid.ariaFilterInput'),
      ariaFilterColumnsInput: t('agGrid.ariaFilterColumnsInput'),
      ariaFilterValue: t('agGrid.ariaFilterValue'),
      ariaFilterFromValue: t('agGrid.ariaFilterFromValue'),
      ariaFilterToValue: t('agGrid.ariaFilterToValue'),
      ariaFilteringOperator: t('agGrid.ariaFilteringOperator'),
      ariaColumnToggleVisibility: t('agGrid.ariaColumnToggleVisibility'),
      ariaColumnGroupToggleVisibility: t('agGrid.ariaColumnGroupToggleVisibility'),
      ariaRowSelect: t('agGrid.ariaRowSelect'),
      ariaRowDeselect: t('agGrid.ariaRowDeselect'),
      ariaRowToggleSelection: t('agGrid.ariaRowToggleSelection'),
      ariaRowSelectAll: t('agGrid.ariaRowSelectAll'),
      ariaSearch: t('agGrid.ariaSearch'),
      ariaSearchFilterValues: t('agGrid.ariaSearchFilterValues'),
      
      // Number separators for locale-specific formatting
      thousandSeparator: t('agGrid.thousandSeparator'),
      decimalSeparator: t('agGrid.decimalSeparator'),
    };
  }, [t]);

  /**
   * Initialize AG Grid
   */
  const initializeGrid = useCallback(async () => {
    if (!gridContainerRef.current) return;

    try {
      // Note: isLoading is already set to true by the caller
      setError(null);

      // Destroy existing grid instance if it exists
      if (gridInstanceRef.current && gridApiRef.current) {
        try {
          gridApiRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying existing grid:', e);
        }
        gridInstanceRef.current = null;
        gridApiRef.current = null;
        columnApiRef.current = null;
        setGridReady(false);
      }

      // Clear the container
      if (gridContainerRef.current) {
        gridContainerRef.current.innerHTML = '';
      }

      // Load AG Grid library (theme is passed via gridOptions, not loaded as CSS)
      const agGrid = await loadAGGrid();

      if (!agGrid.createGrid) {
        throw new Error('AG Grid createGrid function not found');
      }
      
      // Check if ref is still valid after async load
      if (!gridContainerRef.current) {
        console.warn('[AGGrid] Container ref became null after library load, aborting');
        setIsLoading(false);
        return;
      }
      
      // Get theme object for v33+ Theming API
      const themeObject = getThemeObject(theme);
      if (!themeObject) {
        throw new Error(`Failed to load theme: ${theme}`);
      }
      
      // Prepare grid options
      // Use initial rowData captured on mount to avoid dependency issues
      const options: AGGridOptions = {
        theme: themeObject, // v33+ Theming API: pass theme object, not CSS class
        columnDefs,
        rowData: initialRowDataRef.current,
        enableRtl: isRTL,
        localeText: getLocaleText(),
        animateRows: true,
        // v32.2+ row selection using object format
        rowSelection: {
          mode: 'multiRow',
          enableClickSelection: false, // Replaces suppressRowClickSelection
        },
        // v32.2+ cell selection replaces enableRangeSelection
        cellSelection: true,
        enableCellTextSelection: true,
        ensureDomOrder: true,
        ...gridOptions,
        onGridReady: (params) => {
          gridApiRef.current = params.api;
          columnApiRef.current = params.columnApi;
          setGridReady(true);
          
          // Grid is ready, stop showing loading spinner
          setIsLoading(false);
          
          // Call user's onGridReady if provided
          if (onGridReady) {
            onGridReady(params.api, params.columnApi);
          }
          
          // Call grid options onGridReady if provided
          if (gridOptions.onGridReady) {
            gridOptions.onGridReady(params);
          }
        },
      };

      // Create the grid using modern createGrid API
      const gridApi = agGrid.createGrid(gridContainerRef.current, options);
      gridInstanceRef.current = gridApi;
    } catch (err) {
      console.error('[AGGrid] Failed to initialize AG Grid:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
    // Note: rowData is intentionally NOT in dependencies - we update it separately via setRowData
  }, [columnDefs, theme, isRTL, getLocaleText, getThemeObject, gridOptions, onGridReady]);

  /**
   * Initialize grid when container ref is ready and grid not already initialized
   */
  useEffect(() => {
    // Check if grid is already initialized
    if (gridReady) {
      return;
    }
    
    if (isLoading) {
      return;
    }

    if (gridContainerRef.current) {
      // Set loading BEFORE calling initializeGrid to prevent double initialization
      setIsLoading(true);
      initializeGrid();
    } else {
      console.warn('[AGGrid] Container ref not ready yet, will retry on next render');
      // Schedule a retry
      const timer = setTimeout(() => {
        if (gridContainerRef.current && !gridReady && !isLoading) {
          setIsLoading(true);
          initializeGrid();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridContainerRef.current]); // Re-run when ref changes

  /**
   * Update row data when it changes
   */
  useEffect(() => {
    if (gridReady && gridApiRef.current && rowData) {
      // Use modern AG Grid API method
      gridApiRef.current.setGridOption('rowData', rowData);
    }
  }, [rowData, gridReady]);

  /**
   * Reinitialize grid when language or theme changes
   * This is necessary because:
   * - AG Grid doesn't support dynamically changing locale text
   * - Theme changes require passing a new theme object (v33+ Theming API)
   */
  useEffect(() => {
    if (gridReady) {
      initializeGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, theme]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (gridApiRef.current) {
        try {
          gridApiRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying grid on unmount:', e);
        }
      }
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div
        className={`ag-grid-loading ${containerClassName}`}
        style={{ height, width }}
        data-id-ref="ag-grid-loading-container"
      >
        <div className="ag-grid-loading-spinner" data-id-ref="ag-grid-loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('loading')}</span>
          </div>
          <p className="mt-2">{t('agGrid.loadingOoo')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        className={`ag-grid-error ${containerClassName}`}
        style={{ height, width }}
        data-id-ref="ag-grid-error-container"
      >
        <div className="alert alert-danger" role="alert" data-id-ref="ag-grid-error-message">
          <h5 className="alert-heading">{t('error')}</h5>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Expose api via ref for parent components

  // Render AG Grid
  // Note: v33+ Theming API doesn't require ag-theme-* CSS classes
  // The theme is passed via the theme grid option
  return (
    <div
      className={`ag-grid-wrapper ${containerClassName}`}
      style={{ height, width }}
      data-id-ref={idRef ? `${idRef}-wrapper-container` : 'ag-grid-wrapper-container'}
    >
      <div
        ref={gridContainerRef}
        className={`ag-grid-container ${className} ${isRTL ? 'ag-grid-rtl' : 'ag-grid-ltr'}`}
        style={{ height: '100%', width: '100%' }}
        data-id-ref={idRef ? `${idRef}-${theme}-container` : `ag-grid-${theme}-container`}
      />
    </div>
  );
});

AGGridWrapper.displayName = 'AGGridWrapper';

export default AGGridWrapper;
