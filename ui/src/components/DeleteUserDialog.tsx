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
import { Warning as WarningIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { deleteUser } from '../services/userApi';
import type { UserInfoDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteUserDialog');

interface DeleteUserDialogProps {
  open: boolean;
  user: UserInfoDto | null;
  onClose: (shouldRefresh: boolean) => void;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
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

  const handleDelete = async () => {
    if (!user || !user.id) {
      logger.error('Cannot delete user: user or user ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Deleting user', { userId: user.id, userName: user.userName });
      const response = await deleteUser(user.id);

      if (response.success) {
        logger.log('User deleted successfully', { userId: user.id });
        onClose(true);
      } else {
        setError(response.message || t('userManagement.errors.deleteFailed'));
      }
    } catch (err) {
      logger.error('Failed to delete user', { error: err });
      setError(t('userManagement.errors.deleteFailed'));
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
      data-id-ref="delete-user-dialog"
    >
      <DialogTitle data-id-ref="delete-user-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('userManagement.dialogs.deleteUserTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="delete-user-dialog-content">
        {error && (
          <Alert
            data-id-ref="delete-user-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <DialogContentText data-id-ref="delete-user-confirmation-text">
          {t('userManagement.dialogs.deleteUserMessage', {
            userName: getUserDisplayName(),
          })}
        </DialogContentText>

        <Alert severity="warning" sx={{ mt: 2 }} data-id-ref="delete-user-warning">
          {t('userManagement.dialogs.deleteUserWarning')}
        </Alert>
      </DialogContent>

      <DialogActions data-id-ref="delete-user-dialog-actions">
        <Button
          data-id-ref="cancel-delete-user-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="confirm-delete-user-btn"
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteUserDialog;
