import React, { useState, useEffect, useMemo } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import { Security as SecurityIcon, Search as SearchIcon } from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoringStore } from '../stores/monitoringStore';
import { getPermissions, savePermissions } from '../services/userApi';
import type { UserInfoDto, Group } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('ManagePermissionsDialog');

interface ManagePermissionsDialogProps {
  open: boolean;
  user: UserInfoDto | null;
  onClose: (shouldRefresh: boolean) => void;
}

const ManagePermissionsDialog: React.FC<ManagePermissionsDialogProps> = ({
  open,
  user,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const items = useMonitoringStore((state) => state.items);
  const groups = useMonitoringStore((state) => state.groups);
  const [loading, setLoading] = useState(false);
  const [fetchingPermissions, setFetchingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUserPermissions = async (userId: string) => {
    setFetchingPermissions(true);
    try {
      logger.log('Fetching user permissions', { userId });
      const response = await getPermissions(userId);
      setSelectedItemIds(response.itemIds || []);
      logger.log('User permissions fetched', { count: response.itemIds?.length || 0 });
    } catch (err) {
      logger.error('Failed to fetch user permissions', { error: err });
      setError(t('permissionsManagement.errors.fetchFailed'));
    } finally {
      setFetchingPermissions(false);
    }
  };

  // Initialize permissions when dialog opens or user changes
  useEffect(() => {
    if (open && user && user.id) {
      fetchUserPermissions(user.id);
      setError(null);
      setSearchTerm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const getUserDisplayName = (): string => {
    if (!user) return '';
    const isRTL = language === 'fa';
    if (isRTL && user.firstNameFa && user.lastNameFa) {
      return `${user.firstNameFa} ${user.lastNameFa}`;
    }
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName || '';
  };

  // Build group hierarchy map for display
  const groupMap = useMemo(() => {
    const map = new Map<string, Group>();
    groups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [groups]);

  const getGroupPath = React.useCallback(
    (groupId: string | null | undefined): string => {
      if (!groupId) return '';
      const path: string[] = [];
      let currentId: string | null | undefined = groupId;
      while (currentId) {
        const group = groupMap.get(currentId);
        if (!group) break;
        const groupName = language === 'fa' && group.nameFa ? group.nameFa : group.name;
        path.unshift(groupName);
        currentId = group.parentId;
      }
      return path.join(' / ');
    },
    [groupMap, language]
  );

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const itemName = language === 'fa' && item.nameFa ? item.nameFa : item.name;
        const groupPath = getGroupPath(item.groupId);
        return (
          itemName.toLowerCase().includes(searchLower) ||
          groupPath.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort by group path, then item name
    filtered.sort((a, b) => {
      const groupPathA = getGroupPath(a.groupId);
      const groupPathB = getGroupPath(b.groupId);
      if (groupPathA !== groupPathB) {
        return groupPathA.localeCompare(groupPathB);
      }
      const nameA = language === 'fa' && a.nameFa ? a.nameFa : a.name;
      const nameB = language === 'fa' && b.nameFa ? b.nameFa : b.name;
      return nameA.localeCompare(nameB);
    });

    return filtered;
  }, [items, searchTerm, language, getGroupPath]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((item) => item.id));
    }
  };

  const handleSubmit = async () => {
    if (!user || !user.id) {
      logger.error('Cannot save permissions: user or user ID is null');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.log('Saving user permissions', {
        userId: user.id,
        userName: user.userName,
        itemCount: selectedItemIds.length,
      });

      const response = await savePermissions(user.id, selectedItemIds);

      if (response.success) {
        logger.log('User permissions saved successfully', { 
          userId: user.id,
          message: response.message,
          permissionsCount: response.permissionsCount,
        });
        onClose(true);
      } else {
        setError(response.message || t('permissionsManagement.errors.saveFailed'));
      }
    } catch (err) {
      logger.error('Failed to save user permissions', { error: err });
      setError(t('permissionsManagement.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  const allFilteredSelected =
    filteredItems.length > 0 && selectedItemIds.length === filteredItems.length;
  const someFilteredSelected =
    selectedItemIds.length > 0 && selectedItemIds.length < filteredItems.length;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      data-id-ref="manage-permissions-dialog"
    >
      <DialogTitle data-id-ref="manage-permissions-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">{t('permissionsManagement.managePermissions')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="manage-permissions-dialog-content">
        {error && (
          <Alert
            data-id-ref="manage-permissions-error"
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('permissionsManagement.dialogs.manageMessage', {
            userName: getUserDisplayName(),
          })}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <TextField
            data-id-ref="permissions-search-field"
            fullWidth
            size="small"
            placeholder={t('permissionsManagement.searchItems')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {fetchingPermissions ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}
            data-id-ref="permissions-loading"
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 1 }}>
              <FormControlLabel
                data-id-ref="permissions-select-all-checkbox"
                control={
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected}
                    onChange={handleSelectAll}
                    disabled={loading || filteredItems.length === 0}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight="bold">
                    {t('permissionsManagement.selectAll')} ({selectedItemIds.length} / {items.length})
                  </Typography>
                }
              />
            </Box>

            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
              }}
              data-id-ref="permissions-items-container"
            >
              <FormGroup data-id-ref="permissions-checkbox-group">
                {filteredItems.map((item) => {
                  const itemName = language === 'fa' && item.nameFa ? item.nameFa : item.name;
                  const groupPath = getGroupPath(item.groupId);

                  return (
                    <FormControlLabel
                      key={item.id}
                      data-id-ref={`permission-checkbox-${item.id}`}
                      control={
                        <Checkbox
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          disabled={loading}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{itemName}</Typography>
                          {groupPath && (
                            <Typography variant="caption" color="text.secondary">
                              {groupPath}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  );
                })}
              </FormGroup>

              {filteredItems.length === 0 && (
                <Alert severity="info" data-id-ref="no-items-alert">
                  {searchTerm
                    ? t('permissionsManagement.errors.noItemsMatchSearch')
                    : t('permissionsManagement.errors.noItemsAvailable')}
                </Alert>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions data-id-ref="manage-permissions-dialog-actions">
        <Button
          data-id-ref="cancel-manage-permissions-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.buttons.cancel')}
        </Button>
        <Button
          data-id-ref="save-permissions-btn"
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || fetchingPermissions}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? t('common.loading') : t('common.buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManagePermissionsDialog;
