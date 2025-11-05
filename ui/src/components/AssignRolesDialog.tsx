import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from '@mui/material';
import { AssignmentInd as AssignmentIndIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { updateUserRoles } from '../services/userApi';
import type { UserInfoDto, RoleInfoDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AssignRolesDialog');

interface AssignRolesDialogProps {
  open: boolean;
  user: UserInfoDto | null;
  roles: RoleInfoDto[];
  onClose: (shouldRefresh: boolean) => void;
}

const AssignRolesDialog: React.FC<AssignRolesDialogProps> = ({
  open,
  user,
  roles,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Initialize selected roles when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
      setSelectedRoles(user.roles || []);
      setError(null);
    }
  }, [open, user]);

  const getUserDisplayName = (): string => {
    if (!user) return '';
    const isRTL = language === 'fa';
    if (isRTL && user.firstNameFa && user.lastNameFa) {
      return `${user.firstNameFa} ${user.lastNameFa}`;
    }
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName || '';
  };

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleName)) {
        return prev.filter((r) => r !== roleName);
      } else {
        return [...prev, roleName];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user || !user.id) {
      logger.error('Cannot update roles: user or user ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Updating user roles', {
        userId: user.id,
        userName: user.userName,
        roles: selectedRoles,
      });

      const response = await updateUserRoles(user.id, selectedRoles);

      if (response.success) {
        logger.log('User roles updated successfully', { userId: user.id });
        onClose(true);
      } else {
        setError(response.message || t('userManagement.errors.assignRolesFailed'));
      }
    } catch (err) {
      logger.error('Failed to update user roles', { error: err });
      setError(t('userManagement.errors.assignRolesFailed'));
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
      data-id-ref="assign-roles-dialog"
    >
      <DialogTitle data-id-ref="assign-roles-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIndIcon color="primary" />
          <Typography variant="h6">
            {t('userManagement.assignRoles')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="assign-roles-dialog-content">
        {error && (
          <Alert
            data-id-ref="assign-roles-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('userManagement.dialogs.assignRolesMessage', {
            userName: getUserDisplayName(),
          })}
        </Typography>

        <FormGroup data-id-ref="roles-checkbox-group">
          {roles.map((role) => (
            <FormControlLabel
              key={role.id}
              data-id-ref={`role-checkbox-${role.name}`}
              control={
                <Checkbox
                  checked={selectedRoles.includes(role.name || '')}
                  onChange={() => handleRoleToggle(role.name || '')}
                  disabled={loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">{role.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('userManagement.roleUserCount', { count: role.userCount })}
                  </Typography>
                </Box>
              }
            />
          ))}
        </FormGroup>

        {roles.length === 0 && (
          <Alert severity="info" data-id-ref="no-roles-alert">
            {t('userManagement.errors.noRolesAvailable')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions data-id-ref="assign-roles-dialog-actions">
        <Button
          data-id-ref="cancel-assign-roles-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="save-roles-btn"
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || roles.length === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignRolesDialog;
