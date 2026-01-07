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
  CompareArrows as CompareArrowsIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getComparisonMemories } from '../services/extendedApi';
import type { ComparisonMemory, ComparisonGroup, GroupOperator } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

// Lazy load dialog components for code splitting
const AddEditComparisonMemoryDialog = lazy(() => import('./AddEditComparisonMemoryDialog'));
const DeleteComparisonMemoryDialog = lazy(() => import('./DeleteComparisonMemoryDialog'));

interface ComparisonMemoryWithItems extends ComparisonMemory {
  outputSourceName?: string;
  outputSourceType?: string;
  parsedGroups?: Array<ComparisonGroup & { inputItemNames?: string[] }>;
}

const ComparisonMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State management
  const [memories, setMemories] = useState<ComparisonMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<ComparisonMemoryWithItems | null>(null);
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
      const response = await getComparisonMemories();
      // Enhance with item details from monitoring context
      const enhanced = (response.comparisonMemories || []).map((cm) => {
        let parsedGroups: Array<ComparisonGroup & { inputItemNames?: string[] }> = [];
        try {
          const groups = JSON.parse(cm.comparisonGroups || '[]') as ComparisonGroup[];
          parsedGroups = groups.map((group) => {
            const inputItemNames = group.inputItemIds.map((id) => {
              const item = items.find((item) => item.id === id);
              return item ? (language === 'fa' ? item.nameFa : item.name) || '' : id;
            });
            return { ...group, inputItemNames };
          });
        } catch {
          parsedGroups = [];
        }

        const outputItem = items.find((item) => item.id === (cm.outputReference || cm.outputItemId));
        let outputSourceName = '';
        let outputSourceType = '';
        
        if (cm.outputType === 1) {
          // GlobalVariable
          outputSourceName = cm.outputReference;
          outputSourceType = t('common.globalVariable');
        } else {
          // Point
          outputSourceName = outputItem
            ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || ''
            : '';
          outputSourceType = t('common.point');
        }

        return {
          ...cm,
          outputSourceName,
          outputSourceType,
          parsedGroups,
        };
      });
      setMemories(enhanced);
    } catch (err: unknown) {
      console.error('Failed to fetch comparison memories:', err);
      setError(t('comparisonMemory.errors.fetchFailed'));
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

  const handleEdit = (memory: ComparisonMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  const handleDelete = (memory: ComparisonMemoryWithItems) => {
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
      const outputMatch = memory.outputSourceName?.toLowerCase().includes(term);
      const groupMatch = memory.parsedGroups?.some((group) =>
        group.name?.toLowerCase().includes(term) ||
        group.inputItemNames?.some((name) => name.toLowerCase().includes(term))
      );
      return nameMatch || outputMatch || groupMatch;
    });
  }, [memories, searchTerm]);

  // Get group operator label
  const getGroupOperatorLabel = useCallback((op: GroupOperator): string => {
    switch (op) {
      case 1: // And
        return t('comparisonMemory.groupOperator.and');
      case 2: // Or
        return t('comparisonMemory.groupOperator.or');
      case 3: // Xor
        return t('comparisonMemory.groupOperator.xor');
      default:
        return String(op);
    }
  }, [t]);

  // Get comparison mode label
  const getModeLabel = useCallback((mode: number): string => {
    switch (mode) {
      case 1: // Analog
        return t('comparisonMemory.mode.analog');
      case 2: // Digital
        return t('comparisonMemory.mode.digital');
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
          headerText: t('comparisonMemory.name'),
          width: 150,
          template: (rowData: ComparisonMemoryWithItems) => (
            <Typography variant="body2">{rowData.name || '-'}</Typography>
          ),
        },
        {
          field: 'parsedGroups',
          headerText: t('comparisonMemory.sections.groups'),
          width: 300,
          template: (rowData: ComparisonMemoryWithItems) => {
            const groups = rowData.parsedGroups || [];
            if (groups.length === 0) {
              return (
                <Typography variant="body2" color="text.secondary">
                  -
                </Typography>
              );
            }

            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {groups.slice(0, 2).map((group, idx) => {
                  const inputCount = group.inputItemIds?.length || 0;
                  const label = group.name
                    ? `${group.name} (${t('comparisonMemory.nOutOfM', { n: group.requiredVotes, m: inputCount })})`
                    : t('comparisonMemory.nOutOfM', { n: group.requiredVotes, m: inputCount });
                  return (
                    <Tooltip key={idx} title={`${getModeLabel(group.comparisonMode)}: ${group.inputItemNames?.join(', ') || ''}`}>
                      <Chip
                        label={label}
                        size="small"
                        color={group.comparisonMode === 1 ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </Tooltip>
                  );
                })}
                {groups.length > 2 && (
                  <Chip
                    label={`+${groups.length - 2} ${t('common.more')}`}
                    size="small"
                    color="default"
                  />
                )}
              </Box>
            );
          },
        },
        {
          field: 'groupOperator',
          headerText: t('comparisonMemory.groupOperator'),
          width: 160,
          textAlign: 'Center',
          template: (rowData: ComparisonMemoryWithItems) => (
            <Chip
              label={getGroupOperatorLabel(rowData.groupOperator)}
              size="small"
              color={
                rowData.groupOperator === 1 ? 'info' :
                rowData.groupOperator === 2 ? 'warning' :
                'secondary'
              }
            />
          ),
        },
        {
          field: 'outputSourceName',
          headerText: t('comparisonMemory.outputSource'),
          width: 200,
          template: (rowData: ComparisonMemoryWithItems) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{rowData.outputSourceName || '-'}</Typography>
              {rowData.outputSourceType && (
                <Chip
                  label={rowData.outputSourceType}
                  size="small"
                  color={rowData.outputType === 1 ? 'secondary' : 'primary'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          ),
        },
        {
          field: 'interval',
          headerText: t('comparisonMemory.interval'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: ComparisonMemoryWithItems) => (
            <Typography variant="body2">{rowData.interval}s</Typography>
          ),
        },
        {
          field: 'invertOutput',
          headerText: t('comparisonMemory.invertOutput'),
          width: 120,
          textAlign: 'Center',
          template: (rowData: ComparisonMemoryWithItems) =>
            rowData.invertOutput ? (
              <Chip label={t('common.yes')} size="small" color="warning" />
            ) : (
              <Chip label={t('common.no')} size="small" variant="outlined" />
            ),
        },
        {
          field: 'isDisabled',
          headerText: t('common.status'),
          width: 100,
          textAlign: 'Center',
          template: (rowData: ComparisonMemoryWithItems) =>
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
          template: (rowData: ComparisonMemoryWithItems) => (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Tooltip title={t('common.edit')}>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(rowData)}
                  data-id-ref="comparison-memory-edit-btn"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(rowData)}
                  data-id-ref="comparison-memory-delete-btn"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ),
        },
      ];
    },
    [t, getGroupOperatorLabel, getModeLabel]
  );

  return (
    <Container maxWidth={false} data-id-ref="comparison-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }} data-id-ref="comparison-memory-page-card">
        <CardHeader
          avatar={<CompareArrowsIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="comparison-memory-page-title">
              {t('comparisonMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="comparison-memory-page-description">
                {t('comparisonMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="comparison-memory-overview-help-btn"
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
              data-id-ref="comparison-memory-add-btn"
            >
              {t('comparisonMemory.addNew')}
            </Button>
          }
          data-id-ref="comparison-memory-page-header"
        />
        <CardContent data-id-ref="comparison-memory-page-content" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('comparisonMemory.searchPlaceholder')}
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
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" data-id-ref="comparison-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="comparison-memory-search-input"
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
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="comparison-memory-grid-container">
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
          <AddEditComparisonMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            comparisonMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedMemory && (
          <DeleteComparisonMemoryDialog
            open={deleteDialogOpen}
            comparisonMemory={selectedMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="comparisonMemory.help.comparisonGroups"
      />
    </Container>
  );
};

export default ComparisonMemoryManagementPage;
