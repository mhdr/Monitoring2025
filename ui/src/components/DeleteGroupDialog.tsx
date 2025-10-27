import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import {
  DeleteOutline as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useMonitoring } from '../hooks/useMonitoring';
import { deleteGroup } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteGroupDialog');

interface DeleteGroupDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess?: () => void;
}

/**
 * Dialog for deleting a monitoring group/folder
 * Only allows deletion if the group has no items or subgroups
 */
const DeleteGroupDialog: React.FC<DeleteGroupDialogProps> = ({
  open,
  onClose,
  groupId,
  groupName,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { state, fetchGroups } = useMonitoring();
  const groups = state.groups;
  const items = state.items;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  logger.log('DeleteGroupDialog render', { 
    open, 
    groupId, 
    groupName,
    groupsCount: groups.length,
    itemsCount: items.length,
  });

  /**
   * Check if group has subgroups
   */
  const hasSubgroups = useMemo(() => {
    return groups.some(group => group.parentId === groupId);
  }, [groups, groupId]);

  /**
   * Check if group has items
   */
  const hasItems = useMemo(() => {
    return items.some(item => item.groupId === groupId);
  }, [items, groupId]);

  /**
   * Count subgroups and items
   */
  const { subgroupCount, itemCount } = useMemo(() => {
    const subgroupCount = groups.filter(group => group.parentId === groupId).length;
    const itemCount = items.filter(item => item.groupId === groupId).length;
    return { subgroupCount, itemCount };
  }, [groups, items, groupId]);

  /**
   * Check if deletion is allowed (no subgroups and no items)
   */
  const canDelete = !hasSubgroups && !hasItems;

  /**
   * Handle dialog close - reset state
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  /**
   * Handle delete group submission
   */
  const handleDelete = async () => {
    if (!canDelete) {
      setError(t('deleteGroupDialog.errors.hasContent'));
      return;
    }

    logger.log('Deleting group', {
      groupId,
      groupName,
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await deleteGroup({
        id: groupId,
      });

      if (response.success) {
        logger.log('Group deleted successfully', {
          groupId,
        });
        
        setSuccess(true);
        
        // Refresh groups from backend to get updated structure
        try {
          await fetchGroups();
          logger.log('Groups refreshed from backend after delete');
        } catch (refreshError) {
          logger.error('Failed to refresh groups after delete', refreshError);
          // Continue with success flow even if refresh fails
        }
        
        // Call success callback after short delay to show success message
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1000);
      } else {
        logger.error('Delete group failed - API returned unsuccessful', { 
          groupId,
          message: response.message,
        });
        const errorMessage = response.message || t('deleteGroupDialog.errors.deleteFailed');
        setError(errorMessage);
      }
    } catch (err: unknown) {
      logger.error('Error deleting group', err);
      
      // Extract error message
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || t('deleteGroupDialog.errors.unknownError');
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 2, sm: 3 },
          maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
        },
      }}
      data-id-ref="delete-group-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <DialogTitle 
        data-id-ref="delete-group-dialog-title"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <DeleteIcon color="error" />
          <Typography 
            variant="h6" 
            component="span"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {t('deleteGroupDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent 
        data-id-ref="delete-group-dialog-content"
        sx={{
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Folder Information */}
        <Box mb={2}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {t('deleteGroupDialog.folderLabel')}
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight="medium"
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1rem' },
              wordBreak: 'break-word',
            }}
          >
            {groupName}
          </Typography>
        </Box>

        {/* Warning Message */}
        {canDelete ? (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ 
              mb: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="delete-group-dialog-warning"
          >
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {t('deleteGroupDialog.confirmMessage')}
            </Typography>
          </Alert>
        ) : (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="delete-group-dialog-cannot-delete"
          >
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {t('deleteGroupDialog.cannotDeleteMessage')}
            </Typography>
            {hasSubgroups && (
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, mt: 1 }}>
                • {t('deleteGroupDialog.hasSubgroups', { count: subgroupCount })}
              </Typography>
            )}
            {hasItems && (
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, mt: 0.5 }}>
                • {t('deleteGroupDialog.hasItems', { count: itemCount })}
              </Typography>
            )}
          </Alert>
        )}

        <DialogContentText
          sx={{ 
            fontSize: { xs: '0.85rem', sm: '0.9rem' },
            mb: 2,
          }}
        >
          {canDelete 
            ? t('deleteGroupDialog.description')
            : t('deleteGroupDialog.moveOrDeleteContent')
          }
        </DialogContentText>

        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="delete-group-dialog-error"
          >
            {error}
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="delete-group-dialog-success"
          >
            {t('deleteGroupDialog.success')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions 
        data-id-ref="delete-group-dialog-actions"
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2 },
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          '& > :not(style)': {
            width: { xs: '100%', sm: 'auto' },
          },
        }}
      >
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          disabled={isSubmitting}
          data-id-ref="delete-group-dialog-cancel-button"
          fullWidth={false}
          sx={{
            order: { xs: 2, sm: 1 },
          }}
        >
          {t('cancel')}
        </Button>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete();
          }}
          variant="contained"
          color="error"
          disabled={isSubmitting || !canDelete}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <DeleteIcon />}
          data-id-ref="delete-group-dialog-delete-button"
          fullWidth={false}
          sx={{
            order: { xs: 1, sm: 2 },
          }}
        >
          {isSubmitting ? t('deleteGroupDialog.deleting') : t('deleteGroupDialog.deleteButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteGroupDialog;
