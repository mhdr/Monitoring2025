/**
 * useAGGrid Hook
 * Custom React hook for convenient AG Grid integration
 * Provides easy access to AG Grid API and utilities
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { loadAGGrid, preloadAGGrid } from '../utils/agGridLoader';
import type { AGGridApi, AGGridColumnApi, AGGridRowData } from '../types/agGrid';

interface UseAGGridOptions {
  preload?: boolean;
  theme?: 'alpine' | 'balham' | 'material' | 'quartz';
}

interface UseAGGridReturn {
  gridApi: AGGridApi | null;
  columnApi: AGGridColumnApi | null;
  setGridApi: (api: AGGridApi) => void;
  setColumnApi: (api: AGGridColumnApi) => void;
  handleGridReady: (api: AGGridApi, columnApi: AGGridColumnApi) => void;
  
  // Utility methods
  refreshData: (newData?: AGGridRowData[]) => void;
  exportToCsv: (fileName?: string) => void;
  exportToExcel: (fileName?: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedRows: () => AGGridRowData[];
  sizeColumnsToFit: () => void;
  autoSizeAllColumns: () => void;
  showLoadingOverlay: () => void;
  hideOverlay: () => void;
}

/**
 * Custom hook for AG Grid integration
 */
export const useAGGrid = (options: UseAGGridOptions = {}): UseAGGridReturn => {
  const { preload = false, theme = 'quartz' } = options;
  
  const gridApiRef = useRef<AGGridApi | null>(null);
  const columnApiRef = useRef<AGGridColumnApi | null>(null);
  
  const [gridApi, setGridApiState] = useState<AGGridApi | null>(null);
  const [columnApi, setColumnApiState] = useState<AGGridColumnApi | null>(null);

  /**
   * Preload AG Grid if requested
   */
  useEffect(() => {
    if (preload) {
      preloadAGGrid(theme);
    }
  }, [preload, theme]);

  /**
   * Set Grid API
   */
  const setGridApi = useCallback((api: AGGridApi) => {
    gridApiRef.current = api;
    setGridApiState(api);
  }, []);

  /**
   * Set Column API
   */
  const setColumnApi = useCallback((api: AGGridColumnApi) => {
    columnApiRef.current = api;
    setColumnApiState(api);
  }, []);

  /**
   * Handle grid ready event
   */
  const handleGridReady = useCallback((api: AGGridApi, colApi: AGGridColumnApi) => {
    setGridApi(api);
    setColumnApi(colApi);
  }, [setGridApi, setColumnApi]);

  /**
   * Refresh data in the grid
   */
  const refreshData = useCallback((newData?: AGGridRowData[]) => {
    if (gridApiRef.current) {
      if (newData) {
        gridApiRef.current.setRowData(newData);
      } else {
        gridApiRef.current.refreshCells();
      }
    }
  }, []);

  /**
   * Export data to CSV
   */
  const exportToCsv = useCallback((fileName?: string) => {
    if (gridApiRef.current) {
      const params = fileName ? { fileName } : undefined;
      gridApiRef.current.exportDataAsCsv(params);
    }
  }, []);

  /**
   * Export data to Excel
   */
  const exportToExcel = useCallback((fileName?: string) => {
    if (gridApiRef.current) {
      const params = fileName ? { fileName } : undefined;
      gridApiRef.current.exportDataAsExcel(params);
    }
  }, []);

  /**
   * Select all rows
   */
  const selectAll = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.selectAll();
    }
  }, []);

  /**
   * Deselect all rows
   */
  const deselectAll = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.deselectAll();
    }
  }, []);

  /**
   * Get selected rows
   */
  const getSelectedRows = useCallback((): AGGridRowData[] => {
    if (gridApiRef.current) {
      return gridApiRef.current.getSelectedRows();
    }
    return [];
  }, []);

  /**
   * Size columns to fit container
   */
  const sizeColumnsToFit = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.sizeColumnsToFit();
    }
  }, []);

  /**
   * Auto-size all columns based on content
   */
  const autoSizeAllColumns = useCallback(() => {
    if (columnApiRef.current) {
      columnApiRef.current.autoSizeAllColumns(false);
    } else if (gridApiRef.current) {
      gridApiRef.current.autoSizeAllColumns(false);
    }
  }, []);

  /**
   * Show loading overlay
   */
  const showLoadingOverlay = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.showLoadingOverlay();
    }
  }, []);

  /**
   * Hide overlay
   */
  const hideOverlay = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.hideOverlay();
    }
  }, []);

  return {
    gridApi,
    columnApi,
    setGridApi,
    setColumnApi,
    handleGridReady,
    refreshData,
    exportToCsv,
    exportToExcel,
    selectAll,
    deselectAll,
    getSelectedRows,
    sizeColumnsToFit,
    autoSizeAllColumns,
    showLoadingOverlay,
    hideOverlay,
  };
};

/**
 * Hook to preload AG Grid
 * Useful for improving initial render performance
 */
export const useAGGridPreload = (theme?: 'alpine' | 'balham' | 'material' | 'quartz'): void => {
  useEffect(() => {
    loadAGGrid(theme).catch(error => {
      console.error('Failed to preload AG Grid:', error);
    });
  }, [theme]);
};

export default useAGGrid;
