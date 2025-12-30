import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
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
  Functions as FormulaIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getFormulaMemories } from '../services/extendedApi';
import type { FormulaMemory, ItemType } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('FormulaMemoryManagementPage');

// Lazy load dialog components
const AddEditFormulaMemoryDialog = lazy(() => import('./AddEditFormulaMemoryDialog'));
const DeleteFormulaMemoryDialog = lazy(() => import('./DeleteFormulaMemoryDialog'));

/**
 * Extended FormulaMemory type with resolved item names
 */
interface FormulaMemoryWithItems extends FormulaMemory {
  outputItemName?: string;
  outputItemNameFa?: string;
  outputItemType?: ItemType;
  variableCount?: number;
}

/**
 * Get ItemType color for badge
 */
const getItemTypeColor = (itemType: ItemType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return 'info';
    case ItemTypeEnum.DigitalOutput:
      return 'success';
    case ItemTypeEnum.AnalogInput:
      return 'primary';
    case ItemTypeEnum.AnalogOutput:
      return 'secondary';
    default:
      return 'default';
  }
};

/**
 * Get ItemType label
 */
const getItemTypeLabel = (itemType: ItemType, t: (key: string) => string): string => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return t('itemType.digitalInput');
    case ItemTypeEnum.DigitalOutput:
      return t('itemType.digitalOutput');
    case ItemTypeEnum.AnalogInput:
      return t('itemType.analogInput');
    case ItemTypeEnum.AnalogOutput:
      return t('itemType.analogOutput');
    default:
      return String(itemType);
  }
};

/**
 * Parse variable aliases JSON and count variables
 */
const parseVariableAliases = (variableAliasesJson: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(variableAliasesJson || '{}');
    return typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Formula Memory Management Page Component
 * Manages formula/expression memory configurations for custom mathematical calculations
 */
const FormulaMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [formulaMemories, setFormulaMemories] = useState<FormulaMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFormulaMemory, setSelectedFormulaMemory] = useState<FormulaMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all formula memory configurations
   */
  const fetchFormulaMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getFormulaMemories();

      // Enhance with item details from monitoring context
      const enhancedMemories: FormulaMemoryWithItems[] = (response.formulaMemories || []).map((fm: FormulaMemory) => {
        const outputItem = items.find((item) => item.id === fm.outputItemId);
        const aliases = parseVariableAliases(fm.variableAliases);

        return {
          ...fm,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
          variableCount: Object.keys(aliases).length,
        };
      });

      setFormulaMemories(enhancedMemories);
      logger.info('Formula memories fetched successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch formula memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch formula memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchFormulaMemories();
    }
  }, [fetchFormulaMemories, items.length]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    fetchFormulaMemories();
  };

  /**
   * Handle add button click
   */
  const handleAdd = useCallback(() => {
    setSelectedFormulaMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((formulaMemory: FormulaMemoryWithItems) => {
    setSelectedFormulaMemory(formulaMemory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((formulaMemory: FormulaMemoryWithItems) => {
    setSelectedFormulaMemory(formulaMemory);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedFormulaMemory(null);
  };

  /**
   * Handle successful operation (add/edit/delete)
   */
  const handleOperationSuccess = () => {
    handleDialogClose();
    fetchFormulaMemories();
  };

  /**
   * Filter formula memories based on search term
   */
  const filteredFormulaMemories = useMemo(() => {
    if (!searchTerm) return formulaMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return formulaMemories.filter(
      (fm) =>
        fm.name?.toLowerCase().includes(lowerSearch) ||
        fm.expression?.toLowerCase().includes(lowerSearch) ||
        fm.outputItemName?.toLowerCase().includes(lowerSearch) ||
        fm.outputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        fm.description?.toLowerCase().includes(lowerSearch) ||
        fm.units?.toLowerCase().includes(lowerSearch)
    );
  }, [formulaMemories, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'name',
        headerText: t('formulaMemory.name'),
        width: 180,
        template: (rowData: FormulaMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormulaIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {rowData.name || t('common.unnamed')}
            </Typography>
            {rowData.isDisabled && (
              <Chip label={t('common.disabled')} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        ),
      },
      {
        field: 'expression',
        headerText: t('formulaMemory.expression'),
        width: 250,
        template: (rowData: FormulaMemoryWithItems) => (
          <Tooltip title={rowData.expression} placement="top">
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                maxWidth: 230,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {rowData.expression}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'variableCount',
        headerText: t('formulaMemory.variables'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: FormulaMemoryWithItems) => (
          <Chip
            label={`${rowData.variableCount || 0} ${t('formulaMemory.vars')}`}
            size="small"
            color="info"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        ),
      },
      {
        field: 'outputItemName',
        headerText: t('formulaMemory.outputItem'),
        width: 200,
        template: (rowData: FormulaMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.outputItemName || t('common.notSet')}
            </Typography>
            {rowData.outputItemType && (
              <Chip
                label={getItemTypeLabel(rowData.outputItemType, t)}
                size="small"
                color={getItemTypeColor(rowData.outputItemType)}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'interval',
        headerText: t('formulaMemory.interval'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: FormulaMemoryWithItems) => (
          <Typography variant="body2">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'status',
        headerText: t('formulaMemory.status'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: FormulaMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            {rowData.lastError ? (
              <Tooltip title={rowData.lastError}>
                <Chip
                  icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                  label={t('formulaMemory.error')}
                  size="small"
                  color="error"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Tooltip>
            ) : rowData.lastEvaluationTime ? (
              <Chip
                icon={<SuccessIcon sx={{ fontSize: 14 }} />}
                label={t('formulaMemory.ok')}
                size="small"
                color="success"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            ) : (
              <Chip
                label={t('formulaMemory.pending')}
                size="small"
                color="default"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'units',
        headerText: t('formulaMemory.units'),
        width: 80,
        textAlign: 'Center',
        template: (rowData: FormulaMemoryWithItems) => (
          <Typography variant="body2">{rowData.units || '-'}</Typography>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: FormulaMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="formula-memory-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="formula-memory-delete-btn"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ];
  }, [t, handleEdit, handleDelete]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
      data-id-ref="formula-memory-page"
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardHeader
          avatar={<FormulaIcon fontSize="large" color="primary" />}
          title={
            <Typography variant="h5" component="h1">
              {t('formulaMemory.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              {t('formulaMemory.description')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="formula-memory-add-btn"
            >
              {t('formulaMemory.addNew')}
            </Button>
          }
        />

        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Search and Filter Bar */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder={t('formulaMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="formula-memory-search-input"
            />

            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={loading}
              data-id-ref="formula-memory-refresh-btn"
            >
              {loading ? <CircularProgress size={24} /> : t('common.refresh')}
            </Button>
          </Box>

          {/* Formula Memories Grid */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {loading && formulaMemories.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <SyncfusionGridWrapper
                data={filteredFormulaMemories}
                columns={columns}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                height="100%"
              />
            )}
          </Box>

          {/* Summary */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('formulaMemory.totalCount', { count: formulaMemories.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('formulaMemory.filteredCount', { count: filteredFormulaMemories.length })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={<CircularProgress />}>
        {addEditDialogOpen && (
          <AddEditFormulaMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            formulaMemory={selectedFormulaMemory}
            editMode={editMode}
          />
        )}

        {deleteDialogOpen && selectedFormulaMemory && (
          <DeleteFormulaMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            formulaMemory={selectedFormulaMemory}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default FormulaMemoryManagementPage;
