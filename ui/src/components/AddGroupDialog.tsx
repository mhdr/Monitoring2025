import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';
import { useLanguage } from '../hooks/useLanguage';
import { addGroup } from '../services/monitoringApi';
import type { AddGroupRequestDto, AddGroupResponseDto, AddGroupErrorType } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddGroupDialog');

interface AddGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
  parentId?: string | null;
}

const AddGroupDialog: React.FC<AddGroupDialogProps> = ({ open, onClose, onSuccess, parentId }) => {
  const { t } = useLanguage();
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFolderName('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    // Validate folder name
    if (!folderName || folderName.trim().length === 0) {
      setError(t('addGroupDialog.errors.nameRequired'));
      return;
    }

    if (folderName.length > 100) {
      setError(t('addGroupDialog.errors.nameTooLong'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requestDto: AddGroupRequestDto = {
        name: folderName.trim(),
        parentId: parentId || null,
      };

      logger.log('Submitting add group request', { requestDto });

      const response: AddGroupResponseDto = await addGroup(requestDto);

      logger.log('Add group response received', { response });

      if (response.success && response.groupId) {
        logger.log('Group created successfully', { groupId: response.groupId });
        
        // Call success callback
        if (onSuccess) {
          onSuccess(response.groupId);
        }

        // Close dialog
        onClose();
      } else {
        // Handle error from response
        const errorMessage = getErrorMessage(response.error, response.message);
        logger.error('Add group failed', { error: response.error, message: response.message });
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('Add group request failed', { error: err });
      setError(t('addGroupDialog.errors.requestFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (errorType?: AddGroupErrorType, message?: string | null): string => {
    // If there's a message from the server, use it
    if (message) {
      return message;
    }

    // Otherwise, map error type to translation key
    switch (errorType) {
      case 1: // InvalidName
        return t('addGroupDialog.errors.invalidName');
      case 2: // DuplicateName
        return t('addGroupDialog.errors.duplicateName');
      case 3: // ParentNotFound
        return t('addGroupDialog.errors.parentNotFound');
      default:
        return t('addGroupDialog.errors.unknownError');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
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
      data-id-ref="add-group-dialog"
    >
      <DialogTitle data-id-ref="add-group-dialog-title">
        {t('addGroupDialog.title')}
      </DialogTitle>

      <DialogContent data-id-ref="add-group-dialog-content">
        <Box sx={{ pt: 1 }} data-id-ref="add-group-dialog-form">
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              data-id-ref="add-group-dialog-error-alert"
            >
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            fullWidth
            label={t('addGroupDialog.folderNameLabel')}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
            error={Boolean(error)}
            inputProps={{
              maxLength: 100,
            }}
            helperText={t('addGroupDialog.folderNameHelperText')}
            data-id-ref="add-group-dialog-name-input"
          />
        </Box>
      </DialogContent>

      <DialogActions data-id-ref="add-group-dialog-actions">
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          data-id-ref="add-group-dialog-cancel-button"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          data-id-ref="add-group-dialog-submit-button"
        >
          {isSubmitting ? t('common.creating') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddGroupDialog;
