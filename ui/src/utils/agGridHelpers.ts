/**
 * AG Grid Helper Utilities
 * Utilities for responsive column definitions and mobile optimization
 */

import type { ColDef } from 'ag-grid-community';
import { isMobile, isTablet, isExtraSmall } from './deviceDetection';
import { createLogger } from './logger';

const logger = createLogger('AGGridHelpers');

/**
 * Column priority levels for responsive visibility
 */
export const ColumnPriority = {
  CRITICAL: 1,  // Always visible (ID, name, status)
  HIGH: 2,      // Visible on sm+ (important data)
  MEDIUM: 3,    // Visible on md+ (secondary data)
  LOW: 4,       // Visible on lg+ (nice-to-have)
  OPTIONAL: 5,  // Visible on xl only (extra details)
} as const;

export type ColumnPriorityType = typeof ColumnPriority[keyof typeof ColumnPriority];

/**
 * Mobile-optimized column width presets
 */
export const MOBILE_COLUMN_WIDTHS = {
  ICON: 50,           // Icon-only columns
  TINY: 70,           // Small text (ID, code)
  SMALL: 100,         // Short text
  MEDIUM: 150,        // Medium text
  LARGE: 200,         // Long text
  AUTO: undefined,    // Auto-size to content
} as const;

/**
 * Options for making a column definition responsive
 */
export interface ResponsiveColumnOptions {
  /** Base column definition */
  colDef: ColDef;
  /** Priority level (determines visibility on different breakpoints) */
  priority?: ColumnPriorityType;
  /** Mobile-specific width override */
  mobileWidth?: number;
  /** Tablet-specific width override */
  tabletWidth?: number;
  /** Whether to hide column on mobile entirely */
  hideOnMobile?: boolean;
  /** Whether to hide column on tablet */
  hideOnTablet?: boolean;
  /** Custom mobile header name (shorter) */
  mobileHeaderName?: string;
}

/**
 * Make a column definition responsive based on device type
 * @param options - Responsive column options
 * @returns Column definition with responsive settings applied
 */
export const makeResponsiveColumnDef = (options: ResponsiveColumnOptions): ColDef => {
  const {
    colDef,
    priority = ColumnPriority.HIGH,
    mobileWidth,
    tabletWidth,
    hideOnMobile = false,
    hideOnTablet = false,
    mobileHeaderName,
  } = options;

  const mobile = isMobile();
  const tablet = isTablet();
  const extraSmall = isExtraSmall();

  // Determine if column should be hidden
  let hide = colDef.hide || false;
  
  if (hideOnMobile && mobile) {
    hide = true;
  } else if (hideOnTablet && tablet) {
    hide = true;
  } else if (priority >= ColumnPriority.MEDIUM && mobile) {
    hide = true; // Hide MEDIUM+ priority on mobile
  } else if (priority >= ColumnPriority.LOW && extraSmall) {
    hide = true; // Hide LOW+ priority on extra small screens
  }

  // Determine column width
  let width = colDef.width;
  if (mobile && mobileWidth !== undefined) {
    width = mobileWidth;
  } else if (tablet && tabletWidth !== undefined) {
    width = tabletWidth;
  } else if (mobile && !width) {
    // Auto-adjust width for mobile if not specified
    width = MOBILE_COLUMN_WIDTHS.MEDIUM;
  }

  // Use mobile-specific header name if provided
  const headerName = mobile && mobileHeaderName ? mobileHeaderName : colDef.headerName;

  const responsiveColDef: ColDef = {
    ...colDef,
    hide,
    width,
    headerName,
    // Mobile-specific overrides
    ...(mobile && {
      suppressMenu: true, // Simplify column menu on mobile
      suppressMovable: true, // Prevent drag-to-reorder on mobile (touch conflicts)
      resizable: false, // Disable column resizing on mobile (difficult with touch)
    }),
  };

  logger.log('Responsive column created:', {
    field: colDef.field,
    priority,
    mobile,
    tablet,
    extraSmall,
    hide,
    width,
  });

  return responsiveColDef;
};

/**
 * Create mobile-optimized grid options
 * @param baseOptions - Base grid options to extend
 * @returns Mobile-optimized grid options
 */
export const getMobileGridOptions = (baseOptions: Record<string, unknown> = {}) => {
  const mobile = isMobile();
  const touch = typeof window !== 'undefined' && ('ontouchstart' in window);

  if (!mobile && !touch) {
    return baseOptions; // No mobile optimizations needed
  }

  const mobileOptions = {
    ...baseOptions,
    
    // Row height optimization for touch targets (WCAG 2.1 Level AAA)
    rowHeight: 52, // Minimum 44px for touch, 52px provides comfortable spacing
    headerHeight: 48, // Larger header for easier touch interaction
    
    // Pagination optimization
    pagination: true,
    paginationPageSize: 20, // Smaller page size for better mobile performance
    paginationPageSizeSelector: [10, 20, 50], // Simplified page size options
    
    // Touch optimization
    suppressCellFocus: false, // Allow cell focus for touch accessibility
    suppressRowClickSelection: false, // Allow row selection via touch
    enableCellTextSelection: true, // Allow text selection on mobile
    
    // Performance optimization
    rowBuffer: 10, // Reduce buffer for better mobile performance
    debounceVerticalScrollbar: true, // Smoother scrolling on mobile
    
    // Simplified UI for mobile
    suppressContextMenu: true, // Disable context menu (difficult on mobile)
    suppressMenuHide: false, // Allow menu to close
    
    // Column menu simplification
    columnMenu: 'legacy' as const, // Use simpler legacy menu on mobile
    
    // Overlay optimization
    overlayLoadingTemplate: '<span class="ag-overlay-loading-center">Loading...</span>',
    overlayNoRowsTemplate: '<span class="ag-overlay-no-rows-center">No data available</span>',
    
    // Suppress features that don't work well on mobile
    suppressMovableColumns: true, // Prevent column drag (touch conflicts)
    suppressColumnVirtualisation: false, // Keep virtualization for performance
    
    // Enable features that work well with touch
    suppressTouch: false, // Enable touch support
    enableBrowserTooltips: true, // Use native browser tooltips (work better on mobile)
  };

  logger.log('Mobile grid options applied:', { mobile, touch, rowHeight: mobileOptions.rowHeight });

  return mobileOptions;
};

/**
 * Adjust column definitions array for mobile display
 * @param columnDefs - Array of column definitions
 * @param criticalFields - Fields that should always be visible on mobile
 * @returns Mobile-adjusted column definitions
 */
export const adjustColumnsForMobile = (
  columnDefs: ColDef[],
  criticalFields: string[] = []
): ColDef[] => {
  const mobile = isMobile();
  
  if (!mobile) {
    return columnDefs; // No adjustment needed
  }

  return columnDefs.map((colDef) => {
    const field = colDef.field || '';
    const isCritical = criticalFields.includes(field);

    // Keep critical columns visible
    if (isCritical) {
      return {
        ...colDef,
        hide: false,
        suppressMenu: true,
        suppressMovable: true,
        resizable: false,
      };
    }

    // Auto-hide less important columns on mobile
    return {
      ...colDef,
      hide: colDef.hide !== false, // Hide by default unless explicitly set to false
      suppressMenu: true,
      suppressMovable: true,
      resizable: false,
    };
  });
};

/**
 * Get mobile-optimized default column definition
 * @returns Default column definition for mobile
 */
export const getMobileDefaultColDef = (): ColDef => {
  const mobile = isMobile();

  if (!mobile) {
    return {
      resizable: true,
      sortable: true,
      filter: true,
    };
  }

  return {
    resizable: false, // Disable resizing on mobile
    sortable: true, // Keep sorting
    filter: true, // Keep filtering
    suppressMovable: true, // Prevent drag-to-reorder
    minWidth: 80, // Ensure minimum touch target width
    flex: 1, // Use flex sizing for better mobile fit
    cellStyle: {
      padding: '8px', // Comfortable padding for touch
      display: 'flex',
      alignItems: 'center',
    },
  };
};

/**
 * Create a mobile-friendly column definition preset
 * @param field - Field name
 * @param headerName - Column header
 * @param priority - Column priority
 * @param options - Additional column options
 * @returns Mobile-optimized column definition
 */
export const createMobileColumn = (
  field: string,
  headerName: string,
  priority: ColumnPriorityType = ColumnPriority.HIGH,
  options: Partial<ColDef> = {}
): ColDef => {
  return makeResponsiveColumnDef({
    colDef: {
      field,
      headerName,
      ...options,
    },
    priority,
  });
};

/**
 * Get responsive sidebar configuration
 * @returns Sidebar config optimized for current device
 */
export const getResponsiveSidebarConfig = () => {
  const mobile = isMobile();

  if (mobile) {
    // Disable sidebar on mobile - takes up too much screen space
    return {
      toolPanels: [],
      hiddenByDefault: true,
    };
  }

  // Desktop sidebar with all tools
  return {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
      },
      {
        id: 'filters',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
      },
    ],
  };
};

/**
 * Log grid configuration for debugging
 * @param columnDefs - Column definitions
 * @param gridOptions - Grid options
 */
export const logGridConfig = (columnDefs: ColDef[], gridOptions: Record<string, unknown>) => {
  logger.log('AG Grid Configuration:', {
    columnCount: columnDefs.length,
    visibleColumns: columnDefs.filter(c => !c.hide).length,
    hiddenColumns: columnDefs.filter(c => c.hide).length,
    gridOptions: {
      rowHeight: gridOptions.rowHeight,
      headerHeight: gridOptions.headerHeight,
      pagination: gridOptions.pagination,
      paginationPageSize: gridOptions.paginationPageSize,
    },
  });
};
