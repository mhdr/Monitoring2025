/**
 * Syncfusion Grid Example
 * 
 * This file demonstrates how to use the SyncfusionGridWrapper component.
 * Copy and adapt this example for your own use cases.
 */

import { useRef, useCallback } from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import SyncfusionGridWrapper, {
  type SyncfusionColumnDef,
} from '../components/SyncfusionGridWrapper';
import type { GridComponent } from '@syncfusion/ej2-react-grids';

/**
 * Sample data type
 */
interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  salary: number;
  hireDate: Date;
  isActive: boolean;
}

/**
 * Sample data for the grid
 */
const sampleEmployees: Employee[] = [
  { id: 1, name: 'Ahmad Karimi', department: 'Engineering', position: 'Senior Developer', salary: 85000, hireDate: new Date('2020-03-15'), isActive: true },
  { id: 2, name: 'Sara Mohammadi', department: 'Design', position: 'UI/UX Designer', salary: 72000, hireDate: new Date('2021-06-01'), isActive: true },
  { id: 3, name: 'Reza Ahmadi', department: 'Engineering', position: 'Junior Developer', salary: 55000, hireDate: new Date('2023-01-10'), isActive: true },
  { id: 4, name: 'Maryam Hosseini', department: 'HR', position: 'HR Manager', salary: 78000, hireDate: new Date('2019-11-20'), isActive: true },
  { id: 5, name: 'Ali Rezaei', department: 'Marketing', position: 'Marketing Lead', salary: 68000, hireDate: new Date('2022-04-05'), isActive: false },
  { id: 6, name: 'Fateme Nazari', department: 'Engineering', position: 'Tech Lead', salary: 95000, hireDate: new Date('2018-07-12'), isActive: true },
  { id: 7, name: 'Mohammad Jafari', department: 'Sales', position: 'Sales Rep', salary: 52000, hireDate: new Date('2023-08-22'), isActive: true },
  { id: 8, name: 'Zahra Moradi', department: 'Finance', position: 'Accountant', salary: 62000, hireDate: new Date('2021-02-14'), isActive: true },
  { id: 9, name: 'Hossein Rahimi', department: 'Engineering', position: 'DevOps Engineer', salary: 88000, hireDate: new Date('2020-09-30'), isActive: true },
  { id: 10, name: 'Negar Tavakoli', department: 'Design', position: 'Graphic Designer', salary: 58000, hireDate: new Date('2022-11-08'), isActive: false },
  { id: 11, name: 'Amir Zare', department: 'Engineering', position: 'QA Engineer', salary: 65000, hireDate: new Date('2021-05-17'), isActive: true },
  { id: 12, name: 'Leila Sadeghi', department: 'Support', position: 'Support Lead', salary: 60000, hireDate: new Date('2020-12-03'), isActive: true },
];

/**
 * Column definitions for the employee grid
 */
const employeeColumns: SyncfusionColumnDef[] = [
  { field: 'id', headerText: 'ID', width: 80, textAlign: 'Center', isPrimaryKey: true },
  { field: 'name', headerText: 'Name', width: 180 },
  { field: 'department', headerText: 'Department', width: 140 },
  { field: 'position', headerText: 'Position', width: 160 },
  { field: 'salary', headerText: 'Salary', width: 120, textAlign: 'Right', format: 'C0' },
  { field: 'hireDate', headerText: 'Hire Date', width: 130, type: 'date', format: 'yMd' },
  { field: 'isActive', headerText: 'Active', width: 100, textAlign: 'Center', type: 'boolean' },
];

/**
 * SyncfusionGridExample Component
 * 
 * Demonstrates the usage of SyncfusionGridWrapper with various features enabled.
 */
export function SyncfusionGridExample() {
  const gridRef = useRef<GridComponent | null>(null);

  // Handle grid ready event
  const handleGridReady = useCallback((grid: GridComponent) => {
    console.log('Grid is ready:', grid);
  }, []);

  // Handle row selection
  const handleRowSelected = useCallback((args: unknown) => {
    console.log('Row selected:', args);
  }, []);

  // Handle record click
  const handleRecordClick = useCallback((args: unknown) => {
    console.log('Record clicked:', args);
  }, []);

  // Export to Excel
  const handleExcelExport = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.excelExport();
    }
  }, []);

  // Export to PDF
  const handlePdfExport = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.pdfExport();
    }
  }, []);

  return (
    <Box sx={{ p: 3 }} data-id-ref="syncfusion-grid-example-container">
      <Typography variant="h4" gutterBottom data-id-ref="syncfusion-grid-example-title">
        Syncfusion Grid Example
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} data-id-ref="syncfusion-grid-example-description">
        This example demonstrates the Syncfusion Grid component with pagination, sorting, filtering, and grouping features.
      </Typography>

      {/* Export buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleExcelExport}
          data-id-ref="syncfusion-grid-excel-export-btn"
        >
          Export to Excel
        </Button>
        <Button
          variant="outlined"
          onClick={handlePdfExport}
          data-id-ref="syncfusion-grid-pdf-export-btn"
        >
          Export to PDF
        </Button>
      </Stack>

      <Paper elevation={2} sx={{ p: 0, overflow: 'hidden' }} data-id-ref="syncfusion-grid-example-paper">
        <SyncfusionGridWrapper
          ref={gridRef}
          columns={employeeColumns}
          data={sampleEmployees}
          allowPaging={true}
          pageSettings={{ pageSize: 5, pageSizes: [5, 10, 25, 50] }}
          allowSorting={true}
          allowFiltering={true}
          allowGrouping={true}
          allowSelection={true}
          selectionSettings={{ mode: 'Row', type: 'Single' }}
          allowResizing={true}
          allowReordering={true}
          allowExcelExport={true}
          allowPdfExport={true}
          toolbar={['Search', 'Print']}
          height={400}
          idRef="employee-grid"
          onGridReady={handleGridReady}
          onRowSelected={handleRowSelected}
          onRecordClick={handleRecordClick}
        />
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Features Enabled
        </Typography>
        <Typography component="ul" variant="body2" color="text.secondary">
          <li>✅ Pagination with configurable page sizes</li>
          <li>✅ Column sorting (click header to sort)</li>
          <li>✅ Column filtering (type in filter row)</li>
          <li>✅ Column grouping (drag column header to group bar)</li>
          <li>✅ Row selection (click to select)</li>
          <li>✅ Column resizing (drag column borders)</li>
          <li>✅ Column reordering (drag and drop columns)</li>
          <li>✅ Excel/PDF export</li>
          <li>✅ Search and Print toolbar</li>
          <li>✅ RTL support (switches with language)</li>
        </Typography>
      </Box>
    </Box>
  );
}

export default SyncfusionGridExample;
