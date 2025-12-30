import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
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
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getRateOfChangeMemories } from '../services/extendedApi';
import type { RateOfChangeMemory, RateOfChangeMemoryWithItems, ItemType } from '../types/api';
import { ItemTypeEnum, RateCalculationMethod, RateTimeUnit } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('RateOfChangeMemoryManagementPage');

// Lazy load dialog components
const AddEditRateOfChangeMemoryDialog = lazy(() => import('./AddEditRateOfChangeMemoryDialog'));
const DeleteRateOfChangeMemoryDialog = lazy(() => import('./DeleteRateOfChangeMemoryDialog'));

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
 * Get calculation method label
 */
const getCalculationMethodLabel = (method: number, t: (key: string) => string): string => {
  switch (method) {
    case RateCalculationMethod.SimpleDifference:
      return t('rateOfChangeMemory.calculationMethod.simpleDifference');
    case RateCalculationMethod.MovingAverage:
      return t('rateOfChangeMemory.calculationMethod.movingAverage');
    case RateCalculationMethod.WeightedAverage:
      return t('rateOfChangeMemory.calculationMethod.weightedAverage');
    case RateCalculationMethod.LinearRegression:
      return t('rateOfChangeMemory.calculationMethod.linearRegression');
    default:
      return String(method);
  }
};

/**
 * Get time unit label
 */
const getTimeUnitLabel = (unit: number, t: (key: string) => string): string => {
  switch (unit) {
    case RateTimeUnit.PerSecond:
      return t('rateOfChangeMemory.timeUnit.perSecond');
    case RateTimeUnit.PerMinute:
      return t('rateOfChangeMemory.timeUnit.perMinute');
    case RateTimeUnit.PerHour:
      return t('rateOfChangeMemory.timeUnit.perHour');
    default:
      return String(unit);
  }
};

/**
 * Rate of Change Memory Management Page Component
 * Manages rate of change/derivative calculations for analog values
 */
const RateOfChangeMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [rateOfChangeMemories, setRateOfChangeMemories] = useState<RateOfChangeMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<RateOfChangeMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all rate of change memory configurations
   */
  const fetchRateOfChangeMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getRateOfChangeMemories();

      if (!response.isSuccessful) {
        setError(response.errorMessage || 'Failed to fetch rate of change memories');
        return;
      }

      // Enhance with item details from monitoring context
      const enhancedMemories: RateOfChangeMemoryWithItems[] = (response.rateOfChangeMemories || []).map((m: RateOfChangeMemory) => {
        const inputItem = items.find((item) => item.id === m.inputItemId);
        const outputItem = items.find((item) => item.id === m.outputItemId);
        const alarmOutputItem = m.alarmOutputItemId ? items.find((item) => item.id === m.alarmOutputItemId) : null;

        return {
          ...m,
          inputItemName: inputItem ? (language === 'fa' ? inputItem.nameFa : inputItem.name) || undefined : undefined,
          inputItemNameFa: inputItem?.nameFa || undefined,
          inputItemType: inputItem?.itemType,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
          alarmOutputItemName: alarmOutputItem ? (language === 'fa' ? alarmOutputItem.nameFa : alarmOutputItem.name) || undefined : undefined,
          alarmOutputItemNameFa: alarmOutputItem?.nameFa || undefined,
          alarmOutputItemType: alarmOutputItem?.itemType,
        };
      });

      setRateOfChangeMemories(enhancedMemories);
      logger.info('Rate of change memories fetched successfully', { count: enhancedMemories.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      logger.error('Failed to fetch rate of change memories', err);
    } finally {
      setLoading(false);
    }
  }, [items, language]);

  // Fetch rate of change memories on component mount and when items or language changes
  useEffect(() => {
    if (items.length > 0) {
      fetchRateOfChangeMemories();
    }
  }, [fetchRateOfChangeMemories, items.length]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    fetchRateOfChangeMemories();
  };

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
  const handleEdit = useCallback((memory: RateOfChangeMemoryWithItems) => {
    setSelectedMemory(memory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((memory: RateOfChangeMemoryWithItems) => {
    setSelectedMemory(memory);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedMemory(null);
  };

  /**
   * Handle successful operation (add/edit/delete)
   */
  const handleOperationSuccess = () => {
    handleDialogClose();
    fetchRateOfChangeMemories();
  };

  /**
   * Filter rate of change memories based on search term
   */
  const filteredMemories = useMemo(() => {
    if (!searchTerm) return rateOfChangeMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return rateOfChangeMemories.filter(
      (m) =>
        m.name?.toLowerCase().includes(lowerSearch) ||
        m.inputItemName?.toLowerCase().includes(lowerSearch) ||
        m.inputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        m.outputItemName?.toLowerCase().includes(lowerSearch) ||
        m.outputItemNameFa?.toLowerCase().includes(lowerSearch) ||
        m.rateUnitDisplay?.toLowerCase().includes(lowerSearch)
    );
  }, [rateOfChangeMemories, searchTerm]);

  /**
   * Define Syncfusion Grid columns
   */
  const columns: SyncfusionColumnDef[] = useMemo(() => {
    return [
      {
        field: 'name',
        headerText: t('rateOfChangeMemory.name'),
        width: 180,
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="rateofchange-memory-name-cell">
            <TrendingUpIcon fontSize="small" color="primary" />
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
        headerText: t('rateOfChangeMemory.inputItem'),
        width: 200,
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="rateofchange-memory-input-cell">
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
        headerText: t('rateOfChangeMemory.outputItem'),
        width: 200,
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="rateofchange-memory-output-cell">
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
        field: 'calculationMethod',
        headerText: t('rateOfChangeMemory.calculationMethod.label'),
        width: 150,
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Chip
            label={getCalculationMethodLabel(rowData.calculationMethod, t)}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
            data-id-ref="rateofchange-memory-method-chip"
          />
        ),
      },
      {
        field: 'lastSmoothedRate',
        headerText: t('rateOfChangeMemory.currentRate'),
        width: 130,
        textAlign: 'Right',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }} data-id-ref="rateofchange-memory-rate-cell">
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {rowData.lastSmoothedRate !== null && rowData.lastSmoothedRate !== undefined
                ? rowData.lastSmoothedRate.toFixed(rowData.decimalPlaces)
                : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rowData.rateUnitDisplay || getTimeUnitLabel(rowData.timeUnit, t)}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'alarmState',
        headerText: t('rateOfChangeMemory.alarmStatus'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box data-id-ref="rateofchange-memory-alarm-cell">
            {rowData.alarmOutputItemId ? (
              rowData.alarmState === true ? (
                <Chip label={t('rateOfChangeMemory.highAlarm')} size="small" color="error" icon={<WarningIcon />} sx={{ height: 20, fontSize: '0.65rem' }} />
              ) : rowData.alarmState === false ? (
                <Chip label={t('rateOfChangeMemory.lowAlarm')} size="small" color="warning" icon={<WarningIcon />} sx={{ height: 20, fontSize: '0.65rem' }} />
              ) : (
                <Chip label={t('common.ok')} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
              )
            ) : (
              <Typography variant="caption" color="text.secondary">—</Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'interval',
        headerText: t('rateOfChangeMemory.interval'),
        width: 80,
        textAlign: 'Center',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="rateofchange-memory-interval-cell">{rowData.interval}s</Typography>
        ),
      },
      {
        field: 'timeWindowSeconds',
        headerText: t('rateOfChangeMemory.timeWindow'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="rateofchange-memory-window-cell">{rowData.timeWindowSeconds}s</Typography>
        ),
      },
      {
        field: 'baselineStatus',
        headerText: t('rateOfChangeMemory.baseline'),
        width: 100,
        textAlign: 'Center',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box data-id-ref="rateofchange-memory-baseline-cell">
            {rowData.accumulatedSamples >= rowData.baselineSampleCount ? (
              <Chip label={t('common.ready')} size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
            ) : (
              <Tooltip title={`${rowData.accumulatedSamples}/${rowData.baselineSampleCount}`}>
                <Chip 
                  label={`${Math.round((rowData.accumulatedSamples / rowData.baselineSampleCount) * 100)}%`} 
                  size="small" 
                  color="warning" 
                  sx={{ height: 18, fontSize: '0.65rem' }} 
                />
              </Tooltip>
            )}
          </Box>
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        textAlign: 'Center',
        template: (rowData: RateOfChangeMemoryWithItems) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} data-id-ref="rateofchange-memory-actions-cell">
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => handleEdit(rowData)}
                color="primary"
                data-id-ref="rateofchange-memory-edit-btn"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                onClick={() => handleDelete(rowData)}
                color="error"
                data-id-ref="rateofchange-memory-delete-btn"
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
    <Box 
      sx={{ 
        width: '100%', 
        height: '100vh', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        p: 3 
      }} 
      data-id-ref="rateofchange-memory-page"
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardHeader
          avatar={<TrendingUpIcon fontSize="large" color="primary" />}
          title={
            <Typography variant="h5" component="h1" data-id-ref="rateofchange-memory-page-title">
              {t('rateOfChangeMemory.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary" data-id-ref="rateofchange-memory-page-description">
              {t('rateOfChangeMemory.description')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-id-ref="rateofchange-memory-add-btn"
            >
              {t('rateOfChangeMemory.addNew')}
            </Button>
          }
          data-id-ref="rateofchange-memory-page-header"
        />

        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-id-ref="rateofchange-memory-error-alert">
              {error}
            </Alert>
          )}

          {/* Search and Filter Bar */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }} data-id-ref="rateofchange-memory-toolbar">
            <TextField
              placeholder={t('rateOfChangeMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="rateofchange-memory-search-input"
            />

            <Button
              variant="outlined"
              onClick={handleRefresh}
              disabled={loading}
              data-id-ref="rateofchange-memory-refresh-btn"
            >
              {loading ? <CircularProgress size={24} /> : t('common.refresh')}
            </Button>
          </Box>

          {/* Rate of Change Memories Grid */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }} data-id-ref="rateofchange-memory-grid-container">
            {loading && rateOfChangeMemories.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <SyncfusionGridWrapper
                data={filteredMemories}
                columns={columns}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                height="100%"
              />
            )}
          </Box>

          {/* Summary */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-id-ref="rateofchange-memory-summary">
            <Typography variant="body2" color="text.secondary">
              {t('rateOfChangeMemory.totalCount', { count: rateOfChangeMemories.length })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('rateOfChangeMemory.filteredCount', { count: filteredMemories.length })}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={<CircularProgress />}>
        {addEditDialogOpen && (
          <AddEditRateOfChangeMemoryDialog
            open={addEditDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            rateOfChangeMemory={selectedMemory}
            editMode={editMode}
          />
        )}

        {deleteDialogOpen && selectedMemory && (
          <DeleteRateOfChangeMemoryDialog
            open={deleteDialogOpen}
            onClose={handleDialogClose}
            onSuccess={handleOperationSuccess}
            rateOfChangeMemory={selectedMemory}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default RateOfChangeMemoryManagementPage;
