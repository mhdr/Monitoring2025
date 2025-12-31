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
  Tune as TuneIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getDeadbandMemories } from '../services/extendedApi';
import type { DeadbandMemory, DeadbandMemoryWithItems, ItemType } from '../types/api';
import { ItemTypeEnum, DeadbandType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('DeadbandMemoryManagementPage');

// Lazy load dialog components
const AddEditDeadbandMemoryDialog = lazy(() => import('./AddEditDeadbandMemoryDialog'));
const DeleteDeadbandMemoryDialog = lazy(() => import('./DeleteDeadbandMemoryDialog'));

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
 * Check if item type is analog
 */
const isAnalogType = (itemType?: ItemType): boolean => {
  return itemType === ItemTypeEnum.AnalogInput || itemType === ItemTypeEnum.AnalogOutput;
};

/**
 * Get deadband type label
 */
const getDeadbandTypeLabel = (deadbandType: number, t: (key: string) => string): string => {
  switch (deadbandType) {
    case DeadbandType.Absolute:
      return t('deadbandMemory.deadbandType.absolute');
    case DeadbandType.Percentage:
      return t('deadbandMemory.deadbandType.percentage');
    case DeadbandType.RateOfChange:
      return t('deadbandMemory.deadbandType.rateOfChange');
    default:
      return String(deadbandType);
  }
};

/**
 * Deadband Memory Management Page Component
 * Manages deadband/hysteresis filtering for noisy inputs
 */
const DeadbandMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [deadbandMemories, setDeadbandMemories] = useState<DeadbandMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<DeadbandMemoryWithItems | null>(null);
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
   * Fetch all deadband memory configurations
   */
  const fetchDeadbandMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getDeadbandMemories();

      if (!response.isSuccessful) {
        setError(response.errorMessage || 'Failed to fetch deadband memories');
        return;
      }

      // Enhance with item details from monitoring context
      const enhancedMemories: DeadbandMemoryWithItems[] = (response.deadbandMemories || []).map((m: DeadbandMemory) => {
        const inputItem = items.find((item) => item.id === m.inputItemId);
        const outputItem = items.find((item) => item.id === m.outputItemId);

        return {
          ...m,
          inputItemName: inputItem ? (language === 'fa' ? inputItem.nameFa : inputItem.name) || undefined : undefined,
          inputItemNameFa: inputItem?.nameFa || undefined,
          inputItemType: inputItem?.itemType,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
        };
      });

      setDeadbandMemories(enhancedMemories);
      logger.info('Deadband memories fetched successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch deadband memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch deadband memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchDeadbandMemories();
    }
  }, [fetchDeadbandMemories, items.length]);

  /**
   * Handle add button click
   */
  const handleAdd = useCallback(() => {
    setSelectedMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback((memory: DeadbandMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((memory: DeadbandMemoryWithItems) => {
    setSelectedMemory(memory);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle dialog close and refresh data
   */
  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchDeadbandMemories();
    }
  }, [fetchDeadbandMemories]);

  /**
   * Filter deadband memories based on search term
   */
  const filteredMemories = useMemo(() => {
    if (!searchTerm) return deadbandMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return deadbandMemories.filter(
      (m) =>
        m.name?.toLowerCase().includes(lowerSearch) ||
        m.inputItemName?.toLowerCase().includes(lowerSearch) ||
        m.inputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        m.outputItemName?.toLowerCase().includes(lowerSearch) ||
        m.outputItemNameFa?.toLowerCase().includes(lowerSearch)
    );
  }, [deadbandMemories, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'name',
        headerText: t('deadbandMemory.name'),
        width: 180,
        template: (rowData: DeadbandMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="deadband-memory-name-cell">
            <TuneIcon fontSize="small" color="primary" />
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
        headerText: t('deadbandMemory.inputItem'),
        width: 200,
        template: (rowData: DeadbandMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="deadband-memory-input-cell">
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
        headerText: t('deadbandMemory.outputItem'),
        width: 200,
        template: (rowData: DeadbandMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="deadband-memory-output-cell">
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
        field: 'mode',
        headerText: t('deadbandMemory.mode'),
        width: 150,
        template: (rowData: DeadbandMemoryWithItems) => {
          const isAnalog = isAnalogType(rowData.inputItemType);
          return (
            <Box data-id-ref="deadband-memory-mode-cell">
              {isAnalog ? (
                <Tooltip title={`${t('deadbandMemory.deadband')}: ${rowData.deadband}`}>
                  <Chip
                    label={getDeadbandTypeLabel(rowData.deadbandType, t)}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title={`${t('deadbandMemory.stabilityTime')}: ${rowData.stabilityTime}s`}>
                  <Chip
                    label={t('deadbandMemory.digitalStability')}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Tooltip>
              )}
            </Box>
          );
        },
      },
      {
        field: 'threshold',
        headerText: t('deadbandMemory.threshold'),
        width: 120,
        textAlign: 'Right',
        template: (rowData: DeadbandMemoryWithItems) => {
          const isAnalog = isAnalogType(rowData.inputItemType);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }} data-id-ref="deadband-memory-threshold-cell">
              {isAnalog ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {rowData.deadband}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rowData.deadbandType === DeadbandType.Percentage ? '%' : 
                     rowData.deadbandType === DeadbandType.RateOfChange ? '/s' : ''}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                    {rowData.stabilityTime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">s</Typography>
                </>
              )}
            </Box>
          );
        },
      },
      {
        field: 'lastOutputValue',
        headerText: t('deadbandMemory.lastOutput'),
        width: 100,
        textAlign: 'Right',
        template: (rowData: DeadbandMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="deadband-memory-lastoutput-cell">
            {rowData.lastOutputValue !== null && rowData.lastOutputValue !== undefined
              ? isAnalogType(rowData.inputItemType)
                ? rowData.lastOutputValue.toFixed(2)
                : rowData.lastOutputValue === 1 ? t('common.on') : t('common.off')
              : '—'}
          </Typography>
        ),
      },
      {
        field: 'interval',
        headerText: t('deadbandMemory.interval'),
        width: 80,
        textAlign: 'Center',
        template: (rowData: DeadbandMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="deadband-memory-interval-cell">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: DeadbandMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} data-id-ref="deadband-memory-actions-cell">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="deadband-memory-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="deadband-memory-delete-btn"
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
    <Container maxWidth={false} data-id-ref="deadband-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="deadband-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardHeader
          avatar={<TuneIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="deadband-memory-page-title">
              {t('deadbandMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="deadband-memory-page-description">
                {t('deadbandMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="deadband-memory-overview-help-btn"
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
              data-id-ref="deadband-memory-add-btn"
            >
              {t('deadbandMemory.addNew')}
            </Button>
          }
          data-id-ref="deadband-memory-page-header"
        />

        <CardContent data-id-ref="deadband-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-id-ref="deadband-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Search Bar */}
          <Box sx={{ mb: 2 }} data-id-ref="deadband-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('deadbandMemory.searchPlaceholder')}
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
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="deadband-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="deadband-memory-search-input"
            />
          </Box>

          {/* Deadband Memories Grid */}
          {loading && deadbandMemories.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="deadband-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredMemories}
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
          <AddEditDeadbandMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            deadbandMemory={selectedMemory}
            editMode={editMode}
          />
        )}
        {deleteDialogOpen && selectedMemory && (
          <DeleteDeadbandMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            deadbandMemory={selectedMemory}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="deadbandMemory.help.overview"
      />
    </Container>
  );
};

export default DeadbandMemoryManagementPage;
