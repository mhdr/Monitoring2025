import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { setGlobalVariableValue } from '../services/extendedApi';
import type { GlobalVariable, GlobalVariableType } from '../types/api';
import { GlobalVariableType as GlobalVariableTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('SetGlobalVariableValueDialog');

interface SetGlobalVariableValueDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  variable: GlobalVariable;
}

/**
 * Dialog for setting a global variable's runtime value
 */
const SetGlobalVariableValueDialog: React.FC<SetGlobalVariableValueDialogProps> = ({
  open,
  onClose,
  variable,
}) => {
  const { t } = useLanguage();

  // State management
  const [value, setValue] = useState<string>('');
  const [booleanValue, setBooleanValue] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize value from variable
  useEffect(() => {
    if (variable) {
      if (variable.variableType === GlobalVariableTypeEnum.Boolean) {
        const boolVal = variable.currentValue === 'true' || variable.currentValue === '1';
        setBooleanValue(boolVal);
        setValue(boolVal ? 'true' : 'false');
      } else {
        setValue(variable.currentValue || '0');
      }
    }
  }, [variable]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate value based on type
      let valueToSubmit = value;
      if (variable.variableType === GlobalVariableTypeEnum.Boolean) {
        valueToSubmit = booleanValue ? 'true' : 'false';
      } else if (variable.variableType === GlobalVariableTypeEnum.Float) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          setError(t('globalVariables.setValue.errors.invalidNumber'));
          return;
        }
        valueToSubmit = value;
      }

      const response = await setGlobalVariableValue({
        id: variable.id,
        value: valueToSubmit,
      });

      if (!response.isSuccessful) {
        setError(response.errorMessage || t('globalVariables.setValue.errors.failed'));
        return;
      }

      logger.info('Global variable value set successfully', {
        variableName: variable.name,
        newValue: valueToSubmit,
      });

      onClose(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('globalVariables.setValue.errors.unknown');
      setError(errorMessage);
      logger.error('Failed to set global variable value', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onClose(false);
  };

  /**
   * Handle boolean switch change
   */
  const handleBooleanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setBooleanValue(newValue);
    setValue(newValue ? 'true' : 'false');
  };

  /**
   * Handle text field change
   */
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  /**
   * Get variable type label
   */
  const getVariableTypeLabel = (variableType: GlobalVariableType): string => {
    switch (variableType) {
      case GlobalVariableTypeEnum.Boolean:
        return t('globalVariables.type.boolean');
      case GlobalVariableTypeEnum.Float:
        return t('globalVariables.type.float');
      default:
        return String(variableType);
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth data-id-ref="set-globalvariable-value-dialog">
      <DialogTitle data-id-ref="set-globalvariable-value-dialog-title">
        {t('globalVariables.setValue.title')}
      </DialogTitle>

      <DialogContent data-id-ref="set-globalvariable-value-dialog-content">
        {/* Variable Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }} data-id-ref="set-globalvariable-info-box">
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('globalVariables.name')}
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 1 }}>
            {variable.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('globalVariables.variableType')}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {getVariableTypeLabel(variable.variableType)}
          </Typography>

          {variable.description && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('globalVariables.description')}
              </Typography>
              <Typography variant="body1">{variable.description}</Typography>
            </>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="set-globalvariable-value-error-alert">
            {error}
          </Alert>
        )}

        {/* Value Input */}
        <Box sx={{ mb: 2 }} data-id-ref="set-globalvariable-value-input-box">
          {variable.variableType === GlobalVariableTypeEnum.Boolean ? (
            <FormControlLabel
              control={
                <Switch
                  checked={booleanValue}
                  onChange={handleBooleanChange}
                  disabled={loading}
                  data-id-ref="set-globalvariable-boolean-switch"
                />
              }
              label={booleanValue ? t('common.true') : t('common.false')}
              data-id-ref="set-globalvariable-boolean-label"
            />
          ) : (
            <TextField
              fullWidth
              label={t('globalVariables.setValue.newValue')}
              value={value}
              onChange={handleValueChange}
              disabled={loading}
              type="number"
              inputProps={{
                step: 'any',
              }}
              helperText={t('globalVariables.setValue.newValueHelp')}
              data-id-ref="set-globalvariable-value-input"
            />
          )}
        </Box>

        {/* Current Value Display */}
        <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }} data-id-ref="set-globalvariable-current-value-box">
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {t('globalVariables.currentValue')}
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {variable.currentValue}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="set-globalvariable-value-dialog-actions">
        <Button onClick={handleCancel} disabled={loading} startIcon={<CloseIcon />} data-id-ref="set-globalvariable-value-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          data-id-ref="set-globalvariable-value-submit-btn"
        >
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetGlobalVariableValueDialog;
