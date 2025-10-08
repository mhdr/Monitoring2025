import { useState } from 'react';
import { 
  Container, 
  Grid2 as Grid, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Alert, 
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useChangePasswordMutation } from '../services/rtkApi';
import './ProfilePage.css';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  
  // RTK Query mutation hook
  const [changePassword, { isLoading: isSubmitting }] = useChangePasswordMutation();
  
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Current password validation
    if (!passwordForm.currentPassword.trim()) {
      newErrors.currentPassword = t('profilePage.validation.currentPasswordRequired');
    }
    
    // New password validation
    if (!passwordForm.newPassword.trim()) {
      newErrors.newPassword = t('profilePage.validation.newPasswordRequired');
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = t('profilePage.validation.passwordMinLength');
    } else {
      // Check password complexity
      const hasUpperCase = /[A-Z]/.test(passwordForm.newPassword);
      const hasLowerCase = /[a-z]/.test(passwordForm.newPassword);
      const hasNumber = /[0-9]/.test(passwordForm.newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        newErrors.newPassword = t('profilePage.validation.passwordComplexity');
      }
    }
    
    // Confirm password validation
    if (!passwordForm.confirmNewPassword.trim()) {
      newErrors.confirmNewPassword = t('profilePage.validation.confirmPasswordRequired');
    } else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      newErrors.confirmNewPassword = t('profilePage.validation.passwordsDoNotMatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setSuccessMessage('');
    setErrorMessage('');
    
    // Validate form
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      // Call the RTK Query mutation
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }).unwrap();
      
      if (response.isSuccessful) {
        setSuccessMessage(t('profilePage.messages.changePasswordSuccess'));
        // Clear the form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setErrors({});
        
        // Log out the user after successful password change
        // User needs to log in again with the new password
        setTimeout(() => {
          logout();
        }, 2000); // Give user 2 seconds to see the success message
      } else {
        setErrorMessage(t('profilePage.messages.changePasswordError'));
      }
    } catch (error: unknown) {
      console.error('Change password error:', error);
      
      // Handle specific error cases
      const apiError = error as { status?: number; message?: string };
      if (apiError.status === 400 || apiError.status === 401) {
        setErrorMessage(t('profilePage.messages.currentPasswordIncorrect'));
      } else if (apiError.status === 0) {
        setErrorMessage(t('profilePage.messages.networkError'));
      } else {
        setErrorMessage(apiError.message || t('profilePage.messages.changePasswordError'));
      }
    }
  };

  const handleInputChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
    
    // Clear messages when user starts typing
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCancel = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
  };

  const getFirstName = () => {
    if (language === 'fa' && user?.firstNameFa) {
      return user.firstNameFa;
    }
    return user?.firstName || '-';
  };

  const getLastName = () => {
    if (language === 'fa' && user?.lastNameFa) {
      return user.lastNameFa;
    }
    return user?.lastName || '-';
  };

  return (
    <Container maxWidth={false} className="profile-page" data-id-ref="profile-page-container">
      <Box className="page-header mb-4" data-id-ref="profile-page-header">
        <Typography variant="h4" component="h1" className="page-title" data-id-ref="profile-page-title">
          {t('profilePage.title')}
        </Typography>
        <Typography variant="body1" className="page-subtitle text-muted" data-id-ref="profile-page-subtitle">
          {t('profilePage.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* User Information Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card className="profile-card h-100" data-id-ref="profile-page-user-info-card">
            <CardContent data-id-ref="profile-page-user-info-card-body">
              <Typography variant="h6" className="card-title mb-4" data-id-ref="profile-page-user-info-title">
                <i className="bi bi-person-circle me-2" data-id-ref="profile-page-user-info-icon"></i>
                {t('profilePage.userInfo.title')}
              </Typography>
              
              <Box className="user-info-content" data-id-ref="profile-page-user-info-content">
                <Box className="info-item mb-3" data-id-ref="profile-page-user-info-username-item">
                  <Typography component="label" className="info-label" data-id-ref="profile-page-user-info-username-label">
                    {t('profilePage.userInfo.username')}
                  </Typography>
                  <Typography className="info-value" data-id-ref="profile-page-user-info-username-value">
                    {user?.userName || '-'}
                  </Typography>
                </Box>

                <Box className="info-item mb-3" data-id-ref="profile-page-user-info-firstname-item">
                  <Typography component="label" className="info-label" data-id-ref="profile-page-user-info-firstname-label">
                    {t('profilePage.userInfo.firstName')}
                  </Typography>
                  <Typography className="info-value" data-id-ref="profile-page-user-info-firstname-value">
                    {getFirstName()}
                  </Typography>
                </Box>

                <Box className="info-item mb-3" data-id-ref="profile-page-user-info-lastname-item">
                  <Typography component="label" className="info-label" data-id-ref="profile-page-user-info-lastname-label">
                    {t('profilePage.userInfo.lastName')}
                  </Typography>
                  <Typography className="info-value" data-id-ref="profile-page-user-info-lastname-value">
                    {getLastName()}
                  </Typography>
                </Box>

                <Box className="info-item" data-id-ref="profile-page-user-info-roles-item">
                  <Typography component="label" className="info-label" data-id-ref="profile-page-user-info-roles-label">
                    {t('profilePage.userInfo.roles')}
                  </Typography>
                  <Box className="info-value" data-id-ref="profile-page-user-info-roles-value">
                    {user?.roles && user.roles.length > 0 ? (
                      <Box className="roles-badges" data-id-ref="profile-page-user-info-roles-badges">
                        {user.roles.map((role, index) => (
                          <Chip
                            key={index}
                            label={role}
                            color="primary"
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                            data-id-ref={`profile-page-user-info-role-badge-${index}`}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography component="span" data-id-ref="profile-page-user-info-no-roles">-</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password Card */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card className="profile-card h-100" data-id-ref="profile-page-change-password-card">
            <CardContent data-id-ref="profile-page-change-password-card-body">
              <Typography variant="h6" className="card-title mb-4" data-id-ref="profile-page-change-password-title">
                <i className="bi bi-shield-lock me-2" data-id-ref="profile-page-change-password-icon"></i>
                {t('profilePage.changePassword.title')}
              </Typography>
              
              <Typography variant="body2" className="text-muted mb-4" data-id-ref="profile-page-change-password-subtitle">
                {t('profilePage.changePassword.subtitle')}
              </Typography>

              {successMessage && (
                <Alert 
                  severity="success"
                  onClose={() => setSuccessMessage('')}
                  sx={{ mb: 2 }}
                  data-id-ref="profile-page-change-password-success-alert"
                >
                  {successMessage}
                </Alert>
              )}

              {errorMessage && (
                <Alert 
                  severity="error"
                  onClose={() => setErrorMessage('')}
                  sx={{ mb: 2 }}
                  data-id-ref="profile-page-change-password-error-alert"
                >
                  {errorMessage}
                </Alert>
              )}

              <Box component="form" onSubmit={handlePasswordChange} data-id-ref="profile-page-change-password-form">
                <TextField
                  type="password"
                  label={t('profilePage.changePassword.currentPassword')}
                  value={passwordForm.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  fullWidth
                  margin="normal"
                  data-id-ref="profile-page-change-password-current-input"
                />

                <TextField
                  type="password"
                  label={t('profilePage.changePassword.newPassword')}
                  value={passwordForm.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  fullWidth
                  margin="normal"
                  data-id-ref="profile-page-change-password-new-input"
                />

                <TextField
                  type="password"
                  label={t('profilePage.changePassword.confirmNewPassword')}
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                  error={!!errors.confirmNewPassword}
                  helperText={errors.confirmNewPassword}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  fullWidth
                  margin="normal"
                  data-id-ref="profile-page-change-password-confirm-input"
                />

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }} data-id-ref="profile-page-change-password-buttons">
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                    data-id-ref="profile-page-change-password-submit-button"
                  >
                    {isSubmitting ? t('loading') : t('profilePage.changePassword.changePasswordButton')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    data-id-ref="profile-page-change-password-cancel-button"
                  >
                    {t('profilePage.changePassword.cancelButton')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
