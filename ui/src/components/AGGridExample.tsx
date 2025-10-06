/**
 * AG Grid Example Component
 * Demonstrates how to use the AG Grid wrapper
 */

import React, { useState, useMemo } from 'react';
import { AGGridWrapper } from './AGGridWrapper';
import { useAGGrid } from '../hooks/useAGGrid';
import { useTranslation } from '../hooks/useTranslation';
import type { AGGridColumnDef, AGGridRowData } from '../types/agGrid';

/**
 * Example component showing AG Grid usage
 */
export const AGGridExample: React.FC = () => {
  const { t } = useTranslation();
  const {
    handleGridReady,
    exportToCsv,
    exportToExcel,
    selectAll,
    deselectAll,
    getSelectedRows,
    sizeColumnsToFit,
    autoSizeAllColumns,
  } = useAGGrid({ preload: true, theme: 'quartz' });

  // Sample data
  const [rowData] = useState<AGGridRowData[]>([
    { id: 1, name: 'Item 1', value: 100, status: 'active', date: '2025-01-01' },
    { id: 2, name: 'Item 2', value: 200, status: 'inactive', date: '2025-01-02' },
    { id: 3, name: 'Item 3', value: 300, status: 'active', date: '2025-01-03' },
    { id: 4, name: 'Item 4', value: 400, status: 'active', date: '2025-01-04' },
    { id: 5, name: 'Item 5', value: 500, status: 'inactive', date: '2025-01-05' },
  ]);

  // Column definitions
  const columnDefs = useMemo<AGGridColumnDef[]>(() => [
    {
      field: 'id',
      headerName: t('item'),
      width: 100,
      checkboxSelection: true,
      pinned: 'left',
    },
    {
      field: 'name',
      headerName: t('name'),
      flex: 1,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      field: 'value',
      headerName: t('value'),
      width: 150,
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) => {
        if (params.value && typeof params.value === 'number') {
          return new Intl.NumberFormat('en-US').format(params.value);
        }
        return '';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      sortable: true,
      filter: true,
      cellRenderer: (params) => {
        const status = params.value as string;
        const className = status === 'active' ? 'badge bg-success' : 'badge bg-secondary';
        const text = status === 'active' ? 'Active' : 'Inactive';
        return `<span class="${className}">${text}</span>`;
      },
    },
    {
      field: 'date',
      headerName: t('date'),
      width: 150,
      sortable: true,
      filter: 'agDateColumnFilter',
    },
  ], [t]);

  // Handle export CSV
  const handleExportCsv = () => {
    exportToCsv('grid-data.csv');
  };

  // Handle export Excel
  const handleExportExcel = () => {
    exportToExcel('grid-data.xlsx');
  };

  // Handle select all
  const handleSelectAll = () => {
    selectAll();
    const selected = getSelectedRows();
    console.log('Selected rows:', selected);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    deselectAll();
  };

  return (
    <div className="container-fluid py-4" data-id-ref="ag-grid-example-container">
      <div className="row mb-3">
        <div className="col-12">
          <h2 className="mb-3">{t('dataTable')}</h2>
          
          {/* Toolbar */}
          <div className="btn-toolbar mb-3" role="toolbar" data-id-ref="ag-grid-toolbar">
            <div className="btn-group me-2" role="group">
              <button
                onClick={handleExportCsv}
                className="btn btn-primary"
                data-id-ref="ag-grid-export-csv-button"
              >
                <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                {t('agGrid.csvExport')}
              </button>
              <button
                onClick={handleExportExcel}
                className="btn btn-primary"
                data-id-ref="ag-grid-export-excel-button"
              >
                <i className="bi bi-file-earmark-excel me-2"></i>
                {t('agGrid.excelExport')}
              </button>
            </div>
            
            <div className="btn-group me-2" role="group">
              <button
                onClick={handleSelectAll}
                className="btn btn-secondary"
                data-id-ref="ag-grid-select-all-button"
              >
                <i className="bi bi-check-square me-2"></i>
                {t('selectAll')}
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn btn-secondary"
                data-id-ref="ag-grid-deselect-all-button"
              >
                <i className="bi bi-square me-2"></i>
                {t('deselectAll')}
              </button>
            </div>
            
            <div className="btn-group" role="group">
              <button
                onClick={sizeColumnsToFit}
                className="btn btn-outline-secondary"
                data-id-ref="ag-grid-fit-columns-button"
              >
                <i className="bi bi-arrows-angle-contract me-2"></i>
                Fit Columns
              </button>
              <button
                onClick={autoSizeAllColumns}
                className="btn btn-outline-secondary"
                data-id-ref="ag-grid-auto-size-button"
              >
                <i className="bi bi-arrows-expand me-2"></i>
                Auto Size
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="row">
        <div className="col-12">
          <AGGridWrapper
            columnDefs={columnDefs}
            rowData={rowData}
            onGridReady={handleGridReady}
            height="600px"
            theme="quartz"
            gridOptions={{
              pagination: true,
              paginationPageSize: 10,
              rowSelection: 'multiple',
              suppressRowClickSelection: true,
              animateRows: true,
              onCellValueChanged: (event) => {
                console.log('Cell value changed:', event);
              },
              onSelectionChanged: (event) => {
                console.log('Selection changed:', event);
              },
            }}
            data-id-ref="ag-grid-example-grid"
          />
        </div>
      </div>
    </div>
  );
};

export default AGGridExample;
