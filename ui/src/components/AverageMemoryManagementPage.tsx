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
  Calculate as CalculateIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getAverageMemories } from '../services/extendedApi';
import type { AverageMemory, OutlierMethod } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

// Lazy load dialog components for code splitting
const AddEditAverageMemoryDialog = lazy(() => import('./AddEditAverageMemoryDialog'));
const DeleteAverageMemoryDialog = lazy(() => import('./DeleteAverageMemoryDialog'));

interface AverageMemoryWithItems extends AverageMemory {
  inputItemNames?: string[];
  outputItemName?: string;
}

const AverageMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State management
  const [memories, setMemories] = useState<AverageMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<AverageMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  // Fetch data with item enrichment
  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAverageMemories();
      // Enhance with item details from monitoring context
      const enhanced = (response.averageMemories || []).map((am) => {
        let inputIds: string[] = [];
        try {
          inputIds = JSON.parse(am.inputItemIds);
        } catch {
          inputIds = [];
        }

        const inputItemNames = inputIds.map((id) => {
          const item = items.find((item) => item.id === id);
          return item ? (language === 'fa' ? item.nameFa : item.name) || '' : id;
        });

        const outputItem = items.find((item) => item.id === am.outputItemId);
        const outputItemName = outputItem
          ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || ''
          : '';

        return {
          ...am,
          inputItemNames,
          outputItemName,
        };
      });
      setMemories(enhanced);
    } catch (err: unknown) {
      console.error('Failed to fetch average memories:', err);
      setError(t('averageMemory.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [items, language, t]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Handlers
  const handleAdd = () => {
    setSelectedMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  };

  const handleEdit = (memory: AverageMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  const handleDelete = (memory: AverageMemoryWithItems) => {
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
      const inputMatch = memory.inputItemNames?.some((name) => name.toLowerCase().includes(term));
      const outputMatch = memory.outputItemName?.toLowerCase().includes(term);
      return nameMatch || inputMatch || outputMatch;
    });
  }, [memories, searchTerm]);

  // Syncfusion Grid columns definition
  const columns: SyncfusionColumnDef[] = useMemo(
    () => {
      // Get outlier method label
      const getOutlierMethodLabel = (method: OutlierMethod): string => {
        switch (method) {
          case 0: // None
            return t('averageMemory.outlierMethod.none');
          case 1: // IQR
            return t('averageMemory.outlierMethod.iqr');
          case 2: // ZScore
            return t('averageMemory.outlierMethod.zScore');
          default:
            return t('averageMemory.outlierMethod.none');
        }
      };

      return [
        {
          field: 'name',
          headerText: t('averageMemory.name'),
          width: 150,
          template: (rowData: AverageMemoryWithItems) => (
            <Typography variant="body2">{rowData.name || '-'}</Typography>
          ),
        },
        {
          field: 'inputItemNames',
          headerText: t('averageMemory.inputItems'),
          width: 300,
          template: (rowData: AverageMemoryWithItems) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {rowData.inputItemNames && rowData.inputItemNames.length > 0 ? (
                <>
                  {rowData.inputItemNames.slice(0, 3).map((name, idx) => (
                    <Chip key={idx} label={name} size="small" />
                  ))}
                  {rowData.inputItemNames.length > 3 && (
                    <Chip
                      label={`+${rowData.inputItemNames.length - 3} ${t('common.more')}`}
                      size="small"
                      color="primary"
                    />
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  -
                </Typography>
              )}
            </Box>
          ),
        },
        {
          field: 'outputItemName',
          headerText: t('averageMemory.outputItem'),
          width: 200,
          template: (rowData: AverageMemoryWithItems) => (
            <Typography variant="body2">{rowData.outputItemName || '-'}</Typography>
          ),
        },
        {
          field: 'interval',
          headerText: t('averageMemory.interval'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: AverageMemoryWithItems) => (
            <Typography variant="body2">{rowData.interval}s</Typography>
          ),
        },
        {
          field: 'enableOutlierDetection',
          headerText: t('averageMemory.outlierDetection'),
          width: 180,
          textAlign: 'Center',
          template: (rowData: AverageMemoryWithItems) =>
            rowData.enableOutlierDetection ? (
              <Chip
                label={`${getOutlierMethodLabel(rowData.outlierMethod)} (${rowData.outlierThreshold})`}
                size="small"
                color="success"
              />
            ) : (
              <Chip label={t('common.disabled')} size="small" />
            ),
        },
        {
          field: 'isDisabled',
          headerText: t('common.status'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: AverageMemoryWithItems) =>
            rowData.isDisabled ? (
              <Chip label={t('common.disabled')} size="small" color="default" />
            ) : (
              <Chip label={t('common.enabled')} size="small" color="success" />
            ),
        },
        {
          field: 'actions',
          headerText: t('common.actions'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: AverageMemoryWithItems) => (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(rowData)}
                  data-id-ref="average-memory-edit-btn"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(rowData)}
                  data-id-ref="average-memory-delete-btn"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ),
        },
      ];
    },
    [t]
  );

  return (
    <Container maxWidth={false} data-id-ref="average-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }} data-id-ref="average-memory-page-card">
        <CardHeader
          avatar={<CalculateIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="average-memory-page-title">
              {t('averageMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="average-memory-page-description">
                {t('averageMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="average-memory-overview-help-btn"
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
              data-id-ref="average-memory-add-btn"
            >
              {t('averageMemory.addNew')}
            </Button>
          }
          data-id-ref="average-memory-page-header"
        />
        <CardContent data-id-ref="average-memory-page-content" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('averageMemory.searchPlaceholder')}
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
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="average-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="average-memory-search-input"
            />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Data Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="average-memory-grid-container">
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
          <AddEditAverageMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            averageMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedMemory && (
          <DeleteAverageMemoryDialog
            open={deleteDialogOpen}
            averageMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="averageMemory.help.overview"
      />
    </Container>
  );
};

export default AverageMemoryManagementPage;
