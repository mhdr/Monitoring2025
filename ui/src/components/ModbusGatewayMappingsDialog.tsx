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
  PlaylistAdd as PlaylistAddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
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
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusGatewayMappingsDialog');

/**
 * Helper function to derive default mapping values based on selected monitoring item.
 * This auto-populates form fields when user selects an item to help with correct configuration.
 * 
 * Mapping rules:
 * - Modbus address: Uses item's pointNumber as the default address
 * - Register type: Based on item type direction (input/output) and data type (digital/analog)
 * - Data representation: Digital items use Int16, Analog items use Float32
 * - Endianness: Only relevant for Float32 (multi-register), uses BigEndian as default
 */
const getDefaultMappingFromItem = (item: Item): Partial<AddMappingFormData> => {
  const isDigital = item.itemType === ItemTypeEnum.DigitalInput || item.itemType === ItemTypeEnum.DigitalOutput;
  const isOutput = item.itemType === ItemTypeEnum.DigitalOutput || item.itemType === ItemTypeEnum.AnalogOutput;
  
  // Determine register type based on item type:
  // - DigitalInput → DiscreteInput (read-only bit, function code 02)
  // - DigitalOutput → Coil (read/write bit, function codes 01, 05, 15)
  // - AnalogInput → InputRegister (read-only register, function code 04)
  // - AnalogOutput → HoldingRegister (read/write register, function codes 03, 06, 16)
  let registerType: ModbusRegisterType;
  if (isDigital) {
    registerType = isOutput ? ModbusRegisterTypeEnum.Coil : ModbusRegisterTypeEnum.DiscreteInput;
  } else {
    registerType = isOutput ? ModbusRegisterTypeEnum.HoldingRegister : ModbusRegisterTypeEnum.InputRegister;
  }
  
  // Determine data representation based on item type:
  // - Digital items use Int16 (single register for boolean-like values)
  // - Analog items use Float32 (two registers for floating point values)
  const dataRepresentation: ModbusDataRepresentation = isDigital 
    ? ModbusDataRepresentationEnum.Int16 
    : ModbusDataRepresentationEnum.Float32;
  
  // Endianness is only relevant for Float32 (multi-register values)
  // For digital items, we use None as it doesn't apply
  const endianness: EndiannessType = isDigital 
    ? EndiannessTypeEnum.None 
    : EndiannessTypeEnum.BigEndian;
  
  return {
    modbusAddress: item.pointNumber,
    registerType,
    dataRepresentation,
    endianness,
  };
};

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

  // Edit mapping state
  const [editingMapping, setEditingMapping] = useState<EditableMapping | null>(null);
  const [editFormData, setEditFormData] = useState<AddMappingFormData>({

    itemId: '',
    modbusAddress: 0,
    registerType: ModbusRegisterTypeEnum.HoldingRegister,
    dataRepresentation: ModbusDataRepresentationEnum.Float32,
    endianness: EndiannessTypeEnum.BigEndian,
    scaleMin: 0,
    scaleMax: 100,
  });

  // Starting address for bulk additions
  const [bulkStartingAddress, setBulkStartingAddress] = useState<number>(1);

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

  /**
   * Calculate the next available address for a specific register type.
   * Finds the highest used address (considering register count) among existing mappings.
   * @param registerType The register type to check
   * @param existingMappings Current mappings to check for address usage
   * @param userStartingAddress User-specified minimum starting address
   * @returns The next available address (max of user starting address and end of existing allocations)
   */
  const calculateNextAvailableAddress = useCallback((
    registerType: ModbusRegisterType,
    existingMappings: EditableMapping[],
    userStartingAddress: number
  ): number => {
    // Filter mappings by register type (only non-deleted ones)
    const typeMappings = existingMappings.filter(
      m => m.registerType === registerType && !m.isDeleted
    );
    
    if (typeMappings.length === 0) {
      return userStartingAddress;
    }

    // Find the maximum end address (modbusAddress + registerCount)
    const maxEndAddress = Math.max(
      ...typeMappings.map(m => m.modbusAddress + m.registerCount)
    );

    // Return the higher of user-specified starting address or next available
    return Math.max(userStartingAddress, maxEndAddress);
  }, []);

  /**
   * Allocate sequential addresses for a list of items, grouped by register type.
   * Each register type has its own address space, starting from user-specified address
   * or continuing from existing mappings (whichever is higher).
   * @param items Items to allocate addresses for
   * @param existingMappings Current mappings to consider
   * @param userStartingAddress User-specified starting address
   * @returns Map of itemId → allocated modbusAddress
   */
  const allocateSequentialAddresses = useCallback((
    items: Item[],
    existingMappings: EditableMapping[],
    userStartingAddress: number
  ): Map<string, number> => {
    const addressMap = new Map<string, number>();
    
    // Group items by their target register type
    const itemsByRegisterType = new Map<ModbusRegisterType, Array<{ item: Item; dataRep: ModbusDataRepresentation }>>();
    
    for (const item of items) {
      const defaults = getDefaultMappingFromItem(item);
      const registerType = defaults.registerType ?? ModbusRegisterTypeEnum.HoldingRegister;
      const dataRep = defaults.dataRepresentation ?? ModbusDataRepresentationEnum.Float32;
      
      if (!itemsByRegisterType.has(registerType)) {
        itemsByRegisterType.set(registerType, []);
      }
      itemsByRegisterType.get(registerType)!.push({ item, dataRep });
    }
    
    // Allocate addresses for each register type group
    for (const [registerType, itemsWithType] of itemsByRegisterType) {
      let currentAddress = calculateNextAvailableAddress(
        registerType,
        existingMappings,
        userStartingAddress
      );
      
      for (const { item, dataRep } of itemsWithType) {
        addressMap.set(item.id, currentAddress);
        // Advance by register count (2 for Float32, 1 for others)
        currentAddress += getRegisterCount(dataRep);
      }
    }
    
    return addressMap;
  }, [calculateNextAvailableAddress]);

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

  // Handle starting edit of a mapping
  const handleStartEditMapping = useCallback((mapping: EditableMapping) => {
    setEditingMapping(mapping);
    setEditFormData({
      itemId: mapping.itemId,
      modbusAddress: mapping.modbusAddress,
      registerType: mapping.registerType,
      dataRepresentation: mapping.dataRepresentation,
      endianness: mapping.endianness,
      scaleMin: mapping.scaleMin ?? 0,
      scaleMax: mapping.scaleMax ?? 100,
    });
    setShowAddForm(false);
  }, []);

  // Handle saving edit of a mapping
  const handleSaveEditMapping = useCallback(() => {
    if (!editingMapping) return;

    const updatedMapping: EditableMapping = {
      ...editingMapping,
      modbusAddress: editFormData.modbusAddress,
      registerType: editFormData.registerType,
      dataRepresentation: editFormData.dataRepresentation,
      endianness: editFormData.endianness,
      registerCount: getRegisterCount(editFormData.dataRepresentation),
      scaleMin: editFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger
        ? (editFormData.scaleMin === '' ? 0 : editFormData.scaleMin)
        : null,
      scaleMax: editFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger
        ? (editFormData.scaleMax === '' ? 100 : editFormData.scaleMax)
        : null,
      isModified: !editingMapping.isNew, // Only mark as modified if not a new mapping
    };

    setMappings(prev => prev.map(m => 
      m.id === editingMapping.id ? updatedMapping : m
    ));
    setHasChanges(true);
    setEditingMapping(null);
  }, [editingMapping, editFormData]);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingMapping(null);
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

  // Editable chip template for Syncfusion Grid
  const editableTemplate = useCallback((props: unknown) => {
    const mapping = props as EditableMapping;
    return (
      <Chip
        data-id-ref={`mapping-editable-chip-${mapping.id}`}
        label={mapping.isEditable ? t('common.yes') : t('common.no')}
        color={mapping.isEditable ? 'success' : 'default'}
        size="small"
        variant="outlined"
      />
    );
  }, [t]);

  // Actions template for Syncfusion Grid
  const actionsTemplate = useCallback((props: unknown) => {
    const mapping = props as EditableMapping;
    return (
      <Box
        data-id-ref={`mapping-actions-${mapping.id}`}
        sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
      >
        <Tooltip title={t('edit')}>
          <IconButton
            data-id-ref={`mapping-edit-btn-${mapping.id}`}
            size="small"
            color="primary"
            onClick={() => handleStartEditMapping(mapping)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
  }, [t, handleDeleteMapping, handleStartEditMapping]);

  // Prepare row data with derived fields for Syncfusion Grid
  const rowData = useMemo(() => {
    return displayMappings.map((mapping) => ({
      ...mapping,
      registerTypeName: getRegisterTypeLabel(mapping.registerType),
      itemDisplay: language === 'fa' && mapping.itemNameFa ? mapping.itemNameFa : (mapping.itemName || mapping.itemId || ''),
      dataRepName: getDataRepLabel(mapping.dataRepresentation),
      endiannessName: getEndiannessLabel(mapping.endianness),
    }));
  }, [displayMappings, language, getRegisterTypeLabel, getDataRepLabel, getEndiannessLabel]);

  // Mapping column definitions for Syncfusion Grid
  const columnDefs = useMemo<SyncfusionColumnDef[]>(() => {
    return [
      {
        field: 'modbusAddress',
        headerText: t('modbusGateway.mappings.modbusAddress'),
        width: 130,
        minWidth: 100,
        allowSorting: true,
      },
      {
        field: 'registerTypeName',
        headerText: t('modbusGateway.mappings.registerType'),
        width: 160,
        minWidth: 140,
        allowSorting: true,
      },
      {
        field: 'itemDisplay',
        headerText: t('modbusGateway.mappings.item'),
        width: 200,
        minWidth: 150,
        allowSorting: true,
      },
      {
        field: 'dataRepName',
        headerText: t('modbusGateway.mappings.dataRepresentation'),
        width: 160,
        minWidth: 140,
        allowSorting: true,
      },
      {
        field: 'endiannessName',
        headerText: t('modbusGateway.mappings.endianness'),
        width: 160,
        minWidth: 140,
        allowSorting: true,
      },
      {
        field: 'registerCount',
        headerText: t('modbusGateway.mappings.registerCount'),
        width: 100,
        minWidth: 80,
        allowSorting: true,
      },
      {
        field: 'isEditable',
        headerText: t('modbusGateway.mappings.isEditable'),
        width: 100,
        minWidth: 80,
        template: editableTemplate,
      },
      {
        field: 'id',
        headerText: t('common.actions'),
        width: 110,
        minWidth: 110,
        allowSorting: false,
        allowFiltering: false,
        template: actionsTemplate,
      },
    ];
  }, [t, editableTemplate, actionsTemplate]);

  // Get available items (not already mapped)
  const availableItems = useMemo(() => {
    const mappedItemIds = new Set(displayMappings.map(m => m.itemId));
    return monitoringItems.filter(item => !mappedItemIds.has(item.id));
  }, [monitoringItems, displayMappings]);

  // Handle adding all available items with default configurations
  // Uses sequential address allocation grouped by register type to avoid conflicts
  const handleAddAllItems = useCallback(() => {
    if (availableItems.length === 0) return;

    // Allocate addresses sequentially, grouped by register type
    const addressAllocation = allocateSequentialAddresses(
      availableItems,
      mappings,
      bulkStartingAddress
    );

    const newMappings: EditableMapping[] = availableItems.map((item, index) => {
      const defaults = getDefaultMappingFromItem(item);
      const dataRep = defaults.dataRepresentation ?? ModbusDataRepresentationEnum.Float32;
      const allocatedAddress = addressAllocation.get(item.id) ?? bulkStartingAddress;
      
      return {
        id: `new-${Date.now()}-${index}`,
        gatewayId: gateway.id,
        modbusAddress: allocatedAddress,
        registerType: defaults.registerType ?? ModbusRegisterTypeEnum.HoldingRegister,
        itemId: item.id,
        itemName: item.name,
        itemNameFa: item.nameFa || null,
        isEditable: item.isEditable,
        registerCount: getRegisterCount(dataRep),
        dataRepresentation: dataRep,
        endianness: defaults.endianness ?? EndiannessTypeEnum.BigEndian,
        scaleMin: null,
        scaleMax: null,
        isNew: true,
        isModified: false,
        isDeleted: false,
      };
    });

    setMappings(prev => [...prev, ...newMappings]);
    setHasChanges(true);
    setShowAddForm(false);
  }, [availableItems, gateway.id, mappings, bulkStartingAddress, allocateSequentialAddresses]);

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
                      if (newValue) {
                        // Auto-populate form fields based on selected item
                        const defaults = getDefaultMappingFromItem(newValue);
                        setAddFormData(prev => ({ 
                          ...prev, 
                          itemId: newValue.id,
                          modbusAddress: defaults.modbusAddress ?? prev.modbusAddress,
                          registerType: defaults.registerType ?? prev.registerType,
                          dataRepresentation: defaults.dataRepresentation ?? prev.dataRepresentation,
                          endianness: defaults.endianness ?? prev.endianness,
                        }));
                      } else {
                        setAddFormData(prev => ({ ...prev, itemId: '' }));
                      }
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

            {/* Edit Mapping Form */}
            {editingMapping && (
              <Box
                data-id-ref="edit-mapping-form"
                sx={{
                  mb: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  backgroundColor: 'action.hover',
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('modbusGateway.mappings.editMapping')} - {language === 'fa' && editingMapping.itemNameFa ? editingMapping.itemNameFa : editingMapping.itemName}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
                  <TextField
                    data-id-ref="edit-mapping-address-input"
                    label={t('modbusGateway.mappings.modbusAddress')}
                    type="number"
                    size="small"
                    value={editFormData.modbusAddress}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, modbusAddress: Number(e.target.value) }))}
                    inputProps={{ min: 0 }}
                    sx={{ width: 120 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t('modbusGateway.mappings.registerType')}</InputLabel>
                    <Select
                      data-id-ref="edit-mapping-regtype-select"
                      value={editFormData.registerType}
                      label={t('modbusGateway.mappings.registerType')}
                      onChange={(e: SelectChangeEvent<number>) => 
                        setEditFormData(prev => ({ ...prev, registerType: e.target.value as ModbusRegisterType }))
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
                      data-id-ref="edit-mapping-datarep-select"
                      value={editFormData.dataRepresentation}
                      label={t('modbusGateway.mappings.dataRepresentation')}
                      onChange={(e: SelectChangeEvent<number>) => 
                        setEditFormData(prev => ({ ...prev, dataRepresentation: e.target.value as ModbusDataRepresentation }))
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

                  {editFormData.dataRepresentation === ModbusDataRepresentationEnum.Float32 && (
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>{t('modbusGateway.mappings.endianness')}</InputLabel>
                      <Select
                        data-id-ref="edit-mapping-endian-select"
                        value={editFormData.endianness}
                        label={t('modbusGateway.mappings.endianness')}
                        onChange={(e: SelectChangeEvent<number>) => 
                          setEditFormData(prev => ({ ...prev, endianness: e.target.value as EndiannessType }))
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

                  {editFormData.dataRepresentation === ModbusDataRepresentationEnum.ScaledInteger && (
                    <>
                      <TextField
                        data-id-ref="edit-mapping-scalemin-input"
                        label={t('modbusGateway.mappings.scaleMin')}
                        type="number"
                        size="small"
                        value={editFormData.scaleMin}
                        onChange={(e) => setEditFormData(prev => ({ 
                          ...prev, 
                          scaleMin: e.target.value === '' ? '' : Number(e.target.value) 
                        }))}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        data-id-ref="edit-mapping-scalemax-input"
                        label={t('modbusGateway.mappings.scaleMax')}
                        type="number"
                        size="small"
                        value={editFormData.scaleMax}
                        onChange={(e) => setEditFormData(prev => ({ 
                          ...prev, 
                          scaleMax: e.target.value === '' ? '' : Number(e.target.value) 
                        }))}
                        sx={{ width: 100 }}
                      />
                    </>
                  )}

                  <Button
                    data-id-ref="edit-mapping-save-btn"
                    variant="contained"
                    size="small"
                    onClick={handleSaveEditMapping}
                    sx={{ height: 40 }}
                  >
                    {t('save')}
                  </Button>
                  <Button
                    data-id-ref="edit-mapping-cancel-btn"
                    variant="outlined"
                    size="small"
                    onClick={handleCancelEdit}
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
              sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start', pt: 1 }}
            >
              <Button
                data-id-ref="mappings-add-btn"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowAddForm(true)}
                disabled={showAddForm || saving || !!editingMapping}
              >
                {t('modbusGateway.mappings.addMapping')}
              </Button>

              <TextField
                data-id-ref="mappings-starting-address-input"
                label={t('modbusGateway.mappings.startingAddress')}
                type="number"
                size="small"
                value={bulkStartingAddress}
                onChange={(e) => setBulkStartingAddress(Math.max(1, Number(e.target.value) || 1))}
                inputProps={{ min: 1 }}
                sx={{ width: 140 }}
                disabled={showAddForm || saving || !!editingMapping}
              />

              <Tooltip title={t('modbusGateway.mappings.addAllItemsTooltip')}>
                <span>
                  <Button
                    data-id-ref="mappings-add-all-btn"
                    variant="outlined"
                    color="secondary"
                    startIcon={<PlaylistAddIcon />}
                    onClick={handleAddAllItems}
                    disabled={showAddForm || saving || availableItems.length === 0 || !!editingMapping}
                  >
                    {t('modbusGateway.mappings.addAllItems')}
                  </Button>
                </span>
              </Tooltip>
              
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
                <SyncfusionGridWrapper
                  data={rowData}
                  columns={columnDefs}
                  height="100%"
                  allowPaging={false}
                  allowSorting={true}
                  allowResizing={true}
                  data-id-ref="gateway-mappings-grid"
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
