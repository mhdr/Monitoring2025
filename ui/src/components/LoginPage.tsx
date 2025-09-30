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
  from?: {
    pathname: string;
  };
}

const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
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
      // Navigate to the saved location or default to /dashboard
      const state = location.state as LocationState;
      const from = state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
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
    <div className="login-page min-vh-100 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={8} md={6} lg={5} xl={4}>
            <Card className="login-card shadow-lg border-0">
              <Card.Body className="p-4 p-md-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="login-logo mb-3">
                    <div className="logo-icon">
                      <i className="fas fa-warehouse" aria-hidden="true"></i>
                    </div>
                  </div>
                  <h1 className="h3 mb-2 fw-bold text-primary">
                    {t('loginTitle')}
                  </h1>
                  <p className="text-muted mb-0">
                    {t('loginSubtitle')}
                  </p>
                </div>

                {/* Error Alert */}
                {apiError && (
                  <Alert 
                    variant="danger" 
                    className="mb-4" 
                    dismissible 
                    onClose={clearApiError}
                  >
                    <Alert.Heading className="h6 mb-2">
                      {t('loginError')}
                    </Alert.Heading>
                    {apiError}
                  </Alert>
                )}

                {/* Login Form */}
                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium">
                      {t('username')} *
                    </Form.Label>
                    <Form.Control
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
                    <Form.Control.Feedback type="invalid">
                      {errors.username}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium">
                      {t('password')} *
                    </Form.Label>
                    <Form.Control
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
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Check
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
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 fw-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
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