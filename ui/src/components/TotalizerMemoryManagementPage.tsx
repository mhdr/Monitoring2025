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
  AccountBalance as TotalizerIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getTotalizerMemories } from '../services/extendedApi';
import type { TotalizerMemory, TotalizerMemoryWithItems, ItemType } from '../types/api';
import { ItemTypeEnum, AccumulationType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

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

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  /**
   * Fetch all totalizer memory configurations
   */
  const fetchTotalizerMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTotalizerMemories();

      // Enhance with item details from monitoring context
      const enhancedMemories: TotalizerMemoryWithItems[] = (response.totalizerMemories || []).map((tm: TotalizerMemory) => {
        const inputItem = items.find((item) => item.id === tm.inputItemId);
        const outputItem = items.find((item) => item.id === tm.outputItemId);

        return {
          ...tm,
          inputItemName: inputItem ? (language === 'fa' ? inputItem.nameFa : inputItem.name) || undefined : undefined,
          inputItemNameFa: inputItem?.nameFa || undefined,
          inputItemType: inputItem?.itemType,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
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
   * Handle dialog close and refresh data
   */
  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedTotalizerMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchTotalizerMemories();
    }
  }, [fetchTotalizerMemories]);

  /**
   * Filter totalizer memories based on search term
   */
  const filteredTotalizerMemories = useMemo(() => {
    if (!searchTerm) return totalizerMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return totalizerMemories.filter(
      (tm) =>
        tm.name?.toLowerCase().includes(lowerSearch) ||
        tm.inputItemName?.toLowerCase().includes(lowerSearch) ||
        tm.inputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        tm.outputItemName?.toLowerCase().includes(lowerSearch) ||
        tm.outputItemNameFa?.toLowerCase().includes(lowerSearch) ||
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
        field: 'inputItemName',
        headerText: t('totalizerMemory.inputItem'),
        width: 200,
        template: (rowData: TotalizerMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.inputItemName || t('common.notSet')}
            </Typography>
            {rowData.inputItemType && (
              <Chip
                label={getItemTypeLabel(rowData.inputItemType, t)}
                size="small"
                color={getItemTypeColor(rowData.inputItemType)}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'outputItemName',
        headerText: t('totalizerMemory.outputItem'),
        width: 200,
        template: (rowData: TotalizerMemoryWithItems) => (
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
    <Container maxWidth={false} data-id-ref="totalizer-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="totalizer-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardHeader
          avatar={<TotalizerIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="totalizer-memory-page-title">
              {t('totalizerMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="totalizer-memory-page-description">
                {t('totalizerMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="totalizer-memory-overview-help-btn"
                sx={{ ml: 0.5 }}
              >
                <HelpOutlineIcon fontSize="small" color="action" />
              </IconButton>
            </Box>
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
          data-id-ref="totalizer-memory-page-header"
        />

        <CardContent data-id-ref="totalizer-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-id-ref="totalizer-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Search Bar */}
          <Box sx={{ mb: 2 }} data-id-ref="totalizer-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('totalizerMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="totalizer-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="totalizer-memory-search-input"
            />
          </Box>

          {/* Totalizer Memories Grid */}
          {loading && totalizerMemories.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="totalizer-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredTotalizerMemories}
                columns={columns}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                pageSettings={{ pageSize: 50, pageSizes: [25, 50, 100, 200] }}
                filterSettings={{ type: 'Excel' }}
                height="100%"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={<CircularProgress />}>
        {addEditDialogOpen && (
          <AddEditTotalizerMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            totalizerMemory={selectedTotalizerMemory}
            editMode={editMode}
          />
        )}
        {deleteDialogOpen && selectedTotalizerMemory && (
          <DeleteTotalizerMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            totalizerMemory={selectedTotalizerMemory}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="totalizerMemory.help.overview"
      />
    </Container>
  );
};

export default TotalizerMemoryManagementPage;
