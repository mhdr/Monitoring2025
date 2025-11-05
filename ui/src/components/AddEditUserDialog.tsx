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
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { createUser, editUser } from '../services/userApi';
import type { UserInfoDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditUserDialog');

interface AddEditUserDialogProps {
  open: boolean;
  editMode: boolean;
  user: UserInfoDto | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  userName: string;
  firstName: string;
  lastName: string;
  firstNameFa: string;
  lastNameFa: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  userName?: string;
  firstName?: string;
  lastName?: string;
  firstNameFa?: string;
  lastNameFa?: string;
  password?: string;
  confirmPassword?: string;
}

const AddEditUserDialog: React.FC<AddEditUserDialogProps> = ({
  open,
  editMode,
  user,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    userName: '',
    firstName: '',
    lastName: '',
    firstNameFa: '',
    lastNameFa: '',
    password: '',
    confirmPassword: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or user changes
  useEffect(() => {
    if (open) {
      if (editMode && user) {
        setFormData({
          userName: user.userName || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          firstNameFa: user.firstNameFa || '',
          lastNameFa: user.lastNameFa || '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setFormData({
          userName: '',
          firstName: '',
          lastName: '',
          firstNameFa: '',
          lastNameFa: '',
          password: '',
          confirmPassword: '',
        });
      }
      setFormErrors({});
      setError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, editMode, user]);

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    
    // Username validation
    if (!formData.userName.trim()) {
      errors.userName = t('userManagement.validation.usernameRequired');
    } else if (formData.userName.length < 3) {
      errors.userName = t('userManagement.validation.usernameMinLength');
    }
    
    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = t('userManagement.validation.firstNameRequired');
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = t('userManagement.validation.lastNameRequired');
    }
    
    // Farsi first name validation
    if (!formData.firstNameFa.trim()) {
      errors.firstNameFa = t('userManagement.validation.firstNameFaRequired');
    }
    
    // Farsi last name validation
    if (!formData.lastNameFa.trim()) {
      errors.lastNameFa = t('userManagement.validation.lastNameFaRequired');
    }
    
    // Password validation (only for create mode)
    if (!editMode) {
      if (!formData.password) {
        errors.password = t('userManagement.validation.passwordRequired');
      } else if (formData.password.length < 6) {
        errors.password = t('userManagement.validation.passwordMinLength');
      }
      
      // Confirm password validation
      if (!formData.confirmPassword) {
        errors.confirmPassword = t('userManagement.validation.confirmPasswordRequired');
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = t('userManagement.validation.passwordsMustMatch');
      }
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
      if (editMode && user) {
        // Edit existing user
        logger.log('Editing user', { userId: user.id, userName: formData.userName });
        const response = await editUser({
          userId: user.id || '',
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          firstNameFa: formData.firstNameFa.trim(),
          lastNameFa: formData.lastNameFa.trim(),
          userName: formData.userName.trim(),
        });
        
        if (response.success) {
          logger.log('User edited successfully', { userId: user.id });
          onClose(true);
        } else {
          setError(response.message || t('userManagement.errors.editFailed'));
        }
      } else {
        // Create new user
        logger.log('Creating user', { userName: formData.userName });
        const response = await createUser({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          firstNameFa: formData.firstNameFa.trim(),
          lastNameFa: formData.lastNameFa.trim(),
          userName: formData.userName.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
        
        if (response.success) {
          logger.log('User created successfully');
          onClose(true);
        } else {
          setError(response.message || t('userManagement.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save user', { error: err });
      setError(editMode 
        ? t('userManagement.errors.editFailed')
        : t('userManagement.errors.createFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      data-id-ref="add-edit-user-dialog"
    >
      <DialogTitle data-id-ref="add-edit-user-dialog-title">
        {editMode ? t('userManagement.editUser') : t('userManagement.createUser')}
      </DialogTitle>
      
      <DialogContent data-id-ref="add-edit-user-dialog-content">
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && (
            <Alert 
              data-id-ref="add-edit-user-error"
              severity="error" 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          <TextField
            data-id-ref="user-username-input"
            label={t('userManagement.fields.username')}
            value={formData.userName}
            onChange={handleInputChange('userName')}
            error={Boolean(formErrors.userName)}
            helperText={formErrors.userName || t('userManagement.hints.username')}
            required
            fullWidth
            disabled={editMode} // Username cannot be changed
            autoComplete="username"
          />
          
          <TextField
            data-id-ref="user-firstName-input"
            label={t('userManagement.fields.firstName')}
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={Boolean(formErrors.firstName)}
            helperText={formErrors.firstName || t('userManagement.hints.firstName')}
            required
            fullWidth
            autoComplete="given-name"
          />
          
          <TextField
            data-id-ref="user-lastName-input"
            label={t('userManagement.fields.lastName')}
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            error={Boolean(formErrors.lastName)}
            helperText={formErrors.lastName || t('userManagement.hints.lastName')}
            required
            fullWidth
            autoComplete="family-name"
          />
          
          <TextField
            data-id-ref="user-firstNameFa-input"
            label={t('userManagement.fields.firstNameFa')}
            value={formData.firstNameFa}
            onChange={handleInputChange('firstNameFa')}
            error={Boolean(formErrors.firstNameFa)}
            helperText={formErrors.firstNameFa || t('userManagement.hints.firstNameFa')}
            required
            fullWidth
          />
          
          <TextField
            data-id-ref="user-lastNameFa-input"
            label={t('userManagement.fields.lastNameFa')}
            value={formData.lastNameFa}
            onChange={handleInputChange('lastNameFa')}
            error={Boolean(formErrors.lastNameFa)}
            helperText={formErrors.lastNameFa || t('userManagement.hints.lastNameFa')}
            required
            fullWidth
          />
          
          {!editMode && (
            <>
              <TextField
                data-id-ref="user-password-input"
                label={t('userManagement.fields.password')}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={Boolean(formErrors.password)}
                helperText={formErrors.password || t('userManagement.hints.password')}
                required
                fullWidth
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        data-id-ref="toggle-password-visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                data-id-ref="user-confirmPassword-input"
                label={t('userManagement.fields.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={Boolean(formErrors.confirmPassword)}
                helperText={formErrors.confirmPassword || t('userManagement.hints.confirmPassword')}
                required
                fullWidth
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        data-id-ref="toggle-confirm-password-visibility"
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                        aria-label={showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')}
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions data-id-ref="add-edit-user-dialog-actions">
        <Button
          data-id-ref="cancel-user-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="save-user-btn"
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

export default AddEditUserDialog;
