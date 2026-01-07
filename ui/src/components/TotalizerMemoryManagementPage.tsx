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
  AccountBalance as TotalizerIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getTotalizerMemories, getGlobalVariables } from '../services/extendedApi';
import type { TotalizerMemory, TotalizerMemoryWithItems, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, AccumulationType, TotalizerSourceType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('TotalizerMemoryManagementPage');

// Lazy load dialog components
const AddEditTotalizerMemoryDialog = lazy(() => import('./AddEditTotalizerMemoryDialog'));
const DeleteTotalizerMemoryDialog = lazy(() => import('./DeleteTotalizerMemoryDialog'));

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
 * Get accumulation type label
 */
const getAccumulationTypeLabel = (accType: AccumulationType, t: (key: string) => string): string => {
  switch (accType) {
    case AccumulationType.RateIntegration:
      return t('totalizerMemory.accumulationType.rateIntegration');
    case AccumulationType.EventCountRising:
      return t('totalizerMemory.accumulationType.eventCountRising');
    case AccumulationType.EventCountFalling:
      return t('totalizerMemory.accumulationType.eventCountFalling');
    case AccumulationType.EventCountBoth:
      return t('totalizerMemory.accumulationType.eventCountBoth');
    default:
      return String(accType);
  }
};

/**
 * Totalizer Memory Management Page Component
 * Manages totalizer/accumulator configurations for flow, energy, and event counting
 */
const TotalizerMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [totalizerMemories, setTotalizerMemories] = useState<TotalizerMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTotalizerMemory, setSelectedTotalizerMemory] = useState<TotalizerMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all totalizer memory configurations
   */
  const fetchTotalizerMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.log('Fetching totalizer memories and global variables');
      
      // Fetch both totalizer memories and global variables in parallel
      const [tmResponse, gvResponse] = await Promise.all([
        getTotalizerMemories(),
        getGlobalVariables({})
      ]);

      if (gvResponse?.globalVariables) {
        logger.log('Global variables fetched successfully', { count: gvResponse.globalVariables.length });
      }

      // Enhance with item/variable details from monitoring context
      const enhancedMemories: TotalizerMemoryWithItems[] = (tmResponse.totalizerMemories || []).map((tm: TotalizerMemory) => {
        let inputSourceName: string | undefined;
        let inputItemType: ItemType | undefined;
        let outputSourceName: string | undefined;
        let outputItemType: ItemType | undefined;

        // Resolve input source
        if (tm.inputType === TotalizerSourceType.Point) {
          const inputItem = items.find((item) => item.id === tm.inputReference);
          if (inputItem) {
            inputSourceName = language === 'fa' && inputItem.nameFa ? inputItem.nameFa : inputItem.name;
            inputItemType = inputItem.itemType;
          }
        } else if (tm.inputType === TotalizerSourceType.GlobalVariable) {
          const inputVariable = gvResponse?.globalVariables?.find((v) => v.name === tm.inputReference);
          if (inputVariable) {
            inputSourceName = inputVariable.name;
          }
        }

        // Resolve output source
        if (tm.outputType === TotalizerSourceType.Point) {
          const outputItem = items.find((item) => item.id === tm.outputReference);
          if (outputItem) {
            outputSourceName = language === 'fa' && outputItem.nameFa ? outputItem.nameFa : outputItem.name;
            outputItemType = outputItem.itemType;
          }
        } else if (tm.outputType === TotalizerSourceType.GlobalVariable) {
          const outputVariable = gvResponse?.globalVariables?.find((v) => v.name === tm.outputReference);
          if (outputVariable) {
            outputSourceName = outputVariable.name;
          }
        }

        return {
          ...tm,
          inputSourceName,
          inputItemType,
          outputSourceName,
          outputItemType,
        };
      });

      setTotalizerMemories(enhancedMemories);
      logger.info('Totalizer memories fetched successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch totalizer memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch totalizer memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchTotalizerMemories();
    }
  }, [fetchTotalizerMemories, items.length]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    fetchTotalizerMemories();
  };

  /**
   * Handle add button click
   */
  const handleAdd = useCallback(() => {
    setSelectedTotalizerMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((totalizerMemory: TotalizerMemoryWithItems) => {
    setSelectedTotalizerMemory(totalizerMemory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((totalizerMemory: TotalizerMemoryWithItems) => {
    setSelectedTotalizerMemory(totalizerMemory);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedTotalizerMemory(null);
  };

  /**
   * Handle successful operation (add/edit/delete)
   */
  const handleOperationSuccess = () => {
    handleDialogClose();
    fetchTotalizerMemories();
  };

  /**
   * Filter totalizer memories based on search term
   */
  const filteredTotalizerMemories = useMemo(() => {
    if (!searchTerm) return totalizerMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return totalizerMemories.filter(
      (tm) =>
        tm.name?.toLowerCase().includes(lowerSearch) ||
        tm.inputSourceName?.toLowerCase().includes(lowerSearch) ||
        tm.outputSourceName?.toLowerCase().includes(lowerSearch) ||
        tm.units?.toLowerCase().includes(lowerSearch)
    );
  }, [totalizerMemories, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'name',
        headerText: t('totalizerMemory.name'),
        width: 180,
        template: (rowData: TotalizerMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TotalizerIcon fontSize="small" color="primary" />
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
        field: 'inputSourceName',
        headerText: t('totalizerMemory.inputSource'),
        width: 200,
        template: (rowData: TotalizerMemoryWithItems) => {
          const isGlobalVariable = rowData.inputType === TotalizerSourceType.GlobalVariable;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {rowData.inputSourceName || t('common.notSet')}
              </Typography>
              {isGlobalVariable ? (
                <Chip
                  label={t('common.globalVariable')}
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              ) : (
                rowData.inputItemType && (
                  <Chip
                    label={getItemTypeLabel(rowData.inputItemType, t)}
                    size="small"
                    color={getItemTypeColor(rowData.inputItemType)}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )
              )}
            </Box>
          );
        },
      },
      {
        field: 'outputSourceName',
        headerText: t('totalizerMemory.outputSource'),
        width: 200,
        template: (rowData: TotalizerMemoryWithItems) => {
          const isGlobalVariable = rowData.outputType === TotalizerSourceType.GlobalVariable;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {rowData.outputSourceName || t('common.notSet')}
              </Typography>
              {isGlobalVariable ? (
                <Chip
                  label={t('common.globalVariable')}
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              ) : (
                rowData.outputItemType && (
                  <Chip
                    label={getItemTypeLabel(rowData.outputItemType, t)}
                    size="small"
                    color={getItemTypeColor(rowData.outputItemType)}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )
              )}
            </Box>
          );
        },
      },
      {
        field: 'accumulationType',
        headerText: t('totalizerMemory.accumulationType.label'),
        width: 150,
        template: (rowData: TotalizerMemoryWithItems) => (
          <Chip
            label={getAccumulationTypeLabel(rowData.accumulationType, t)}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        ),
      },
      {
        field: 'accumulatedValue',
        headerText: t('totalizerMemory.accumulatedValue'),
        width: 150,
        textAlign: 'Right',
        template: (rowData: TotalizerMemoryWithItems) => (
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {rowData.accumulatedValue.toFixed(rowData.decimalPlaces)} {rowData.units || ''}
          </Typography>
        ),
      },
      {
        field: 'interval',
        headerText: t('totalizerMemory.interval'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: TotalizerMemoryWithItems) => (
          <Typography variant="body2">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'resetConfig',
        headerText: t('totalizerMemory.resetConfig'),
        width: 120,
        template: (rowData: TotalizerMemoryWithItems) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {rowData.resetOnOverflow && (
              <Chip label={t('totalizerMemory.autoReset')} size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
            )}
            {rowData.scheduledResetEnabled && (
              <Chip label={t('totalizerMemory.scheduled')} size="small" color="info" sx={{ height: 16, fontSize: '0.6rem' }} />
            )}
            {rowData.manualResetEnabled && (
              <Chip label={t('totalizerMemory.manual')} size="small" color="default" sx={{ height: 16, fontSize: '0.6rem' }} />
            )}
          </Box>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: TotalizerMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="totalizer-memory-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="totalizer-memory-delete-btn"
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
        p: 3 
      }} 
      data-id-ref="totalizer-memory-page"
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardHeader
          avatar={<TotalizerIcon fontSize="large" color="primary" />}
          title={
            <Typography variant="h5" component="h1">
              {t('totalizerMemory.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              {t('totalizerMemory.description')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="totalizer-memory-add-btn"
            >
              {t('totalizerMemory.addNew')}
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
              placeholder={t('totalizerMemory.searchPlaceholder')}
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
              data-id-ref="totalizer-memory-search-input"
            />

            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={loading}
              data-id-ref="totalizer-memory-refresh-btn"
            >
              {loading ? <CircularProgress size={24} /> : t('common.refresh')}
            </Button>
          </Box>

          {/* Totalizer Memories Grid */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {loading && totalizerMemories.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <SyncfusionGridWrapper
                data={filteredTotalizerMemories}
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
              {t('totalizerMemory.totalCount', { count: totalizerMemories.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('totalizerMemory.filteredCount', { count: filteredTotalizerMemories.length })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={<CircularProgress />}>
        {addEditDialogOpen && (
          <AddEditTotalizerMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            totalizerMemory={selectedTotalizerMemory}
            editMode={editMode}
          />
        )}

        {deleteDialogOpen && selectedTotalizerMemory && (
          <DeleteTotalizerMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            totalizerMemory={selectedTotalizerMemory}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default TotalizerMemoryManagementPage;
