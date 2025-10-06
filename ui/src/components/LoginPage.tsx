import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../types/auth';
import './LoginPage.css';

interface FormErrors {
  username?: string;
  password?: string;
}

interface LocationState {
  // Preserve the full location including pathname, search, and hash
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Initialize rememberMe as true to match the default checked state of the checkbox
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: true });
  const [errors, setErrors] = useState<FormErrors>({});
  // Local API error 
  const [apiError, setApiError] = useState<string>('');
  const [pendingNewAttempt, setPendingNewAttempt] = useState(false);

  // Clear apiError only when user starts typing or manually dismisses
  const clearApiError = () => {
    setApiError('');
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = t('usernameRequired');
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('usernameMinLength');
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear API error when user modifies form
    // Don't clear apiError on first key stroke after failure; only mark that user is editing
    if (apiError && !pendingNewAttempt) {
      setPendingNewAttempt(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If user modified inputs after a failure (pendingNewAttempt), clear apiError now
    if (pendingNewAttempt) {
      clearApiError();
    }

    try {
      await login({
        userName: formData.username.trim(),
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      // If we reach this point, login was successful
      // Navigate to the saved location (preserve search/hash) or default to /dashboard
      const state = location.state as LocationState;
      const fromLoc = state?.from;
      if (fromLoc && fromLoc.pathname) {
        const target = `${fromLoc.pathname || '/dashboard'}${fromLoc.search || ''}${fromLoc.hash || ''}`;
        navigate(target, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      // Handle login error
      const apiErr = error as ApiError;
      setApiError(apiErr.message || t('unexpectedError'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <div data-id-ref="login-page-container" className="login-page min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={8} md={6} lg={5} xl={4}>
            <Card data-id-ref="login-card" className="login-card shadow-lg border-0">
              <Card.Body data-id-ref="login-card-body" className="p-4 p-md-5">
                {/* Header */}
                <div data-id-ref="login-header" className="text-center mb-4">
                  <div data-id-ref="login-logo" className="login-logo mb-3">
                    <div data-id-ref="login-logo-icon" className="logo-icon">
                      <i data-id-ref="login-logo-icon-visual" className="fas fa-warehouse" aria-hidden="true"></i>
                    </div>
                  </div>
                  <h1 data-id-ref="login-title" className="h3 mb-2 fw-bold text-primary">
                    {t('loginTitle')}
                  </h1>
                  <p data-id-ref="login-subtitle" className="text-muted mb-0">
                    {t('loginSubtitle')}
                  </p>
                </div>

                {/* Error Alert */}
                {apiError && (
                  <Alert 
                    data-id-ref="login-error-alert"
                    variant="danger" 
                    className="mb-4" 
                    dismissible 
                    onClose={clearApiError}
                  >
                    <Alert.Heading data-id-ref="login-error-heading" className="h6 mb-2">
                      {t('loginError')}
                    </Alert.Heading>
                    <div data-id-ref="login-error-message">{apiError}</div>
                  </Alert>
                )}

                {/* Login Form */}
                <Form data-id-ref="login-form" onSubmit={handleSubmit} noValidate>
                  <Form.Group data-id-ref="login-username-group" className="mb-3">
                    <Form.Label data-id-ref="login-username-label" className="fw-medium">
                      {t('username')} *
                    </Form.Label>
                    <Form.Control
                      data-id-ref="login-username-input"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      isInvalid={!!errors.username}
                      disabled={isLoading}
                      autoComplete="username"
                      className="form-control-lg"
                      placeholder={t('username')}
                    />
                    <Form.Control.Feedback data-id-ref="login-username-feedback" type="invalid">
                      {errors.username}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group data-id-ref="login-password-group" className="mb-4">
                    <Form.Label data-id-ref="login-password-label" className="fw-medium">
                      {t('password')} *
                    </Form.Label>
                    <Form.Control
                      data-id-ref="login-password-input"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      isInvalid={!!errors.password}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="form-control-lg"
                      placeholder={t('password')}
                    />
                    <Form.Control.Feedback data-id-ref="login-password-feedback" type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group data-id-ref="login-remember-group" className="mb-4">
                    <Form.Check
                      data-id-ref="login-remember-checkbox"
                      type="checkbox"
                      name="rememberMe"
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      label={t('rememberMe')}
                      className="fw-medium"
                    />
                  </Form.Group>

                  <Button
                    data-id-ref="login-submit-button"
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 fw-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          data-id-ref="login-loading-spinner"
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        {t('loading')}
                      </>
                    ) : (
                      t('loginButton')
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;