import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  DriveFileMove as MoveIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { movePoint } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';
import type { Group } from '../types/api';

const logger = createLogger('MoveItemDialog');

interface MoveItemDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  currentGroupId?: string | null;
  onSuccess?: () => void;
}

/**
 * Dialog for moving a monitoring item to a different folder/group
 */
const MoveItemDialog: React.FC<MoveItemDialogProps> = ({
  open,
  onClose,
  itemId,
  itemName,
  currentGroupId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { state } = useMonitoring();
  const groups = state.groups;
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  logger.log('MoveItemDialog render', { 
    open, 
    itemId, 
    itemName, 
    currentGroupId,
    groupsCount: groups.length,
  });

  /**
   * Get hierarchical folder structure for display
   * Build folder paths like "Parent / Child / Grandchild"
   */
  const folderOptions = useMemo(() => {
    // Create a map of group IDs to their full path names
    const groupMap = new Map<string, Group>();
    groups.forEach(group => {
      if (group.id) {
        groupMap.set(group.id, group);
      }
    });

    // Build full paths for each group
    const buildPath = (groupId: string): string => {
      const group = groupMap.get(groupId);
      if (!group) return '';
      
      // Choose name based on current language
      const getGroupName = (g: Group): string => {
        if (language === 'fa') {
          return g.nameFa || g.name || 'پوشه بدون نام';
        }
        return g.name || g.nameFa || 'Unnamed Folder';
      };
      
      if (!group.parentId) {
        // Root level group
        return getGroupName(group);
      }
      
      // Recursively build path
      const parentPath = buildPath(group.parentId);
      const groupName = getGroupName(group);
      return parentPath ? `${parentPath} / ${groupName}` : groupName;
    };

    // Map groups to options with full paths
    return groups
      .filter(group => group.id && group.id !== currentGroupId) // Exclude current folder
      .map(group => ({
        id: group.id!,
        name: group.name || group.nameFa || 'Unnamed Folder',
        nameFa: group.nameFa || group.name || 'پوشه بدون نام',
        fullPath: buildPath(group.id!),
        parentId: group.parentId,
      }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath)); // Sort by path
  }, [groups, currentGroupId, language]);

  /**
   * Get current folder name for display
   */
  const currentFolderName = useMemo(() => {
    if (!currentGroupId) return t('moveItemDialog.noCurrentFolder');
    
    const currentGroup = groups.find(g => g.id === currentGroupId);
    if (!currentGroup) return t('moveItemDialog.unknownFolder');
    
    // Choose name based on current language
    if (language === 'fa') {
      return currentGroup.nameFa || currentGroup.name || t('moveItemDialog.unnamedFolder');
    }
    return currentGroup.name || currentGroup.nameFa || t('moveItemDialog.unnamedFolder');
  }, [currentGroupId, groups, t, language]);

  /**
   * Handle dialog close - reset state
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedGroupId('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  /**
   * Handle folder selection change
   */
  const handleFolderChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroupId(event.target.value);
    setError(null);
  };

  /**
   * Handle move item submission
   */
  const handleSubmit = async () => {
    if (!selectedGroupId) {
      setError(t('moveItemDialog.validation.folderRequired'));
      return;
    }

    logger.log('Moving item to new folder', {
      itemId,
      itemName,
      fromFolderId: currentGroupId,
      toFolderId: selectedGroupId,
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await movePoint({
        pointId: itemId,
        parentId: selectedGroupId,
      });

      if (response.isSuccessful) {
        logger.log('Item moved successfully', {
          itemId,
          toFolderId: selectedGroupId,
        });
        
        setSuccess(true);
        
        // Call success callback after short delay to show success message
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1000);
      } else {
        logger.error('Move item failed - API returned unsuccessful', { itemId });
        setError(t('moveItemDialog.errors.moveFailed'));
      }
    } catch (err: unknown) {
      logger.error('Error moving item', err);
      
      // Extract error message
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || t('moveItemDialog.errors.unknownError');
      
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
      data-id-ref="move-item-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <DialogTitle 
        data-id-ref="move-item-dialog-title"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <MoveIcon color="primary" />
          <Typography 
            variant="h6" 
            component="span"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {t('moveItemDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent 
        data-id-ref="move-item-dialog-content"
        sx={{
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Item Information */}
        <Box mb={2}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {t('moveItemDialog.itemLabel')}
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight="medium"
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1rem' },
              wordBreak: 'break-word',
            }}
          >
            {itemName}
          </Typography>
        </Box>

        {/* Current Folder */}
        <Box mb={3}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {t('moveItemDialog.currentFolderLabel')}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.primary"
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1rem' },
              wordBreak: 'break-word',
            }}
          >
            {currentFolderName}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Folder Selection */}
        <FormControl 
          fullWidth 
          disabled={isSubmitting} 
          data-id-ref="move-item-dialog-folder-select"
          size="small"
        >
          <InputLabel id="move-item-folder-label">
            {t('moveItemDialog.selectFolderLabel')}
          </InputLabel>
          <Select
            labelId="move-item-folder-label"
            value={selectedGroupId}
            onChange={handleFolderChange}
            label={t('moveItemDialog.selectFolderLabel')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
              },
            }}
          >
            <MenuItem value="" disabled>
              <em>{t('moveItemDialog.selectFolderPlaceholder')}</em>
            </MenuItem>
            {folderOptions.map((folder) => (
              <MenuItem 
                key={folder.id} 
                value={folder.id}
                data-id-ref={`move-item-dialog-folder-option-${folder.id}`}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <FolderIcon fontSize="small" color="action" />
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      wordBreak: 'break-word',
                    }}
                  >
                    {folder.fullPath}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="move-item-dialog-error"
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
            data-id-ref="move-item-dialog-success"
          >
            {t('moveItemDialog.success')}
          </Alert>
        )}

        {/* No Folders Available */}
        {folderOptions.length === 0 && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="move-item-dialog-no-folders"
          >
            {t('moveItemDialog.noFoldersAvailable')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions 
        data-id-ref="move-item-dialog-actions"
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
          data-id-ref="move-item-dialog-cancel-button"
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
          disabled={isSubmitting || !selectedGroupId || folderOptions.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <MoveIcon />}
          data-id-ref="move-item-dialog-move-button"
          fullWidth={false}
          sx={{
            order: { xs: 1, sm: 2 },
          }}
        >
          {isSubmitting ? t('moveItemDialog.moving') : t('moveItemDialog.moveButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveItemDialog;
