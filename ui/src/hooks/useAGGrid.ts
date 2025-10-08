/**
 * useAGGrid Hook
 * Custom React hook for convenient AG Grid integration
 * Provides easy access to AG Grid API and utilities
 */

import { useRef, useCallback, useState } from 'react';
import type { AGGridApi, AGGridRowData } from '../types/agGrid';

interface UseAGGridOptions {
  // Options for future extensibility
}

interface UseAGGridReturn {
  gridApi: AGGridApi | null;
  setGridApi: (api: AGGridApi) => void;
  handleGridReady: (api: AGGridApi, columnApi?: AGGridApi) => void;
  
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
export const useAGGrid = (_options: UseAGGridOptions = {}): UseAGGridReturn => {
  const gridApiRef = useRef<AGGridApi | null>(null);
  const [gridApi, setGridApiState] = useState<AGGridApi | null>(null);

  /**
   * Set Grid API
   */
  const setGridApi = useCallback((api: AGGridApi) => {
    gridApiRef.current = api;
    setGridApiState(api);
  }, []);

  /**
   * Handle grid ready event
   */
  const handleGridReady = useCallback((api: AGGridApi, _columnApi?: AGGridApi) => {
    setGridApi(api);
  }, [setGridApi]);

  /**
   * Refresh data in the grid
   */
  const refreshData = useCallback((newData?: AGGridRowData[]) => {
    if (gridApiRef.current) {
      if (newData) {
        gridApiRef.current.setGridOption('rowData', newData);
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
    if (gridApiRef.current) {
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
    setGridApi,
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
 * Hook to preload AG Grid - deprecated, AG Grid modules are now registered at startup
 * @deprecated AG Grid modules are now registered at application startup
 */
export const useAGGridPreload = () => {
  console.warn('[useAGGridPreload] This hook is deprecated. AG Grid modules are now registered at application startup.');
};
