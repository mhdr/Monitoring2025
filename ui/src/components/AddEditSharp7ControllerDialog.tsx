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
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { addSharp7Controller, editSharp7Controller } from '../services/extendedApi';
import type { ControllerSharp7, DataType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditSharp7ControllerDialog');

interface AddEditSharp7ControllerDialogProps {
  open: boolean;
  editMode: boolean;
  controller: ControllerSharp7 | null;
  onClose: (shouldRefresh: boolean) => void;
  onSuccess: (message: string) => void;
}

interface FormData {
  name: string;
  ipAddress: string;
  dbAddress: number;
  dbStartData: number;
  dbSizeData: number;
  dataType: DataType;
  username: string;
  password: string;
  isDisabled: boolean;
}

interface FormErrors {
  name?: string;
  ipAddress?: string;
  dbAddress?: string;
  dbStartData?: string;
  dbSizeData?: string;
  dataType?: string;
  username?: string;
  password?: string;
}

const AddEditSharp7ControllerDialog: React.FC<AddEditSharp7ControllerDialogProps> = ({
  open,
  editMode,
  controller,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    ipAddress: '',
    dbAddress: 0,
    dbStartData: 0,
    dbSizeData: 1,
    dataType: 1 as DataType,
    username: '',
    password: '',
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
          dbAddress: controller.dbAddress || 0,
          dbStartData: controller.dbStartData || 0,
          dbSizeData: controller.dbSizeData || 1,
          dataType: controller.dataType ?? (1 as DataType),
          username: controller.username || '',
          password: '', // Leave blank for security in edit mode
          isDisabled: controller.isDisabled ?? false,
        });
      } else {
        setFormData({
          name: '',
          ipAddress: '',
          dbAddress: 0,
          dbStartData: 0,
          dbSizeData: 1,
          dataType: 1 as DataType,
          username: '',
          password: '',
          isDisabled: false,
        });
      }
      setFormErrors({});
      setError(null);
      setShowPassword(false);
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

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = t('sharp7Controllers.validation.nameRequired');
    }

    // IP Address validation
    if (!formData.ipAddress.trim()) {
      errors.ipAddress = t('sharp7Controllers.validation.ipAddressRequired');
    } else if (!validateIpAddress(formData.ipAddress.trim())) {
      errors.ipAddress = t('sharp7Controllers.validation.ipAddressInvalid');
    }

    // DB Address validation
    if (formData.dbAddress === undefined || formData.dbAddress === null) {
      errors.dbAddress = t('sharp7Controllers.validation.dbAddressRequired');
    } else if (formData.dbAddress < 0) {
      errors.dbAddress = t('sharp7Controllers.validation.dbAddressMin');
    }

    // DB Start Data validation
    if (formData.dbStartData === undefined || formData.dbStartData === null) {
      errors.dbStartData = t('sharp7Controllers.validation.dbStartDataRequired');
    } else if (formData.dbStartData < 0) {
      errors.dbStartData = t('sharp7Controllers.validation.dbStartDataMin');
    }

    // DB Size Data validation
    if (!formData.dbSizeData) {
      errors.dbSizeData = t('sharp7Controllers.validation.dbSizeDataRequired');
    } else if (formData.dbSizeData < 1) {
      errors.dbSizeData = t('sharp7Controllers.validation.dbSizeDataMin');
    }

    // Data type validation
    if (formData.dataType === undefined || formData.dataType === null) {
      errors.dataType = t('sharp7Controllers.validation.dataTypeRequired');
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
        const response = await editSharp7Controller({
          id: controller.id,
          name: formData.name.trim(),
          ipAddress: formData.ipAddress.trim(),
          dbAddress: formData.dbAddress,
          dbStartData: formData.dbStartData,
          dbSizeData: formData.dbSizeData,
          dataType: formData.dataType,
          username: formData.username.trim() || null,
          password: formData.password || null, // Only update if provided
          isDisabled: formData.isDisabled,
        });

        if (response.isSuccessful) {
          logger.log('Controller edited successfully', { controllerId: controller.id });
          onSuccess(t('sharp7Controllers.success.updated'));
          onClose(true);
        } else {
          setError(response.errorMessage || t('sharp7Controllers.errors.updateFailed'));
        }
      } else {
        // Create new controller
        logger.log('Creating controller', { name: formData.name });
        const response = await addSharp7Controller({
          name: formData.name.trim(),
          ipAddress: formData.ipAddress.trim(),
          dbAddress: formData.dbAddress,
          dbStartData: formData.dbStartData,
          dbSizeData: formData.dbSizeData,
          dataType: formData.dataType,
          username: formData.username.trim() || null,
          password: formData.password || null,
          isDisabled: formData.isDisabled,
        });

        if (response.isSuccessful) {
          logger.log('Controller created successfully', { id: response.controllerId });
          onSuccess(t('sharp7Controllers.success.created'));
          onClose(true);
        } else {
          setError(response.errorMessage || t('sharp7Controllers.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save controller', { error: err });
      setError(
        editMode
          ? t('sharp7Controllers.errors.updateFailed')
          : t('sharp7Controllers.errors.createFailed')
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
      data-id-ref="add-edit-sharp7-controller-dialog"
    >
      <DialogTitle data-id-ref="add-edit-sharp7-controller-dialog-title">
        {editMode
          ? t('sharp7Controllers.dialogs.editTitle')
          : t('sharp7Controllers.dialogs.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-sharp7-controller-dialog-content">
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && (
            <Alert
              data-id-ref="add-edit-sharp7-controller-error"
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
                data-id-ref="sharp7-name-input"
                label={t('sharp7Controllers.fields.name')}
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
            <Grid size={12}>
              <TextField
                data-id-ref="sharp7-ip-input"
                label={t('sharp7Controllers.fields.ipAddress')}
                value={formData.ipAddress}
                onChange={handleInputChange('ipAddress')}
                error={Boolean(formErrors.ipAddress)}
                helperText={formErrors.ipAddress}
                required
                fullWidth
                placeholder="192.168.1.100"
              />
            </Grid>
          </Grid>

          {/* Data Block Settings */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                data-id-ref="sharp7-db-address-input"
                label={t('sharp7Controllers.fields.dbAddress')}
                type="number"
                value={formData.dbAddress}
                onChange={handleInputChange('dbAddress')}
                error={Boolean(formErrors.dbAddress)}
                helperText={formErrors.dbAddress || t('sharp7Controllers.fields.dbAddressHelper')}
                required
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                data-id-ref="sharp7-db-start-data-input"
                label={t('sharp7Controllers.fields.dbStartData')}
                type="number"
                value={formData.dbStartData}
                onChange={handleInputChange('dbStartData')}
                error={Boolean(formErrors.dbStartData)}
                helperText={formErrors.dbStartData || t('sharp7Controllers.fields.dbStartDataHelper')}
                required
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                data-id-ref="sharp7-db-size-data-input"
                label={t('sharp7Controllers.fields.dbSizeData')}
                type="number"
                value={formData.dbSizeData}
                onChange={handleInputChange('dbSizeData')}
                error={Boolean(formErrors.dbSizeData)}
                helperText={formErrors.dbSizeData || t('sharp7Controllers.fields.dbSizeDataHelper')}
                required
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          {/* Data Format Settings */}
          <Grid container spacing={2}>
            <Grid size={12}>
              <FormControl fullWidth error={Boolean(formErrors.dataType)}>
                <InputLabel data-id-ref="sharp7-data-type-label">
                  {t('sharp7Controllers.fields.dataType')}
                </InputLabel>
                <Select
                  data-id-ref="sharp7-data-type-select"
                  value={formData.dataType}
                  onChange={handleSelectChange('dataType')}
                  label={t('sharp7Controllers.fields.dataType')}
                >
                  <MenuItem value={1}>{t('sharp7Controllers.dataTypes.boolean')}</MenuItem>
                  <MenuItem value={2}>{t('sharp7Controllers.dataTypes.int')}</MenuItem>
                  <MenuItem value={3}>{t('sharp7Controllers.dataTypes.float')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Authentication (Optional) */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                data-id-ref="sharp7-username-input"
                label={t('sharp7Controllers.fields.username')}
                value={formData.username}
                onChange={handleInputChange('username')}
                error={Boolean(formErrors.username)}
                helperText={formErrors.username || t('sharp7Controllers.fields.usernameHelper')}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                data-id-ref="sharp7-password-input"
                label={t('sharp7Controllers.fields.password')}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={Boolean(formErrors.password)}
                helperText={
                  formErrors.password ||
                  (editMode
                    ? t('sharp7Controllers.fields.passwordHelperEdit')
                    : t('sharp7Controllers.fields.passwordHelper'))
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        data-id-ref="sharp7-toggle-password-visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Status */}
          <Grid container spacing={2}>
            <Grid size={12}>
              <FormControlLabel
                data-id-ref="sharp7-disabled-switch"
                control={
                  <Switch
                    checked={formData.isDisabled}
                    onChange={handleSwitchChange('isDisabled')}
                    color="warning"
                  />
                }
                label={t('sharp7Controllers.fields.isDisabled')}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions data-id-ref="add-edit-sharp7-controller-dialog-actions">
        <Button
          data-id-ref="sharp7-cancel-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="sharp7-save-btn"
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

export default AddEditSharp7ControllerDialog;
