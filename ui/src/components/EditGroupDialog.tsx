import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useMonitoring } from '../hooks/useMonitoring';
import { editGroup } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('EditGroupDialog');

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupNameFa?: string | null;
  onSuccess?: () => void;
}

/**
 * Dialog for editing a monitoring group/folder name
 */
const EditGroupDialog: React.FC<EditGroupDialogProps> = ({
  open,
  onClose,
  groupId,
  groupName,
  groupNameFa,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { fetchGroups } = useMonitoring();
  const [name, setName] = useState<string>(groupName);
  const [nameFa, setNameFa] = useState<string>(groupNameFa || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  logger.log('EditGroupDialog render', { 
    open, 
    groupId, 
    groupName,
    groupNameFa,
  });

  // Reset names when dialog opens or props change
  useEffect(() => {
    if (open) {
      setName(groupName);
      setNameFa(groupNameFa || '');
      setError(null);
      setSuccess(false);
    }
  }, [open, groupName, groupNameFa]);

  /**
   * Handle dialog close - reset state
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setName(groupName);
      setNameFa(groupNameFa || '');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  /**
   * Handle name input change
   */
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setError(null);
  };

  /**
   * Handle nameFa input change
   */
  const handleNameFaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameFa(event.target.value);
    setError(null);
  };

  /**
   * Handle edit group submission
   */
  const handleSubmit = async () => {
    // Validation: At least one name must be provided
    const trimmedName = name.trim();
    const trimmedNameFa = nameFa.trim();
    
    if (!trimmedName && !trimmedNameFa) {
      setError(t('editGroupDialog.validation.atLeastOneName'));
      return;
    }

    // Check if at least one name has changed
    if (trimmedName === groupName && trimmedNameFa === (groupNameFa || '')) {
      setError(t('editGroupDialog.validation.nameUnchanged'));
      return;
    }

    logger.log('Editing group names', {
      groupId,
      oldName: groupName,
      newName: trimmedName,
      oldNameFa: groupNameFa,
      newNameFa: trimmedNameFa,
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await editGroup({
        id: groupId,
        name: trimmedName || null,
        nameFa: trimmedNameFa || null,
      });

      if (response.success) {
        logger.log('Group names edited successfully', {
          groupId,
          newName: trimmedName,
          newNameFa: trimmedNameFa,
        });
        
        setSuccess(true);
        
        // Refresh groups from backend to get updated structure
        try {
          await fetchGroups();
          logger.log('Groups refreshed from backend after edit');
        } catch (refreshError) {
          logger.error('Failed to refresh groups after edit', refreshError);
          // Continue with success flow even if refresh fails
        }
        
        // Call success callback after short delay to show success message
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1000);
      } else {
        logger.error('Edit group failed - API returned unsuccessful', { 
          groupId,
        });
        const errorMessage = response.message || t('editGroupDialog.errors.editFailed');
        setError(errorMessage);
      }
    } catch (err: unknown) {
      logger.error('Error editing group', err);
      
      // Extract error message
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || t('editGroupDialog.errors.unknownError');
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault();
      handleSubmit();
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
      data-id-ref="edit-group-dialog"
    >
      <DialogTitle 
        data-id-ref="edit-group-dialog-title"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <EditIcon color="primary" />
          <Typography 
            variant="h6" 
            component="span"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {t('editGroupDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent 
        data-id-ref="edit-group-dialog-content"
        sx={{
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Current Folder Names */}
        <Box mb={3}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {t('editGroupDialog.currentNamesLabel')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <FolderIcon fontSize="small" color="action" />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  wordBreak: 'break-word',
                }}
              >
                <strong>{t('editGroupDialog.englishLabel')}:</strong> {groupName || t('editGroupDialog.notSet')}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <FolderIcon fontSize="small" color="action" />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  wordBreak: 'break-word',
                }}
              >
                <strong>{t('editGroupDialog.persianLabel')}:</strong> {groupNameFa || t('editGroupDialog.notSet')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Name Input Fields */}
        <TextField
          autoFocus
          margin="dense"
          label={t('editGroupDialog.englishNameLabel')}
          type="text"
          fullWidth
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          error={!!error && !success}
          data-id-ref="edit-group-dialog-name-input"
          size="small"
          sx={{ mb: 2 }}
          placeholder={t('editGroupDialog.englishNamePlaceholder')}
        />

        <TextField
          margin="dense"
          label={t('editGroupDialog.persianNameLabel')}
          type="text"
          fullWidth
          value={nameFa}
          onChange={handleNameFaChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          error={!!error && !success}
          helperText={error && !success ? error : t('editGroupDialog.atLeastOneRequired')}
          data-id-ref="edit-group-dialog-namefa-input"
          size="small"
          sx={{ mb: 2 }}
          placeholder={t('editGroupDialog.persianNamePlaceholder')}
          inputProps={{
            dir: 'rtl',
            style: { textAlign: 'right' }
          }}
        />

        {/* Success Message */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="edit-group-dialog-success"
          >
            {t('editGroupDialog.success')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions 
        data-id-ref="edit-group-dialog-actions"
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
          data-id-ref="edit-group-dialog-cancel-button"
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
            handleSubmit();
          }}
          variant="contained"
          disabled={isSubmitting || (!name.trim() && !nameFa.trim())}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <EditIcon />}
          data-id-ref="edit-group-dialog-save-button"
          fullWidth={false}
          sx={{
            order: { xs: 1, sm: 2 },
          }}
        >
          {isSubmitting ? t('editGroupDialog.saving') : t('editGroupDialog.saveButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditGroupDialog;
