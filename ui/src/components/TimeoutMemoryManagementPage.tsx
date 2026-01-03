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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Timer as TimerIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getTimeoutMemories, getGlobalVariables } from '../services/extendedApi';
import type { TimeoutMemory, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, TimeoutSourceType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('TimeoutMemoryManagementPage');

// Lazy load dialog components
const AddEditTimeoutMemoryDialog = lazy(() => import('./AddEditTimeoutMemoryDialog'));
const DeleteTimeoutMemoryDialog = lazy(() => import('./DeleteTimeoutMemoryDialog'));

/**
 * Format timeout duration into human-readable format
 * @param seconds - Timeout in seconds
 * @returns Formatted string like "120s (2 minutes)"
 */
const formatTimeout = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${seconds}s (${minutes} ${minutes === 1 ? 'minute' : 'minutes'})`;
    }
    return `${seconds}s (${minutes}m ${remainingSeconds}s)`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    if (remainingMinutes === 0) {
      return `${seconds}s (${hours} ${hours === 1 ? 'hour' : 'hours'})`;
    }
    return `${seconds}s (${hours}h ${remainingMinutes}m)`;
  } else {
    const days = Math.floor(seconds / 86400);
    const remainingHours = Math.floor((seconds % 86400) / 3600);
    if (remainingHours === 0) {
      return `${seconds}s (${days} ${days === 1 ? 'day' : 'days'})`;
    }
    return `${seconds}s (${days}d ${remainingHours}h)`;
  }
};

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

interface TimeoutMemoryWithItems extends TimeoutMemory {
  inputSourceName?: string;
  inputItemType?: ItemType;
  outputSourceName?: string;
  outputItemType?: ItemType;
}

const TimeoutMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State
  const [timeoutMemories, setTimeoutMemories] = useState<TimeoutMemoryWithItems[]>([]);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTimeoutMemory, setSelectedTimeoutMemory] = useState<TimeoutMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  // Fetch timeout memories
  const fetchTimeoutMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching timeout memories and global variables');
      
      // Fetch both timeout memories and global variables in parallel
      const [tmResponse, gvResponse] = await Promise.all([
        getTimeoutMemories(),
        getGlobalVariables({})
      ]);

      if (gvResponse?.variables) {
        setGlobalVariables(gvResponse.variables);
        logger.log('Global variables fetched successfully', { count: gvResponse.variables.length });
      }

      if (tmResponse?.timeoutMemories) {
        // Enhance timeout memories with source names and types
        const enhancedMemories: TimeoutMemoryWithItems[] = tmResponse.timeoutMemories.map((tm) => {
          let inputSourceName: string | undefined;
          let inputItemType: ItemType | undefined;
          let outputSourceName: string | undefined;
          let outputItemType: ItemType | undefined;

          // Resolve input source
          if (tm.inputType === TimeoutSourceType.Point) {
            const inputItem = items.find((item) => item.id === tm.inputReference);
            if (inputItem) {
              inputSourceName = language === 'fa' && inputItem.nameFa ? inputItem.nameFa : inputItem.name;
              inputItemType = inputItem.itemType;
            }
          } else if (tm.inputType === TimeoutSourceType.GlobalVariable) {
            const inputVariable = gvResponse?.variables?.find((v) => v.name === tm.inputReference);
            if (inputVariable) {
              inputSourceName = inputVariable.name;
            }
          }

          // Resolve output source
          if (tm.outputType === TimeoutSourceType.Point) {
            const outputItem = items.find((item) => item.id === tm.outputReference);
            if (outputItem) {
              outputSourceName = language === 'fa' && outputItem.nameFa ? outputItem.nameFa : outputItem.name;
              outputItemType = outputItem.itemType;
            }
          } else if (tm.outputType === TimeoutSourceType.GlobalVariable) {
            const outputVariable = gvResponse?.variables?.find((v) => v.name === tm.outputReference);
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

        setTimeoutMemories(enhancedMemories);
        logger.log('Timeout memories fetched successfully', { count: enhancedMemories.length });
      } else {
        setError(t('timeoutMemory.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch timeout memories', { error: err });
      setError(t('timeoutMemory.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [items, language, t]);

  useEffect(() => {
    if (items.length > 0) {
      fetchTimeoutMemories();
    }
  }, [fetchTimeoutMemories, items.length]);

  // Filter timeout memories based on search term
  const filteredTimeoutMemories = useMemo(() => {
    if (!searchTerm) return timeoutMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return timeoutMemories.filter(
      (tm) =>
        tm.inputSourceName?.toLowerCase().includes(lowerSearch) ||
        tm.outputSourceName?.toLowerCase().includes(lowerSearch) ||
        formatTimeout(tm.timeout).toLowerCase().includes(lowerSearch)
    );
  }, [timeoutMemories, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCreateTimeoutMemory = useCallback(() => {
    setSelectedTimeoutMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditTimeoutMemory = useCallback((tm: TimeoutMemoryWithItems) => {
    setSelectedTimeoutMemory(tm);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteTimeoutMemory = useCallback((tm: TimeoutMemoryWithItems) => {
    setSelectedTimeoutMemory(tm);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedTimeoutMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchTimeoutMemories();
    }
  }, [fetchTimeoutMemories]);

  // Define columns for Syncfusion Grid
  const columns: SyncfusionColumnDef[] = useMemo(
    () => [
      {
        field: 'inputSourceName',
        headerText: t('timeoutMemory.inputSource'),
        width: 250,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={rowData.inputType === TimeoutSourceType.Point ? t('timeoutMemory.sourceTypePoint') : t('timeoutMemory.sourceTypeGlobalVariable')}
              size="small"
              color={rowData.inputType === TimeoutSourceType.Point ? 'primary' : 'secondary'}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
            <Typography variant="body2" noWrap>
              {rowData.inputSourceName || rowData.inputReference}
            </Typography>
            {rowData.inputItemType !== undefined && (
              <Chip
                label={getItemTypeLabel(rowData.inputItemType, t)}
                size="small"
                color={getItemTypeColor(rowData.inputItemType)}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'outputSourceName',
        headerText: t('timeoutMemory.outputSource'),
        width: 250,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={rowData.outputType === TimeoutSourceType.Point ? t('timeoutMemory.sourceTypePoint') : t('timeoutMemory.sourceTypeGlobalVariable')}
              size="small"
              color={rowData.outputType === TimeoutSourceType.Point ? 'primary' : 'secondary'}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
            <Typography variant="body2" noWrap>
              {rowData.outputSourceName || rowData.outputReference}
            </Typography>
            {rowData.outputItemType !== undefined && (
              <Chip
                label={getItemTypeLabel(rowData.outputItemType, t)}
                size="small"
                color={getItemTypeColor(rowData.outputItemType)}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'timeout',
        headerText: t('timeoutMemory.timeout'),
        width: 200,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon fontSize="small" color="action" />
            <Typography variant="body2">{formatTimeout(rowData.timeout)}</Typography>
          </Box>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        allowSorting: false,
        allowFiltering: false,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEditTimeoutMemory(rowData)}
              data-id-ref="timeout-memory-edit-btn"
              title={t('common.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteTimeoutMemory(rowData)}
              data-id-ref="timeout-memory-delete-btn"
              title={t('common.delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, handleEditTimeoutMemory, handleDeleteTimeoutMemory]
  );

  return (
    <Container maxWidth={false} data-id-ref="timeout-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="timeout-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardHeader
          avatar={<TimerIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          data-id-ref="timeout-memory-page-card-header"
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="timeout-memory-page-title">
              {t('timeoutMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="timeout-memory-page-description">
                {t('timeoutMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="timeout-memory-overview-help-btn"
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
              onClick={handleCreateTimeoutMemory}
              data-id-ref="timeout-memory-add-btn"
            >
              {t('timeoutMemory.addNew')}
            </Button>
          }
        />
        <CardContent data-id-ref="timeout-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }} data-id-ref="timeout-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('timeoutMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              data-id-ref="timeout-memory-search-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end" data-id-ref="timeout-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error" data-id-ref="timeout-memory-error-alert">
                {error}
              </Alert>
            </Box>
          )}

          {loading && items.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="timeout-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredTimeoutMemories}
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
          <AddEditTimeoutMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            timeoutMemory={selectedTimeoutMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedTimeoutMemory && (
          <DeleteTimeoutMemoryDialog
            open={deleteDialogOpen}
            timeoutMemory={selectedTimeoutMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="timeoutMemory.help.overview"
      />
    </Container>
  );
};

export default TimeoutMemoryManagementPage;
