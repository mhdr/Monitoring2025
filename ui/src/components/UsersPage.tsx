import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  LockReset as LockResetIcon,
  AssignmentInd as AssignmentIndIcon,
} from '@mui/icons-material';
import type { ColDef } from 'ag-grid-community';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import AGGridWrapper from './AGGridWrapper';
import { getUsers, getRoles, toggleUserStatus } from '../services/userApi';
import type { UserInfoDto, RoleInfoDto } from '../types/api';
import type { AGGridRowData } from '../types/agGrid';
import { createLogger } from '../utils/logger';

const logger = createLogger('UsersPage');

// Lazy load dialog components
const AddEditUserDialog = lazy(() => import('./AddEditUserDialog'));
const DeleteUserDialog = lazy(() => import('./DeleteUserDialog'));
const AssignRolesDialog = lazy(() => import('./AssignRolesDialog'));
const ResetPasswordDialog = lazy(() => import('./ResetPasswordDialog'));

const UsersPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user: currentUser } = useAuth();
  
  // State
  const [users, setUsers] = useState<UserInfoDto[]>([]);
  const [roles, setRoles] = useState<RoleInfoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const includeDisabled = true; // Always include disabled users
  
  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignRolesDialogOpen, setAssignRolesDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfoDto | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getRoles();
        if (response.success && response.roles) {
          setRoles(response.roles);
          logger.log('Roles fetched successfully', { count: response.roles.length });
        }
      } catch (err) {
        logger.error('Failed to fetch roles', { error: err });
      }
    };
    fetchRoles();
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching users', { searchTerm, roleFilter, includeDisabled });
      const response = await getUsers({
        searchTerm: searchTerm || undefined,
        role: roleFilter || undefined,
        includeDisabled,
        page: 1,
        pageSize: 500,
      });

      if (response.success && response.users) {
        setUsers(response.users);
        logger.log('Users fetched successfully', { count: response.users.length });
      } else {
        setError(response.errorMessage || t('userManagement.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch users', { error: err });
      setError(t('userManagement.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, includeDisabled, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleRoleFilterChange = (event: SelectChangeEvent<string>) => {
    setRoleFilter(event.target.value);
  };

  const handleCreateUser = useCallback(() => {
    setSelectedUser(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditUser = useCallback((user: UserInfoDto) => {
    setSelectedUser(user);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteUser = useCallback((user: UserInfoDto) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleAssignRoles = useCallback((user: UserInfoDto) => {
    setSelectedUser(user);
    setAssignRolesDialogOpen(true);
  }, []);

  const handleResetPassword = useCallback((user: UserInfoDto) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }, []);

  const handleToggleStatus = useCallback(async (user: UserInfoDto) => {
    if (!user.id) {
      logger.error('Cannot toggle status: user ID is missing');
      return;
    }
    
    try {
      logger.log('Toggle user status', { userId: user.id, currentStatus: user.isDisabled });
      const disable = !user.isDisabled; // Toggle the current state
      const response = await toggleUserStatus(user.id, disable);
      
      if (response.success) {
        logger.log('User status toggled successfully', { userId: user.id, disabled: disable });
        fetchUsers(); // Refresh the user list
      } else {
        setError(response.message || t('userManagement.errors.toggleStatusFailed'));
      }
    } catch (err) {
      logger.error('Failed to toggle user status', { error: err, userId: user.id });
      setError(t('userManagement.errors.toggleStatusFailed'));
    }
  }, [t, fetchUsers]);

  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setAssignRolesDialogOpen(false);
    setResetPasswordDialogOpen(false);
    setSelectedUser(null);
    setEditMode(false);
    
    if (shouldRefresh) {
      fetchUsers();
    }
  };

  const columnDefs = useMemo<ColDef<UserInfoDto>[]>(() => {
    const isRTL = language === 'fa';
    
    return [
      {
        headerName: t('userManagement.fields.username'),
        field: 'userName',
        flex: 1,
        minWidth: 150,
        filter: true,
        sortable: true,
      },
      {
        headerName: t('userManagement.fields.firstName'),
        field: isRTL ? 'firstNameFa' : 'firstName',
        flex: 1,
        minWidth: 150,
        filter: true,
        sortable: true,
        valueGetter: (params) => {
          if (isRTL) {
            return params.data?.firstNameFa || params.data?.firstName || '';
          }
          return params.data?.firstName || params.data?.firstNameFa || '';
        },
      },
      {
        headerName: t('userManagement.fields.lastName'),
        field: isRTL ? 'lastNameFa' : 'lastName',
        flex: 1,
        minWidth: 150,
        filter: true,
        sortable: true,
        valueGetter: (params) => {
          if (isRTL) {
            return params.data?.lastNameFa || params.data?.lastName || '';
          }
          return params.data?.lastName || params.data?.lastNameFa || '';
        },
      },
      {
        headerName: t('userManagement.fields.roles'),
        field: 'roles',
        flex: 1.2,
        minWidth: 200,
        sortable: true,
        cellRenderer: (params: { value?: string[]; data?: UserInfoDto }) => {
          const userRoles = params.value || [];
          return (
            <Box 
              data-id-ref={`user-roles-${params.data?.id}`}
              sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}
            >
              {userRoles.map((role) => (
                <Chip 
                  key={role} 
                  label={role} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              ))}
            </Box>
          );
        },
      },
      {
        headerName: t('userManagement.fields.status'),
        field: 'isDisabled',
        flex: 0.8,
        minWidth: 120,
        sortable: true,
        cellRenderer: (params: { value?: boolean; data?: UserInfoDto }) => {
          const isDisabled = params.value || false;
          return (
            <Chip 
              data-id-ref={`user-status-${params.data?.id}`}
              label={isDisabled ? t('userManagement.disabled') : t('userManagement.active')}
              color={isDisabled ? 'error' : 'success'}
              size="small"
            />
          );
        },
      },
      {
        headerName: t('common.actions'),
        field: 'id',
        flex: 1.8,
        minWidth: 280,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: UserInfoDto }) => {
          const user = params.data;
          if (!user) return null;
          
          const isSelf = user.id === currentUser?.id;
          
          return (
            <Box 
              data-id-ref={`user-actions-${user.id}`}
              sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
            >
              <IconButton
                data-id-ref={`edit-user-btn-${user.id}`}
                size="small"
                color="primary"
                onClick={() => handleEditUser(user)}
                title={t('userManagement.editUser')}
                disabled={isSelf}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                data-id-ref={`assign-roles-btn-${user.id}`}
                size="small"
                color="secondary"
                onClick={() => handleAssignRoles(user)}
                title={t('userManagement.assignRoles')}
                disabled={isSelf}
              >
                <AssignmentIndIcon fontSize="small" />
              </IconButton>
              <IconButton
                data-id-ref={`reset-password-btn-${user.id}`}
                size="small"
                color="warning"
                onClick={() => handleResetPassword(user)}
                title={t('userManagement.actions.resetPassword')}
                disabled={isSelf}
              >
                <LockResetIcon fontSize="small" />
              </IconButton>
              <IconButton
                data-id-ref={`toggle-status-btn-${user.id}`}
                size="small"
                color={user.isDisabled ? 'success' : 'warning'}
                onClick={() => handleToggleStatus(user)}
                title={user.isDisabled ? t('userManagement.actions.enable') : t('userManagement.actions.disable')}
                disabled={isSelf}
              >
                {user.isDisabled ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
              </IconButton>
              <IconButton
                data-id-ref={`delete-user-btn-${user.id}`}
                size="small"
                color="error"
                onClick={() => handleDeleteUser(user)}
                title={t('userManagement.deleteUser')}
                disabled={isSelf}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ];
  }, [language, t, currentUser, handleEditUser, handleAssignRoles, handleResetPassword, handleToggleStatus, handleDeleteUser]);

  return (
    <Container 
      maxWidth={false} 
      data-id-ref="users-page-container" 
      sx={{ 
        height: '100%', 
        width: '100%', 
        py: 3, 
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card 
        data-id-ref="users-page-card" 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <CardHeader
          data-id-ref="users-page-card-header"
          title={
            <Typography 
              variant="h4" 
              component="h1" 
              data-id-ref="users-page-title"
            >
              {t('userManagement.title')}
            </Typography>
          }
          action={
            <Button
              data-id-ref="create-user-btn"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateUser}
              sx={{ minWidth: 140 }}
            >
              {t('userManagement.createUser')}
            </Button>
          }
        />
        <CardContent 
          data-id-ref="users-page-card-body" 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack 
            data-id-ref="users-filters"
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              data-id-ref="search-users-input"
              placeholder={t('userManagement.filters.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      data-id-ref="clear-search-btn"
                      size="small"
                      onClick={handleClearSearch}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel data-id-ref="role-filter-label">
                {t('userManagement.filters.role')}
              </InputLabel>
              <Select
                data-id-ref="role-filter-select"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                label={t('userManagement.filters.role')}
              >
                <MenuItem value="">{t('userManagement.filters.allRoles')}</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name || ''}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {error && (
            <Alert 
              data-id-ref="users-error-alert"
              severity="error" 
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {loading && (
            <Box 
              data-id-ref="users-loading"
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && (
            <Box 
              data-id-ref="users-grid-container"
              sx={{ flex: 1, minHeight: 400 }}
            >
              <AGGridWrapper
                rowData={users as unknown as AGGridRowData[]}
                columnDefs={columnDefs}
                gridOptions={{
                  pagination: true,
                  paginationPageSize: 50,
                  paginationPageSizeSelector: [25, 50, 100, 200],
                  domLayout: 'normal',
                  rowHeight: 56,
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialogs with Suspense for lazy loading */}
      <Suspense fallback={null}>
        {addEditDialogOpen && (
          <AddEditUserDialog
            open={addEditDialogOpen}
            editMode={editMode}
            user={selectedUser}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {deleteDialogOpen && (
          <DeleteUserDialog
            open={deleteDialogOpen}
            user={selectedUser}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {assignRolesDialogOpen && (
          <AssignRolesDialog
            open={assignRolesDialogOpen}
            user={selectedUser}
            roles={roles}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {resetPasswordDialogOpen && (
          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            user={selectedUser}
            onClose={handleDialogClose}
          />
        )}
      </Suspense>
    </Container>
  );
};

export default UsersPage;
