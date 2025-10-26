import React, { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { getItem, editItem } from '../services/monitoringApi';
import type {
  MonitoringItem,
  EditItemRequestDto,
} from '../types/api';
import { EditItemErrorType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('EditItemDialog');

// Constants matching backend enums
const ItemTypeEnum = {
  DigitalInput: 1,
  DigitalOutput: 2,
  AnalogInput: 3,
  AnalogOutput: 4,
} as const;

const ShouldScaleTypeEnum = {
  No: 1,
  Yes: 2,
} as const;

const ValueCalculationMethodEnum = {
  LastValue: 0,
  Average: 1,
} as const;

type ItemType = typeof ItemTypeEnum[keyof typeof ItemTypeEnum];
type ShouldScaleType = typeof ShouldScaleTypeEnum[keyof typeof ShouldScaleTypeEnum];
type ValueCalculationMethod = typeof ValueCalculationMethodEnum[keyof typeof ValueCalculationMethodEnum];

interface EditItemDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string | null;
  onSuccess?: () => void;
}

interface EditItemFormData {
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
  onText: string;
  onTextFa: string;
  offText: string;
  offTextFa: string;
  unit: string;
  unitFa: string;
  isDisabled: boolean;
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  open,
  onClose,
  itemId,
  onSuccess,
}) => {
  const { t } = useLanguage();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [itemData, setItemData] = useState<MonitoringItem | null>(null);
  
  const [formData, setFormData] = useState<EditItemFormData>({
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
    saveIntervalSeconds: 5,
    saveHistoricalIntervalSeconds: 5,
    numberOfSamples: 1,
    onText: '',
    onTextFa: '',
    offText: '',
    offTextFa: '',
    unit: '',
    unitFa: '',
    isDisabled: false,
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

  // Load item data when dialog opens
  useEffect(() => {
    const loadItemData = async () => {
      if (!itemId) {
        logger.warn('loadItemData: No itemId provided');
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      logger.log('Loading item data for itemId:', itemId);

      try {
        const response = await getItem(itemId);
        
        if (!response.success || !response.data) {
          setLoadError(t('editItemDialog.errors.loadFailed'));
          logger.error('Failed to load item:', response.errorMessage);
          return;
        }

        const item = response.data;
        setItemData(item);

        // Populate form with item data
        setFormData({
          itemType: item.itemType,
          itemName: item.name || '',
          itemNameFa: item.nameFa || '',
          pointNumber: item.pointNumber,
          shouldScale: item.shouldScale,
          rawHigh: item.normMax || 0,
          rawLow: item.normMin || 0,
          scaleHigh: item.scaleMax || 0,
          scaleLow: item.scaleMin || 0,
          valueCalculationMethod: item.calculationMethod,
          saveIntervalSeconds: item.saveInterval,
          saveHistoricalIntervalSeconds: item.saveHistoricalInterval,
          numberOfSamples: item.numberOfSamples,
          onText: item.onText || '',
          onTextFa: item.onTextFa || '',
          offText: item.offText || '',
          offTextFa: item.offTextFa || '',
          unit: item.unit || '',
          unitFa: item.unitFa || '',
          isDisabled: item.isDisabled || false,
        });

        logger.log('Item data loaded successfully:', item);
      } catch (error) {
        logger.error('Error loading item data:', error);
        setLoadError(t('editItemDialog.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    if (open && itemId) {
      loadItemData();
    }
  }, [open, itemId, t]);

  const handleFieldChange = <K extends keyof EditItemFormData>(
    field: K,
    value: EditItemFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    setSaveError(null);

    if (!formData.itemName.trim()) {
      setSaveError(t('editItemDialog.errors.itemNameRequired'));
      return false;
    }

    if (formData.pointNumber < 0) {
      setSaveError(t('editItemDialog.errors.invalidPointNumber'));
      return false;
    }

    if (formData.saveIntervalSeconds <= 0) {
      setSaveError(t('editItemDialog.errors.invalidSaveInterval'));
      return false;
    }

    if (shouldShowScaling) {
      if (formData.rawHigh === formData.rawLow) {
        setSaveError(t('editItemDialog.errors.invalidRawRange'));
        return false;
      }
      if (formData.scaleHigh === formData.scaleLow) {
        setSaveError(t('editItemDialog.errors.invalidScaleRange'));
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!itemId || !validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    logger.log('Saving item changes for itemId:', itemId);

    try {
      const requestDto: EditItemRequestDto = {
        id: itemId,
        itemType: formData.itemType,
        itemName: formData.itemName,
        itemNameFa: formData.itemNameFa || null,
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
        onText: formData.onText || null,
        onTextFa: formData.onTextFa || null,
        offText: formData.offText || null,
        offTextFa: formData.offTextFa || null,
        unit: formData.unit || null,
        unitFa: formData.unitFa || null,
        isDisabled: formData.isDisabled,
      };

      const response = await editItem(requestDto);

      if (!response.success) {
        const errorType = response.error;
        let errorMessage = t('editItemDialog.errors.saveFailed');

        if (errorType !== undefined) {
          switch (errorType) {
            case EditItemErrorType.InvalidPointNumber:
              errorMessage = t('editItemDialog.errors.invalidPointNumber');
              break;
            case EditItemErrorType.DuplicatePointNumber:
              errorMessage = t('editItemDialog.errors.duplicatePointNumber');
              break;
            case EditItemErrorType.ValidationError:
              errorMessage = response.message || t('editItemDialog.errors.validationError');
              break;
            case EditItemErrorType.Unauthorized:
              errorMessage = t('editItemDialog.errors.unauthorized');
              break;
          }
        }

        setSaveError(errorMessage);
        logger.error('Failed to save item:', response.message, 'Error type:', errorType);
        return;
      }

      logger.log('Item saved successfully');
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error) {
      logger.error('Error saving item:', error);
      setSaveError(t('editItemDialog.errors.saveFailed'));
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
        saveIntervalSeconds: 5,
        saveHistoricalIntervalSeconds: 5,
        numberOfSamples: 1,
        onText: '',
        onTextFa: '',
        offText: '',
        offTextFa: '',
        unit: '',
        unitFa: '',
        isDisabled: false,
      });
      setItemData(null);
      setLoadError(null);
      setSaveError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-id-ref="edit-item-dialog"
    >
      <DialogTitle data-id-ref="edit-item-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="span">
            {t('editItemDialog.title')}
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClose}
            disabled={isSaving}
            aria-label={t('common.close')}
            data-id-ref="edit-item-dialog-close-button"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="edit-item-dialog-content">
        {isLoading && (
          <Box 
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}
            data-id-ref="edit-item-dialog-loading-container"
          >
            <CircularProgress data-id-ref="edit-item-dialog-loading-spinner" />
          </Box>
        )}

        {loadError && (
          <Alert severity="error" data-id-ref="edit-item-dialog-load-error">
            {loadError}
          </Alert>
        )}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="edit-item-dialog-save-error">
            {saveError}
          </Alert>
        )}

        {!isLoading && !loadError && itemData && (
          <Box data-id-ref="edit-item-dialog-form">
            {/* Basic Information Section */}
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              gutterBottom
              data-id-ref="edit-item-dialog-basic-info-heading"
            >
              {t('editItemDialog.sections.basicInformation')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl fullWidth disabled>
                  <InputLabel id="item-type-label">{t('editItemDialog.fields.itemType')}</InputLabel>
                  <Select
                    labelId="item-type-label"
                    value={formData.itemType}
                    label={t('editItemDialog.fields.itemType')}
                    data-id-ref="edit-item-dialog-item-type"
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
                  label={t('editItemDialog.fields.pointNumber')}
                  type="number"
                  value={formData.pointNumber}
                  onChange={(e) => handleFieldChange('pointNumber', parseInt(e.target.value) || 0)}
                  disabled={isSaving}
                  required
                  inputProps={{ min: 0, max: 2147483647 }}
                  data-id-ref="edit-item-dialog-point-number"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label={t('editItemDialog.fields.itemName')}
                  value={formData.itemName}
                  onChange={(e) => handleFieldChange('itemName', e.target.value)}
                  disabled={isSaving}
                  required
                  inputProps={{ maxLength: 200 }}
                  data-id-ref="edit-item-dialog-item-name"
                />

                <TextField
                  fullWidth
                  label={t('editItemDialog.fields.itemNameFa')}
                  value={formData.itemNameFa}
                  onChange={(e) => handleFieldChange('itemNameFa', e.target.value)}
                  disabled={isSaving}
                  inputProps={{ maxLength: 200 }}
                  data-id-ref="edit-item-dialog-item-name-fa"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl fullWidth>
                  <InputLabel id="value-calc-method-label">{t('editItemDialog.fields.valueCalculationMethod')}</InputLabel>
                  <Select
                    labelId="value-calc-method-label"
                    value={formData.valueCalculationMethod}
                    label={t('editItemDialog.fields.valueCalculationMethod')}
                    onChange={(e) => handleFieldChange('valueCalculationMethod', e.target.value as ValueCalculationMethod)}
                    disabled={isSaving}
                    data-id-ref="edit-item-dialog-value-calc-method"
                  >
                    <MenuItem value={ValueCalculationMethodEnum.LastValue}>
                      {t('editItemDialog.valueCalculationMethods.lastValue')}
                    </MenuItem>
                    <MenuItem value={ValueCalculationMethodEnum.Average}>
                      {t('editItemDialog.valueCalculationMethods.average')}
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label={t('editItemDialog.fields.numberOfSamples')}
                  type="number"
                  value={formData.numberOfSamples}
                  onChange={(e) => handleFieldChange('numberOfSamples', parseInt(e.target.value) || 1)}
                  disabled={isSaving}
                  required
                  inputProps={{ min: 1, max: 100 }}
                  data-id-ref="edit-item-dialog-number-of-samples"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label={t('editItemDialog.fields.saveIntervalSeconds')}
                  type="number"
                  value={formData.saveIntervalSeconds}
                  onChange={(e) => handleFieldChange('saveIntervalSeconds', parseInt(e.target.value) || 5)}
                  disabled={isSaving}
                  required
                  inputProps={{ min: 1, max: 3600 }}
                  data-id-ref="edit-item-dialog-save-interval"
                />

                <TextField
                  fullWidth
                  label={t('editItemDialog.fields.saveHistoricalIntervalSeconds')}
                  type="number"
                  value={formData.saveHistoricalIntervalSeconds}
                  onChange={(e) => handleFieldChange('saveHistoricalIntervalSeconds', parseInt(e.target.value) || 5)}
                  disabled={isSaving}
                  required
                  inputProps={{ min: 1, max: 3600 }}
                  data-id-ref="edit-item-dialog-save-historical-interval"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isDisabled}
                    onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                    disabled={isSaving}
                    data-id-ref="edit-item-dialog-is-disabled-switch"
                  />
                }
                label={t('editItemDialog.fields.isDisabled')}
                data-id-ref="edit-item-dialog-is-disabled"
              />
            </Box>

            {/* Digital-specific Fields */}
            {isDigital && (
              <>
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold" 
                  gutterBottom
                  data-id-ref="edit-item-dialog-digital-fields-heading"
                >
                  {t('editItemDialog.sections.digitalFields')}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.onText')}
                      value={formData.onText}
                      onChange={(e) => handleFieldChange('onText', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 50 }}
                      data-id-ref="edit-item-dialog-on-text"
                    />

                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.onTextFa')}
                      value={formData.onTextFa}
                      onChange={(e) => handleFieldChange('onTextFa', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 50 }}
                      data-id-ref="edit-item-dialog-on-text-fa"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.offText')}
                      value={formData.offText}
                      onChange={(e) => handleFieldChange('offText', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 50 }}
                      data-id-ref="edit-item-dialog-off-text"
                    />

                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.offTextFa')}
                      value={formData.offTextFa}
                      onChange={(e) => handleFieldChange('offTextFa', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 50 }}
                      data-id-ref="edit-item-dialog-off-text-fa"
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
                  data-id-ref="edit-item-dialog-analog-fields-heading"
                >
                  {t('editItemDialog.sections.analogFields')}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.unit')}
                      value={formData.unit}
                      onChange={(e) => handleFieldChange('unit', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 20 }}
                      data-id-ref="edit-item-dialog-unit"
                    />

                    <TextField
                      fullWidth
                      label={t('editItemDialog.fields.unitFa')}
                      value={formData.unitFa}
                      onChange={(e) => handleFieldChange('unitFa', e.target.value)}
                      disabled={isSaving}
                      inputProps={{ maxLength: 20 }}
                      data-id-ref="edit-item-dialog-unit-fa"
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
                        data-id-ref="edit-item-dialog-should-scale-switch"
                      />
                    }
                    label={t('editItemDialog.fields.shouldScale')}
                    data-id-ref="edit-item-dialog-should-scale"
                  />

                  {shouldShowScaling && (
                    <>
                      <Typography variant="body2" color="text.secondary" data-id-ref="edit-item-dialog-raw-range-label">
                        {t('editItemDialog.sections.rawRange')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          fullWidth
                          label={t('editItemDialog.fields.rawLow')}
                          type="number"
                          value={formData.rawLow}
                          onChange={(e) => handleFieldChange('rawLow', parseFloat(e.target.value) || 0)}
                          disabled={isSaving}
                          data-id-ref="edit-item-dialog-raw-low"
                        />

                        <TextField
                          fullWidth
                          label={t('editItemDialog.fields.rawHigh')}
                          type="number"
                          value={formData.rawHigh}
                          onChange={(e) => handleFieldChange('rawHigh', parseFloat(e.target.value) || 0)}
                          disabled={isSaving}
                          data-id-ref="edit-item-dialog-raw-high"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" data-id-ref="edit-item-dialog-scale-range-label">
                        {t('editItemDialog.sections.scaleRange')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          fullWidth
                          label={t('editItemDialog.fields.scaleLow')}
                          type="number"
                          value={formData.scaleLow}
                          onChange={(e) => handleFieldChange('scaleLow', parseFloat(e.target.value) || 0)}
                          disabled={isSaving}
                          data-id-ref="edit-item-dialog-scale-low"
                        />

                        <TextField
                          fullWidth
                          label={t('editItemDialog.fields.scaleHigh')}
                          type="number"
                          value={formData.scaleHigh}
                          onChange={(e) => handleFieldChange('scaleHigh', parseFloat(e.target.value) || 0)}
                          disabled={isSaving}
                          data-id-ref="edit-item-dialog-scale-high"
                        />
                      </Box>
                    </>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions data-id-ref="edit-item-dialog-actions">
        <Button
          onClick={handleClose}
          disabled={isSaving}
          data-id-ref="edit-item-dialog-cancel-button"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || isSaving || !!loadError}
          data-id-ref="edit-item-dialog-save-button"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditItemDialog;
