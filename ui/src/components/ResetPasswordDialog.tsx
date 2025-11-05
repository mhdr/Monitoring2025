import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { resetPassword } from '../services/userApi';
import type { UserInfoDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ResetPasswordDialog');

interface ResetPasswordDialogProps {
  open: boolean;
  user: UserInfoDto | null;
  onClose: (shouldRefresh: boolean) => void;
}

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  open,
  user,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserDisplayName = (): string => {
    if (!user) return '';
    const isRTL = language === 'fa';
    if (isRTL && user.firstNameFa && user.lastNameFa) {
      return `${user.firstNameFa} ${user.lastNameFa}`;
    }
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName || '';
  };

  const handleReset = async () => {
    if (!user || !user.userName) {
      logger.error('Cannot reset password: user or userName is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Resetting user password', { userName: user.userName });
      const response = await resetPassword(user.userName);

      if (response.isSuccessful) {
        logger.log('Password reset successfully', { userName: user.userName });
        onClose(true);
      } else {
        const errorMessage = response.message || 
          (response.errors && response.errors.length > 0 ? response.errors.join(', ') : null) ||
          t('userManagement.errors.resetPasswordFailed');
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('Failed to reset password', { error: err });
      setError(t('userManagement.errors.resetPasswordFailed'));
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
      data-id-ref="reset-password-dialog"
    >
      <DialogTitle data-id-ref="reset-password-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockResetIcon color="warning" />
          <Typography variant="h6">
            {t('userManagement.dialogs.resetPasswordTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="reset-password-dialog-content">
        {error && (
          <Alert
            data-id-ref="reset-password-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="reset-password-confirmation-text">
          {t('userManagement.dialogs.resetPasswordMessage', {
            userName: getUserDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="info" sx={{ mt: 2 }} data-id-ref="reset-password-warning">
          {t('userManagement.dialogs.resetPasswordWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="reset-password-dialog-actions">
        <Button
          data-id-ref="cancel-reset-password-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-reset-password-btn"
          onClick={handleReset}
          variant="contained"
          color="warning"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('userManagement.actions.resetPassword')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResetPasswordDialog;
