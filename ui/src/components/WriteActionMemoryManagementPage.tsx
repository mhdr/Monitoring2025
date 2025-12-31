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
  PlayArrow as PlayArrowIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getWriteActionMemories } from '../services/extendedApi';
import type { WriteActionMemory, ItemType } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('WriteActionMemoryManagementPage');

// Lazy load dialog components
const AddEditWriteActionMemoryDialog = lazy(() => import('./AddEditWriteActionMemoryDialog'));
const DeleteWriteActionMemoryDialog = lazy(() => import('./DeleteWriteActionMemoryDialog'));

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

interface WriteActionMemoryWithItems extends WriteActionMemory {
  outputItemName?: string;
  outputItemType?: ItemType;
  sourceItemName?: string;
  sourceItemType?: ItemType;
}

const WriteActionMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State
  const [writeActionMemories, setWriteActionMemories] = useState<WriteActionMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWriteActionMemory, setSelectedWriteActionMemory] = useState<WriteActionMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  // Fetch write action memories
  const fetchWriteActionMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching write action memories');
      const response = await getWriteActionMemories();

      if (response?.writeActionMemories) {
        // Enhance write action memories with item names and types
        const enhancedMemories: WriteActionMemoryWithItems[] = response.writeActionMemories.map((wam) => {
          const outputItem = items.find((item) => item.id === wam.outputItemId);
          const sourceItem = wam.outputValueSourceItemId 
            ? items.find((item) => item.id === wam.outputValueSourceItemId)
            : undefined;

          return {
            ...wam,
            outputItemName: outputItem ? (language === 'fa' && outputItem.nameFa ? outputItem.nameFa : outputItem.name) : undefined,
            outputItemType: outputItem?.itemType,
            sourceItemName: sourceItem ? (language === 'fa' && sourceItem.nameFa ? sourceItem.nameFa : sourceItem.name) : undefined,
            sourceItemType: sourceItem?.itemType,
          };
        });

        setWriteActionMemories(enhancedMemories);
        logger.log('Write action memories fetched successfully', { count: enhancedMemories.length });
      } else {
        setError(t('writeActionMemory.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch write action memories', { error: err });
      setError(t('writeActionMemory.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [items, language, t]);

  useEffect(() => {
    if (items.length > 0) {
      fetchWriteActionMemories();
    }
  }, [fetchWriteActionMemories, items.length]);

  // Filter write action memories based on search term
  const filteredWriteActionMemories = useMemo(() => {
    if (!searchTerm) return writeActionMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return writeActionMemories.filter(
      (wam) =>
        wam.name?.toLowerCase().includes(lowerSearch) ||
        wam.outputItemName?.toLowerCase().includes(lowerSearch) ||
        wam.sourceItemName?.toLowerCase().includes(lowerSearch) ||
        wam.outputValue?.toLowerCase().includes(lowerSearch)
    );
  }, [writeActionMemories, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCreateWriteActionMemory = useCallback(() => {
    setSelectedWriteActionMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditWriteActionMemory = useCallback((wam: WriteActionMemoryWithItems) => {
    setSelectedWriteActionMemory(wam);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteWriteActionMemory = useCallback((wam: WriteActionMemoryWithItems) => {
    setSelectedWriteActionMemory(wam);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedWriteActionMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchWriteActionMemories();
    }
  }, [fetchWriteActionMemories]);

  // Define columns for Syncfusion Grid
  const columns: SyncfusionColumnDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerText: t('writeActionMemory.name'),
        width: 180,
        template: (rowData: WriteActionMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {rowData.name || `WAM-${rowData.id.substring(0, 8)}`}
            </Typography>
            {rowData.isDisabled && (
              <Chip
                label={t('common.disabled')}
                size="small"
                color="default"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'outputItemName',
        headerText: t('writeActionMemory.outputItem'),
        width: 200,
        template: (rowData: WriteActionMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {rowData.outputItemName || rowData.outputItemId}
            </Typography>
            {rowData.outputItemType !== undefined && (
              <Chip
                label={getItemTypeLabel(rowData.outputItemType, t)}
                size="small"
                color={getItemTypeColor(rowData.outputItemType)}
                sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'outputValueMode',
        headerText: t('writeActionMemory.valueSource'),
        width: 180,
        template: (rowData: WriteActionMemoryWithItems) => {
          const isStatic = rowData.outputValue !== null && rowData.outputValue !== undefined;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isStatic ? (
                <>
                  <Chip
                    label={t('writeActionMemory.static')}
                    size="small"
                    color="info"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  <Tooltip title={rowData.outputValue || ''}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 80 }}>
                      {rowData.outputValue}
                    </Typography>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Chip
                    label={t('writeActionMemory.dynamic')}
                    size="small"
                    color="secondary"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {rowData.sourceItemName || rowData.outputValueSourceItemId}
                  </Typography>
                </>
              )}
            </Box>
          );
        },
      },
      {
        field: 'duration',
        headerText: t('writeActionMemory.duration'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: WriteActionMemoryWithItems) => (
          <Typography variant="body2">{rowData.duration}s</Typography>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        allowSorting: false,
        allowFiltering: false,
        template: (rowData: WriteActionMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEditWriteActionMemory(rowData)}
              data-id-ref="write-action-memory-edit-btn"
              title={t('common.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteWriteActionMemory(rowData)}
              data-id-ref="write-action-memory-delete-btn"
              title={t('common.delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, handleEditWriteActionMemory, handleDeleteWriteActionMemory]
  );

  return (
    <Container maxWidth={false} data-id-ref="write-action-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="write-action-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardHeader
          avatar={<PlayArrowIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          data-id-ref="write-action-memory-page-card-header"
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="write-action-memory-page-title">
              {t('writeActionMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="write-action-memory-page-description">
                {t('writeActionMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="write-action-memory-overview-help-btn"
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
              onClick={handleCreateWriteActionMemory}
              data-id-ref="write-action-memory-add-btn"
            >
              {t('writeActionMemory.addNew')}
            </Button>
          }
        />
        <CardContent data-id-ref="write-action-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }} data-id-ref="write-action-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('writeActionMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              data-id-ref="write-action-memory-search-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end" data-id-ref="write-action-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error" data-id-ref="write-action-memory-error-alert">
                {error}
              </Alert>
            </Box>
          )}

          {loading && items.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="write-action-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredWriteActionMemories}
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
          <AddEditWriteActionMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            writeActionMemory={selectedWriteActionMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedWriteActionMemory && (
          <DeleteWriteActionMemoryDialog
            open={deleteDialogOpen}
            writeActionMemory={selectedWriteActionMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="writeActionMemory.help.overview"
      />
    </Container>
  );
};

export default WriteActionMemoryManagementPage;
