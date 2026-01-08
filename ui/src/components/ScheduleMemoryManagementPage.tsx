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
  Schedule as ScheduleIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getScheduleMemories, getGlobalVariables } from '../services/extendedApi';
import type { ScheduleMemory, ItemType, GlobalVariable } from '../types/api';
import { ItemTypeEnum, ScheduleSourceType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('ScheduleMemoryManagementPage');

// Lazy load dialog components
const AddEditScheduleMemoryDialog = lazy(() => import('./AddEditScheduleMemoryDialog'));
const DeleteScheduleMemoryDialog = lazy(() => import('./DeleteScheduleMemoryDialog'));

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

interface EnhancedScheduleMemory extends ScheduleMemory {
  outputItemName?: string;
  outputItemType?: ItemType;
}

const ScheduleMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // State
  const [scheduleMemories, setScheduleMemories] = useState<EnhancedScheduleMemory[]>([]);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScheduleMemory, setSelectedScheduleMemory] = useState<EnhancedScheduleMemory | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Help popover state
  const [overviewHelpAnchor, setOverviewHelpAnchor] = useState<HTMLElement | null>(null);

  const handleOverviewHelpOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOverviewHelpAnchor(event.currentTarget);
  };

  const handleOverviewHelpClose = () => {
    setOverviewHelpAnchor(null);
  };

  // Fetch global variables on mount
  useEffect(() => {
    getGlobalVariables({}).then((response) => {
      if (response.isSuccessful && response.globalVariables) {
        setGlobalVariables(response.globalVariables);
      }
    }).catch((err) => {
      logger.error('Failed to load global variables', err);
    });
  }, []);

  // Fetch schedule memories
  const fetchScheduleMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching schedule memories');
      const response = await getScheduleMemories({});

      if (response?.scheduleMemories) {
        // Enhance schedule memories with item/variable names based on outputType
        const enhancedMemories: EnhancedScheduleMemory[] = response.scheduleMemories.map((sm) => {
          let outputItemName: string | undefined;
          let outputItemType: ItemType | undefined;

          if (sm.outputType === ScheduleSourceType.Point) {
            // Find the Point item
            const outputItem = items.find((item) => item.id === sm.outputReference);
            outputItemName = outputItem ? (language === 'fa' && outputItem.nameFa ? outputItem.nameFa : outputItem.name) : sm.outputReference;
            outputItemType = outputItem?.itemType;
          } else if (sm.outputType === ScheduleSourceType.GlobalVariable) {
            // Find the GlobalVariable
            const gv = globalVariables.find((v) => v.name === sm.outputReference);
            outputItemName = gv ? `${gv.name} (${gv.variableType === 0 ? 'Boolean' : 'Float'})` : sm.outputReference;
            outputItemType = undefined; // Global variables don't have itemType
          }

          return {
            ...sm,
            outputItemName,
            outputItemType,
          };
        });

        setScheduleMemories(enhancedMemories);
        logger.log('Schedule memories fetched successfully', { count: enhancedMemories.length });
      } else {
        setError(t('scheduleMemory.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch schedule memories', { error: err });
      setError(t('scheduleMemory.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [items, globalVariables, language, t]);

  useEffect(() => {
    if (items.length > 0) {
      fetchScheduleMemories();
    }
  }, [fetchScheduleMemories, items.length]);

  // Filter schedule memories based on search term
  const filteredScheduleMemories = useMemo(() => {
    if (!searchTerm) return scheduleMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return scheduleMemories.filter(
      (sm) =>
        sm.name?.toLowerCase().includes(lowerSearch) ||
        sm.outputItemName?.toLowerCase().includes(lowerSearch) ||
        sm.holidayCalendarName?.toLowerCase().includes(lowerSearch)
    );
  }, [scheduleMemories, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCreateScheduleMemory = useCallback(() => {
    setSelectedScheduleMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditScheduleMemory = useCallback((sm: EnhancedScheduleMemory) => {
    setSelectedScheduleMemory(sm);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteScheduleMemory = useCallback((sm: EnhancedScheduleMemory) => {
    setSelectedScheduleMemory(sm);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(async (shouldRefresh: boolean) => {
    if (shouldRefresh) {
      await fetchScheduleMemories();
    }

    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedScheduleMemory(null);
    setEditMode(false);
  }, [fetchScheduleMemories]);

  // Define columns for Syncfusion Grid
  const columns: SyncfusionColumnDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerText: t('scheduleMemory.name'),
        width: 200,
        template: (rowData: EnhancedScheduleMemory) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {rowData.name || '-'}
            </Typography>
            {rowData.isDisabled && (
              <Chip label={t('common.disabled')} size="small" color="default" sx={{ height: 20, fontSize: '0.7rem' }} />
            )}
          </Box>
        ),
      },
      {
        field: 'outputItemName',
        headerText: t('scheduleMemory.outputItem'),
        width: 250,
        template: (rowData: EnhancedScheduleMemory) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" noWrap>
              {rowData.outputItemName || rowData.outputReference}
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
        field: 'scheduleBlocks',
        headerText: t('scheduleMemory.blocks'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: EnhancedScheduleMemory) => (
          <Chip
            label={rowData.scheduleBlocks?.length || 0}
            size="small"
            color="primary"
            variant="outlined"
          />
        ),
      },
      {
        field: 'holidayCalendarName',
        headerText: t('scheduleMemory.holidayCalendar'),
        width: 180,
        template: (rowData: EnhancedScheduleMemory) => (
          <Typography variant="body2" noWrap>
            {rowData.holidayCalendarName || t('common.none')}
          </Typography>
        ),
      },
      {
        field: 'interval',
        headerText: t('scheduleMemory.interval'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: EnhancedScheduleMemory) => (
          <Typography variant="body2">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 160,
        textAlign: 'Center',
        allowSorting: false,
        allowFiltering: false,
        template: (rowData: EnhancedScheduleMemory) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEditScheduleMemory(rowData)}
              data-id-ref="schedule-memory-edit-btn"
              title={t('common.edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteScheduleMemory(rowData)}
              data-id-ref="schedule-memory-delete-btn"
              title={t('common.delete')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [t, handleEditScheduleMemory, handleDeleteScheduleMemory]
  );

  return (
    <Container maxWidth={false} data-id-ref="schedule-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="schedule-memory-page-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
        <CardHeader
          avatar={<ScheduleIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          data-id-ref="schedule-memory-page-card-header"
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="schedule-memory-page-title">
              {t('scheduleMemory.title')}
            </Typography>
          }
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" data-id-ref="schedule-memory-page-description">
                {t('scheduleMemory.description')}
              </Typography>
              <IconButton
                size="small"
                onClick={handleOverviewHelpOpen}
                data-id-ref="schedule-memory-overview-help-btn"
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
              onClick={handleCreateScheduleMemory}
              data-id-ref="schedule-memory-add-btn"
            >
              {t('scheduleMemory.addNew')}
            </Button>
          }
        />
        <CardContent data-id-ref="schedule-memory-page-card-body" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search */}
          <Box sx={{ mb: 2 }} data-id-ref="schedule-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('scheduleMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              data-id-ref="schedule-memory-search-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end" data-id-ref="schedule-memory-clear-search-btn">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {error && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error" data-id-ref="schedule-memory-error-alert">
                {error}
              </Alert>
            </Box>
          )}

          {loading && items.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="schedule-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredScheduleMemories}
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
          <AddEditScheduleMemoryDialog
            open={addEditDialogOpen}
            editMode={editMode}
            scheduleMemory={selectedScheduleMemory}
            onClose={handleDialogClose}
          />
        )}
        {deleteDialogOpen && selectedScheduleMemory && (
          <DeleteScheduleMemoryDialog
            open={deleteDialogOpen}
            scheduleMemory={selectedScheduleMemory}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>

      {/* Overview Help Popover */}
      <FieldHelpPopover
        anchorEl={overviewHelpAnchor}
        open={Boolean(overviewHelpAnchor)}
        onClose={handleOverviewHelpClose}
        fieldKey="scheduleMemory.help.overview"
      />
    </Container>
  );
};

export default ScheduleMemoryManagementPage;
