import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { addModbusController, editModbusController } from '../services/extendedApi';
import type {
  ControllerModbus,
  Endianness,
  ModbusConnectionType,
  MyModbusType,
  ModbusAddressBase,
  ModbusDataType,
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditModbusControllerDialog');

interface AddEditModbusControllerDialogProps {
  open: boolean;
  editMode: boolean;
  controller: ControllerModbus | null;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

interface FormData {
  name: string;
  ipAddress: string;
  port: number;
  startAddress: number;
  dataLength: number;
  dataType: ModbusDataType;
  endianness: Endianness;
  connectionType: ModbusConnectionType;
  modbusType: MyModbusType;
  unitIdentifier: number;
  addressBase: ModbusAddressBase;
  isDisabled: boolean;
}

interface FormErrors {
  name?: string;
  ipAddress?: string;
  port?: string;
  startAddress?: string;
  dataLength?: string;
  dataType?: string;
  unitIdentifier?: string;
}

const AddEditModbusControllerDialog: React.FC<AddEditModbusControllerDialogProps> = ({
  open,
  editMode,
  controller,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    ipAddress: '',
    port: 502,
    startAddress: 0,
    dataLength: 1,
    dataType: 1 as ModbusDataType,
    endianness: 0 as Endianness,
    connectionType: 1 as ModbusConnectionType,
    modbusType: 0 as MyModbusType,
    unitIdentifier: 1,
    addressBase: 0 as ModbusAddressBase,
    isDisabled: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or controller changes
  useEffect(() => {
    if (open) {
      if (editMode && controller) {
        setFormData({
          name: controller.name || '',
          ipAddress: controller.ipAddress || '',
          port: controller.port || 502,
          startAddress: controller.startAddress || 0,
          dataLength: controller.dataLength || 1,
          dataType: controller.dataType ?? (1 as ModbusDataType),
          endianness: controller.endianness ?? (0 as Endianness),
          connectionType: controller.connectionType ?? (1 as ModbusConnectionType),
          modbusType: controller.modbusType ?? (0 as MyModbusType),
          unitIdentifier: controller.unitIdentifier ?? 1,
          addressBase: controller.addressBase ?? (0 as ModbusAddressBase),
          isDisabled: controller.isDisabled ?? false,
        });
      } else {
        setFormData({
          name: '',
          ipAddress: '',
          port: 502,
          startAddress: 0,
          dataLength: 1,
          dataType: 1 as ModbusDataType,
          endianness: 0 as Endianness,
          connectionType: 1 as ModbusConnectionType,
          modbusType: 0 as MyModbusType,
          unitIdentifier: 1,
          addressBase: 0 as ModbusAddressBase,
          isDisabled: false,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, controller]);

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'number'
      ? (event.target.value === '' ? '' : Number(event.target.value))
      : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof FormData) => (
    event: SelectChangeEvent<number>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: Number(event.target.value) }));
  };

  const handleSwitchChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.checked }));
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = t('modbusControllers.validation.nameRequired');
    }

    // IP Address validation
    if (!formData.ipAddress.trim()) {
      errors.ipAddress = t('modbusControllers.validation.ipAddressRequired');
    } else if (!validateIpAddress(formData.ipAddress.trim())) {
      errors.ipAddress = t('modbusControllers.validation.ipAddressInvalid');
    }

    // Port validation
    if (!formData.port && formData.port !== 0) {
      errors.port = t('modbusControllers.validation.portRequired');
    } else if (formData.port < 1 || formData.port > 65535) {
      errors.port = t('modbusControllers.validation.portRange');
    }

    // Start address validation
    if (formData.startAddress === undefined || formData.startAddress === null) {
      errors.startAddress = t('modbusControllers.validation.startAddressRequired');
    } else if (formData.startAddress < 0) {
      errors.startAddress = t('modbusControllers.validation.startAddressMin');
    }

    // Data length validation
    if (!formData.dataLength) {
      errors.dataLength = t('modbusControllers.validation.dataLengthRequired');
    } else if (formData.dataLength < 1) {
      errors.dataLength = t('modbusControllers.validation.dataLengthMin');
    }

    // Data type validation
    if (formData.dataType === undefined || formData.dataType === null) {
      errors.dataType = t('modbusControllers.validation.dataTypeRequired');
    }

    // Unit identifier validation
    if (formData.unitIdentifier < 0 || formData.unitIdentifier > 247) {
      errors.unitIdentifier = t('modbusControllers.validation.unitIdentifierRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editMode && controller) {
        // Edit existing controller
        logger.log('Editing controller', { controllerId: controller.id, name: formData.name });
        const response = await editModbusController({
          id: controller.id,
          name: formData.name.trim(),
          ipAddress: formData.ipAddress.trim(),
          port: formData.port,
          startAddress: formData.startAddress,
          dataLength: formData.dataLength,
          dataType: formData.dataType,
          endianness: formData.endianness,
          connectionType: formData.connectionType,
          modbusType: formData.modbusType,
          unitIdentifier: formData.unitIdentifier,
          addressBase: formData.addressBase,
          isDisabled: formData.isDisabled,
        });

        if (response.isSuccessful) {
          logger.log('Controller edited successfully', { controllerId: controller.id });
          onSuccess(t('modbusControllers.success.updated'));
          onClose(true);
        } else {
          setError(response.errorMessage || t('modbusControllers.errors.updateFailed'));
        }
      } else {
        // Create new controller
        logger.log('Creating controller', { name: formData.name });
        const response = await addModbusController({
          name: formData.name.trim(),
          ipAddress: formData.ipAddress.trim(),
          port: formData.port,
          startAddress: formData.startAddress,
          dataLength: formData.dataLength,
          dataType: formData.dataType,
          endianness: formData.endianness,
          connectionType: formData.connectionType,
          modbusType: formData.modbusType,
          unitIdentifier: formData.unitIdentifier,
          addressBase: formData.addressBase,
          isDisabled: formData.isDisabled,
        });

        if (response.isSuccessful) {
          logger.log('Controller created successfully', { id: response.controllerId });
          onSuccess(t('modbusControllers.success.created'));
          onClose(true);
        } else {
          setError(response.errorMessage || t('modbusControllers.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save controller', { error: err });
      setError(
        editMode
          ? t('modbusControllers.errors.updateFailed')
          : t('modbusControllers.errors.createFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-modbus-controller-dialog"
    >
      <DialogTitle data-id-ref="add-edit-modbus-controller-dialog-title">
        {editMode
          ? t('modbusControllers.dialogs.editTitle')
          : t('modbusControllers.dialogs.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-modbus-controller-dialog-content">
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && (
            <Alert
              data-id-ref="add-edit-modbus-controller-error"
              severity="error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Basic Info */}
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                data-id-ref="modbus-name-input"
                label={t('modbusControllers.fields.name')}
                value={formData.name}
                onChange={handleInputChange('name')}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Network Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                data-id-ref="modbus-ip-input"
                label={t('modbusControllers.fields.ipAddress')}
                value={formData.ipAddress}
                onChange={handleInputChange('ipAddress')}
                error={Boolean(formErrors.ipAddress)}
                helperText={formErrors.ipAddress}
                required
                fullWidth
                placeholder="192.168.1.100"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                data-id-ref="modbus-port-input"
                label={t('modbusControllers.fields.port')}
                type="number"
                value={formData.port}
                onChange={handleInputChange('port')}
                error={Boolean(formErrors.port)}
                helperText={formErrors.port}
                required
                fullWidth
                inputProps={{ min: 1, max: 65535 }}
              />
            </Grid>
          </Grid>

          {/* Connection Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel data-id-ref="modbus-connection-type-label">
                  {t('modbusControllers.fields.connectionType')}
                </InputLabel>
                <Select
                  data-id-ref="modbus-connection-type-select"
                  value={formData.connectionType}
                  onChange={handleSelectChange('connectionType')}
                  label={t('modbusControllers.fields.connectionType')}
                >
                  <MenuItem value={1}>{t('modbusControllers.connectionTypes.tcp')}</MenuItem>
                  <MenuItem value={2}>{t('modbusControllers.connectionTypes.tcpOverRtu')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel data-id-ref="modbus-type-label">
                  {t('modbusControllers.fields.modbusType')}
                </InputLabel>
                <Select
                  data-id-ref="modbus-type-select"
                  value={formData.modbusType}
                  onChange={handleSelectChange('modbusType')}
                  label={t('modbusControllers.fields.modbusType')}
                >
                  <MenuItem value={0}>{t('modbusControllers.modbusTypes.none')}</MenuItem>
                  <MenuItem value={1}>{t('modbusControllers.modbusTypes.ascii')}</MenuItem>
                  <MenuItem value={2}>{t('modbusControllers.modbusTypes.rtu')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Address Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                data-id-ref="modbus-start-address-input"
                label={t('modbusControllers.fields.startAddress')}
                type="number"
                value={formData.startAddress}
                onChange={handleInputChange('startAddress')}
                error={Boolean(formErrors.startAddress)}
                helperText={formErrors.startAddress}
                required
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                data-id-ref="modbus-data-length-input"
                label={t('modbusControllers.fields.dataLength')}
                type="number"
                value={formData.dataLength}
                onChange={handleInputChange('dataLength')}
                error={Boolean(formErrors.dataLength)}
                helperText={formErrors.dataLength}
                required
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          {/* Data Format Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth error={Boolean(formErrors.dataType)}>
                <InputLabel data-id-ref="modbus-data-type-label">
                  {t('modbusControllers.fields.dataType')}
                </InputLabel>
                <Select
                  data-id-ref="modbus-data-type-select"
                  value={formData.dataType}
                  onChange={handleSelectChange('dataType')}
                  label={t('modbusControllers.fields.dataType')}
                >
                  <MenuItem value={1}>{t('modbusControllers.dataTypes.boolean')}</MenuItem>
                  <MenuItem value={2}>{t('modbusControllers.dataTypes.int')}</MenuItem>
                  <MenuItem value={3}>{t('modbusControllers.dataTypes.float')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel data-id-ref="modbus-endianness-label">
                  {t('modbusControllers.fields.endianness')}
                </InputLabel>
                <Select
                  data-id-ref="modbus-endianness-select"
                  value={formData.endianness}
                  onChange={handleSelectChange('endianness')}
                  label={t('modbusControllers.fields.endianness')}
                >
                  <MenuItem value={0}>{t('modbusControllers.endianness.none')}</MenuItem>
                  <MenuItem value={1}>{t('modbusControllers.endianness.bigEndian')}</MenuItem>
                  <MenuItem value={2}>{t('modbusControllers.endianness.littleEndian')}</MenuItem>
                  <MenuItem value={3}>{t('modbusControllers.endianness.midBigEndian')}</MenuItem>
                  <MenuItem value={4}>{t('modbusControllers.endianness.midLittleEndian')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Advanced Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                data-id-ref="modbus-unit-identifier-input"
                label={t('modbusControllers.fields.unitIdentifier')}
                type="number"
                value={formData.unitIdentifier}
                onChange={handleInputChange('unitIdentifier')}
                error={Boolean(formErrors.unitIdentifier)}
                helperText={formErrors.unitIdentifier}
                fullWidth
                inputProps={{ min: 0, max: 247 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel data-id-ref="modbus-address-base-label">
                  {t('modbusControllers.fields.addressBase')}
                </InputLabel>
                <Select
                  data-id-ref="modbus-address-base-select"
                  value={formData.addressBase}
                  onChange={handleSelectChange('addressBase')}
                  label={t('modbusControllers.fields.addressBase')}
                >
                  <MenuItem value={0}>{t('modbusControllers.addressBases.base0')}</MenuItem>
                  <MenuItem value={1}>{t('modbusControllers.addressBases.base1')}</MenuItem>
                  <MenuItem value={2}>{t('modbusControllers.addressBases.base40001')}</MenuItem>
                  <MenuItem value={3}>{t('modbusControllers.addressBases.base40000')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Status */}
          <Grid container spacing={2}>
            <Grid size={12}>
              <FormControlLabel
                data-id-ref="modbus-disabled-switch"
                control={
                  <Switch
                    checked={formData.isDisabled}
                    onChange={handleSwitchChange('isDisabled')}
                    color="warning"
                  />
                }
                label={t('modbusControllers.fields.isDisabled')}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions data-id-ref="add-edit-modbus-controller-dialog-actions">
        <Button
          data-id-ref="modbus-cancel-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="modbus-save-btn"
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditModbusControllerDialog;
