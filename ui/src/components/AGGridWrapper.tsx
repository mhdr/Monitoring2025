/**
 * AG Grid React Wrapper Component
 * Provides a React component wrapper for AG Grid Enterprise with:
 * - Lazy loading (loaded only when needed)
 * - RTL support (Persian/Arabic)
 * - i18n localization
 * - Theme integration
 * - TypeScript support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

/**
 * AG Grid Wrapper Component
 */
export const AGGridWrapper: React.FC<AGGridWrapperProps> = ({
  columnDefs,
  rowData = [],
  gridOptions = {},
  onGridReady,
  height = '500px',
  width = '100%',
  theme = 'quartz',
  className = '',
  containerClassName = '',
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridApiRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridReady, setGridReady] = useState(false);

  // Check if RTL is needed
  const isRTL = language === 'fa';

  /**
   * Get localized text for AG Grid
   */
  const getLocaleText = useCallback((): Record<string, string> => {
    return {
      // Pagination
      page: t('agGrid.page'),
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
    };
  }, [t]);

  /**
   * Initialize AG Grid
   */
  const initializeGrid = useCallback(async () => {
    if (!gridContainerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load AG Grid library
      const agGrid = await loadAGGrid(theme);

      if (!agGrid.Grid) {
        throw new Error('AG Grid Grid constructor not found');
      }

      // Prepare grid options
      const options: AGGridOptions = {
        columnDefs,
        rowData,
        enableRtl: isRTL,
        localeText: getLocaleText(),
        animateRows: true,
        rowSelection: 'multiple',
        suppressRowClickSelection: true,
        enableCellTextSelection: true,
        ensureDomOrder: true,
        ...gridOptions,
        onGridReady: (params) => {
          gridApiRef.current = params.api;
          columnApiRef.current = params.columnApi;
          setGridReady(true);
          
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

      // Create the grid - Cast agGrid.Grid as constructor
      const GridConstructor = agGrid.Grid as new (element: HTMLElement, options: AGGridOptions) => void;
      new GridConstructor(gridContainerRef.current, options);

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize AG Grid:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [columnDefs, rowData, theme, isRTL, getLocaleText, gridOptions, onGridReady]);

  /**
   * Initialize grid on mount
   */
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  /**
   * Update row data when it changes
   */
  useEffect(() => {
    if (gridReady && gridApiRef.current && rowData) {
      gridApiRef.current.setRowData(rowData);
    }
  }, [rowData, gridReady]);

  /**
   * Update locale text when language changes
   */
  useEffect(() => {
    if (gridReady && gridApiRef.current) {
      // Re-initialize grid to apply new locale
      initializeGrid();
    }
  }, [language, gridReady, initializeGrid]);

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

  // Render AG Grid
  return (
    <div
      className={`ag-grid-wrapper ${containerClassName}`}
      style={{ height, width }}
      data-id-ref="ag-grid-wrapper-container"
    >
      <div
        ref={gridContainerRef}
        className={`ag-theme-${theme} ${className} ${isRTL ? 'ag-grid-rtl' : 'ag-grid-ltr'}`}
        style={{ height: '100%', width: '100%' }}
        data-id-ref={`ag-grid-${theme}-container`}
      />
    </div>
  );
};

export default AGGridWrapper;
