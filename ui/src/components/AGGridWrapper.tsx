/**
 * AG Grid React Wrapper Component
 */

import { useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';
import { AG_GRID_LOCALE_IR } from '@ag-grid-community/locale';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import type { AGGridApi, AGGridWrapperProps } from '../types/agGrid';
import './AGGridWrapper.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'ag-grid-community/styles/ag-theme-material.css';

import {
  ClientSideRowModelModule, TextEditorModule, NumberEditorModule,
  DateEditorModule, TextFilterModule, NumberFilterModule, DateFilterModule,
  PaginationModule, CsvExportModule, ValidationModule
} from 'ag-grid-community';

import {
  RowGroupingModule, SetFilterModule, MultiFilterModule, ExcelExportModule,
  ClipboardModule, ColumnsToolPanelModule, FiltersToolPanelModule, SideBarModule,
  StatusBarModule, ContextMenuModule, ColumnMenuModule, CellSelectionModule, PivotModule
} from 'ag-grid-enterprise';

ModuleRegistry.registerModules([
  ClientSideRowModelModule, TextEditorModule, NumberEditorModule, DateEditorModule,
  TextFilterModule, NumberFilterModule, DateFilterModule, PaginationModule, CsvExportModule,
  RowGroupingModule, SetFilterModule, MultiFilterModule, ExcelExportModule, ClipboardModule,
  ColumnsToolPanelModule, FiltersToolPanelModule, SideBarModule, StatusBarModule,
  ContextMenuModule, ColumnMenuModule, CellSelectionModule, PivotModule, ValidationModule,
]);

LicenseManager.setLicenseKey('DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6');

export const AGGridWrapper = forwardRef<AGGridApi, AGGridWrapperProps>(({ 
  columnDefs, rowData = [], gridOptions = {}, onGridReady,
  height = '500px', width = '100%', theme = 'quartz',
  className = '', containerClassName = '', idRef
}, ref) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const gridApiRef = useRef<AGGridApi | null>(null);
  const isRTL = language === 'fa';
  
  useImperativeHandle(ref, () => gridApiRef.current ?? ({} as AGGridApi), []);

  const localeText = useMemo(() => {
    if (language === 'fa') return AG_GRID_LOCALE_IR;
    return { page: t('agGrid.page'), more: t('agGrid.more'), to: t('agGrid.to'), of: t('agGrid.of') };
  }, [language, t]);

  const handleGridReady = useCallback((params: { api: AGGridApi }) => {
    gridApiRef.current = params.api;
    if (onGridReady) onGridReady(params.api, params.api);
  }, [onGridReady]);

  const themeClassName = useMemo(() => {
    const themes: Record<string, string> = { alpine: 'ag-theme-alpine', balham: 'ag-theme-balham', material: 'ag-theme-material' };
    return themes[theme] || 'ag-theme-quartz';
  }, [theme]);

  const containerStyle = useMemo(() => ({ height, width }), [height, width]);
  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true, ...gridOptions.defaultColDef }), [gridOptions.defaultColDef]);
  const mergedGridOptions = useMemo(() => ({ animateRows: true, enableRtl: isRTL, enableCellTextSelection: true, ensureDomOrder: true, ...gridOptions, localeText, defaultColDef, onGridReady: handleGridReady }), [gridOptions, localeText, defaultColDef, handleGridReady, isRTL]);

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
