import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Chip,
  Stack,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import AGGridWrapper from './AGGridWrapper';
import { getModbusGatewayMappings, batchEditModbusGatewayMappings } from '../services/extendedApi';
import { getItems } from '../services/monitoringApi';
import type {
  ModbusGatewayConfig,
  ModbusGatewayMapping,
  ModbusGatewayMappingEdit,
  Item,
  ModbusRegisterType,
  ModbusDataRepresentation,
  EndiannessType,
  GatewayValidationError,
} from '../types/api';
import {
  ModbusRegisterTypeEnum,
  ModbusDataRepresentationEnum,
  EndiannessTypeEnum,
  ItemTypeEnum,
} from '../types/api';
import type { AGGridRowData } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusGatewayMappingsDialog');

interface ModbusGatewayMappingsDialogProps {
  open: boolean;
  gateway: ModbusGatewayConfig;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface EditableMapping extends ModbusGatewayMapping {
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

interface AddMappingFormData {
  itemId: string;
  modbusAddress: number;
  registerType: ModbusRegisterType;
  dataRepresentation: ModbusDataRepresentation;
  endianness: EndiannessType;
  scaleMin: number | '';
  scaleMax: number | '';
}

const ModbusGatewayMappingsDialog: React.FC<ModbusGatewayMappingsDialogProps> = ({
  open,
  gateway,
  onClose,
  onSuccess,
}) => {
  const { t, language } = useLanguage();

  // State
  const [mappings, setMappings] = useState<EditableMapping[]>([]);
  const [monitoringItems, setMonitoringItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<GatewayValidationError[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Add mapping form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState<AddMappingFormData>({
    itemId: '',
    modbusAddress: 0,
    registerType: ModbusRegisterTypeEnum.HoldingRegister,
    dataRepresentation: ModbusDataRepresentationEnum.Float32,
    endianness: EndiannessTypeEnum.BigEndian,
    scaleMin: 0,
    scaleMax: 100,
  });

  // Fetch all monitoring items for autocomplete (inputs and outputs)
  useEffect(() => {
    const fetchMonitoringItems = async () => {
      try {
        const response = await getItems();
        if (response?.items) {
          // Include all item types for Modbus gateway mappings:
          // - DigitalInput (1) -> can be mapped to DiscreteInput (1x) or Coil (0x)
          // - DigitalOutput (2) -> can be mapped to Coil (0x) or DiscreteInput (1x)
          // - AnalogInput (3) -> can be mapped to InputRegister (3x) or HoldingRegister (4x)
          // - AnalogOutput (4) -> can be mapped to HoldingRegister (4x) or InputRegister (3x)
          const items = response.items.filter(
            (item) => 
              item.itemType === ItemTypeEnum.DigitalInput ||
              item.itemType === ItemTypeEnum.DigitalOutput ||
              item.itemType === ItemTypeEnum.AnalogInput ||
              item.itemType === ItemTypeEnum.AnalogOutput
          );
          setMonitoringItems(items);
          logger.log('Monitoring items fetched', { count: items.length });
        }
      } catch (err) {
        logger.error('Failed to fetch items', { error: err });
      }
    };
    if (open) {
      fetchMonitoringItems();
    }
  }, [open]);

  // Fetch mappings when gateway changes
  const fetchMappings = useCallback(async () => {
    if (!gateway?.id) return;

    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      logger.log('Fetching gateway mappings', { gatewayId: gateway.id });
      const response = await getModbusGatewayMappings({ gatewayId: gateway.id });

      if (response?.isSuccessful && response.mappings) {
        setMappings(response.mappings.map(m => ({ ...m, isNew: false, isModified: false, isDeleted: false })));
        logger.log('Mappings fetched', { count: response.mappings.length });
      } else {
        setError(response?.errorMessage || t('modbusGateway.errors.fetchMappingsFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch mappings', { error: err });
      setError(t('modbusGateway.errors.fetchMappingsFailed'));
    } finally {
      setLoading(false);
    }
  }, [gateway?.id, t]);

  useEffect(() => {
    if (open && gateway?.id) {
      fetchMappings();
      setHasChanges(false);
      setShowAddForm(false);
    }
  }, [open, gateway?.id, fetchMappings]);

  // Get display name for item
  const getItemDisplayName = useCallback((item: Item): string => {
    if (language === 'fa' && item.nameFa) {
      return item.nameFa;
    }
    return item.name;
  }, [language]);

  // Calculate register count based on data representation
  const getRegisterCount = (dataRep: ModbusDataRepresentation): number => {
    return dataRep === ModbusDataRepresentationEnum.Float32 ? 2 : 1;
  };

  // Register type labels
  const getRegisterTypeLabel = useCallback((type: ModbusRegisterType): string => {
    switch (type) {
      case ModbusRegisterTypeEnum.Coil:
        return t('modbusGateway.registerTypes.coil');
      case ModbusRegisterTypeEnum.DiscreteInput:
        return t('modbusGateway.registerTypes.discreteInput');
      case ModbusRegisterTypeEnum.HoldingRegister:
        return t('modbusGateway.registerTypes.holdingRegister');
      case ModbusRegisterTypeEnum.InputRegister:
        return t('modbusGateway.registerTypes.inputRegister');
      default:
        return String(type);
    }
  }, [t]);

  // Data representation labels
  const getDataRepLabel = useCallback((rep: ModbusDataRepresentation): string => {
    switch (rep) {
      case ModbusDataRepresentationEnum.Int16:
        return t('modbusGateway.dataRepresentations.int16');
      case ModbusDataRepresentationEnum.Float32:
        return t('modbusGateway.dataRepresentations.float32');
      case ModbusDataRepresentationEnum.ScaledInteger:
        return t('modbusGateway.dataRepresentations.scaledInteger');
      default:
        return String(rep);
    }
  }, [t]);

  // Endianness labels
  const getEndiannessLabel = useCallback((end: EndiannessType): string => {
    switch (end) {
      case EndiannessTypeEnum.None:
        return t('modbusGateway.endianness.none');
      case EndiannessTypeEnum.BigEndian:
        return t('modbusGateway.endianness.bigEndian');
      case EndiannessTypeEnum.LittleEndian:
        return t('modbusGateway.endianness.littleEndian');
      case EndiannessTypeEnum.MidBigEndian:
        return t('modbusGateway.endianness.midBigEndian');
      case EndiannessTypeEnum.MidLittleEndian:
        return t('modbusGateway.endianness.midLittleEndian');
      default:
        return String(end);
    }
  }, [t]);

  // Handle adding a new mapping
  const handleAddMapping = () => {
    if (!addFormData.itemId) return;

    const selectedItem = monitoringItems.find(i => i.id === addFormData.itemId);
    const newMapping: EditableMapping = {
      id: `new-${Date.now()}`,
      gatewayId: gateway.id,
      modbusAddress: addFormData.modbusAddress,
      registerType: addFormData.registerType,
      itemId: addFormData.itemId,
      itemName: selectedItem?.name || null,
      itemNameFa: selectedItem?.nameFa || null,
      isEditable: selectedItem?.isEditable || false,
      registerCount: getRegisterCount(addFormData.dataRepresentation),
      dataRepresentation: addFormData.dataRepresentation,
      endianness: addFormData.endianness,
      scaleMin: addFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger 
        ? (addFormData.scaleMin === '' ? 0 : addFormData.scaleMin) 
        : null,
      scaleMax: addFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger 
        ? (addFormData.scaleMax === '' ? 100 : addFormData.scaleMax) 
        : null,
      isNew: true,
      isModified: false,
      isDeleted: false,
    };

    setMappings(prev => [...prev, newMapping]);
    setHasChanges(true);
    setShowAddForm(false);
    
    // Reset form
    setAddFormData({
      itemId: '',
      modbusAddress: 0,
      registerType: ModbusRegisterTypeEnum.HoldingRegister,
      dataRepresentation: ModbusDataRepresentationEnum.Float32,
      endianness: EndiannessTypeEnum.BigEndian,
      scaleMin: 0,
      scaleMax: 100,
    });
  };

  // Handle deleting a mapping
  const handleDeleteMapping = useCallback((mapping: EditableMapping) => {
    if (mapping.isNew) {
      // If it's a new unsaved mapping, just remove it
      setMappings(prev => prev.filter(m => m.id !== mapping.id));
    } else {
      // Mark as deleted
      setMappings(prev => prev.map(m => 
        m.id === mapping.id ? { ...m, isDeleted: true } : m
      ));
    }
    setHasChanges(true);
  }, []);

  // Handle saving changes
  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    setValidationErrors([]);

    try {
      const added: ModbusGatewayMappingEdit[] = mappings
        .filter(m => m.isNew && !m.isDeleted)
        .map(m => ({
          modbusAddress: m.modbusAddress,
          registerType: m.registerType,
          itemId: m.itemId,
          dataRepresentation: m.dataRepresentation,
          endianness: m.endianness,
          scaleMin: m.scaleMin,
          scaleMax: m.scaleMax,
        }));

      const updated: ModbusGatewayMappingEdit[] = mappings
        .filter(m => m.isModified && !m.isNew && !m.isDeleted)
        .map(m => ({
          id: m.id,
          modbusAddress: m.modbusAddress,
          registerType: m.registerType,
          itemId: m.itemId,
          dataRepresentation: m.dataRepresentation,
          endianness: m.endianness,
          scaleMin: m.scaleMin,
          scaleMax: m.scaleMax,
        }));

      const removedIds: string[] = mappings
        .filter(m => m.isDeleted && !m.isNew)
        .map(m => m.id);

      const response = await batchEditModbusGatewayMappings({
        gatewayId: gateway.id,
        added,
        updated,
        removedIds,
      });

      if (response.isSuccessful) {
        logger.log('Mappings saved', { added: response.addedCount, updated: response.updatedCount, removed: response.removedCount });
        onSuccess(t('modbusGateway.success.mappingsSaved'));
        setHasChanges(false);
        fetchMappings(); // Refresh from server
      } else {
        if (response.validationErrors && response.validationErrors.length > 0) {
          setValidationErrors(response.validationErrors);
        } else {
          setError(t('modbusGateway.errors.saveMappingsFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save mappings', { error: err });
      setError(t('modbusGateway.errors.saveMappingsFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Filter out deleted mappings for display
  const displayMappings = useMemo(() => {
    return mappings.filter(m => !m.isDeleted);
  }, [mappings]);

  // Mapping column definitions
  const columnDefs = useMemo<ColDef<EditableMapping>[]>(() => {
    return [
      {
        headerName: t('modbusGateway.mappings.modbusAddress'),
        field: 'modbusAddress',
        width: 130,
        minWidth: 100,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.registerType'),
        field: 'registerType',
        width: 160,
        minWidth: 140,
        valueFormatter: (params) => getRegisterTypeLabel(params.value),
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.item'),
        field: 'itemId',
        flex: 2,
        minWidth: 200,
        valueFormatter: (params) => {
          const mapping = params.data;
          if (language === 'fa' && mapping?.itemNameFa) {
            return mapping.itemNameFa;
          }
          return mapping?.itemName || params.value || '';
        },
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.dataRepresentation'),
        field: 'dataRepresentation',
        width: 160,
        minWidth: 140,
        valueFormatter: (params) => getDataRepLabel(params.value),
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.endianness'),
        field: 'endianness',
        width: 160,
        minWidth: 140,
        valueFormatter: (params) => getEndiannessLabel(params.value),
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.registerCount'),
        field: 'registerCount',
        width: 100,
        minWidth: 80,
        sortable: true,
      },
      {
        headerName: t('modbusGateway.mappings.isEditable'),
        field: 'isEditable',
        width: 100,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<EditableMapping>) => (
          <Chip
            data-id-ref={`mapping-editable-chip-${params.data?.id}`}
            label={params.value ? t('common.yes') : t('common.no')}
            color={params.value ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        width: 80,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<EditableMapping>) => {
          const mapping = params.data;
          if (!mapping) return null;

          return (
            <Box
              data-id-ref={`mapping-actions-${mapping.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <Tooltip title={t('delete')}>
                <IconButton
                  data-id-ref={`mapping-delete-btn-${mapping.id}`}
                  size="small"
                  color="error"
                  onClick={() => handleDeleteMapping(mapping)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ];
  }, [t, language, getRegisterTypeLabel, getDataRepLabel, getEndiannessLabel, handleDeleteMapping]);

  // Get available items (not already mapped)
  const availableItems = useMemo(() => {
    const mappedItemIds = new Set(displayMappings.map(m => m.itemId));
    return monitoringItems.filter(item => !mappedItemIds.has(item.id));
  }, [monitoringItems, displayMappings]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (hasChanges) {
          // Could show confirmation dialog here
        }
        onClose();
      }}
      maxWidth="lg"
      fullWidth
      data-id-ref="modbus-gateway-mappings-dialog"
    >
      <DialogTitle
        data-id-ref="modbus-gateway-mappings-dialog-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h6">{t('modbusGateway.mappings.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('modbusGateway.mappings.subtitle', { name: gateway.name })}
          </Typography>
        </Box>
        <IconButton
          data-id-ref="mappings-dialog-close-btn"
          onClick={onClose}
          edge="end"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent data-id-ref="modbus-gateway-mappings-dialog-content">
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
            data-id-ref="mappings-error-alert"
          >
            {error}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            data-id-ref="mappings-validation-errors"
          >
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((err, idx) => (
                <li key={idx}>
                  {err.errorCode === 'ADDRESS_OVERLAP' 
                    ? t('modbusGateway.validation.addressOverlap') 
                    : err.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {loading ? (
          <Box
            data-id-ref="mappings-loading"
            sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Add Mapping Form */}
            {showAddForm && (
              <Box
                data-id-ref="add-mapping-form"
                sx={{
                  mb: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.default',
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('modbusGateway.mappings.addMapping')}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
                  <Autocomplete
                    data-id-ref="add-mapping-item-autocomplete"
                    options={availableItems}
                    getOptionLabel={(item) => getItemDisplayName(item)}
                    value={availableItems.find(i => i.id === addFormData.itemId) || null}
                    onChange={(_, newValue) => {
                      setAddFormData(prev => ({ ...prev, itemId: newValue?.id || '' }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('modbusGateway.mappings.item')}
                        size="small"
                        sx={{ minWidth: 200 }}
                      />
                    )}
                    sx={{ flex: 2, minWidth: 200 }}
                  />
                  
                  <TextField
                    data-id-ref="add-mapping-address-input"
                    label={t('modbusGateway.mappings.modbusAddress')}
                    type="number"
                    size="small"
                    value={addFormData.modbusAddress}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, modbusAddress: Number(e.target.value) }))}
                    inputProps={{ min: 0 }}
                    sx={{ width: 120 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t('modbusGateway.mappings.registerType')}</InputLabel>
                    <Select
                      data-id-ref="add-mapping-regtype-select"
                      value={addFormData.registerType}
                      label={t('modbusGateway.mappings.registerType')}
                      onChange={(e: SelectChangeEvent<number>) => 
                        setAddFormData(prev => ({ ...prev, registerType: e.target.value as ModbusRegisterType }))
                      }
                    >
                      <MenuItem value={ModbusRegisterTypeEnum.Coil}>
                        {t('modbusGateway.registerTypes.coil')}
                      </MenuItem>
                      <MenuItem value={ModbusRegisterTypeEnum.DiscreteInput}>
                        {t('modbusGateway.registerTypes.discreteInput')}
                      </MenuItem>
                      <MenuItem value={ModbusRegisterTypeEnum.HoldingRegister}>
                        {t('modbusGateway.registerTypes.holdingRegister')}
                      </MenuItem>
                      <MenuItem value={ModbusRegisterTypeEnum.InputRegister}>
                        {t('modbusGateway.registerTypes.inputRegister')}
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t('modbusGateway.mappings.dataRepresentation')}</InputLabel>
                    <Select
                      data-id-ref="add-mapping-datarep-select"
                      value={addFormData.dataRepresentation}
                      label={t('modbusGateway.mappings.dataRepresentation')}
                      onChange={(e: SelectChangeEvent<number>) => 
                        setAddFormData(prev => ({ ...prev, dataRepresentation: e.target.value as ModbusDataRepresentation }))
                      }
                    >
                      <MenuItem value={ModbusDataRepresentationEnum.Int16}>
                        {t('modbusGateway.dataRepresentations.int16')}
                      </MenuItem>
                      <MenuItem value={ModbusDataRepresentationEnum.Float32}>
                        {t('modbusGateway.dataRepresentations.float32')}
                      </MenuItem>
                      <MenuItem value={ModbusDataRepresentationEnum.ScaledInteger}>
                        {t('modbusGateway.dataRepresentations.scaledInteger')}
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {addFormData.dataRepresentation === ModbusDataRepresentationEnum.Float32 && (
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>{t('modbusGateway.mappings.endianness')}</InputLabel>
                      <Select
                        data-id-ref="add-mapping-endian-select"
                        value={addFormData.endianness}
                        label={t('modbusGateway.mappings.endianness')}
                        onChange={(e: SelectChangeEvent<number>) => 
                          setAddFormData(prev => ({ ...prev, endianness: e.target.value as EndiannessType }))
                        }
                      >
                        <MenuItem value={EndiannessTypeEnum.BigEndian}>
                          {t('modbusGateway.endianness.bigEndian')}
                        </MenuItem>
                        <MenuItem value={EndiannessTypeEnum.LittleEndian}>
                          {t('modbusGateway.endianness.littleEndian')}
                        </MenuItem>
                        <MenuItem value={EndiannessTypeEnum.MidBigEndian}>
                          {t('modbusGateway.endianness.midBigEndian')}
                        </MenuItem>
                        <MenuItem value={EndiannessTypeEnum.MidLittleEndian}>
                          {t('modbusGateway.endianness.midLittleEndian')}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {addFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger && (
                    <>
                      <TextField
                        data-id-ref="add-mapping-scalemin-input"
                        label={t('modbusGateway.mappings.scaleMin')}
                        type="number"
                        size="small"
                        value={addFormData.scaleMin}
                        onChange={(e) => setAddFormData(prev => ({ 
                          ...prev, 
                          scaleMin: e.target.value === '' ? '' : Number(e.target.value) 
                        }))}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        data-id-ref="add-mapping-scalemax-input"
                        label={t('modbusGateway.mappings.scaleMax')}
                        type="number"
                        size="small"
                        value={addFormData.scaleMax}
                        onChange={(e) => setAddFormData(prev => ({ 
                          ...prev, 
                          scaleMax: e.target.value === '' ? '' : Number(e.target.value) 
                        }))}
                        sx={{ width: 100 }}
                      />
                    </>
                  )}

                  <Button
                    data-id-ref="add-mapping-confirm-btn"
                    variant="contained"
                    size="small"
                    onClick={handleAddMapping}
                    disabled={!addFormData.itemId}
                    sx={{ height: 40 }}
                  >
                    {t('add')}
                  </Button>
                  <Button
                    data-id-ref="add-mapping-cancel-btn"
                    variant="outlined"
                    size="small"
                    onClick={() => setShowAddForm(false)}
                    sx={{ height: 40 }}
                  >
                    {t('cancel')}
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Toolbar */}
            <Box
              data-id-ref="mappings-toolbar"
              sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}
            >
              <Button
                data-id-ref="mappings-add-btn"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowAddForm(true)}
                disabled={showAddForm || saving}
              >
                {t('modbusGateway.mappings.addMapping')}
              </Button>
              
              {hasChanges && (
                <Chip
                  data-id-ref="mappings-unsaved-indicator"
                  label={t('modbusGateway.mappings.unsavedChanges')}
                  color="warning"
                  size="small"
                />
              )}
            </Box>

            {/* Mappings Grid */}
            {displayMappings.length === 0 ? (
              <Box
                data-id-ref="mappings-empty-state"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  py: 8,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('modbusGateway.mappings.noMappings')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('modbusGateway.mappings.addFirstMapping')}
                </Typography>
              </Box>
            ) : (
              <Box
                data-id-ref="mappings-grid-container"
                sx={{ height: 400 }}
              >
                <AGGridWrapper
                  idRef="gateway-mappings"
                  rowData={displayMappings as unknown as AGGridRowData[]}
                  columnDefs={columnDefs}
                  height="100%"
                  gridOptions={{
                    pagination: false,
                    domLayout: 'normal',
                    rowHeight: 48,
                    getRowId: (params) => String(params.data.id),
                    getRowClass: (params) => {
                      if (params.data?.isNew) return 'ag-row-new';
                      return undefined;
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions data-id-ref="modbus-gateway-mappings-dialog-actions">
        <Button
          data-id-ref="mappings-cancel-btn"
          onClick={onClose}
          disabled={saving}
        >
          {t('close')}
        </Button>
        <Button
          data-id-ref="mappings-save-btn"
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSaveChanges}
          disabled={!hasChanges || saving}
        >
          {saving ? t('common.saving') : t('modbusGateway.mappings.saveChanges')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModbusGatewayMappingsDialog;
