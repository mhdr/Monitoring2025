/**
 * useAGGrid Hook
 * Custom React hook for convenient AG Grid integration
 * Provides easy access to AG Grid API and utilities
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import type { AGGridApi, AGGridRowData } from '../types/agGrid';
import type { ColDef } from 'ag-grid-community';
import { createLogger } from '../utils/logger';
import { isMobile, isTouchDevice } from '../utils/deviceDetection';
import { adjustColumnsForMobile, getMobileDefaultColDef } from '../utils/agGridHelpers';

const logger = createLogger('useAGGrid');

interface UseAGGridOptions {
  enableMobileOptimizations?: boolean; // Auto-detect and apply mobile optimizations
  criticalFields?: string[]; // Fields that should always be visible on mobile
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
  
  // Mobile-specific utilities
  isMobileDevice: boolean;
  isTouchDevice: boolean;
  optimizeColumnsForMobile: (columnDefs: ColDef[], criticalFields?: string[]) => ColDef[];
  getMobileDefaultColDef: () => ColDef;
  applyMobileLayout: () => void;
}

/**
 * Custom hook for AG Grid integration
 */
export const useAGGrid = (options: UseAGGridOptions = {}): UseAGGridReturn => {
  const { enableMobileOptimizations = true, criticalFields = [] } = options;
  
  const gridApiRef = useRef<AGGridApi | null>(null);
  const [gridApi, setGridApiState] = useState<AGGridApi | null>(null);
  
  // Detect mobile and touch devices
  const [deviceInfo, setDeviceInfo] = useState(() => ({
    isMobile: isMobile(),
    isTouch: isTouchDevice(),
  }));

  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = isMobile();
      const newIsTouch = isTouchDevice();
      
      if (newIsMobile !== deviceInfo.isMobile || newIsTouch !== deviceInfo.isTouch) {
        setDeviceInfo({
          isMobile: newIsMobile,
          isTouch: newIsTouch,
        });
        
        logger.log('Device info updated:', { isMobile: newIsMobile, isTouch: newIsTouch });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [deviceInfo]);

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
  const handleGridReady = useCallback((api: AGGridApi) => {
    setGridApi(api);
    
    // Apply mobile layout if enabled and on mobile device
    if (enableMobileOptimizations && deviceInfo.isMobile && gridApiRef.current) {
      logger.log('Applying mobile optimizations on grid ready');
      // Auto-size columns to fit on mobile
      setTimeout(() => {
        gridApiRef.current?.sizeColumnsToFit();
      }, 100);
    }
  }, [setGridApi, enableMobileOptimizations, deviceInfo.isMobile]);

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

  /**
   * Optimize column definitions for mobile display
   */
  const optimizeColumnsForMobile = useCallback((columnDefs: ColDef[], fields: string[] = criticalFields): ColDef[] => {
    if (!deviceInfo.isMobile) {
      logger.log('Not on mobile, skipping column optimization');
      return columnDefs;
    }
    
    logger.log('Optimizing columns for mobile', { criticalFields: fields });
    return adjustColumnsForMobile(columnDefs, fields);
  }, [deviceInfo.isMobile, criticalFields]);

  /**
   * Get mobile-optimized default column definition
   */
  const getMobileDefaultColDefCallback = useCallback((): ColDef => {
    return getMobileDefaultColDef();
  }, []);

  /**
   * Apply mobile-specific layout adjustments to current grid
   */
  const applyMobileLayout = useCallback(() => {
    if (!gridApiRef.current) {
      logger.warn('Grid API not available for mobile layout');
      return;
    }

    if (!deviceInfo.isMobile) {
      logger.log('Not on mobile, skipping mobile layout');
      return;
    }

    logger.log('Applying mobile layout');
    
    // Size columns to fit on mobile
    gridApiRef.current.sizeColumnsToFit();
    
    // Refresh cells to apply new styles
    gridApiRef.current.refreshCells();
  }, [deviceInfo.isMobile]);

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
    // Mobile-specific utilities
    isMobileDevice: deviceInfo.isMobile,
    isTouchDevice: deviceInfo.isTouch,
    optimizeColumnsForMobile,
    getMobileDefaultColDef: getMobileDefaultColDefCallback,
    applyMobileLayout,
  };
};

/**
 * Hook to preload AG Grid - deprecated, AG Grid modules are now registered at startup
 * @deprecated AG Grid modules are now registered at application startup
 */
export const useAGGridPreload = () => {
  logger.warn('This hook is deprecated. AG Grid modules are now registered at application startup.');
};
