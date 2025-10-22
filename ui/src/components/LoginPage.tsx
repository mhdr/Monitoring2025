import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  AlertTitle,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Warehouse as WarehouseIcon, Close as CloseIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import type { ApiError } from '../types/auth';

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
  const [formData, setFormData] = useState({ username: '', password: '' });
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
      });

      // If we reach this point, login was successful
      // Navigate to the saved location (preserve search/hash) or default to /dashboard/sync
      const state = location.state as LocationState;
      const fromLoc = state?.from;
      if (fromLoc && fromLoc.pathname) {
        const target = `${fromLoc.pathname || '/dashboard/sync'}${fromLoc.search || ''}${fromLoc.hash || ''}`;
        navigate(target, { replace: true });
      } else {
        navigate('/dashboard/sync', { replace: true });
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
    <Box
      data-id-ref="login-page-container"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Card data-id-ref="login-card" elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent data-id-ref="login-card-body" sx={{ p: { xs: 3, md: 5 } }}>
            {/* Header */}
            <Box data-id-ref="login-header" sx={{ textAlign: 'center', mb: 4 }}>
              <Box data-id-ref="login-logo" sx={{ mb: 2 }}>
                <WarehouseIcon
                  data-id-ref="login-logo-icon-visual"
                  sx={{ fontSize: 64 }}
                  color="primary"
                />
              </Box>
              <Typography
                variant="h4"
                component="h1"
                data-id-ref="login-title"
                sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}
              >
                {t('loginTitle')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                data-id-ref="login-subtitle"
              >
                {t('loginSubtitle')}
              </Typography>
            </Box>

            {/* Error Alert */}
            {apiError && (
              <Alert
                severity="error"
                data-id-ref="login-error-alert"
                sx={{ mb: 3 }}
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={clearApiError}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                }
              >
                <AlertTitle data-id-ref="login-error-heading">
                  {t('loginError')}
                </AlertTitle>
                <Box data-id-ref="login-error-message">{apiError}</Box>
              </Alert>
            )}

            {/* Login Form */}
            <Box
              component="form"
              data-id-ref="login-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <TextField
                data-id-ref="login-username-input"
                fullWidth
                label={t('username') + ' *'}
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={!!errors.username}
                helperText={errors.username}
                disabled={isLoading}
                autoComplete="username"
                placeholder={t('username')}
                sx={{ mb: 3 }}
                inputProps={{
                  'data-id-ref': 'login-username-field',
                }}
              />

              <TextField
                data-id-ref="login-password-input"
                fullWidth
                type="password"
                label={t('password') + ' *'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={!!errors.password}
                helperText={errors.password}
                disabled={isLoading}
                autoComplete="current-password"
                placeholder={t('password')}
                sx={{ mb: 4 }}
                inputProps={{
                  'data-id-ref': 'login-password-field',
                }}
              />

              <Button
                data-id-ref="login-submit-button"
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5 }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress
                      data-id-ref="login-loading-spinner"
                      size={20}
                      color="inherit"
                    />
                    {t('loading')}
                  </Box>
                ) : (
                  t('loginButton')
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;