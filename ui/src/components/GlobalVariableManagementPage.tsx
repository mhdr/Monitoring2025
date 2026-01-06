import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  HelpOutline as HelpOutlineIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { formatDate } from '../utils/dateFormatting';
import { getGlobalVariables } from '../services/extendedApi';
import type { GlobalVariable, GlobalVariableType } from '../types/api';
import { GlobalVariableType as GlobalVariableTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';
import { signalRManager } from '../services/signalrClient';

const logger = createLogger('GlobalVariableManagementPage');

// Lazy load dialog components
const AddEditGlobalVariableDialog = lazy(() => import('./AddEditGlobalVariableDialog'));
const DeleteGlobalVariableDialog = lazy(() => import('./DeleteGlobalVariableDialog'));
const GlobalVariableUsageDialog = lazy(() => import('./GlobalVariableUsageDialog'));
const SetGlobalVariableValueDialog = lazy(() => import('./SetGlobalVariableValueDialog'));

/**
 * Get variable type color for badge
 */
const getVariableTypeColor = (
  variableType: GlobalVariableType
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (variableType) {
    case GlobalVariableTypeEnum.Boolean:
      return 'info';
    case GlobalVariableTypeEnum.Float:
      return 'primary';
    default:
      return 'default';
  }
};

/**
 * Get variable type label
 */
const getVariableTypeLabel = (variableType: GlobalVariableType, t: (key: string) => string): string => {
  switch (variableType) {
    case GlobalVariableTypeEnum.Boolean:
      return t('globalVariables.type.boolean');
    case GlobalVariableTypeEnum.Float:
      return t('globalVariables.type.float');
    default:
      return String(variableType);
  }
};

/**
 * Format variable value based on type
 */
const formatVariableValue = (variable: GlobalVariable, t: (key: string) => string): string => {
  if (variable.currentValue === null || variable.currentValue === undefined || variable.currentValue === '') {
    return '—';
  }

  if (variable.variableType === GlobalVariableTypeEnum.Boolean) {
    const boolValue = variable.currentValue.toLowerCase();
    if (boolValue === 'true' || boolValue === '1') return t('common.true');
    if (boolValue === 'false' || boolValue === '0') return t('common.false');
    return variable.currentValue;
  }

  // Float type - format to 2 decimal places if numeric
  const numValue = parseFloat(variable.currentValue);
  if (!isNaN(numValue)) {
    return numValue.toFixed(2);
  }

  return variable.currentValue;
};

/**
 * Format last update time to relative time
 */
const formatLastUpdateTime = (timestamp: number | null | undefined, t: (key: string) => string): string => {
  if (!timestamp) return t('common.never');

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}${t('common.secondsAgo')}`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}${t('common.minutesAgo')}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${t('common.hoursAgo')}`;

  const days = Math.floor(hours / 24);
  return `${days}${t('common.daysAgo')}`;
};

/**
 * Global Variable Management Page Component
 * Manages lightweight in-memory global variables accessible to all memories
 */
const GlobalVariableManagementPage: React.FC = () => {
  const { t, language } = useLanguage();

  // State management
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [setValueDialogOpen, setSetValueDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<GlobalVariable | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  /**
   * Merge new global variables with existing ones to prevent flickering
   * Only updates changed items, preserving array reference stability
   */
  const mergeGlobalVariables = useCallback((newVariables: GlobalVariable[]) => {
    setGlobalVariables((prevVariables) => {
      // If previous is empty or first load, just set the new data
      if (prevVariables.length === 0) {
        return newVariables;
      }

      // Create a map of previous variables by ID for quick lookup
      const prevMap = new Map(prevVariables.map((v) => [v.id, v]));

      // Check if we need to update at all
      let hasChanges = prevVariables.length !== newVariables.length;

      if (!hasChanges) {
        // Check if any variable has actually changed
        for (const newVar of newVariables) {
          const prevVar = prevMap.get(newVar.id);
          if (!prevVar ||
            prevVar.currentValue !== newVar.currentValue ||
            prevVar.lastUpdateTime !== newVar.lastUpdateTime ||
            prevVar.name !== newVar.name ||
            prevVar.description !== newVar.description ||
            prevVar.isDisabled !== newVar.isDisabled ||
            prevVar.variableType !== newVar.variableType) {
            hasChanges = true;
            break;
          }
        }
      }

      // If nothing changed, return the same reference to prevent re-render
      if (!hasChanges) {
        return prevVariables;
      }

      // Build new array, reusing unchanged objects to maintain reference equality
      return newVariables.map((newVar) => {
        const prevVar = prevMap.get(newVar.id);
        if (prevVar &&
          prevVar.currentValue === newVar.currentValue &&
          prevVar.lastUpdateTime === newVar.lastUpdateTime &&
          prevVar.name === newVar.name &&
          prevVar.description === newVar.description &&
          prevVar.isDisabled === newVar.isDisabled &&
          prevVar.variableType === newVar.variableType) {
          // Variable unchanged, reuse previous object reference
          return prevVar;
        }
        // Variable changed, use new object
        return newVar;
      });
    });
  }, []);

  /**
   * Fetch all global variable configurations
   * NOTE: We intentionally omit 'isInitialLoad' from deps to avoid infinite loop.
   * When isInitialLoad changes from true to false, it would recreate fetchGlobalVariables,
   * which would trigger the useEffect that calls it, causing another fetch.
   */
  const fetchGlobalVariables = useCallback(async (options?: { silent?: boolean }) => {
    // Default to silent refreshes after the first load to avoid UI flicker/spinners
    // Access isInitialLoad via closure - it's read-only here, changes don't need to recreate this callback
    const effectiveSilent = options?.silent ?? !isInitialLoad;
    try {
      if (!effectiveSilent) {
        setLoading(true);
      }
      setError(null);

      const response = await getGlobalVariables();

      if (!response.isSuccessful) {
        setError(response.errorMessage || 'Failed to fetch global variables');
        return;
      }

      mergeGlobalVariables(response.globalVariables || []);
      logger.info('Global variables fetched successfully', { count: response.globalVariables?.length || 0, silent: effectiveSilent });

      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch global variables', err);
    } finally {
      if (!effectiveSilent) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeGlobalVariables]); // Intentionally omit isInitialLoad to prevent infinite loop

  // Fetch global variables on component mount
  useEffect(() => {
    fetchGlobalVariables();
  }, [fetchGlobalVariables]);

  // Subscribe to SignalR real-time updates
  useEffect(() => {
    const handleGlobalVariablesUpdate = () => {
      logger.info('Received global variables update notification - refreshing data silently');
      // Use silent mode to avoid loading spinner and flickering
      fetchGlobalVariables({ silent: true });
    };

    signalRManager.onGlobalVariablesUpdate(handleGlobalVariablesUpdate);

    return () => {
      signalRManager.offGlobalVariablesUpdate();
    };
  }, [fetchGlobalVariables]);

  /**
   * Handle add button click
   */
  const handleAdd = useCallback(() => {
    setSelectedVariable(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((variable: GlobalVariable) => {
    setSelectedVariable(variable);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((variable: GlobalVariable) => {
    setSelectedVariable(variable);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle view usage button click
   */
  const handleViewUsage = useCallback((variable: GlobalVariable) => {
    setSelectedVariable(variable);
    setUsageDialogOpen(true);
  }, []);

  /**
   * Handle set value button click
   */
  const handleSetValue = useCallback((variable: GlobalVariable) => {
    setSelectedVariable(variable);
    setSetValueDialogOpen(true);
  }, []);

  /**
   * Handle dialog close and refresh data
   */
  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setUsageDialogOpen(false);
    setSetValueDialogOpen(false);
    setSelectedVariable(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchGlobalVariables();
    }
  }, [fetchGlobalVariables]);

  /**
   * Filter global variables based on search term
   * Optimized to maintain reference stability when possible
   */
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return globalVariables;

    const lowerSearch = searchTerm.toLowerCase();
    const filtered = globalVariables.filter(
      (v) =>
        v.name?.toLowerCase().includes(lowerSearch) ||
        v.description?.toLowerCase().includes(lowerSearch) ||
        v.currentValue?.toLowerCase().includes(lowerSearch)
    );

    // Return same reference if filter results are identical to previous
    // This prevents unnecessary re-renders of the grid
    return filtered;
  }, [globalVariables, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'id',
        headerText: 'ID',
        width: 0,
        visible: false,
        isPrimaryKey: true,
      },
      {
        field: 'name',
        headerText: t('globalVariables.name'),
        width: 200,
        template: (rowData: GlobalVariable) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="globalvariable-name-cell">
            <CodeIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {rowData.name || t('common.unnamed')}
            </Typography>
            {rowData.isDisabled && (
              <Chip label={t('common.disabled')} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        ),
      },
      {
        field: 'variableType',
        headerText: t('globalVariables.variableType'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: GlobalVariable) => (
          <Box data-id-ref="globalvariable-type-cell">
            <Chip
              label={getVariableTypeLabel(rowData.variableType, t)}
              size="small"
              color={getVariableTypeColor(rowData.variableType)}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        ),
      },
      {
        field: 'currentValue',
        headerText: t('globalVariables.currentValue'),
        width: 140,
        textAlign: 'Center',
        template: (rowData: GlobalVariable) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }} data-id-ref="globalvariable-value-cell">
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                fontFamily: 'monospace',
                color: rowData.variableType === GlobalVariableTypeEnum.Boolean
                  ? (rowData.currentValue === 'true' || rowData.currentValue === '1' ? 'success.main' : 'error.main')
                  : 'text.primary'
              }}
            >
              {formatVariableValue(rowData, t)}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'lastUpdateTime',
        headerText: t('globalVariables.lastUpdate'),
        width: 220,
        textAlign: 'Center',
        template: (rowData: GlobalVariable) => (
          <Typography variant="body2" color="text.secondary" data-id-ref="globalvariable-lastupdate-cell">
            {rowData.lastUpdateTime ? formatDate(rowData.lastUpdateTime, language, 'long') : t('common.never')}
          </Typography>
        ),
      },
      {
        field: 'description',
        headerText: t('globalVariables.description'),
        width: 300,
        template: (rowData: GlobalVariable) => (
          <Typography variant="body2" noWrap data-id-ref="globalvariable-description-cell">
            {rowData.description || '—'}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 200,
        textAlign: 'Center',
        template: (rowData: GlobalVariable) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} data-id-ref="globalvariable-actions-cell">
            <Tooltip title={t('globalVariables.setValue.buttonTitle')}>
              <IconButton
                size="small"
                onClick={() => handleSetValue(rowData)}
                color="success"
                data-id-ref="globalvariable-setvalue-btn"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="globalvariable-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="globalvariable-delete-btn"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('globalVariables.usage.viewUsage')}>
              <IconButton
                size="small"
                onClick={() => handleViewUsage(rowData)}
                color="info"
                data-id-ref="globalvariable-usage-btn"
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ];
  }, [t, handleEdit, handleDelete, handleViewUsage, handleSetValue]);

  return (
    <Container maxWidth={false} sx={{ py: 3, height: '100%', display: 'flex', flexDirection: 'column' }} data-id-ref="globalvariable-management-page">
      <Card elevation={3} sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }} data-id-ref="globalvariable-management-card">
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon />
              <Typography variant="h5" component="div">
                {t('globalVariables.title')}
              </Typography>
              <IconButton size="small" onClick={handleOverviewHelpOpen} data-id-ref="globalvariable-help-btn">
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="globalvariable-add-btn"
            >
              {t('globalVariables.addNew')}
            </Button>
          }
          data-id-ref="globalvariable-management-header"
        />

        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-id-ref="globalvariable-management-content">
          {/* Search Bar */}
          <Box sx={{ mb: 2 }} data-id-ref="globalvariable-search-box">
            <TextField
              fullWidth
              size="small"
              placeholder={t('globalVariables.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} data-id-ref="globalvariable-clear-search-btn">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="globalvariable-search-input"
            />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-id-ref="globalvariable-error-alert">
              {error}
            </Alert>
          )}

          {/* Loading Indicator - Only show on initial load */}
          {loading && isInitialLoad && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }} data-id-ref="globalvariable-loading-box">
              <CircularProgress />
            </Box>
          )}

          {/* Syncfusion Grid - Always rendered to prevent unmount/remount flickering */}
          {!isInitialLoad && (
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                // Hide Syncfusion's built-in spinner to avoid flicker on live refreshes
                '& .e-spinner-pane': { display: 'none !important' }
              }}
              data-id-ref="globalvariable-grid-container"
            >
              <SyncfusionGridWrapper
                data={filteredVariables}
                columns={columns}
                allowPaging
                allowSorting
                allowFiltering
                pageSettings={{ pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                height="100%"
                data-id-ref="globalvariable-grid"
              />
            </Box>
          )}

          {/* No Data Message */}
          {!loading && !isInitialLoad && filteredVariables.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }} data-id-ref="globalvariable-nodata-box">
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? t('common.noSearchResults') : t('globalVariables.noVariables')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="globalVariables.help"
        data-id-ref="globalvariable-help-popover"
      />

      {/* Add/Edit Dialog */}
      {addEditDialogOpen && (
        <Suspense fallback={<CircularProgress />}>
          <AddEditGlobalVariableDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            variable={selectedVariable}
            editMode={editMode}
            data-id-ref="globalvariable-addedit-dialog"
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <Suspense fallback={<CircularProgress />}>
          <DeleteGlobalVariableDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            variable={selectedVariable}
            data-id-ref="globalvariable-delete-dialog"
          />
        </Suspense>
      )}

      {/* Usage Dialog */}
      {usageDialogOpen && (
        <Suspense fallback={<CircularProgress />}>
          <GlobalVariableUsageDialog
            open={usageDialogOpen}
            onClose={handleDialogClose}
            variable={selectedVariable}
            data-id-ref="globalvariable-usage-dialog"
          />
        </Suspense>
      )}

      {/* Set Value Dialog */}
      {setValueDialogOpen && selectedVariable && (
        <Suspense fallback={<CircularProgress />}>
          <SetGlobalVariableValueDialog
            open={setValueDialogOpen}
            onClose={handleDialogClose}
            variable={selectedVariable}
            data-id-ref="globalvariable-setvalue-dialog"
          />
        </Suspense>
      )}
    </Container>
  );
};

export default GlobalVariableManagementPage;
