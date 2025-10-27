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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  DriveFileMove as MoveIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { moveGroup } from '../services/monitoringApi';
import { fetchGroups } from '../services/monitoringApi';
import { createLogger } from '../utils/logger';
import type { Group } from '../types/api';

const logger = createLogger('MoveGroupDialog');

interface MoveGroupDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  currentParentId?: string | null;
  onSuccess?: () => void;
}

/**
 * Dialog for moving a monitoring group/folder to a different parent folder
 */
const MoveGroupDialog: React.FC<MoveGroupDialogProps> = ({
  open,
  onClose,
  groupId,
  groupName,
  currentParentId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { state } = useMonitoring();
  const groups = state.groups;
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [moveToRoot, setMoveToRoot] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  logger.log('MoveGroupDialog render', { 
    open, 
    groupId, 
    groupName, 
    currentParentId,
    groupsCount: groups.length,
  });

  /**
   * Get all descendant group IDs recursively
   */
  const getDescendantIds = useMemo(() => {
    const descendants = new Set<string>();
    
    const findDescendants = (parentId: string) => {
      groups.forEach(group => {
        if (group.parentId === parentId && group.id) {
          descendants.add(group.id);
          findDescendants(group.id); // Recursive call
        }
      });
    };
    
    findDescendants(groupId);
    return descendants;
  }, [groups, groupId]);

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
    const buildPath = (groupIdToCheck: string): string => {
      const group = groupMap.get(groupIdToCheck);
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
      const groupNameStr = getGroupName(group);
      return parentPath ? `${parentPath} / ${groupNameStr}` : groupNameStr;
    };

    // Map groups to options with full paths
    return groups
      .filter(group => {
        // Exclude:
        // 1. The group being moved itself
        // 2. All descendants of the group being moved (to prevent circular references)
        if (!group.id) return false;
        if (group.id === groupId) return false;
        if (getDescendantIds.has(group.id)) return false;
        return true;
      })
      .map(group => ({
        id: group.id!,
        name: group.name || group.nameFa || 'Unnamed Folder',
        nameFa: group.nameFa || group.name || 'پوشه بدون نام',
        fullPath: buildPath(group.id!),
        parentId: group.parentId,
      }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath)); // Sort by path
  }, [groups, groupId, getDescendantIds, language]);

  /**
   * Get current parent folder name for display
   */
  const currentParentName = useMemo(() => {
    if (!currentParentId) return t('moveGroupDialog.noCurrentParent');
    
    const currentParent = groups.find(g => g.id === currentParentId);
    if (!currentParent) return t('moveGroupDialog.unknownFolder');
    
    // Choose name based on current language
    if (language === 'fa') {
      return currentParent.nameFa || currentParent.name || t('moveGroupDialog.unnamedFolder');
    }
    return currentParent.name || currentParent.nameFa || t('moveGroupDialog.unnamedFolder');
  }, [currentParentId, groups, t, language]);

  /**
   * Handle dialog close - reset state
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedParentId(null);
      setMoveToRoot(false);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  /**
   * Handle parent folder selection change
   */
  const handleParentChange = (event: SelectChangeEvent<string>) => {
    setSelectedParentId(event.target.value || null);
    setMoveToRoot(false); // Uncheck move to root when selecting a parent
    setError(null);
  };

  /**
   * Handle move to root checkbox change
   */
  const handleMoveToRootChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMoveToRoot(event.target.checked);
    if (event.target.checked) {
      setSelectedParentId(null); // Clear parent selection when moving to root
    }
    setError(null);
  };

  /**
   * Get error message based on error code
   */
  const getErrorMessage = (errorCode?: number): string => {
    switch (errorCode) {
      case 1:
        return t('moveGroupDialog.errors.groupNotFound');
      case 2:
        return t('moveGroupDialog.errors.parentNotFound');
      case 3:
        return t('moveGroupDialog.errors.circularReference');
      case 4:
        return t('moveGroupDialog.errors.sameParent');
      default:
        return t('moveGroupDialog.errors.moveFailed');
    }
  };

  /**
   * Handle move group submission
   */
  const handleSubmit = async () => {
    // Validation: Must either select a parent or choose to move to root
    if (!moveToRoot && !selectedParentId) {
      setError(t('moveGroupDialog.validation.folderRequired'));
      return;
    }

    const targetParentId = moveToRoot ? null : selectedParentId;

    logger.log('Moving group to new parent', {
      groupId,
      groupName,
      fromParentId: currentParentId,
      toParentId: targetParentId,
      moveToRoot,
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await moveGroup({
        groupId,
        parentId: targetParentId,
      });

      if (response.isSuccessful) {
        logger.log('Group moved successfully', {
          groupId,
          toParentId: targetParentId,
        });
        
        setSuccess(true);
        
        // Call success callback after short delay to show success message
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 1000);
      } else {
        logger.error('Move group failed - API returned unsuccessful', { 
          groupId,
          errorCode: response.error,
          message: response.message,
        });
        const errorMessage = response.message || getErrorMessage(response.error);
        setError(errorMessage);
      }
    } catch (err: unknown) {
      logger.error('Error moving group', err);
      
      // Extract error message
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || t('moveGroupDialog.errors.unknownError');
      
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
      data-id-ref="move-group-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <DialogTitle 
        data-id-ref="move-group-dialog-title"
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
            {t('moveGroupDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent 
        data-id-ref="move-group-dialog-content"
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
            {t('moveGroupDialog.folderLabel')}
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

        {/* Current Parent Folder */}
        <Box mb={3}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {t('moveGroupDialog.currentParentLabel')}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.primary"
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1rem' },
              wordBreak: 'break-word',
            }}
          >
            {currentParentName}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Move to Root Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={moveToRoot}
              onChange={handleMoveToRootChange}
              disabled={isSubmitting}
              data-id-ref="move-group-dialog-root-checkbox"
            />
          }
          label={t('moveGroupDialog.moveToRoot')}
          sx={{ mb: 2 }}
        />

        {/* Parent Folder Selection */}
        <FormControl 
          fullWidth 
          disabled={isSubmitting || moveToRoot} 
          data-id-ref="move-group-dialog-parent-select"
          size="small"
        >
          <InputLabel id="move-group-parent-label">
            {t('moveGroupDialog.selectParentLabel')}
          </InputLabel>
          <Select
            labelId="move-group-parent-label"
            value={selectedParentId || ''}
            onChange={handleParentChange}
            label={t('moveGroupDialog.selectParentLabel')}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                },
              },
            }}
          >
            <MenuItem value="">
              <em>{t('moveGroupDialog.selectParentPlaceholder')}</em>
            </MenuItem>
            {folderOptions.map((folder) => (
              <MenuItem 
                key={folder.id} 
                value={folder.id}
                data-id-ref={`move-group-dialog-parent-option-${folder.id}`}
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
            data-id-ref="move-group-dialog-error"
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
            data-id-ref="move-group-dialog-success"
          >
            {t('moveGroupDialog.success')}
          </Alert>
        )}

        {/* No Folders Available */}
        {folderOptions.length === 0 && !moveToRoot && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            }}
            data-id-ref="move-group-dialog-no-folders"
          >
            {t('moveGroupDialog.noFoldersAvailable')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions 
        data-id-ref="move-group-dialog-actions"
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
          data-id-ref="move-group-dialog-cancel-button"
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
          disabled={isSubmitting || (!moveToRoot && !selectedParentId)}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <MoveIcon />}
          data-id-ref="move-group-dialog-move-button"
          fullWidth={false}
          sx={{
            order: { xs: 1, sm: 2 },
          }}
        >
          {isSubmitting ? t('moveGroupDialog.moving') : t('moveGroupDialog.moveButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveGroupDialog;
