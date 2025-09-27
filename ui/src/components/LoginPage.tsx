import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../types/auth';
import './LoginPage.css';

interface FormErrors {
  username?: string;
  password?: string;
}

const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = t('usernameRequired');
    } else if (formData.username.trim().length < 3) {
      newErrors.username = t('usernameMinLength');
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear API error when user modifies form
    if (apiError) {
      setApiError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
    } catch (error) {
      const apiErr = error as ApiError;
      
      // Map specific error codes to user-friendly messages
      if (apiErr.status === 401) {
        setApiError(t('invalidCredentials'));
      } else if (apiErr.status === 0) {
        setApiError(t('networkError'));
      } else if (apiErr.status && apiErr.status >= 500) {
        setApiError(t('serverError'));
      } else {
        setApiError(apiErr.message || t('unexpectedError'));
      }
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
                    onClose={() => setApiError('')}
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