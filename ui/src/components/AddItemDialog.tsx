import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { addItem } from '../services/monitoringApi';
import type {
  AddItemRequestDto,
} from '../types/api';
import { AddItemErrorType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddItemDialog');

// Constants matching backend enums
const ItemTypeEnum = {
  DigitalInput: 1,
  DigitalOutput: 2,
  AnalogInput: 3,
  AnalogOutput: 4,
} as const;

const ShouldScaleTypeEnum = {
  Yes: 1,
  No: 2,
} as const;

const ValueCalculationMethodEnum = {
  LastValue: 0,
  Average: 1,
} as const;

const SaveOnChangeEnum = {
  Default: 0,
  On: 1,
  Off: 2,
} as const;

const InterfaceTypeEnum = {
  None: 0,
  Sharp7: 1,
  BACnet: 2,
  Modbus: 3,
} as const;

type ItemType = typeof ItemTypeEnum[keyof typeof ItemTypeEnum];
type ShouldScaleType = typeof ShouldScaleTypeEnum[keyof typeof ShouldScaleTypeEnum];
type ValueCalculationMethod = typeof ValueCalculationMethodEnum[keyof typeof ValueCalculationMethodEnum];
type SaveOnChange = typeof SaveOnChangeEnum[keyof typeof SaveOnChangeEnum];
type InterfaceType = typeof InterfaceTypeEnum[keyof typeof InterfaceTypeEnum];

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  parentGroupId?: string | null;
  onSuccess?: () => void;
}

interface AddItemFormData {
  itemType: ItemType;
  itemName: string;
  itemNameFa: string;
  pointNumber: number;
  shouldScale: ShouldScaleType;
  rawHigh: number;
  rawLow: number;
  scaleHigh: number;
  scaleLow: number;
  valueCalculationMethod: ValueCalculationMethod;
  saveIntervalSeconds: number;
  saveHistoricalIntervalSeconds: number;
  numberOfSamples: number;
  saveOnChange: SaveOnChange;
  saveOnChangeRange: number;
  onText: string;
  onTextFa: string;
  offText: string;
  offTextFa: string;
  unit: string;
  unitFa: string;
  isDisabled: boolean;
  isCalibrationEnabled: boolean;
  calibrationA: number;
  calibrationB: number;
  interfaceType: InterfaceType;
  isEditable: boolean;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onClose,
  parentGroupId,
  onSuccess,
}) => {
  const { t } = useLanguage();
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<AddItemFormData>({
    itemType: ItemTypeEnum.DigitalInput,
    itemName: '',
    itemNameFa: '',
    pointNumber: 0,
    shouldScale: ShouldScaleTypeEnum.No,
    rawHigh: 0,
    rawLow: 0,
    scaleHigh: 0,
    scaleLow: 0,
    valueCalculationMethod: ValueCalculationMethodEnum.LastValue,
    saveIntervalSeconds: 4,
    saveHistoricalIntervalSeconds: 60,
    numberOfSamples: 1,
    saveOnChange: SaveOnChangeEnum.Default,
    saveOnChangeRange: 0,
    onText: '',
    onTextFa: '',
    offText: '',
    offTextFa: '',
    unit: '',
    unitFa: '',
    isDisabled: false,
    isCalibrationEnabled: false,
    calibrationA: 1.0,
    calibrationB: 0.0,
    interfaceType: InterfaceTypeEnum.None,
    isEditable: false,
  });

  // Determine if item is digital (type 1 or 2) or analog (type 3 or 4)
  const isDigital = useMemo(() => {
    return formData.itemType === ItemTypeEnum.DigitalInput || formData.itemType === ItemTypeEnum.DigitalOutput;
  }, [formData.itemType]);

  const isAnalog = useMemo(() => {
    return formData.itemType === ItemTypeEnum.AnalogInput || formData.itemType === ItemTypeEnum.AnalogOutput;
  }, [formData.itemType]);

  const shouldShowScaling = useMemo(() => {
    return isAnalog && formData.shouldScale === ShouldScaleTypeEnum.Yes;
  }, [isAnalog, formData.shouldScale]);

  const handleFieldChange = <K extends keyof AddItemFormData>(
    field: K,
    value: AddItemFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    setSaveError(null);

    if (!formData.itemName.trim()) {
      setSaveError(t('addItemDialog.errors.itemNameRequired'));
      return false;
    }

    if (formData.pointNumber < 0) {
      setSaveError(t('addItemDialog.errors.invalidPointNumber'));
      return false;
    }

    if (formData.saveIntervalSeconds <= 0) {
      setSaveError(t('addItemDialog.errors.invalidSaveInterval'));
      return false;
    }

    if (shouldShowScaling) {
      if (formData.rawHigh === formData.rawLow) {
        setSaveError(t('addItemDialog.errors.invalidRawRange'));
        return false;
      }
      if (formData.scaleHigh === formData.scaleLow) {
        setSaveError(t('addItemDialog.errors.invalidScaleRange'));
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});
    logger.log('Adding new item');

    try {
      // Helper function to convert empty strings to null, preserve other values
      const stringOrNull = (value: string): string | null => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      // Helper function to preserve numeric values including 0, convert undefined to null
      const numberOrNull = (value: number | undefined | null): number | null => {
        return value !== null && value !== undefined ? value : null;
      };

      const requestDto: AddItemRequestDto = {
        itemType: formData.itemType,
        itemName: formData.itemName.trim(), // Required field - trim but keep as-is
        itemNameFa: stringOrNull(formData.itemNameFa),
        pointNumber: formData.pointNumber,
        shouldScale: formData.shouldScale,
        normMin: formData.rawLow,
        normMax: formData.rawHigh,
        scaleMin: formData.scaleLow,
        scaleMax: formData.scaleHigh,
        saveInterval: formData.saveIntervalSeconds,
        saveHistoricalInterval: formData.saveHistoricalIntervalSeconds,
        calculationMethod: formData.valueCalculationMethod,
        numberOfSamples: formData.numberOfSamples,
        // Send null for Default (0), otherwise send the actual value
        saveOnChange: formData.saveOnChange === SaveOnChangeEnum.Default ? null : formData.saveOnChange,
        saveOnChangeRange: numberOrNull(formData.saveOnChangeRange),
        onText: stringOrNull(formData.onText),
        onTextFa: stringOrNull(formData.onTextFa),
        offText: stringOrNull(formData.offText),
        offTextFa: stringOrNull(formData.offTextFa),
        unit: stringOrNull(formData.unit),
        unitFa: stringOrNull(formData.unitFa),
        isDisabled: formData.isDisabled,
        isCalibrationEnabled: formData.isCalibrationEnabled ? formData.isCalibrationEnabled : null,
        calibrationA: numberOrNull(formData.calibrationA),
        calibrationB: numberOrNull(formData.calibrationB),
        interfaceType: formData.interfaceType,
        isEditable: formData.isEditable,
        parentGroupId: parentGroupId || null,
      };

      logger.log('Sending add request with DTO:', requestDto);
      const response = await addItem(requestDto);

      if (!response.success) {
        const errorType = response.error;
        let errorMessage = t('addItemDialog.errors.saveFailed');

        if (errorType !== undefined) {
          switch (errorType) {
            case AddItemErrorType.InvalidPointNumber:
              errorMessage = t('addItemDialog.errors.invalidPointNumber');
              break;
            case AddItemErrorType.DuplicatePointNumber:
              errorMessage = t('addItemDialog.errors.duplicatePointNumber');
              break;
            case AddItemErrorType.ValidationError:
              errorMessage = response.message || t('addItemDialog.errors.validationError');
              break;
            case AddItemErrorType.Unauthorized:
              errorMessage = t('addItemDialog.errors.unauthorized');
              break;
          }
        }

        setSaveError(errorMessage);
        logger.error('Failed to add item:', response.message, 'Error type:', errorType);
        return;
      }

      logger.log('Item added successfully', { itemId: response.itemId });
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error) {
      logger.error('Error adding item:', error);
      
      // Check if this is a validation error with field-specific errors
      const apiError = error as Error & { status?: number; errors?: Record<string, string[]> };
      
      if (apiError.status === 400 && apiError.errors) {
        // Parse validation errors - map PascalCase backend fields to camelCase form fields
        const fieldErrorMap: Record<string, string> = {};
        const fieldNameMap: Record<string, string> = {
          'ItemName': 'itemName',
          'ItemNameFa': 'itemNameFa',
          'PointNumber': 'pointNumber',
          'NumberOfSamples': 'numberOfSamples',
          'SaveInterval': 'saveIntervalSeconds',
          'SaveHistoricalInterval': 'saveHistoricalIntervalSeconds',
          'NormMin': 'rawLow',
          'NormMax': 'rawHigh',
          'ScaleMin': 'scaleLow',
          'ScaleMax': 'scaleHigh',
          'Unit': 'unit',
          'UnitFa': 'unitFa',
          'OnText': 'onText',
          'OnTextFa': 'onTextFa',
          'OffText': 'offText',
          'OffTextFa': 'offTextFa',
          'CalibrationA': 'calibrationA',
          'CalibrationB': 'calibrationB',
          'SaveOnChangeRange': 'saveOnChangeRange',
        };
        
        // Convert backend errors to field errors
        Object.keys(apiError.errors).forEach((backendField) => {
          const formField = fieldNameMap[backendField] || backendField.charAt(0).toLowerCase() + backendField.slice(1);
          const errorMessages = apiError.errors![backendField];
          if (errorMessages && errorMessages.length > 0) {
            // Join multiple error messages with a space
            fieldErrorMap[formField] = errorMessages.join(' ');
          }
        });
        
        setFieldErrors(fieldErrorMap);
        setSaveError(t('addItemDialog.errors.validationErrorsFound'));
        logger.error('Validation errors:', fieldErrorMap);
      } else {
        // Generic error
        setSaveError(apiError.message || t('addItemDialog.errors.saveFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setFormData({
        itemType: ItemTypeEnum.DigitalInput,
        itemName: '',
        itemNameFa: '',
        pointNumber: 0,
        shouldScale: ShouldScaleTypeEnum.No,
        rawHigh: 0,
        rawLow: 0,
        scaleHigh: 0,
        scaleLow: 0,
        valueCalculationMethod: ValueCalculationMethodEnum.LastValue,
        saveIntervalSeconds: 4,
        saveHistoricalIntervalSeconds: 60,
        numberOfSamples: 1,
        saveOnChange: SaveOnChangeEnum.Default,
        saveOnChangeRange: 0,
        onText: '',
        onTextFa: '',
        offText: '',
        offTextFa: '',
        unit: '',
        unitFa: '',
        isDisabled: false,
        isCalibrationEnabled: false,
        calibrationA: 1.0,
        calibrationB: 0.0,
        interfaceType: InterfaceTypeEnum.None,
        isEditable: false,
      });
      setSaveError(null);
      setFieldErrors({});
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-id-ref="add-item-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <DialogTitle data-id-ref="add-item-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="span">
            {t('addItemDialog.title')}
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClose}
            disabled={isSaving}
            aria-label={t('common.close')}
            data-id-ref="add-item-dialog-close-button"
          >
            <CloseIcon data-id-ref="add-item-dialog-close-icon" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="add-item-dialog-content">
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="add-item-dialog-save-error">
            {saveError}
          </Alert>
        )}

        <Box data-id-ref="add-item-dialog-form">
          {/* Basic Information Section */}
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            gutterBottom
            data-id-ref="add-item-dialog-basic-info-heading"
          >
            {t('addItemDialog.sections.basicInformation')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth disabled={isSaving}>
                <InputLabel id="item-type-label">{t('addItemDialog.fields.itemType')}</InputLabel>
                <Select
                  labelId="item-type-label"
                  value={formData.itemType}
                  label={t('addItemDialog.fields.itemType')}
                  onChange={(e) => handleFieldChange('itemType', e.target.value as ItemType)}
                  data-id-ref="add-item-dialog-item-type"
                >
                  <MenuItem value={ItemTypeEnum.DigitalInput}>
                    {t('itemCard.itemTypes.digitalInput')}
                  </MenuItem>
                  <MenuItem value={ItemTypeEnum.DigitalOutput}>
                    {t('itemCard.itemTypes.digitalOutput')}
                  </MenuItem>
                  <MenuItem value={ItemTypeEnum.AnalogInput}>
                    {t('itemCard.itemTypes.analogInput')}
                  </MenuItem>
                  <MenuItem value={ItemTypeEnum.AnalogOutput}>
                    {t('itemCard.itemTypes.analogOutput')}
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label={t('addItemDialog.fields.pointNumber')}
                type="number"
                value={formData.pointNumber}
                onChange={(e) => handleFieldChange('pointNumber', parseInt(e.target.value) || 0)}
                disabled={isSaving}
                required
                error={!!fieldErrors.pointNumber}
                helperText={fieldErrors.pointNumber || ''}
                inputProps={{ min: 0, max: 2147483647 }}
                data-id-ref="add-item-dialog-point-number"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth disabled={isSaving}>
                <InputLabel id="interface-type-label">{t('addItemDialog.fields.interfaceType')}</InputLabel>
                <Select
                  labelId="interface-type-label"
                  value={formData.interfaceType}
                  label={t('addItemDialog.fields.interfaceType')}
                  onChange={(e) => handleFieldChange('interfaceType', e.target.value as InterfaceType)}
                  data-id-ref="add-item-dialog-interface-type"
                >
                  <MenuItem value={InterfaceTypeEnum.None}>
                    {t('addItemDialog.interfaceTypes.none')}
                  </MenuItem>
                  <MenuItem value={InterfaceTypeEnum.Sharp7}>
                    {t('addItemDialog.interfaceTypes.sharp7')}
                  </MenuItem>
                  <MenuItem value={InterfaceTypeEnum.BACnet}>
                    {t('addItemDialog.interfaceTypes.bacnet')}
                  </MenuItem>
                  <MenuItem value={InterfaceTypeEnum.Modbus}>
                    {t('addItemDialog.interfaceTypes.modbus')}
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isEditable}
                    onChange={(e) => handleFieldChange('isEditable', e.target.checked)}
                    disabled={isSaving}
                    data-id-ref="add-item-dialog-is-editable-switch"
                  />
                }
                label={t('addItemDialog.fields.isEditable')}
                sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}
                data-id-ref="add-item-dialog-is-editable"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label={t('addItemDialog.fields.itemName')}
                value={formData.itemName}
                onChange={(e) => handleFieldChange('itemName', e.target.value)}
                disabled={isSaving}
                required
                error={!!fieldErrors.itemName}
                helperText={fieldErrors.itemName || ''}
                inputProps={{ maxLength: 200 }}
                data-id-ref="add-item-dialog-item-name"
              />

              <TextField
                fullWidth
                label={t('addItemDialog.fields.itemNameFa')}
                value={formData.itemNameFa}
                onChange={(e) => handleFieldChange('itemNameFa', e.target.value)}
                disabled={isSaving}
                error={!!fieldErrors.itemNameFa}
                helperText={fieldErrors.itemNameFa || ''}
                inputProps={{ maxLength: 200 }}
                data-id-ref="add-item-dialog-item-name-fa"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth>
                <InputLabel id="value-calc-method-label">{t('addItemDialog.fields.valueCalculationMethod')}</InputLabel>
                <Select
                  labelId="value-calc-method-label"
                  value={formData.valueCalculationMethod}
                  label={t('addItemDialog.fields.valueCalculationMethod')}
                  onChange={(e) => handleFieldChange('valueCalculationMethod', e.target.value as ValueCalculationMethod)}
                  disabled={isSaving}
                  data-id-ref="add-item-dialog-value-calc-method"
                >
                  <MenuItem value={ValueCalculationMethodEnum.LastValue}>
                    {t('addItemDialog.valueCalculationMethods.lastValue')}
                  </MenuItem>
                  <MenuItem value={ValueCalculationMethodEnum.Average}>
                    {t('addItemDialog.valueCalculationMethods.average')}
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label={t('addItemDialog.fields.numberOfSamples')}
                type="number"
                value={formData.numberOfSamples}
                onChange={(e) => handleFieldChange('numberOfSamples', parseInt(e.target.value) || 1)}
                disabled={isSaving}
                required
                error={!!fieldErrors.numberOfSamples}
                helperText={fieldErrors.numberOfSamples || ''}
                inputProps={{ min: 1, max: 100 }}
                data-id-ref="add-item-dialog-number-of-samples"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label={t('addItemDialog.fields.saveIntervalSeconds')}
                type="number"
                value={formData.saveIntervalSeconds}
                onChange={(e) => handleFieldChange('saveIntervalSeconds', parseInt(e.target.value) || 5)}
                disabled={isSaving}
                required
                error={!!fieldErrors.saveIntervalSeconds}
                helperText={fieldErrors.saveIntervalSeconds || ''}
                inputProps={{ min: 1, max: 3600 }}
                data-id-ref="add-item-dialog-save-interval"
              />

              <TextField
                fullWidth
                label={t('addItemDialog.fields.saveHistoricalIntervalSeconds')}
                type="number"
                value={formData.saveHistoricalIntervalSeconds}
                onChange={(e) => handleFieldChange('saveHistoricalIntervalSeconds', parseInt(e.target.value) || 5)}
                disabled={isSaving}
                required
                error={!!fieldErrors.saveHistoricalIntervalSeconds}
                helperText={fieldErrors.saveHistoricalIntervalSeconds || ''}
                inputProps={{ min: 1, max: 3600 }}
                data-id-ref="add-item-dialog-save-historical-interval"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDisabled}
                  onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                  disabled={isSaving}
                  data-id-ref="add-item-dialog-is-disabled-switch"
                />
              }
              label={t('addItemDialog.fields.isDisabled')}
              data-id-ref="add-item-dialog-is-disabled"
            />
          </Box>

          {/* Advanced Settings Section */}
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            gutterBottom
            data-id-ref="add-item-dialog-advanced-settings-heading"
          >
            {t('addItemDialog.sections.advancedSettings')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {/* Save On Change */}
            <FormControl fullWidth disabled={isSaving}>
              <InputLabel id="save-on-change-label">
                {t('addItemDialog.fields.saveOnChange')}
              </InputLabel>
              <Select
                labelId="save-on-change-label"
                id="save-on-change"
                value={formData.saveOnChange}
                label={t('addItemDialog.fields.saveOnChange')}
                onChange={(e) => handleFieldChange('saveOnChange', e.target.value as SaveOnChange)}
                data-id-ref="add-item-dialog-save-on-change"
              >
                <MenuItem value={SaveOnChangeEnum.Default}>
                  {t('addItemDialog.saveOnChangeOptions.default')}
                </MenuItem>
                <MenuItem value={SaveOnChangeEnum.On}>
                  {t('addItemDialog.saveOnChangeOptions.on')}
                </MenuItem>
                <MenuItem value={SaveOnChangeEnum.Off}>
                  {t('addItemDialog.saveOnChangeOptions.off')}
                </MenuItem>
              </Select>
            </FormControl>

            {/* Save On Change Range - shown only when Save On Change is enabled */}
            {formData.saveOnChange === SaveOnChangeEnum.On && (
              <TextField
                fullWidth
                label={t('addItemDialog.fields.saveOnChangeRange')}
                type="number"
                value={formData.saveOnChangeRange}
                onChange={(e) => handleFieldChange('saveOnChangeRange', parseFloat(e.target.value) || 0)}
                disabled={isSaving}
                error={!!fieldErrors.saveOnChangeRange}
                helperText={fieldErrors.saveOnChangeRange || t('addItemDialog.fields.saveOnChangeRangeHelper')}
                inputProps={{ min: 0, step: 0.1 }}
                data-id-ref="add-item-dialog-save-on-change-range"
              />
            )}

            {/* Calibration Settings */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isCalibrationEnabled}
                  onChange={(e) => handleFieldChange('isCalibrationEnabled', e.target.checked)}
                  disabled={isSaving}
                  data-id-ref="add-item-dialog-is-calibration-enabled-switch"
                />
              }
              label={t('addItemDialog.fields.isCalibrationEnabled')}
              data-id-ref="add-item-dialog-is-calibration-enabled"
            />

            {/* Calibration Coefficients - shown only when calibration is enabled */}
            {formData.isCalibrationEnabled && (
              <>
                <Typography variant="body2" color="text.secondary" data-id-ref="add-item-dialog-calibration-formula">
                  {t('addItemDialog.fields.calibrationFormula')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.calibrationA')}
                    type="number"
                    value={formData.calibrationA}
                    onChange={(e) => handleFieldChange('calibrationA', parseFloat(e.target.value) || 1.0)}
                    disabled={isSaving}
                    error={!!fieldErrors.calibrationA}
                    helperText={fieldErrors.calibrationA || t('addItemDialog.fields.calibrationAHelper')}
                    inputProps={{ step: 0.01 }}
                    data-id-ref="add-item-dialog-calibration-a"
                  />

                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.calibrationB')}
                    type="number"
                    value={formData.calibrationB}
                    onChange={(e) => handleFieldChange('calibrationB', parseFloat(e.target.value) || 0.0)}
                    disabled={isSaving}
                    error={!!fieldErrors.calibrationB}
                    helperText={fieldErrors.calibrationB || t('addItemDialog.fields.calibrationBHelper')}
                    inputProps={{ step: 0.01 }}
                    data-id-ref="add-item-dialog-calibration-b"
                  />
                </Box>
              </>
            )}
          </Box>

          {/* Digital-specific Fields */}
          {isDigital && (
            <>
              <Typography 
                variant="subtitle1" 
                fontWeight="bold" 
                gutterBottom
                data-id-ref="add-item-dialog-digital-fields-heading"
              >
                {t('addItemDialog.sections.digitalFields')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.onText')}
                    value={formData.onText}
                    onChange={(e) => handleFieldChange('onText', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.onText}
                    helperText={fieldErrors.onText || ''}
                    inputProps={{ maxLength: 50 }}
                    data-id-ref="add-item-dialog-on-text"
                  />

                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.onTextFa')}
                    value={formData.onTextFa}
                    onChange={(e) => handleFieldChange('onTextFa', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.onTextFa}
                    helperText={fieldErrors.onTextFa || ''}
                    inputProps={{ maxLength: 50 }}
                    data-id-ref="add-item-dialog-on-text-fa"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.offText')}
                    value={formData.offText}
                    onChange={(e) => handleFieldChange('offText', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.offText}
                    helperText={fieldErrors.offText || ''}
                    inputProps={{ maxLength: 50 }}
                    data-id-ref="add-item-dialog-off-text"
                  />

                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.offTextFa')}
                    value={formData.offTextFa}
                    onChange={(e) => handleFieldChange('offTextFa', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.offTextFa}
                    helperText={fieldErrors.offTextFa || ''}
                    inputProps={{ maxLength: 50 }}
                    data-id-ref="add-item-dialog-off-text-fa"
                  />
                </Box>
              </Box>
            </>
          )}

          {/* Analog-specific Fields */}
          {isAnalog && (
            <>
              <Typography 
                variant="subtitle1" 
                fontWeight="bold" 
                gutterBottom
                data-id-ref="add-item-dialog-analog-fields-heading"
              >
                {t('addItemDialog.sections.analogFields')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.unit')}
                    value={formData.unit}
                    onChange={(e) => handleFieldChange('unit', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.unit}
                    helperText={fieldErrors.unit || ''}
                    inputProps={{ maxLength: 20 }}
                    data-id-ref="add-item-dialog-unit"
                  />

                  <TextField
                    fullWidth
                    label={t('addItemDialog.fields.unitFa')}
                    value={formData.unitFa}
                    onChange={(e) => handleFieldChange('unitFa', e.target.value)}
                    disabled={isSaving}
                    error={!!fieldErrors.unitFa}
                    helperText={fieldErrors.unitFa || ''}
                    inputProps={{ maxLength: 20 }}
                    data-id-ref="add-item-dialog-unit-fa"
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.shouldScale === ShouldScaleTypeEnum.Yes}
                      onChange={(e) => handleFieldChange(
                        'shouldScale',
                        e.target.checked ? ShouldScaleTypeEnum.Yes : ShouldScaleTypeEnum.No
                      )}
                      disabled={isSaving}
                      data-id-ref="add-item-dialog-should-scale-switch"
                    />
                  }
                  label={t('addItemDialog.fields.shouldScale')}
                  data-id-ref="add-item-dialog-should-scale"
                />

                {shouldShowScaling && (
                  <>
                    <Typography variant="body2" color="text.secondary" data-id-ref="add-item-dialog-raw-range-label">
                      {t('addItemDialog.sections.rawRange')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        fullWidth
                        label={t('addItemDialog.fields.rawLow')}
                        type="number"
                        value={formData.rawLow}
                        onChange={(e) => handleFieldChange('rawLow', parseFloat(e.target.value) || 0)}
                        disabled={isSaving}
                        error={!!fieldErrors.rawLow}
                        helperText={fieldErrors.rawLow || ''}
                        data-id-ref="add-item-dialog-raw-low"
                      />

                      <TextField
                        fullWidth
                        label={t('addItemDialog.fields.rawHigh')}
                        type="number"
                        value={formData.rawHigh}
                        onChange={(e) => handleFieldChange('rawHigh', parseFloat(e.target.value) || 0)}
                        disabled={isSaving}
                        error={!!fieldErrors.rawHigh}
                        helperText={fieldErrors.rawHigh || ''}
                        data-id-ref="add-item-dialog-raw-high"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" data-id-ref="add-item-dialog-scale-range-label">
                      {t('addItemDialog.sections.scaleRange')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        fullWidth
                        label={t('addItemDialog.fields.scaleLow')}
                        type="number"
                        value={formData.scaleLow}
                        onChange={(e) => handleFieldChange('scaleLow', parseFloat(e.target.value) || 0)}
                        disabled={isSaving}
                        error={!!fieldErrors.scaleLow}
                        helperText={fieldErrors.scaleLow || ''}
                        data-id-ref="add-item-dialog-scale-low"
                      />

                      <TextField
                        fullWidth
                        label={t('addItemDialog.fields.scaleHigh')}
                        type="number"
                        value={formData.scaleHigh}
                        onChange={(e) => handleFieldChange('scaleHigh', parseFloat(e.target.value) || 0)}
                        disabled={isSaving}
                        error={!!fieldErrors.scaleHigh}
                        helperText={fieldErrors.scaleHigh || ''}
                        data-id-ref="add-item-dialog-scale-high"
                      />
                    </Box>
                  </>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="add-item-dialog-actions">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          disabled={isSaving}
          data-id-ref="add-item-dialog-cancel-button"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          }}
          variant="contained"
          disabled={isSaving}
          data-id-ref="add-item-dialog-save-button"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddItemDialog;
