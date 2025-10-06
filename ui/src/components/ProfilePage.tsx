import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
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
    <Container fluid className="profile-page" data-id-ref="profile-page-container">
      <div className="page-header mb-4" data-id-ref="profile-page-header">
        <h1 className="page-title" data-id-ref="profile-page-title">
          {t('profilePage.title')}
        </h1>
        <p className="page-subtitle text-muted" data-id-ref="profile-page-subtitle">
          {t('profilePage.subtitle')}
        </p>
      </div>

      <Row className="g-4">
        {/* User Information Card */}
        <Col xs={12} lg={6}>
          <Card className="profile-card h-100" data-id-ref="profile-page-user-info-card">
            <Card.Body data-id-ref="profile-page-user-info-card-body">
              <h5 className="card-title mb-4" data-id-ref="profile-page-user-info-title">
                <i className="bi bi-person-circle me-2" data-id-ref="profile-page-user-info-icon"></i>
                {t('profilePage.userInfo.title')}
              </h5>
              
              <div className="user-info-content" data-id-ref="profile-page-user-info-content">
                <div className="info-item mb-3" data-id-ref="profile-page-user-info-username-item">
                  <label className="info-label" data-id-ref="profile-page-user-info-username-label">
                    {t('profilePage.userInfo.username')}
                  </label>
                  <div className="info-value" data-id-ref="profile-page-user-info-username-value">
                    {user?.userName || '-'}
                  </div>
                </div>

                <div className="info-item mb-3" data-id-ref="profile-page-user-info-firstname-item">
                  <label className="info-label" data-id-ref="profile-page-user-info-firstname-label">
                    {t('profilePage.userInfo.firstName')}
                  </label>
                  <div className="info-value" data-id-ref="profile-page-user-info-firstname-value">
                    {getFirstName()}
                  </div>
                </div>

                <div className="info-item mb-3" data-id-ref="profile-page-user-info-lastname-item">
                  <label className="info-label" data-id-ref="profile-page-user-info-lastname-label">
                    {t('profilePage.userInfo.lastName')}
                  </label>
                  <div className="info-value" data-id-ref="profile-page-user-info-lastname-value">
                    {getLastName()}
                  </div>
                </div>

                <div className="info-item" data-id-ref="profile-page-user-info-roles-item">
                  <label className="info-label" data-id-ref="profile-page-user-info-roles-label">
                    {t('profilePage.userInfo.roles')}
                  </label>
                  <div className="info-value" data-id-ref="profile-page-user-info-roles-value">
                    {user?.roles && user.roles.length > 0 ? (
                      <div className="roles-badges" data-id-ref="profile-page-user-info-roles-badges">
                        {user.roles.map((role, index) => (
                          <span 
                            key={index} 
                            className="badge bg-primary me-2 mb-2"
                            data-id-ref={`profile-page-user-info-role-badge-${index}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span data-id-ref="profile-page-user-info-no-roles">-</span>
                    )}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Change Password Card */}
        <Col xs={12} lg={6}>
          <Card className="profile-card h-100" data-id-ref="profile-page-change-password-card">
            <Card.Body data-id-ref="profile-page-change-password-card-body">
              <h5 className="card-title mb-4" data-id-ref="profile-page-change-password-title">
                <i className="bi bi-shield-lock me-2" data-id-ref="profile-page-change-password-icon"></i>
                {t('profilePage.changePassword.title')}
              </h5>
              
              <p className="text-muted mb-4" data-id-ref="profile-page-change-password-subtitle">
                {t('profilePage.changePassword.subtitle')}
              </p>

              {successMessage && (
                <Alert 
                  variant="success" 
                  dismissible 
                  onClose={() => setSuccessMessage('')}
                  data-id-ref="profile-page-change-password-success-alert"
                >
                  {successMessage}
                </Alert>
              )}

              {errorMessage && (
                <Alert 
                  variant="danger" 
                  dismissible 
                  onClose={() => setErrorMessage('')}
                  data-id-ref="profile-page-change-password-error-alert"
                >
                  {errorMessage}
                </Alert>
              )}

              <Form onSubmit={handlePasswordChange} data-id-ref="profile-page-change-password-form">
                <Form.Group className="mb-3" data-id-ref="profile-page-change-password-current-group">
                  <Form.Label data-id-ref="profile-page-change-password-current-label">
                    {t('profilePage.changePassword.currentPassword')}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    isInvalid={!!errors.currentPassword}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    data-id-ref="profile-page-change-password-current-input"
                  />
                  <Form.Control.Feedback 
                    type="invalid"
                    data-id-ref="profile-page-change-password-current-error"
                  >
                    {errors.currentPassword}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" data-id-ref="profile-page-change-password-new-group">
                  <Form.Label data-id-ref="profile-page-change-password-new-label">
                    {t('profilePage.changePassword.newPassword')}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    isInvalid={!!errors.newPassword}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    data-id-ref="profile-page-change-password-new-input"
                  />
                  <Form.Control.Feedback 
                    type="invalid"
                    data-id-ref="profile-page-change-password-new-error"
                  >
                    {errors.newPassword}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4" data-id-ref="profile-page-change-password-confirm-group">
                  <Form.Label data-id-ref="profile-page-change-password-confirm-label">
                    {t('profilePage.changePassword.confirmNewPassword')}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                    isInvalid={!!errors.confirmNewPassword}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    data-id-ref="profile-page-change-password-confirm-input"
                  />
                  <Form.Control.Feedback 
                    type="invalid"
                    data-id-ref="profile-page-change-password-confirm-error"
                  >
                    {errors.confirmNewPassword}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-flex gap-2" data-id-ref="profile-page-change-password-buttons">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    data-id-ref="profile-page-change-password-submit-button"
                  >
                    {isSubmitting ? (
                      <>
                        <span 
                          className="spinner-border spinner-border-sm me-2" 
                          role="status" 
                          aria-hidden="true"
                          data-id-ref="profile-page-change-password-submit-spinner"
                        ></span>
                        {t('loading')}
                      </>
                    ) : (
                      t('profilePage.changePassword.changePasswordButton')
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    data-id-ref="profile-page-change-password-cancel-button"
                  >
                    {t('profilePage.changePassword.cancelButton')}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
