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
  PrecisionManufacturing as PIDIcon,
  Tune as TuneIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getPIDMemories, getPIDTuningStatus, getGlobalVariables } from '../services/extendedApi';
import type { PIDMemory, ItemType, TuningStatus, PIDTuningSession, GlobalVariable } from '../types/api';
import { ItemTypeEnum, PIDSourceType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('PIDMemoryManagementPage');

// Lazy load dialog components
const AddEditPIDMemoryDialog = lazy(() => import('./AddEditPIDMemoryDialog'));
const DeletePIDMemoryDialog = lazy(() => import('./DeletePIDMemoryDialog'));
const StartPIDTuningDialog = lazy(() => import('./StartPIDTuningDialog'));
const TuningStatusDialog = lazy(() => import('./TuningStatusDialog'));

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
 * Enhanced PID Memory interface with resolved source names
 */
interface EnhancedPIDMemory extends PIDMemory {
  inputSourceName?: string;
  inputItemType?: ItemType;
  outputSourceName?: string;
  outputItemType?: ItemType;
  setPointSourceName?: string;
  setPointItemType?: ItemType;
  isAutoSourceName?: string;
  isAutoItemType?: ItemType;
  manualValueSourceName?: string;
  manualValueItemType?: ItemType;
  reverseOutputSourceName?: string;
  reverseOutputItemType?: ItemType;
  digitalOutputSourceName?: string;
  digitalOutputItemType?: ItemType;
  parentPIDName?: string;
}

/**
 * PID Memory Management Page Component
 * Manages PID controller configurations with tuning parameters
 */
const PIDMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [pidMemories, setPIDMemories] = useState<EnhancedPIDMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tuningSessions, setTuningSessions] = useState<Map<string, PIDTuningSession>>(new Map());

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startTuningDialogOpen, setStartTuningDialogOpen] = useState(false);
  const [tuningStatusDialogOpen, setTuningStatusDialogOpen] = useState(false);
  const [selectedPIDMemory, setSelectedPIDMemory] = useState<EnhancedPIDMemory | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all PID memory configurations
   */
  const fetchPIDMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Fetching PID memories and global variables');

      // Fetch both PID memories and global variables in parallel
      const [pmResponse, gvResponse] = await Promise.all([
        getPIDMemories(),
        getGlobalVariables({})
      ]);

      const globalVariables = gvResponse?.globalVariables || [];
      logger.info('Global variables fetched', { count: globalVariables.length });

      // Helper function to resolve source name
      const resolveSourceName = (
        sourceType: number,
        sourceReference: string,
        variables: GlobalVariable[]
      ): { name?: string; itemType?: ItemType } => {
        if (sourceType === PIDSourceType.Point) {
          const item = items.find((i) => i.id === sourceReference);
          if (item) {
            return {
              name: language === 'fa' && item.nameFa ? item.nameFa : item.name,
              itemType: item.itemType
            };
          }
        } else if (sourceType === PIDSourceType.GlobalVariable) {
          const variable = variables.find((v) => v.name === sourceReference);
          if (variable) {
            return { name: variable.name };
          }
        }
        return {};
      };

      // Enhance with resolved source names
      const enhancedMemories: EnhancedPIDMemory[] = pmResponse.pidMemories.map((pm: PIDMemory) => {
        const input = resolveSourceName(pm.inputType, pm.inputReference, globalVariables);
        const output = resolveSourceName(pm.outputType, pm.outputReference, globalVariables);
        const setPoint = resolveSourceName(pm.setPointType, pm.setPointReference, globalVariables);
        const isAuto = resolveSourceName(pm.isAutoType, pm.isAutoReference, globalVariables);
        const manualValue = resolveSourceName(pm.manualValueType, pm.manualValueReference, globalVariables);
        const reverseOutput = resolveSourceName(pm.reverseOutputType, pm.reverseOutputReference, globalVariables);
        const digitalOutput = pm.digitalOutputReference
          ? resolveSourceName(pm.digitalOutputType ?? PIDSourceType.Point, pm.digitalOutputReference, globalVariables)
          : {};

        return {
          ...pm,
          inputSourceName: input.name,
          inputItemType: input.itemType,
          outputSourceName: output.name,
          outputItemType: output.itemType,
          setPointSourceName: setPoint.name,
          setPointItemType: setPoint.itemType,
          isAutoSourceName: isAuto.name,
          isAutoItemType: isAuto.itemType,
          manualValueSourceName: manualValue.name,
          manualValueItemType: manualValue.itemType,
          reverseOutputSourceName: reverseOutput.name,
          reverseOutputItemType: reverseOutput.itemType,
          digitalOutputSourceName: digitalOutput.name,
          digitalOutputItemType: digitalOutput.itemType,
        };
      });

      setPIDMemories(enhancedMemories);
      logger.info('PID memories enhanced successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch PID memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch PID memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchPIDMemories();
    }
  }, [fetchPIDMemories, items.length]);

  /**
   * Fetch tuning sessions for all PID memories
   */
  const fetchTuningSessions = useCallback(async () => {
    if (pidMemories.length === 0) return;

    const sessions = new Map<string, PIDTuningSession>();

    // Fetch tuning status for each PID memory in parallel
    await Promise.all(
      pidMemories.map(async (pm) => {
        try {
          const response = await getPIDTuningStatus({ pidMemoryId: pm.id });
          if (response.isSuccessful && response.session) {
            sessions.set(pm.id, response.session);
          }
        } catch (err) {
          logger.error(`Failed to fetch tuning status for PID ${pm.id}`, err);
        }
      })
    );

    setTuningSessions(sessions);
  }, [pidMemories]);

  /**
   * Auto-refresh tuning sessions for active tunings
   */
  useEffect(() => {
    if (pidMemories.length === 0) return;

    // Initial fetch
    fetchTuningSessions();

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchTuningSessions();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [pidMemories, fetchTuningSessions]);

  /**
   * Get tuning status label
   */
  const getTuningStatusLabel = (status: TuningStatus): string => {
    const statusMap: Record<number, string> = {
      0: t('pidMemory.autoTuning.statusIdle'),
      1: t('pidMemory.autoTuning.statusInitializing'),
      2: t('pidMemory.autoTuning.statusRelayTest'),
      3: t('pidMemory.autoTuning.statusAnalyzing'),
      4: t('pidMemory.autoTuning.statusCompleted'),
      5: t('pidMemory.autoTuning.statusAborted'),
      6: t('pidMemory.autoTuning.statusFailed'),
    };
    return statusMap[status] || t('common.unknown');
  };

  /**
   * Get tuning status color
   */
  const getTuningStatusColor = (status: TuningStatus): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 0: return 'default'; // Idle
      case 1: return 'primary'; // Initializing
      case 2: return 'primary'; // RelayTest
      case 3: return 'primary'; // AnalyzingData
      case 4: return 'success'; // Completed
      case 5: return 'warning'; // Aborted
      case 6: return 'error'; // Failed
      default: return 'default';
    }
  };

  /**
   * Filter PID memories based on search term
   */
  const filteredPIDMemories = useMemo(() => {
    if (!searchTerm) return pidMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return pidMemories.filter((pm) => {
      const name = pm.name?.toLowerCase() || '';
      const inputName = pm.inputSourceName?.toLowerCase() || '';
      const outputName = pm.outputSourceName?.toLowerCase() || '';
      
      return (
        name.includes(lowerSearch) ||
        inputName.includes(lowerSearch) ||
        outputName.includes(lowerSearch) ||
        pm.id.toLowerCase().includes(lowerSearch)
      );
    });
  }, [pidMemories, searchTerm]);

  /**
   * Define grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerText: t('pidMemory.columnHeaders.name'),
        headerTooltip: t('pidMemory.columnHeaders.nameTooltip'),
        width: 180,
        template: (rowData: EnhancedPIDMemory) => (
          <Box data-id-ref="pid-memory-name-cell">
            <Typography variant="body2" fontWeight="medium">
              {rowData.name || t('common.unnamed')}
            </Typography>
            {rowData.isDisabled && (
              <Chip
                label={t('common.disabled')}
                size="small"
                color="default"
                sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'inputSourceName',
        headerText: t('pidMemory.columnHeaders.inputItem'),
        headerTooltip: t('pidMemory.columnHeaders.inputItemTooltip'),
        width: 200,
        template: (rowData: EnhancedPIDMemory) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="pid-memory-input-item-cell">
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.inputSourceName || t('common.unknown')}
            </Typography>
            {rowData.inputItemType && (
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
        headerText: t('pidMemory.columnHeaders.outputItem'),
        headerTooltip: t('pidMemory.columnHeaders.outputItemTooltip'),
        width: 200,
        template: (rowData: EnhancedPIDMemory) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="pid-memory-output-item-cell">
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.outputSourceName || t('common.unknown')}
            </Typography>
            {rowData.outputItemType && (
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
        field: 'setPointSourceName',
        headerText: t('pidMemory.columnHeaders.setPoint'),
        headerTooltip: t('pidMemory.columnHeaders.setPointTooltip'),
        width: 200,
        template: (rowData: EnhancedPIDMemory) => (
          <Box data-id-ref="pid-memory-setpoint-cell">
            <Typography variant="body2" noWrap>
              {rowData.setPointSourceName || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'kp',
        headerText: t('pidMemory.columnHeaders.kp'),
        headerTooltip: t('pidMemory.columnHeaders.kpTooltip'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'ki',
        headerText: t('pidMemory.columnHeaders.ki'),
        headerTooltip: t('pidMemory.columnHeaders.kiTooltip'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'kd',
        headerText: t('pidMemory.columnHeaders.kd'),
        headerTooltip: t('pidMemory.columnHeaders.kdTooltip'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'interval',
        headerText: t('pidMemory.columnHeaders.interval'),
        headerTooltip: t('pidMemory.columnHeaders.intervalTooltip'),
        width: 100,
        template: (rowData: EnhancedPIDMemory) => (
          <Typography variant="body2" data-id-ref="pid-memory-interval-cell">
            {rowData.interval}s
          </Typography>
        ),
      },
      {
        field: 'cascadeLevel',
        headerText: t('pidMemory.columnHeaders.cascadeLevel'),
        headerTooltip: t('pidMemory.columnHeaders.cascadeLevelTooltip'),
        width: 160,
        template: (rowData: EnhancedPIDMemory) => (
          <Box data-id-ref="pid-memory-cascade-cell">
            {rowData.cascadeLevel > 0 ? (
              <Box>
                <Chip
                  label={`${t('pidMemory.cascadeControl.level')} ${rowData.cascadeLevel}`}
                  size="small"
                  color="info"
                  sx={{ height: 20, fontSize: '0.7rem', mb: 0.5 }}
                />
                {rowData.parentPIDName && (
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {rowData.parentPIDName}
                  </Typography>
                )}
              </Box>
            ) : (
              <Chip
                label={t('pidMemory.cascadeControl.standalone')}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        field: 'tuningStatus',
        headerText: t('pidMemory.autoTuning.statusTitle'),
        width: 150,
        template: (rowData: EnhancedPIDMemory) => {
          const session = tuningSessions.get(rowData.id);
          return (
            <Box data-id-ref="pid-memory-tuning-status-cell">
              {session ? (
                <Chip
                  label={getTuningStatusLabel(session.status)}
                  size="small"
                  color={getTuningStatusColor(session.status)}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                  onClick={() => handleViewTuningStatus(rowData)}
                  clickable
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('pidMemory.autoTuning.statusIdle')}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 160,
        template: (rowData: EnhancedPIDMemory) => {
          const session = tuningSessions.get(rowData.id);
          const isActiveTuning = session && (session.status === 1 || session.status === 2 || session.status === 3);

          return (
            <Box sx={{ display: 'flex', gap: 1 }} data-id-ref="pid-memory-actions-cell">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEdit(rowData)}
                data-id-ref="pid-memory-edit-btn"
                title={t('common.edit')}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(rowData)}
                data-id-ref="pid-memory-delete-btn"
                title={t('common.delete')}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              {session && (session.status === 4 || session.status === 5 || session.status === 6 || isActiveTuning) ? (
                <IconButton
                  size="small"
                  color="info"
                  onClick={() => handleViewTuningStatus(rowData)}
                  data-id-ref="pid-memory-view-tuning-btn"
                  title={t('pidMemory.autoTuning.viewStatus')}
                >
                  <ViewIcon fontSize="small" />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => handleStartTuning(rowData)}
                  data-id-ref="pid-memory-start-tuning-btn"
                  title={t('pidMemory.autoTuning.startButton')}
                  disabled={isActiveTuning}
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        },
      },
    ],
    [t, tuningSessions]
  );

  /**
   * Handle add button click
   */
  const handleAdd = () => {
    setSelectedPIDMemory(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  };

  /**
   * Handle edit button click
   */
  const handleEdit = (pidMemory: EnhancedPIDMemory) => {
    setSelectedPIDMemory(pidMemory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  /**
   * Handle delete button click
   */
  const handleDelete = (pidMemory: EnhancedPIDMemory) => {
    setSelectedPIDMemory(pidMemory);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle start tuning button click
   */
  const handleStartTuning = (pidMemory: EnhancedPIDMemory) => {
    setSelectedPIDMemory(pidMemory);
    setStartTuningDialogOpen(true);
  };

  /**
   * Handle view tuning status button click
   */
  const handleViewTuningStatus = (pidMemory: EnhancedPIDMemory) => {
    setSelectedPIDMemory(pidMemory);
    setTuningStatusDialogOpen(true);
  };

  /**
   * Handle dialog close and refresh data
   */
  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setStartTuningDialogOpen(false);
    setTuningStatusDialogOpen(false);
    setSelectedPIDMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchPIDMemories();
      fetchTuningSessions();
    }
  };

  return (
    <Container maxWidth={false} data-id-ref="pid-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }} data-id-ref="pid-memory-page-card">
        <CardHeader
          avatar={<PIDIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title={
            <Typography variant="h5" component="h1" fontWeight="bold" data-id-ref="pid-memory-page-title">
              {t('pidMemory.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary" data-id-ref="pid-memory-page-description">
              {t('pidMemory.description')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="pid-memory-add-btn"
            >
              {t('pidMemory.addNew')}
            </Button>
          }
          data-id-ref="pid-memory-page-header"
        />

        <CardContent data-id-ref="pid-memory-page-content" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search and Filter */}
          <Box sx={{ mb: 2 }} data-id-ref="pid-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('pidMemory.searchPlaceholder')}
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
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="pid-memory-search-input"
            />
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-id-ref="pid-memory-error-alert">
              {t('pidMemory.errors.fetchFailed')}: {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} data-id-ref="pid-memory-loading">
              <CircularProgress />
            </Box>
          )}

          {/* Data Grid */}
          {!loading && (
            <Box sx={{ flex: 1, minHeight: 400 }} data-id-ref="pid-memory-grid-container">
              <SyncfusionGridWrapper
                data={filteredPIDMemories}
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
          <AddEditPIDMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            pidMemory={selectedPIDMemory}
            editMode={editMode}
          />
        )}
        {deleteDialogOpen && selectedPIDMemory && (
          <DeletePIDMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            pidMemory={selectedPIDMemory}
          />
        )}
        {startTuningDialogOpen && (
          <StartPIDTuningDialog
            open={startTuningDialogOpen}
            pidMemory={selectedPIDMemory}
            onClose={handleDialogClose}
          />
        )}
        {tuningStatusDialogOpen && selectedPIDMemory && (
          <TuningStatusDialog
            open={tuningStatusDialogOpen}
            pidMemoryId={selectedPIDMemory.id}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>
    </Container>
  );
};

export default PIDMemoryManagementPage;
