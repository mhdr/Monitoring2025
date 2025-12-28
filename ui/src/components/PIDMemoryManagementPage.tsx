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
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getPIDMemories } from '../services/extendedApi';
import type { PIDMemory, PIDMemoryWithItems, ItemType } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('PIDMemoryManagementPage');

// Lazy load dialog components
const AddEditPIDMemoryDialog = lazy(() => import('./AddEditPIDMemoryDialog'));
const DeletePIDMemoryDialog = lazy(() => import('./DeletePIDMemoryDialog'));

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
 * PID Memory Management Page Component
 * Manages PID controller configurations with tuning parameters
 */
const PIDMemoryManagementPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // State management
  const [pidMemories, setPIDMemories] = useState<PIDMemoryWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPIDMemory, setSelectedPIDMemory] = useState<PIDMemoryWithItems | null>(null);
  const [editMode, setEditMode] = useState(false);

  /**
   * Fetch all PID memory configurations
   */
  const fetchPIDMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPIDMemories();

      // Enhance with item details from monitoring context
      const enhancedMemories: PIDMemoryWithItems[] = response.pidMemories.map((pm: PIDMemory) => {
        const inputItem = items.find((item) => item.id === pm.inputItemId);
        const outputItem = items.find((item) => item.id === pm.outputItemId);
        const setPointItem = pm.setPointId ? items.find((item) => item.id === pm.setPointId) : undefined;
        const isAutoItem = pm.isAutoId ? items.find((item) => item.id === pm.isAutoId) : undefined;
        const manualValueItem = pm.manualValueId ? items.find((item) => item.id === pm.manualValueId) : undefined;
        const reverseOutputItem = pm.reverseOutputId ? items.find((item) => item.id === pm.reverseOutputId) : undefined;

        return {
          ...pm,
          inputItemName: inputItem ? (language === 'fa' ? inputItem.nameFa : inputItem.name) || undefined : undefined,
          inputItemNameFa: inputItem?.nameFa || undefined,
          inputItemType: inputItem?.itemType,
          outputItemName: outputItem ? (language === 'fa' ? outputItem.nameFa : outputItem.name) || undefined : undefined,
          outputItemNameFa: outputItem?.nameFa || undefined,
          outputItemType: outputItem?.itemType,
          setPointItemName: setPointItem ? (language === 'fa' ? setPointItem.nameFa : setPointItem.name) || undefined : undefined,
          setPointItemNameFa: setPointItem?.nameFa || undefined,
          setPointItemType: setPointItem?.itemType,
          isAutoItemName: isAutoItem ? (language === 'fa' ? isAutoItem.nameFa : isAutoItem.name) || undefined : undefined,
          isAutoItemNameFa: isAutoItem?.nameFa || undefined,
          isAutoItemType: isAutoItem?.itemType,
          manualValueItemName: manualValueItem ? (language === 'fa' ? manualValueItem.nameFa : manualValueItem.name) || undefined : undefined,
          manualValueItemNameFa: manualValueItem?.nameFa || undefined,
          manualValueItemType: manualValueItem?.itemType,
          reverseOutputItemName: reverseOutputItem ? (language === 'fa' ? reverseOutputItem.nameFa : reverseOutputItem.name) || undefined : undefined,
          reverseOutputItemNameFa: reverseOutputItem?.nameFa || undefined,
          reverseOutputItemType: reverseOutputItem?.itemType,
        };
      });

      setPIDMemories(enhancedMemories);
      logger.info('PID memories fetched successfully', { count: enhancedMemories.length });
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
   * Filter PID memories based on search term
   */
  const filteredPIDMemories = useMemo(() => {
    if (!searchTerm) return pidMemories;

    const lowerSearch = searchTerm.toLowerCase();
    return pidMemories.filter((pm) => {
      const name = pm.name?.toLowerCase() || '';
      const inputName = pm.inputItemName?.toLowerCase() || '';
      const outputName = pm.outputItemName?.toLowerCase() || '';
      
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
        headerText: t('pidMemory.name'),
        width: 180,
        template: (rowData: PIDMemoryWithItems) => (
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
        field: 'inputItemName',
        headerText: t('pidMemory.inputItem'),
        width: 200,
        template: (rowData: PIDMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="pid-memory-input-item-cell">
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.inputItemName || t('common.unknown')}
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
        field: 'outputItemName',
        headerText: t('pidMemory.outputItem'),
        width: 200,
        template: (rowData: PIDMemoryWithItems) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="pid-memory-output-item-cell">
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {rowData.outputItemName || t('common.unknown')}
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
        field: 'setPoint',
        headerText: t('pidMemory.setPoint'),
        width: 140,
        template: (rowData: PIDMemoryWithItems) => (
          <Box data-id-ref="pid-memory-setpoint-cell">
            {rowData.setPointId ? (
              <Box>
                <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                  {t('pidMemory.dynamic')}
                </Typography>
                <Typography variant="body2" noWrap>
                  {rowData.setPointItemName || t('common.unknown')}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2">
                {rowData.setPoint?.toFixed(2) ?? t('common.notSet')}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'kp',
        headerText: t('pidMemory.kp'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'ki',
        headerText: t('pidMemory.ki'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'kd',
        headerText: t('pidMemory.kd'),
        width: 80,
        format: 'N3',
      },
      {
        field: 'interval',
        headerText: t('pidMemory.interval'),
        width: 100,
        template: (rowData: PIDMemoryWithItems) => (
          <Typography variant="body2" data-id-ref="pid-memory-interval-cell">
            {rowData.interval}s
          </Typography>
        ),
      },
      {
        field: 'isAuto',
        headerText: t('pidMemory.mode'),
        width: 100,
        template: (rowData: PIDMemoryWithItems) => (
          <Chip
            label={rowData.isAuto ? t('pidMemory.auto') : t('pidMemory.manual')}
            size="small"
            color={rowData.isAuto ? 'success' : 'warning'}
            sx={{ height: 20, fontSize: '0.7rem' }}
            data-id-ref="pid-memory-mode-cell"
          />
        ),
      },
      {
        field: 'actions',
        headerText: t('common.actions'),
        width: 120,
        template: (rowData: PIDMemoryWithItems) => (
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
          </Box>
        ),
      },
    ],
    [t]
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
  const handleEdit = (pidMemory: PIDMemoryWithItems) => {
    setSelectedPIDMemory(pidMemory);
    setEditMode(true);
    setAddEditDialogOpen(true);
  };

  /**
   * Handle delete button click
   */
  const handleDelete = (pidMemory: PIDMemoryWithItems) => {
    setSelectedPIDMemory(pidMemory);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle dialog close and refresh data
   */
  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedPIDMemory(null);
    setEditMode(false);

    if (shouldRefresh) {
      fetchPIDMemories();
    }
  };

  return (
    <Container maxWidth={false} data-id-ref="pid-memory-page-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card sx={{ boxShadow: 3 }} data-id-ref="pid-memory-page-card">
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

        <CardContent data-id-ref="pid-memory-page-content">
          {/* Search and Filter */}
          <Box sx={{ mb: 3 }} data-id-ref="pid-memory-search-container">
            <TextField
              fullWidth
              placeholder={t('pidMemory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <SyncfusionGridWrapper
              data={filteredPIDMemories}
              columns={columns}
              allowPaging={true}
              pageSettings={{ pageSize: 50, pageSizes: [25, 50, 100, 200] }}
              allowSorting={true}
              allowFiltering={true}
              filterSettings={{ type: 'Excel' }}
              height="600px"
            />
          )}

          {/* No Results */}
          {!loading && !error && filteredPIDMemories.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
              }}
              data-id-ref="pid-memory-no-results"
            >
              <PIDIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {searchTerm ? t('common.noResultsFound') : t('pidMemory.noPIDMemories')}
              </Typography>
              {!searchTerm && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mt: 2 }}>
                  {t('pidMemory.addFirst')}
                </Button>
              )}
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
      </Suspense>
    </Container>
  );
};

export default PIDMemoryManagementPage;
