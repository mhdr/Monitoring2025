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
  AccountTree as IfMemoryIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getIfMemories } from '../services/extendedApi';
import type { IfMemory, ItemType } from '../types/api';
import { ItemTypeEnum, IfMemoryOutputType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('IfMemoryManagementPage');

// Lazy load dialog components
const AddEditIfMemoryDialog = lazy(() => import('./AddEditIfMemoryDialog'));
const DeleteIfMemoryDialog = lazy(() => import('./DeleteIfMemoryDialog'));

/**
 * Extended IfMemory type with resolved item names
 */
interface IfMemoryWithItems extends IfMemory {
  outputItemName?: string;
  outputItemNameFa?: string;
  outputItemType?: ItemType;
  branchCount?: number;
}

interface ConditionalBranchInfo {
  id: string;
  order: number;
  condition: string;
  outputValue: number;
  hysteresis?: number;
  name?: string;
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
 * Parse branches JSON and count branches
 */
const parseBranches = (branchesJson: string): ConditionalBranchInfo[] => {
  try {
    const parsed = JSON.parse(branchesJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * IF Memory Management Page Component
 * Manages IF/ELSE IF/ELSE conditional memory configurations
 */
const IfMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [ifMemories, setIfMemories] = useState<IfMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIfMemory, setSelectedIfMemory] = useState<IfMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all IF memory configurations
   */
  const fetchIfMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getIfMemories();

      // Enhance with item details from monitoring context
      const enhancedMemories: IfMemoryWithItems[] = (response.ifMemories || []).map((im: IfMemory) => {
        const outputItem = items.find((item) => item.id === im.outputItemId);
        const branches = parseBranches(im.branches);

        return {
          ...im,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
          branchCount: branches.length,
        };
      });

      setIfMemories(enhancedMemories);
      logger.info('IF memories fetched successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch IF memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch IF memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchIfMemories();
    }
  }, [fetchIfMemories, items.length]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    fetchIfMemories();
  };

  /**
   * Handle add button click
   */
  const handleAdd = useCallback(() => {
    setSelectedIfMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((ifMemory: IfMemoryWithItems) => {
    setSelectedIfMemory(ifMemory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((ifMemory: IfMemoryWithItems) => {
    setSelectedIfMemory(ifMemory);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedIfMemory(null);
  };

  /**
   * Handle successful operation (add/edit/delete)
   */
  const handleOperationSuccess = () => {
    handleDialogClose();
    fetchIfMemories();
  };

  /**
   * Filter IF memories based on search term
   */
  const filteredIfMemories = useMemo(() => {
    if (!searchTerm) return ifMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return ifMemories.filter(
      (im) =>
        im.name?.toLowerCase().includes(lowerSearch) ||
        im.outputItemName?.toLowerCase().includes(lowerSearch) ||
        im.outputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        im.description?.toLowerCase().includes(lowerSearch)
    );
  }, [ifMemories, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'name',
        headerText: t('ifMemory.fields.name'),
        width: 180,
        template: (rowData: IfMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="if-memory-row-name">
            <IfMemoryIcon fontSize="small" color="primary" />
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
        field: 'branchCount',
        headerText: t('ifMemory.branchesCount'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }} data-id-ref="if-memory-row-branches">
            <Chip
              label={`${rowData.branchCount || 0} IF`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label="ELSE"
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        ),
      },
      {
        field: 'outputItemName',
        headerText: t('ifMemory.fields.outputItem'),
        width: 200,
        template: (rowData: IfMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="if-memory-row-output">
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
        field: 'outputType',
        headerText: t('ifMemory.fields.outputType'),
        width: 130,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Chip
            label={rowData.outputType === IfMemoryOutputType.Digital 
              ? t('ifMemory.outputTypes.digital') 
              : t('ifMemory.outputTypes.analog')}
            size="small"
            color={rowData.outputType === IfMemoryOutputType.Digital ? 'info' : 'secondary'}
            sx={{ fontSize: '0.75rem' }}
            data-id-ref="if-memory-row-type"
          />
        ),
      },
      {
        field: 'defaultValue',
        headerText: 'ELSE',
        width: 80,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="if-memory-row-default">
            {rowData.defaultValue}
          </Typography>
        ),
      },
      {
        field: 'interval',
        headerText: t('ifMemory.fields.interval'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="if-memory-row-interval">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'status',
        headerText: t('common.disabled'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-id-ref="if-memory-row-status">
            {rowData.isDisabled ? (
              <Chip
                icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                label={t('common.disabled')}
                size="small"
                color="error"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            ) : (
              <Chip
                icon={<SuccessIcon sx={{ fontSize: 14 }} />}
                label={t('common.on')}
                size="small"
                color="success"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: IfMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} data-id-ref="if-memory-row-actions">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="if-memory-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="if-memory-delete-btn"
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
      data-id-ref="if-memory-page"
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardHeader
          avatar={<IfMemoryIcon fontSize="large" color="primary" />}
          title={
            <Typography variant="h5" component="h1">
              {t('ifMemory.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              {t('ifMemory.description')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="if-memory-add-btn"
            >
              {t('ifMemory.addTitle')}
            </Button>
          }
          data-id-ref="if-memory-page-header"
        />

        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-id-ref="if-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Search and Filter Bar */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder={t('ifMemory.title') + '...'}
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
              data-id-ref="if-memory-search-input"
            />

            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={loading}
              data-id-ref="if-memory-refresh-btn"
            >
              {loading ? <CircularProgress size={24} /> : t('common.refresh')}
            </Button>
          </Box>

          {/* IF Memories Grid */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {loading && ifMemories.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <SyncfusionGridWrapper
                data={filteredIfMemories}
                columns={columns}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                height="100%"
              />
            )}
          </Box>

          {/* Summary */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-id-ref="if-memory-summary">
            <Typography variant="body2" color="text.secondary">
              {t('formulaMemory.totalCount', { count: ifMemories.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('formulaMemory.filteredCount', { count: filteredIfMemories.length })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={<CircularProgress />}>
        {addEditDialogOpen && (
          <AddEditIfMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            ifMemory={selectedIfMemory}
            editMode={editMode}
          />
        )}

        {deleteDialogOpen && selectedIfMemory && (
          <DeleteIfMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            ifMemory={selectedIfMemory}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default IfMemoryManagementPage;
