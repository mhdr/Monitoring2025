import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
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
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { GridComponent as GridComponentType } from '@syncfusion/ej2-react-grids';
import { useLanguage } from '../hooks/useLanguage';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getSharp7Controllers } from '../services/extendedApi';
import type { ControllerSharp7 } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('Sharp7ControllersPage');

// Lazy load dialog components
const AddEditSharp7ControllerDialog = lazy(() => import('./AddEditSharp7ControllerDialog'));
const DeleteSharp7ControllerDialog = lazy(() => import('./DeleteSharp7ControllerDialog'));
const Sharp7MappingsDialog = lazy(() => import('./Sharp7MappingsDialog'));

// Extended row type for the grid
interface ControllerRow extends ControllerSharp7 {
  mappingsCount?: number;
}

const Sharp7ControllersPage: React.FC = () => {
  const { t } = useLanguage();
  
  // State
  const [controllers, setControllers] = useState<ControllerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Grid ref
  const mainGridRef = useRef<GridComponentType | null>(null);
  
  // Controller dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedController, setSelectedController] = useState<ControllerSharp7 | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Mappings dialog state
  const [mappingsDialogOpen, setMappingsDialogOpen] = useState(false);
  const [mappingsController, setMappingsController] = useState<ControllerSharp7 | null>(null);

  // Fetch controllers
  const fetchControllers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching Sharp7 controllers');
      const response = await getSharp7Controllers();

      if (response?.data) {
        setControllers(response.data);
        logger.log('Controllers fetched successfully', { count: response.data.length });
      } else {
        setError(t('sharp7Controllers.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch controllers', { error: err });
      setError(t('sharp7Controllers.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleAddController = useCallback(() => {
    setSelectedController(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditController = useCallback((controller: ControllerSharp7) => {
    setSelectedController(controller);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteController = useCallback((controller: ControllerSharp7) => {
    setSelectedController(controller);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenMappings = useCallback((controller: ControllerSharp7) => {
    setMappingsController(controller);
    setMappingsDialogOpen(true);
  }, []);

  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedController(null);
    setEditMode(false);
    
    if (shouldRefresh) {
      fetchControllers();
      if (successMessage) {
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  };

  const handleMappingsDialogClose = () => {
    setMappingsDialogOpen(false);
    setMappingsController(null);
  };

  // Filter controllers by search term
  const filteredControllers = useMemo(() => {
    if (!searchTerm) return controllers;
    const term = searchTerm.toLowerCase();
    return controllers.filter((c) =>
      c.name?.toLowerCase().includes(term) ||
      c.ipAddress?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term)
    );
  }, [controllers, searchTerm]);

  // Status cell template for Syncfusion Grid
  const statusTemplate = useCallback((data: unknown): React.ReactNode => {
    const props = data as ControllerRow;
    const isDisabled = props.isDisabled || false;
    return (
      <Chip
        data-id-ref={`sharp7-status-${props.id}`}
        label={isDisabled ? t('sharp7Controllers.status.disabled') : t('sharp7Controllers.status.enabled')}
        color={isDisabled ? 'error' : 'success'}
        size="small"
      />
    );
  }, [t]);

  // Actions cell template
  const actionsTemplate = useCallback((data: unknown): React.ReactNode => {
    const controller = data as ControllerRow;
    if (!controller) return null;
    
    return (
      <Box
        data-id-ref={`sharp7-actions-${controller.id}`}
        sx={{ display: 'flex', gap: 0.5, py: 0.5 }}
      >
        <Tooltip title={t('sharp7Controllers.mappings.title')}>
          <IconButton
            data-id-ref={`sharp7-mappings-btn-${controller.id}`}
            size="small"
            color="info"
            onClick={() => handleOpenMappings(controller)}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('sharp7Controllers.editController')}>
          <IconButton
            data-id-ref={`sharp7-edit-btn-${controller.id}`}
            size="small"
            color="primary"
            onClick={() => handleEditController(controller)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('sharp7Controllers.deleteController')}>
          <IconButton
            data-id-ref={`sharp7-delete-btn-${controller.id}`}
            size="small"
            color="error"
            onClick={() => handleDeleteController(controller)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }, [t, handleOpenMappings, handleEditController, handleDeleteController]);

  // Main grid column definitions for Syncfusion Grid
  const columnDefs = useMemo<SyncfusionColumnDef[]>(() => {
    return [
      {
        headerText: t('sharp7Controllers.fields.name'),
        field: 'name',
        width: 150,
        minWidth: 150,
        allowFiltering: true,
        allowSorting: true,
      },
      {
        headerText: t('sharp7Controllers.fields.ipAddress'),
        field: 'ipAddress',
        width: 130,
        minWidth: 130,
        allowFiltering: true,
        allowSorting: true,
      },
      {
        headerText: t('sharp7Controllers.fields.dbAddress'),
        field: 'dbAddress',
        width: 100,
        minWidth: 100,
        allowFiltering: true,
        allowSorting: true,
        type: 'number',
      },
      {
        headerText: t('sharp7Controllers.fields.dbStartData'),
        field: 'dbStartData',
        width: 110,
        minWidth: 110,
        allowFiltering: true,
        allowSorting: true,
        type: 'number',
      },
      {
        headerText: t('sharp7Controllers.fields.dbSizeData'),
        field: 'dbSizeData',
        width: 110,
        minWidth: 110,
        allowFiltering: true,
        allowSorting: true,
        type: 'number',
      },
      {
        headerText: t('sharp7Controllers.fields.username'),
        field: 'username',
        width: 100,
        minWidth: 100,
        allowFiltering: true,
        allowSorting: true,
      },
      {
        headerText: t('sharp7Controllers.fields.status'),
        field: 'isDisabled',
        width: 100,
        minWidth: 100,
        allowSorting: true,
        template: statusTemplate,
      },
      {
        headerText: t('common.actions'),
        field: 'id',
        width: 150,
        minWidth: 150,
        allowSorting: false,
        allowFiltering: false,
        template: actionsTemplate,
      },
    ];
  }, [t, statusTemplate, actionsTemplate]);

  return (
    <Container
      maxWidth={false}
      data-id-ref="sharp7-controllers-page-container"
      sx={{
        height: '100%',
        width: '100%',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Card
        data-id-ref="sharp7-controllers-page-card"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardHeader
          data-id-ref="sharp7-controllers-page-card-header"
          title={
            <Typography
              variant="h4"
              component="h1"
              data-id-ref="sharp7-controllers-page-title"
            >
              {t('sharp7Controllers.title')}
            </Typography>
          }
          action={
            <Button
              data-id-ref="sharp7-add-controller-btn"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddController}
              sx={{ minWidth: 140 }}
            >
              {t('sharp7Controllers.addController')}
            </Button>
          }
        />
        <CardContent
          data-id-ref="sharp7-controllers-page-card-body"
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack
            data-id-ref="sharp7-filters"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              data-id-ref="sharp7-search-input"
              placeholder={t('sharp7Controllers.searchPlaceholder')}
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
                      data-id-ref="sharp7-clear-search-btn"
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
          </Stack>

          {error && (
            <Alert
              data-id-ref="sharp7-error-alert"
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              data-id-ref="sharp7-success-alert"
              severity="success"
              onClose={() => setSuccessMessage(null)}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          {loading && (
            <Box
              data-id-ref="sharp7-loading"
              sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
            >
              <CircularProgress />
            </Box>
          )}

          {!loading && (
            <Box
              data-id-ref="sharp7-grid-container"
              sx={{ flex: 1, minHeight: 400 }}
            >
              <SyncfusionGridWrapper
                idRef="sharp7-controllers"
                data={filteredControllers}
                columns={columnDefs}
                onGridReady={(grid) => { mainGridRef.current = grid; }}
                height="100%"
                allowPaging={true}
                pageSettings={{
                  pageSize: 25,
                  pageSizes: [10, 25, 50, 100],
                }}
                allowSorting={true}
                allowFiltering={true}
                allowResizing={true}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Controller Dialogs */}
      <Suspense fallback={null}>
        {addEditDialogOpen && (
          <AddEditSharp7ControllerDialog
            open={addEditDialogOpen}
            editMode={editMode}
            controller={selectedController}
            onClose={handleDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {deleteDialogOpen && (
          <DeleteSharp7ControllerDialog
            open={deleteDialogOpen}
            controller={selectedController}
            onClose={handleDialogClose}
            onSuccess={(message: string) => setSuccessMessage(message)}
          />
        )}
      </Suspense>

      {/* Mappings Dialog */}
      <Suspense fallback={null}>
        {mappingsDialogOpen && (
          <Sharp7MappingsDialog
            open={mappingsDialogOpen}
            controller={mappingsController}
            onClose={handleMappingsDialogClose}
          />
        )}
      </Suspense>
    </Container>
  );
};

export default Sharp7ControllersPage;
