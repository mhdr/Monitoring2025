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
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getTimeoutMemories } from '../services/extendedApi';
import type { TimeoutMemory, ItemType } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

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
  inputItemName?: string;
  inputItemType?: ItemType;
  outputItemName?: string;
  outputItemType?: ItemType;
}

const TimeoutMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State
  const [timeoutMemories, setTimeoutMemories] = useState<TimeoutMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTimeoutMemory, setSelectedTimeoutMemory] = useState<TimeoutMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch timeout memories
  const fetchTimeoutMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching timeout memories');
      const response = await getTimeoutMemories();

      if (response?.timeoutMemories) {
        // Enhance timeout memories with item names and types
        const enhancedMemories: TimeoutMemoryWithItems[] = response.timeoutMemories.map((tm) => {
          const inputItem = items.find((item) => item.id === tm.inputItemId);
          const outputItem = items.find((item) => item.id === tm.outputItemId);

          return {
            ...tm,
            inputItemName: inputItem ? (language === 'fa' && inputItem.nameFa ? inputItem.nameFa : inputItem.name) : undefined,
            inputItemType: inputItem?.itemType,
            outputItemName: outputItem ? (language === 'fa' && outputItem.nameFa ? outputItem.nameFa : outputItem.name) : undefined,
            outputItemType: outputItem?.itemType,
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
        tm.inputItemName?.toLowerCase().includes(lowerSearch) ||
        tm.outputItemName?.toLowerCase().includes(lowerSearch) ||
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
        field: 'inputItemName',
        headerText: t('timeoutMemory.inputItem'),
        width: 250,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {rowData.inputItemName || rowData.inputItemId}
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
        field: 'outputItemName',
        headerText: t('timeoutMemory.outputItem'),
        width: 250,
        template: (rowData: TimeoutMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {rowData.outputItemName || rowData.outputItemId}
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
      <Card data-id-ref="timeout-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          data-id-ref="timeout-memory-page-card-header"
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h4" component="h1" data-id-ref="timeout-memory-page-title">
                {t('timeoutMemory.title')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder={t('timeoutMemory.searchPlaceholder')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  data-id-ref="timeout-memory-search-input"
                  sx={{ minWidth: 250 }}
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
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTimeoutMemory}
                  data-id-ref="timeout-memory-add-btn"
                >
                  {t('timeoutMemory.addNew')}
                </Button>
              </Box>
            </Box>
          }
        />
        <CardContent data-id-ref="timeout-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {/* Info Alert explaining timeout behavior */}
          <Box sx={{ p: 2, pb: 0 }}>
            <Alert severity="info" sx={{ mb: 2 }} data-id-ref="timeout-memory-behavior-info">
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {t('timeoutMemory.description')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {t('timeoutMemory.behaviorNote')}
              </Typography>
            </Alert>
          </Box>
          
          {error && (
            <Box sx={{ p: 2 }}>
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
    </Container>
  );
};

export default TimeoutMemoryManagementPage;
