/**
 * AG Grid React Wrapper Component
 */

import { useMemo, useCallback, forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';
import { AG_GRID_LOCALE_IR } from '@ag-grid-community/locale';
import { useLanguage } from '../hooks/useLanguage';
import { isMobile, isTouchDevice } from '../utils/deviceDetection';
import { getMobileGridOptions } from '../utils/agGridHelpers';
import type { AGGridApi, AGGridWrapperProps } from '../types/agGrid';
import './AGGridWrapper.css';
// Legacy ag-grid.css removed - using Theming API (v33+)
import 'ag-grid-community/styles/ag-theme-quartz.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'ag-grid-community/styles/ag-theme-material.css';
// Custom MUI theme integration
import './AGGridMuiTheme.css';
import { createLogger } from '../utils/logger';

const logger = createLogger('AGGridWrapper');

import {
  ClientSideRowModelModule, TextEditorModule, NumberEditorModule,
  DateEditorModule, TextFilterModule, NumberFilterModule, DateFilterModule,
  PaginationModule, CsvExportModule, ValidationModule, LocaleModule,
  RowSelectionModule, ColumnApiModule, RowAutoHeightModule, ColumnAutoSizeModule
} from 'ag-grid-community';

import {
  RowGroupingModule, SetFilterModule, MultiFilterModule, ExcelExportModule,
  ClipboardModule, ColumnsToolPanelModule, FiltersToolPanelModule, SideBarModule,
  StatusBarModule, ContextMenuModule, ColumnMenuModule, CellSelectionModule, PivotModule
} from 'ag-grid-enterprise';

ModuleRegistry.registerModules([
  ClientSideRowModelModule, TextEditorModule, NumberEditorModule, DateEditorModule,
  TextFilterModule, NumberFilterModule, DateFilterModule, PaginationModule, CsvExportModule,
  ValidationModule, LocaleModule, RowSelectionModule, ColumnApiModule, RowAutoHeightModule, ColumnAutoSizeModule,
  RowGroupingModule, SetFilterModule, MultiFilterModule, ExcelExportModule, ClipboardModule,
  ColumnsToolPanelModule, FiltersToolPanelModule, SideBarModule, StatusBarModule,
  ContextMenuModule, ColumnMenuModule, CellSelectionModule, PivotModule,
]);

LicenseManager.setLicenseKey('DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6');

export const AGGridWrapper = forwardRef<AGGridApi, AGGridWrapperProps>(({ 
  columnDefs, rowData = [], gridOptions = {}, onGridReady,
  height = '500px', width = '100%', theme = 'quartz',
  className = '', containerClassName = '', idRef
}, ref) => {
  const { language } = useLanguage();
  const gridApiRef = useRef<AGGridApi | null>(null);
  const isRTL = language === 'fa';
  
  // Detect mobile and touch devices
  const [deviceInfo, setDeviceInfo] = useState(() => ({
    isMobile: isMobile(),
    isTouch: isTouchDevice(),
  }));

  // Update device info on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo({
        isMobile: isMobile(),
        isTouch: isTouchDevice(),
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useImperativeHandle(ref, () => gridApiRef.current ?? ({} as AGGridApi), []);

  const localeText = useMemo(() => {
    return language === 'fa' ? AG_GRID_LOCALE_IR : undefined;
  }, [language]);

  const handleGridReady = useCallback((params: { api: AGGridApi }) => {
    gridApiRef.current = params.api;
    
    // Log device info and grid configuration
    logger.log('AG Grid ready:', {
      isMobile: deviceInfo.isMobile,
      isTouch: deviceInfo.isTouch,
      language,
      theme,
      columnCount: columnDefs.length,
    });
    
    if (onGridReady) onGridReady(params.api, params.api);
  }, [onGridReady, deviceInfo, language, theme, columnDefs.length]);

  const themeClassName = useMemo(() => {
    const themes: Record<string, string> = { alpine: 'ag-theme-alpine', balham: 'ag-theme-balham', material: 'ag-theme-material' };
    return themes[theme] || 'ag-theme-quartz';
  }, [theme]);

  const containerStyle = useMemo(() => ({ height, width }), [height, width]);
  const defaultColDef = useMemo(() => ({ 
    resizable: true, 
    sortable: true, 
    filter: true, 
    wrapHeaderText: true,
    autoHeaderHeight: true,
    ...gridOptions.defaultColDef 
  }), [gridOptions.defaultColDef]);
  
  // Apply mobile optimizations if on mobile device
  const mobileOptimizedOptions = useMemo(() => {
    if (deviceInfo.isMobile || deviceInfo.isTouch) {
      return getMobileGridOptions(gridOptions);
    }
    return gridOptions;
  }, [deviceInfo, gridOptions]);
  
  const mergedGridOptions = useMemo(() => {
    const options: Record<string, unknown> = { 
      animateRows: true, 
      enableRtl: isRTL, 
      enableCellTextSelection: true, 
      ensureDomOrder: true, 
      defaultColDef, 
      onGridReady: handleGridReady,
      ...mobileOptimizedOptions
    };
    
    // Apply localeText after spreading gridOptions to ensure it's not overwritten
    if (localeText) {
      options.localeText = localeText;
    }
    
    return options;
  }, [mobileOptimizedOptions, localeText, defaultColDef, handleGridReady, isRTL]);

  return (
    <div className={`ag-grid-wrapper ${containerClassName} ${isRTL ? 'ag-grid-rtl' : 'ag-grid-ltr'}`} style={containerStyle} data-id-ref={idRef ? `${idRef}-wrapper-container` : 'ag-grid-wrapper-container'}>
      <div className={`${themeClassName} ${className}`} style={{ height: '100%', width: '100%' }} data-id-ref={idRef ? `${idRef}-${theme}-container` : `ag-grid-${theme}-container`}>
        <AgGridReact columnDefs={columnDefs} rowData={rowData} {...mergedGridOptions} />
      </div>
    </div>
  );
});

AGGridWrapper.displayName = 'AGGridWrapper';
export default AGGridWrapper;
