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
  Timeline as TimelineIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getStatisticalMemories, getGlobalVariables } from '../services/extendedApi';
import type { StatisticalMemory, StatisticalWindowType, PercentileConfig } from '../types/api';
import { StatisticalSourceType } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

// Lazy load dialog components for code splitting
const AddEditStatisticalMemoryDialog = lazy(() => import('./AddEditStatisticalMemoryDialog'));
const DeleteStatisticalMemoryDialog = lazy(() => import('./DeleteStatisticalMemoryDialog'));

interface StatisticalMemoryWithItems extends StatisticalMemory {
  inputItemName?: string;
  outputMinItemName?: string;
  outputMaxItemName?: string;
  outputAvgItemName?: string;
  outputStdDevItemName?: string;
  outputRangeItemName?: string;
  outputMedianItemName?: string;
  outputCVItemName?: string;
  percentileOutputNames?: Array<{ percentile: number; outputItemName: string }>;
}

const StatisticalMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State management
  const [memories, setMemories] = useState<StatisticalMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<StatisticalMemoryWithItems | null>(null);
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
      // Fetch both statistical memories and global variables in parallel
      const [response, gvResponse] = await Promise.all([
        getStatisticalMemories(),
        getGlobalVariables({})
      ]);

      // Enhance with item details from monitoring context
      const enhanced = (response.statisticalMemories || []).map((sm): StatisticalMemoryWithItems => {
        // Parse percentiles config
        let parsedPercentiles: PercentileConfig[] = [];
        try {
          parsedPercentiles = JSON.parse(sm.percentilesConfig || '[]') as PercentileConfig[];
        } catch {
          parsedPercentiles = [];
        }

        // Resolve percentile output names
        const percentileOutputNames = parsedPercentiles.map((pc) => ({
          percentile: pc.percentile,
          outputItemName: getItemName(pc.outputItemId),
        }));

        // Resolve input source name
        let inputItemName: string = '';
        if (sm.inputType === StatisticalSourceType.Point) {
          inputItemName = getItemName(sm.inputReference);
        } else if (sm.inputType === StatisticalSourceType.GlobalVariable) {
          const inputVariable = gvResponse?.globalVariables?.find((v) => v.name === sm.inputReference);
          inputItemName = inputVariable ? inputVariable.name : sm.inputReference;
        }

        return {
          ...sm,
          inputItemName,
          outputMinItemName: getItemName(sm.outputMinItemId),
          outputMaxItemName: getItemName(sm.outputMaxItemId),
          outputAvgItemName: getItemName(sm.outputAvgItemId),
          outputStdDevItemName: getItemName(sm.outputStdDevItemId),
          outputRangeItemName: getItemName(sm.outputRangeItemId),
          outputMedianItemName: getItemName(sm.outputMedianItemId),
          outputCVItemName: getItemName(sm.outputCVItemId),
          percentileOutputNames,
        };
      });
      setMemories(enhanced);
    } catch (err: unknown) {
      console.error('Failed to fetch statistical memories:', err);
      setError(t('statisticalMemory.errors.fetchFailed'));
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

  const handleEdit = (memory: StatisticalMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  const handleDelete = (memory: StatisticalMemoryWithItems) => {
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
      const inputMatch = memory.inputItemName?.toLowerCase().includes(term);
      const outputMatches = [
        memory.outputMinItemName,
        memory.outputMaxItemName,
        memory.outputAvgItemName,
        memory.outputStdDevItemName,
        memory.outputRangeItemName,
        memory.outputMedianItemName,
        memory.outputCVItemName,
      ].some((name) => name?.toLowerCase().includes(term));
      const percentileMatch = memory.percentileOutputNames?.some(
        (p) => p.outputItemName.toLowerCase().includes(term)
      );
      return nameMatch || inputMatch || outputMatches || percentileMatch;
    });
  }, [memories, searchTerm]);

  // Get window type label
  const getWindowTypeLabel = useCallback((windowType: StatisticalWindowType): string => {
    switch (windowType) {
      case 1: // Rolling
        return t('statisticalMemory.windowType.rolling');
      case 2: // Tumbling
        return t('statisticalMemory.windowType.tumbling');
      default:
        return String(windowType);
    }
  }, [t]);

  // Syncfusion Grid columns definition
  const columns: SyncfusionColumnDef[] = useMemo(
    () => {
      return [
        {
          field: 'name',
          headerText: t('statisticalMemory.name'),
          width: 150,
          template: (rowData: StatisticalMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="statistical-memory-name-cell">
              {rowData.name || '-'}
            </Typography>
          ),
        },
        {
          field: 'inputItemName',
          headerText: t('statisticalMemory.inputItem'),
          width: 180,
          template: (rowData: StatisticalMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="statistical-memory-input-cell">
              {rowData.inputItemName || '-'}
            </Typography>
          ),
        },
        {
          field: 'outputs',
          headerText: t('statisticalMemory.outputs'),
          width: 280,
          template: (rowData: StatisticalMemoryWithItems) => {
            const outputChips: Array<{ label: string; color: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }> = [];
            
            if (rowData.outputMinItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.min'), color: 'primary' });
            if (rowData.outputMaxItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.max'), color: 'primary' });
            if (rowData.outputAvgItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.avg'), color: 'secondary' });
            if (rowData.outputStdDevItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.stddev'), color: 'info' });
            if (rowData.outputRangeItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.range'), color: 'warning' });
            if (rowData.outputMedianItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.median'), color: 'success' });
            if (rowData.outputCVItemId) outputChips.push({ label: t('statisticalMemory.outputTypes.cv'), color: 'error' });
            
            // Add percentiles
            if (rowData.percentileOutputNames && rowData.percentileOutputNames.length > 0) {
              rowData.percentileOutputNames.forEach((p) => {
                outputChips.push({ label: `P${p.percentile}`, color: 'secondary' });
              });
            }

            if (outputChips.length === 0) {
              return <Typography variant="body2" color="text.secondary">-</Typography>;
            }

            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }} data-id-ref="statistical-memory-outputs-cell">
                {outputChips.slice(0, 4).map((chip, idx) => (
                  <Chip
                    key={idx}
                    label={chip.label}
                    size="small"
                    color={chip.color}
                    variant="outlined"
                  />
                ))}
                {outputChips.length > 4 && (
                  <Tooltip title={outputChips.slice(4).map((c) => c.label).join(', ')}>
                    <Chip
                      label={`+${outputChips.length - 4}`}
                      size="small"
                      color="default"
                    />
                  </Tooltip>
                )}
              </Box>
            );
          },
        },
        {
          field: 'windowSize',
          headerText: t('statisticalMemory.windowSize'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: StatisticalMemoryWithItems) => (
            <Tooltip title={`${t('statisticalMemory.minSamples')}: ${rowData.minSamples}`}>
              <Typography variant="body2" data-id-ref="statistical-memory-window-size-cell">
                {rowData.windowSize}
              </Typography>
            </Tooltip>
          ),
        },
        {
          field: 'windowType',
          headerText: t('statisticalMemory.windowType.label'),
          width: 130,
          textAlign: 'Center',
          template: (rowData: StatisticalMemoryWithItems) => (
            <Chip
              label={getWindowTypeLabel(rowData.windowType)}
              size="small"
              color={rowData.windowType === 1 ? 'info' : 'warning'}
              data-id-ref="statistical-memory-window-type-cell"
            />
          ),
        },
        {
          field: 'interval',
          headerText: t('statisticalMemory.interval'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: StatisticalMemoryWithItems) => (
            <Typography variant="body2" data-id-ref="statistical-memory-interval-cell">
              {rowData.interval}s
            </Typography>
          ),
        },
        {
          field: 'isDisabled',
          headerText: t('common.status'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: StatisticalMemoryWithItems) =>
            rowData.isDisabled ? (
              <Chip label={t('common.disabled')} size="small" color="default" data-id-ref="statistical-memory-status-disabled" />
            ) : (
              <Chip label={t('common.enabled')} size="small" color="success" data-id-ref="statistical-memory-status-enabled" />
            ),
        },
        {
          field: 'actions',
          headerText: t('common.actions'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: StatisticalMemoryWithItems) => (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} data-id-ref="statistical-memory-actions-cell">
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(rowData)}
                  data-id-ref="statistical-memory-edit-btn"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(rowData)}
                  data-id-ref="statistical-memory-delete-btn"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ),
        },
      ];
    },
    [t, getWindowTypeLabel]
  );

  return (
    <Container maxWidth={false} data-id-ref="statistical-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }} data-id-ref="statistical-memory-page-card">
        <CardHeader
          avatar={<TimelineIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="statistical-memory-page-title">
              {t('statisticalMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="statistical-memory-page-description">
                {t('statisticalMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="statistical-memory-overview-help-btn"
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
              data-id-ref="statistical-memory-add-btn"
            >
              {t('statisticalMemory.addNew')}
            </Button>
          }
          data-id-ref="statistical-memory-page-header"
        />
        <CardContent data-id-ref="statistical-memory-page-content" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('statisticalMemory.searchPlaceholder')}
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
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="statistical-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="statistical-memory-search-input"
            />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-id-ref="statistical-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} data-id-ref="statistical-memory-loading">
              <CircularProgress />
            </Box>
          )}

          {/* Data Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="statistical-memory-grid-container">
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
          <AddEditStatisticalMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            statisticalMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedMemory && (
          <DeleteStatisticalMemoryDialog
            open={deleteDialogOpen}
            statisticalMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="statisticalMemory.help.overview"
      />
    </Container>
  );
};

export default StatisticalMemoryManagementPage;
