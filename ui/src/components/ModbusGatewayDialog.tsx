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
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { addModbusGateway, editModbusGateway } from '../services/extendedApi';
import type { ModbusGatewayConfig, GatewayValidationError } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ModbusGatewayDialog');

interface ModbusGatewayDialogProps {
  open: boolean;
  editMode: boolean;
  gateway: ModbusGatewayConfig | null;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

interface FormData {
  name: string;
  listenIP: string;
  port: number | '';
  unitId: number;
  isEnabled: boolean;
}

interface FormErrors {
  name?: string;
  listenIP?: string;
  port?: string;
  unitId?: string;
}

const ModbusGatewayDialog: React.FC<ModbusGatewayDialogProps> = ({
  open,
  editMode,
  gateway,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<GatewayValidationError[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    listenIP: '0.0.0.0',
    port: 502,
    unitId: 1,
    isEnabled: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or gateway changes
  useEffect(() => {
    if (open) {
      if (editMode && gateway) {
        setFormData({
          name: gateway.name || '',
          listenIP: gateway.listenIP || '0.0.0.0',
          port: gateway.port || 502,
          unitId: gateway.unitId || 1,
          isEnabled: gateway.isEnabled ?? true,
        });
      } else {
        setFormData({
          name: '',
          listenIP: '0.0.0.0',
          port: 502,
          unitId: 1,
          isEnabled: true,
        });
      }
      setFormErrors({});
      setServerErrors([]);
      setError(null);
    }
  }, [open, editMode, gateway]);

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
    // Clear server errors for this field
    setServerErrors(prev => prev.filter(e => e.field.toLowerCase() !== field.toLowerCase()));
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
      errors.name = t('modbusGateway.validation.nameRequired');
    }

    // IP Address validation
    if (!formData.listenIP.trim()) {
      errors.listenIP = t('modbusGateway.validation.listenIPRequired');
    } else if (!validateIpAddress(formData.listenIP.trim())) {
      errors.listenIP = t('modbusGateway.validation.listenIPInvalid');
    }

    // Port validation
    if (formData.port === '' || formData.port === undefined) {
      errors.port = t('modbusGateway.validation.portRequired');
    } else if (typeof formData.port === 'number' && (formData.port < 1 || formData.port > 65535)) {
      errors.port = t('modbusGateway.validation.portRange');
    }

    // Unit ID validation
    if (formData.unitId < 1 || formData.unitId > 247) {
      errors.unitId = t('modbusGateway.validation.unitIdRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    // Check form validation errors first
    const formError = formErrors[field as keyof FormErrors];
    if (formError) return formError;

    // Check server validation errors
    const serverError = serverErrors.find(e => e.field.toLowerCase() === field.toLowerCase());
    if (serverError) {
      // Map error codes to translated messages
      switch (serverError.errorCode) {
        case 'PORT_IN_USE_DB':
          return t('modbusGateway.validation.portInUseDb');
        case 'PORT_IN_USE_SYSTEM':
          return t('modbusGateway.validation.portInUseSystem');
        default:
          return serverError.message;
      }
    }

    return undefined;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);
    setServerErrors([]);

    try {
      if (editMode && gateway) {
        // Edit existing gateway
        const response = await editModbusGateway({
          id: gateway.id,
          name: formData.name.trim(),
          listenIP: formData.listenIP.trim(),
          port: formData.port as number,
          unitId: formData.unitId,
          isEnabled: formData.isEnabled,
        });

        if (response.isSuccessful) {
          logger.log('Gateway updated successfully');
          onSuccess(t('modbusGateway.success.updated'));
          onClose(true);
        } else {
          if (response.validationErrors && response.validationErrors.length > 0) {
            setServerErrors(response.validationErrors);
          } else {
            setError(t('modbusGateway.errors.updateFailed'));
          }
        }
      } else {
        // Add new gateway
        const response = await addModbusGateway({
          name: formData.name.trim(),
          listenIP: formData.listenIP.trim(),
          port: formData.port as number,
          unitId: formData.unitId,
          isEnabled: formData.isEnabled,
        });

        if (response.isSuccessful) {
          logger.log('Gateway created successfully', { id: response.gatewayId });
          onSuccess(t('modbusGateway.success.created'));
          onClose(true);
        } else {
          if (response.validationErrors && response.validationErrors.length > 0) {
            setServerErrors(response.validationErrors);
          } else {
            setError(t('modbusGateway.errors.createFailed'));
          }
        }
      }
    } catch (err) {
      logger.error('Failed to save gateway', { error: err });
      setError(editMode ? t('modbusGateway.errors.updateFailed') : t('modbusGateway.errors.createFailed'));
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
      maxWidth="sm"
      fullWidth
      data-id-ref="modbus-gateway-dialog"
    >
      <DialogTitle data-id-ref="modbus-gateway-dialog-title">
        {editMode ? t('modbusGateway.dialogs.editTitle') : t('modbusGateway.dialogs.addTitle')}
      </DialogTitle>
      <DialogContent data-id-ref="modbus-gateway-dialog-content">
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              data-id-ref="gateway-dialog-error"
            >
              {error}
            </Alert>
          )}

          <TextField
            data-id-ref="gateway-name-input"
            label={t('modbusGateway.fields.name')}
            value={formData.name}
            onChange={handleInputChange('name')}
            fullWidth
            required
            error={!!getFieldError('name')}
            helperText={getFieldError('name')}
            disabled={loading}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                data-id-ref="gateway-listenip-input"
                label={t('modbusGateway.fields.listenIP')}
                value={formData.listenIP}
                onChange={handleInputChange('listenIP')}
                fullWidth
                required
                error={!!getFieldError('listenIP')}
                helperText={getFieldError('listenIP') || t('modbusGateway.fields.listenIPHelper')}
                disabled={loading}
                placeholder="0.0.0.0"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                data-id-ref="gateway-port-input"
                label={t('modbusGateway.fields.port')}
                type="number"
                value={formData.port}
                onChange={handleInputChange('port')}
                fullWidth
                required
                error={!!getFieldError('port')}
                helperText={getFieldError('port') || t('modbusGateway.fields.portHelper')}
                disabled={loading}
                inputProps={{ min: 1, max: 65535 }}
              />
            </Grid>
          </Grid>

          <TextField
            data-id-ref="gateway-unitid-input"
            label={t('modbusGateway.fields.unitId')}
            type="number"
            value={formData.unitId}
            onChange={handleInputChange('unitId')}
            fullWidth
            required
            error={!!getFieldError('unitId')}
            helperText={getFieldError('unitId') || t('modbusGateway.fields.unitIdHelper')}
            disabled={loading}
            inputProps={{ min: 1, max: 247 }}
          />

          <FormControlLabel
            data-id-ref="gateway-enabled-switch"
            control={
              <Switch
                checked={formData.isEnabled}
                onChange={handleSwitchChange('isEnabled')}
                disabled={loading}
              />
            }
            label={t('modbusGateway.fields.isEnabled')}
          />
        </Stack>
      </DialogContent>
      <DialogActions data-id-ref="modbus-gateway-dialog-actions">
        <Button
          data-id-ref="gateway-dialog-cancel-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('cancel')}
        </Button>
        <Button
          data-id-ref="gateway-dialog-save-btn"
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('common.saving') : t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModbusGatewayDialog;
