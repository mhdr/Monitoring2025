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
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { addGlobalVariable, editGlobalVariable } from '../services/extendedApi';
import type { GlobalVariable, GlobalVariableType } from '../types/api';
import { GlobalVariableType as GlobalVariableTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditGlobalVariableDialog');

interface AddEditGlobalVariableDialogProps {
  open: boolean;
  editMode: boolean;
  variable: GlobalVariable | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  name: string;
  variableType: GlobalVariableType;
  description: string;
  isDisabled: boolean;
}

interface FormErrors {
  name?: string;
  variableType?: string;
  description?: string;
}

const AddEditGlobalVariableDialog: React.FC<AddEditGlobalVariableDialogProps> = ({
  open,
  editMode,
  variable,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    variableType: GlobalVariableTypeEnum.Float,
    description: '',
    isDisabled: false,
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or variable changes
  useEffect(() => {
    if (open) {
      if (editMode && variable) {
        setFormData({
          name: variable.name || '',
          variableType: variable.variableType,
          description: variable.description || '',
          isDisabled: variable.isDisabled || false,
        });
      } else {
        setFormData({
          name: '',
          variableType: GlobalVariableTypeEnum.Float,
          description: '',
          isDisabled: false,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, variable]);

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'isDisabled' 
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field (only for string fields with errors)
    if (field !== 'isDisabled' && formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    
    // Name validation - must be alphanumeric with underscore/hyphen only
    if (!formData.name.trim()) {
      errors.name = t('globalVariables.validation.nameRequired');
    } else if (!/^[a-zA-Z0-9_\-]+$/.test(formData.name)) {
      errors.name = t('globalVariables.validation.nameFormat');
    } else if (formData.name.length < 2) {
      errors.name = t('globalVariables.validation.nameMinLength');
    } else if (formData.name.length > 100) {
      errors.name = t('globalVariables.validation.nameMaxLength');
    }
    
    // Description validation
    if (formData.description && formData.description.length > 500) {
      errors.description = t('globalVariables.validation.descriptionMaxLength');
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
      if (editMode && variable) {
        // Edit existing variable
        logger.log('Editing global variable', { variableId: variable.id, name: formData.name });
        const response = await editGlobalVariable({
          id: variable.id,
          name: formData.name.trim(),
          variableType: formData.variableType,
          description: formData.description.trim() || undefined,
          isDisabled: formData.isDisabled,
        });
        
        if (response.isSuccessful) {
          logger.log('Global variable edited successfully', { variableId: variable.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('globalVariables.errors.editFailed'));
        }
      } else {
        // Create new variable
        logger.log('Creating global variable', { name: formData.name });
        const response = await addGlobalVariable({
          name: formData.name.trim(),
          variableType: formData.variableType,
          description: formData.description.trim() || undefined,
          isDisabled: false, // New variables are enabled by default
        });
        
        if (response.isSuccessful) {
          logger.log('Global variable created successfully', { variableId: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('globalVariables.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save global variable', { error: err });
      setError(editMode 
        ? t('globalVariables.errors.editFailed')
        : t('globalVariables.errors.createFailed')
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
      maxWidth="sm"
      fullWidth
      data-id-ref="add-edit-globalvariable-dialog"
    >
      <DialogTitle data-id-ref="add-edit-globalvariable-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon />
          <Typography variant="h6">
            {editMode ? t('globalVariables.editVariable') : t('globalVariables.createVariable')}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent data-id-ref="add-edit-globalvariable-dialog-content">
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          {error && (
            <Alert 
              data-id-ref="add-edit-globalvariable-error"
              severity="error" 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          <TextField
            data-id-ref="globalvariable-name-input"
            label={t('globalVariables.name')}
            value={formData.name}
            onChange={handleInputChange('name')}
            error={Boolean(formErrors.name)}
            helperText={formErrors.name || t('globalVariables.hints.name')}
            required
            fullWidth
            disabled={editMode} // Name cannot be changed (it's a unique identifier)
            inputProps={{
              style: { fontFamily: 'monospace' }
            }}
          />
          
          <TextField
            data-id-ref="globalvariable-type-select"
            select
            label={t('globalVariables.type')}
            value={formData.variableType}
            onChange={handleInputChange('variableType')}
            error={Boolean(formErrors.variableType)}
            helperText={formErrors.variableType || t('globalVariables.hints.type')}
            required
            fullWidth
            disabled={editMode} // Type cannot be changed after creation
          >
            <MenuItem value={GlobalVariableTypeEnum.Boolean} data-id-ref="globalvariable-type-boolean">
              {t('globalVariables.type.boolean')}
            </MenuItem>
            <MenuItem value={GlobalVariableTypeEnum.Float} data-id-ref="globalvariable-type-float">
              {t('globalVariables.type.float')}
            </MenuItem>
          </TextField>
          
          <TextField
            data-id-ref="globalvariable-description-input"
            label={t('globalVariables.description')}
            value={formData.description}
            onChange={handleInputChange('description')}
            error={Boolean(formErrors.description)}
            helperText={formErrors.description || t('globalVariables.hints.description')}
            fullWidth
            multiline
            rows={3}
          />
          
          <FormControlLabel
            data-id-ref="globalvariable-disabled-checkbox"
            control={
              <Checkbox
                checked={formData.isDisabled}
                onChange={handleInputChange('isDisabled')}
              />
            }
            label={t('globalVariables.isDisabled')}
          />
          
          {editMode && variable && (
            <Alert severity="info" data-id-ref="globalvariable-edit-info">
              {t('globalVariables.hints.editInfo')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions data-id-ref="add-edit-globalvariable-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          data-id-ref="globalvariable-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="globalvariable-submit-btn"
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            editMode ? t('common.save') : t('common.create')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditGlobalVariableDialog;
