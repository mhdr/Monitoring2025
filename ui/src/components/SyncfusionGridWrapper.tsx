/**
 * Syncfusion Grid React Wrapper Component
 * 
 * A wrapper component for Syncfusion EJ2 React Grid with RTL support
 * and integration with the project's theming system.
 */

import { useMemo, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Group,
  Toolbar,
  Edit,
  ExcelExport,
  PdfExport,
  Selection,
  Resize,
  Reorder,
  Inject,
  type GridComponent as GridComponentType,
} from '@syncfusion/ej2-react-grids';
import { useLanguage } from '../hooks/useLanguage';
import { useThemeStore } from '../stores/themeStore';
import { MUI_THEME_PRESETS } from '../types/muiThemes';
import { setSyncfusionLocale } from '../config/syncfusionLocale';
import './SyncfusionGridWrapper.css';
import { createLogger } from '../utils/logger';

const logger = createLogger('SyncfusionGridWrapper');

/**
 * Column definition for Syncfusion Grid
 */
export interface SyncfusionColumnDef {
  field: string;
  headerText: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  textAlign?: 'Left' | 'Right' | 'Center' | 'Justify';
  type?: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  format?: string;
  visible?: boolean;
  allowSorting?: boolean;
  allowFiltering?: boolean;
  allowGrouping?: boolean;
  allowResizing?: boolean;
  allowReordering?: boolean;
  isPrimaryKey?: boolean;
  template?: React.ReactNode | ((props: unknown) => React.ReactNode);
  headerTemplate?: React.ReactNode | ((props: unknown) => React.ReactNode);
}

/**
 * Props for SyncfusionGridWrapper component
 */
export interface SyncfusionGridWrapperProps {
  /** Column definitions */
  columns: SyncfusionColumnDef[];
  /** Row data */
  data: object[];
  /** Enable pagination */
  allowPaging?: boolean;
  /** Page settings */
  pageSettings?: {
    pageSize?: number;
    pageSizes?: boolean | number[];
    pageCount?: number;
  };
  /** Enable sorting */
  allowSorting?: boolean;
  /** Enable filtering */
  allowFiltering?: boolean;
  /** Enable grouping */
  allowGrouping?: boolean;
  /** Enable selection */
  allowSelection?: boolean;
  /** Selection mode */
  selectionSettings?: {
    mode?: 'Row' | 'Cell' | 'Both';
    type?: 'Single' | 'Multiple';
  };
  /** Enable resizing */
  allowResizing?: boolean;
  /** Enable reordering */
  allowReordering?: boolean;
  /** Enable toolbar */
  toolbar?: string[];
  /** Enable Excel export */
  allowExcelExport?: boolean;
  /** Enable PDF export */
  allowPdfExport?: boolean;
  /** Grid height */
  height?: string | number;
  /** Grid width */
  width?: string | number;
  /** Container class name */
  className?: string;
  /** Data-id-ref for testing */
  idRef?: string;
  /** Callback when grid is ready */
  onGridReady?: (grid: GridComponentType) => void;
  /** Row selected callback */
  onRowSelected?: (args: unknown) => void;
  /** Row deselected callback */
  onRowDeselected?: (args: unknown) => void;
  /** Record click callback */
  onRecordClick?: (args: unknown) => void;
  /** Data bound callback */
  onDataBound?: () => void;
}

/**
 * SyncfusionGridWrapper Component
 * 
 * A reusable wrapper for Syncfusion Grid with RTL support and Persian localization.
 */
export const SyncfusionGridWrapper = forwardRef<GridComponentType | null, SyncfusionGridWrapperProps>(
  (
    {
      columns,
      data,
      allowPaging = true,
      pageSettings = { pageSize: 10, pageSizes: [10, 25, 50, 100] },
      allowSorting = true,
      allowFiltering = true,
      allowGrouping = false,
      allowSelection = true,
      selectionSettings = { mode: 'Row', type: 'Single' },
      allowResizing = true,
      allowReordering = true,
      toolbar,
      allowExcelExport = false,
      allowPdfExport = false,
      height = 'auto',
      width = '100%',
      className = '',
      idRef,
      onGridReady,
      onRowSelected,
      onRowDeselected,
      onRecordClick,
      onDataBound,
    },
    ref
  ) => {
    const { language } = useLanguage();
    const currentTheme = useThemeStore((state) => state.currentTheme);
    const gridRef = useRef<GridComponentType | null>(null);
    const isRTL = language === 'fa';
    
    // Get theme mode (light/dark) from current theme preset
    const themeMode = useMemo(() => {
      const themeConfig = MUI_THEME_PRESETS.find(t => t.id === currentTheme);
      return themeConfig?.mode || 'light';
    }, [currentTheme]);

    // Set Syncfusion locale when language changes
    useEffect(() => {
      setSyncfusionLocale(language as 'fa' | 'en');
      logger.log('Syncfusion locale set to:', language);
    }, [language]);

    // Expose grid instance via ref
    useImperativeHandle(ref, () => gridRef.current!, []);

    // Get services to inject based on enabled features
    const services = useMemo(() => {
      const svcs: object[] = [];
      if (allowPaging) svcs.push(Page);
      if (allowSorting) svcs.push(Sort);
      if (allowFiltering) svcs.push(Filter);
      if (allowGrouping) svcs.push(Group);
      if (allowSelection) svcs.push(Selection);
      if (allowResizing) svcs.push(Resize);
      if (allowReordering) svcs.push(Reorder);
      if (toolbar) svcs.push(Toolbar);
      if (allowExcelExport) svcs.push(ExcelExport);
      if (allowPdfExport) svcs.push(PdfExport);
      svcs.push(Edit); // Always include edit for potential future use
      return svcs;
    }, [allowPaging, allowSorting, allowFiltering, allowGrouping, allowSelection, allowResizing, allowReordering, toolbar, allowExcelExport, allowPdfExport]);

    // Handle grid created event
    const handleCreated = () => {
      logger.log('Syncfusion Grid created');
      if (gridRef.current && onGridReady) {
        onGridReady(gridRef.current);
      }
    };

    return (
      <div
        className={`syncfusion-grid-wrapper ${isRTL ? 'rtl' : 'ltr'} ${themeMode === 'dark' ? 'dark-mode' : 'light-mode'} ${className}`}
        data-id-ref={idRef || 'syncfusion-grid-container'}
        data-theme-mode={themeMode}
        style={{ width, height: height === 'auto' ? undefined : height }}
      >
        <GridComponent
          ref={gridRef}
          dataSource={data}
          allowPaging={allowPaging}
          pageSettings={pageSettings}
          allowSorting={allowSorting}
          allowFiltering={allowFiltering}
          allowGrouping={allowGrouping}
          allowSelection={allowSelection}
          selectionSettings={selectionSettings}
          allowResizing={allowResizing}
          allowReordering={allowReordering}
          toolbar={toolbar}
          allowExcelExport={allowExcelExport}
          allowPdfExport={allowPdfExport}
          height={height}
          width="100%"
          enableRtl={isRTL}
          locale={isRTL ? 'fa' : 'en'}
          created={handleCreated}
          rowSelected={onRowSelected}
          rowDeselected={onRowDeselected}
          recordClick={onRecordClick}
          dataBound={onDataBound}
        >
          <ColumnsDirective>
            {columns.map((col, index) => (
              <ColumnDirective
                key={col.field || index}
                field={col.field}
                headerText={col.headerText}
                width={col.width}
                minWidth={col.minWidth}
                maxWidth={col.maxWidth}
                textAlign={col.textAlign}
                type={col.type}
                format={col.format}
                visible={col.visible !== false}
                allowSorting={col.allowSorting !== false}
                allowFiltering={col.allowFiltering !== false}
                allowGrouping={col.allowGrouping !== false}
                allowResizing={col.allowResizing !== false}
                allowReordering={col.allowReordering !== false}
                isPrimaryKey={col.isPrimaryKey}
                template={col.template as unknown as string}
                headerTemplate={col.headerTemplate as unknown as string}
              />
            ))}
          </ColumnsDirective>
          <Inject services={services} />
        </GridComponent>
      </div>
    );
  }
);

SyncfusionGridWrapper.displayName = 'SyncfusionGridWrapper';

export default SyncfusionGridWrapper;
