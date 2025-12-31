import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapVert as SwapVertIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getMinMaxSelectorMemories } from '../services/extendedApi';
import type { MinMaxSelectorMemory, MinMaxSelectionMode, MinMaxFailoverMode } from '../types/api';
import { MinMaxSelectionModeEnum, MinMaxFailoverModeEnum } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

// Lazy load dialog components for code splitting
const AddEditMinMaxSelectorMemoryDialog = lazy(() => import('./AddEditMinMaxSelectorMemoryDialog'));
const DeleteMinMaxSelectorMemoryDialog = lazy(() => import('./DeleteMinMaxSelectorMemoryDialog'));

interface MinMaxSelectorMemoryWithItems extends MinMaxSelectorMemory {
  inputItemNames?: string[];
  outputItemName?: string;
  selectedIndexOutputItemName?: string;
}

const MinMaxSelectorMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State management
  const [memories, setMemories] = useState<MinMaxSelectorMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MinMaxSelectorMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  // Helper to get item name by ID
  const getItemName = useCallback((itemId: string | null | undefined): string => {
    if (!itemId) return '';
    const item = items.find((i) => i.id === itemId);
    if (!item) return '';
    return (language === 'fa' ? item.nameFa : item.name) || '';
  }, [items, language]);

  // Fetch data with item enrichment
  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMinMaxSelectorMemories();
      // Enhance with item details from monitoring context
      const enhanced = (response.minMaxSelectorMemories || []).map((sm): MinMaxSelectorMemoryWithItems => {
        // Parse input item IDs
        let inputIds: string[] = [];
        try {
          inputIds = JSON.parse(sm.inputItemIds || '[]') as string[];
        } catch {
          inputIds = [];
        }

        // Resolve input item names
        const inputItemNames = inputIds.map((id) => getItemName(id)).filter((n) => n);

        return {
          ...sm,
          inputItemNames,
          outputItemName: getItemName(sm.outputItemId),
          selectedIndexOutputItemName: getItemName(sm.selectedIndexOutputItemId),
        };
      });
      setMemories(enhanced);
    } catch (err: unknown) {
      console.error('Failed to fetch min/max selector memories:', err);
      setError(t('minMaxSelectorMemory.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [getItemName, t]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Handlers
  const handleAdd = () => {
    setSelectedMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  };

  const handleEdit = (memory: MinMaxSelectorMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  const handleDelete = (memory: MinMaxSelectorMemoryWithItems) => {
    setSelectedMemory(memory);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedMemory(null);
    setEditMode(false);
    if (shouldRefresh) {
      fetchMemories();
    }
  }, [fetchMemories]);

  // Filter memories based on search term
  const filteredMemories = useMemo(() => {
    if (!searchTerm) return memories;

    const term = searchTerm.toLowerCase();
    return memories.filter((memory) => {
      const nameMatch = memory.name?.toLowerCase().includes(term);
      const inputMatch = memory.inputItemNames?.some((n) => n.toLowerCase().includes(term));
      const outputMatch = memory.outputItemName?.toLowerCase().includes(term);
      const indexOutputMatch = memory.selectedIndexOutputItemName?.toLowerCase().includes(term);
      return nameMatch || inputMatch || outputMatch || indexOutputMatch;
    });
  }, [memories, searchTerm]);

  // Get selection mode label
  const getSelectionModeLabel = useCallback((mode: MinMaxSelectionMode): string => {
    switch (mode) {
      case MinMaxSelectionModeEnum.Minimum:
        return t('minMaxSelectorMemory.selectionMode.min');
      case MinMaxSelectionModeEnum.Maximum:
        return t('minMaxSelectorMemory.selectionMode.max');
      default:
        return String(mode);
    }
  }, [t]);

  // Get failover mode label
  const getFailoverModeLabel = useCallback((mode: MinMaxFailoverMode): string => {
    switch (mode) {
      case MinMaxFailoverModeEnum.IgnoreBad:
        return t('minMaxSelectorMemory.failoverMode.ignoreBad');
      case MinMaxFailoverModeEnum.FallbackToOpposite:
        return t('minMaxSelectorMemory.failoverMode.fallbackToOpposite');
      case MinMaxFailoverModeEnum.HoldLastGood:
        return t('minMaxSelectorMemory.failoverMode.holdLastGood');
      default:
        return String(mode);
    }
  }, [t]);

  // Syncfusion Grid columns definition
  const columns: SyncfusionColumnDef[] = useMemo(
    () => {
      return [
        {
          field: 'name',
          headerText: t('minMaxSelectorMemory.name'),
          width: 150,
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="minmax-selector-memory-name-cell">
              {rowData.name || '-'}
            </Typography>
          ),
        },
        {
          field: 'inputItemNames',
          headerText: t('minMaxSelectorMemory.inputItems'),
          width: 220,
          template: (rowData: MinMaxSelectorMemoryWithItems) => {
            const names = rowData.inputItemNames || [];
            if (names.length === 0) {
              return <Typography variant="body2" color="text.secondary">-</Typography>;
            }
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }} data-id-ref="minmax-selector-memory-inputs-cell">
                {names.slice(0, 3).map((name, idx) => (
                  <Chip key={idx} label={name} size="small" variant="outlined" />
                ))}
                {names.length > 3 && (
                  <Tooltip title={names.slice(3).join(', ')}>
                    <Chip label={`+${names.length - 3}`} size="small" color="default" />
                  </Tooltip>
                )}
              </Box>
            );
          },
        },
        {
          field: 'outputItemName',
          headerText: t('minMaxSelectorMemory.outputItem'),
          width: 160,
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="minmax-selector-memory-output-cell">
              {rowData.outputItemName || '-'}
            </Typography>
          ),
        },
        {
          field: 'selectionMode',
          headerText: t('minMaxSelectorMemory.selectionMode.label'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Chip
              label={getSelectionModeLabel(rowData.selectionMode)}
              size="small"
              color={rowData.selectionMode === MinMaxSelectionModeEnum.Minimum ? 'info' : 'warning'}
              data-id-ref="minmax-selector-memory-mode-cell"
            />
          ),
        },
        {
          field: 'failoverMode',
          headerText: t('minMaxSelectorMemory.failoverMode.label'),
          width: 140,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Chip
              label={getFailoverModeLabel(rowData.failoverMode)}
              size="small"
              color="secondary"
              variant="outlined"
              data-id-ref="minmax-selector-memory-failover-cell"
            />
          ),
        },
        {
          field: 'interval',
          headerText: t('minMaxSelectorMemory.interval'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="minmax-selector-memory-interval-cell">
              {rowData.interval}s
            </Typography>
          ),
        },
        {
          field: 'lastSelectedIndex',
          headerText: t('minMaxSelectorMemory.lastSelected'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) => {
            if (rowData.lastSelectedIndex == null) {
              return <Typography variant="body2" color="text.secondary">-</Typography>;
            }
            return (
              <Tooltip title={`${t('minMaxSelectorMemory.value')}: ${rowData.lastSelectedValue?.toFixed(2) || '-'}`}>
                <Chip
                  label={`#${rowData.lastSelectedIndex}`}
                  size="small"
                  color="success"
                  data-id-ref="minmax-selector-memory-selected-cell"
                />
              </Tooltip>
            );
          },
        },
        {
          field: 'isDisabled',
          headerText: t('common.status'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) =>
            rowData.isDisabled ? (
              <Chip label={t('common.disabled')} size="small" color="default" data-id-ref="minmax-selector-memory-status-disabled" />
            ) : (
              <Chip label={t('common.enabled')} size="small" color="success" data-id-ref="minmax-selector-memory-status-enabled" />
            ),
        },
        {
          field: 'actions',
          headerText: t('common.actions'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: MinMaxSelectorMemoryWithItems) => (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} data-id-ref="minmax-selector-memory-actions-cell">
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(rowData)}
                  data-id-ref="minmax-selector-memory-edit-btn"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(rowData)}
                  data-id-ref="minmax-selector-memory-delete-btn"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ),
        },
      ];
    },
    [t, getSelectionModeLabel, getFailoverModeLabel]
  );

  return (
    <Container maxWidth={false} data-id-ref="minmax-selector-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }} data-id-ref="minmax-selector-memory-page-card">
        <CardHeader
          avatar={<SwapVertIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="minmax-selector-memory-page-title">
              {t('minMaxSelectorMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="minmax-selector-memory-page-description">
                {t('minMaxSelectorMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="minmax-selector-memory-overview-help-btn"
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
              data-id-ref="minmax-selector-memory-add-btn"
            >
              {t('minMaxSelectorMemory.addNew')}
            </Button>
          }
          data-id-ref="minmax-selector-memory-page-header"
        />
        <CardContent data-id-ref="minmax-selector-memory-page-content" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('minMaxSelectorMemory.searchPlaceholder')}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="minmax-selector-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="minmax-selector-memory-search-input"
            />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-id-ref="minmax-selector-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} data-id-ref="minmax-selector-memory-loading">
              <CircularProgress />
            </Box>
          )}

          {/* Data Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="minmax-selector-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredMemories}
                columns={columns}
                allowPaging={true}
                pageSettings={{ pageSize: 50, pageSizes: [25, 50, 100, 200] }}
                allowSorting={true}
                allowFiltering={true}
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
          <AddEditMinMaxSelectorMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            minMaxSelectorMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedMemory && (
          <DeleteMinMaxSelectorMemoryDialog
            open={deleteDialogOpen}
            minMaxSelectorMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="minMaxSelectorMemory.help.overview"
      />
    </Container>
  );
};

export default MinMaxSelectorMemoryManagementPage;
