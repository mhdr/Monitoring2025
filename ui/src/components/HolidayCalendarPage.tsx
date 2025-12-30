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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import SyncfusionGridWrapper, { type SyncfusionColumnDef } from './SyncfusionGridWrapper';
import { getHolidayCalendars } from '../services/extendedApi';
import type { HolidayCalendar } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('HolidayCalendarPage');

// Lazy load dialog components
const AddEditHolidayCalendarDialog = lazy(() => import('./AddEditHolidayCalendarDialog'));
const DeleteHolidayCalendarDialog = lazy(() => import('./DeleteHolidayCalendarDialog'));

const HolidayCalendarPage: React.FC = () => {
  const { t } = useLanguage();
  
  // State
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<HolidayCalendar | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch holiday calendars
  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      logger.log('Fetching holiday calendars');
      const response = await getHolidayCalendars();

      if (response.isSuccessful && response.holidayCalendars) {
        setCalendars(response.holidayCalendars);
        logger.log('Holiday calendars fetched successfully', { count: response.holidayCalendars.length });
      } else {
        setError(response.errorMessage || t('holidayCalendar.errors.fetchFailed'));
      }
    } catch (err) {
      logger.error('Failed to fetch holiday calendars', { error: err });
      setError(t('holidayCalendar.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCreateCalendar = useCallback(() => {
    setSelectedCalendar(null);
    setEditMode(false);
    setAddEditDialogOpen(true);
  }, []);

  const handleEditCalendar = useCallback((calendar: HolidayCalendar) => {
    setSelectedCalendar(calendar);
    setEditMode(true);
    setAddEditDialogOpen(true);
  }, []);

  const handleDeleteCalendar = useCallback((calendar: HolidayCalendar) => {
    setSelectedCalendar(calendar);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = (shouldRefresh: boolean) => {
    setAddEditDialogOpen(false);
    setDeleteDialogOpen(false);
    setSelectedCalendar(null);
    setEditMode(false);
    
    if (shouldRefresh) {
      fetchCalendars();
    }
  };

  // Filter calendars based on search term
  const filteredCalendars = useMemo(() => {
    if (!searchTerm) return calendars;
    
    const term = searchTerm.toLowerCase();
    return calendars.filter(calendar => 
      calendar.name.toLowerCase().includes(term) ||
      (calendar.description && calendar.description.toLowerCase().includes(term))
    );
  }, [calendars, searchTerm]);

  // Define columns for the grid
  const columns: SyncfusionColumnDef[] = useMemo(() => [
    {
      field: 'name',
      headerText: t('holidayCalendar.name'),
      width: 200,
    },
    {
      field: 'description',
      headerText: t('holidayCalendar.description'),
      width: 300,
    },
    {
      field: 'holidayCount',
      headerText: t('holidayCalendar.holidayCount'),
      width: 150,
      template: (rowData: HolidayCalendar) => (
        <Box data-id-ref="holiday-calendar-holiday-count">
          <Chip
            icon={<EventIcon />}
            label={rowData.dates?.length || 0}
            size="small"
            color="primary"
            variant="outlined"
            data-id-ref="holiday-calendar-count-chip"
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerText: t('actions'),
      width: 150,
      template: (rowData: HolidayCalendar) => (
        <Box sx={{ display: 'flex', gap: 1 }} data-id-ref="holiday-calendar-actions">
          <IconButton
            size="small"
            onClick={() => handleEditCalendar(rowData)}
            color="primary"
            data-id-ref="holiday-calendar-edit-btn"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteCalendar(rowData)}
            color="error"
            data-id-ref="holiday-calendar-delete-btn"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ], [t, handleEditCalendar, handleDeleteCalendar]);

  return (
    <Container
      maxWidth={false}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        px: { xs: 2, sm: 3 },
      }}
      data-id-ref="holiday-calendar-page-container"
    >
      <Card
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        data-id-ref="holiday-calendar-page-card"
      >
        <CardHeader
          title={
            <Typography variant="h5" component="h1" data-id-ref="holiday-calendar-page-title">
              {t('holidayCalendar.title')}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary" data-id-ref="holiday-calendar-page-subtitle">
              {t('holidayCalendar.subtitle')}
            </Typography>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateCalendar}
              data-id-ref="holiday-calendar-add-btn"
            >
              {t('holidayCalendar.addCalendar')}
            </Button>
          }
          data-id-ref="holiday-calendar-page-header"
        />
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pt: 0,
          }}
          data-id-ref="holiday-calendar-page-content"
        >
          {/* Search and Filters */}
          <Box sx={{ mb: 2 }} data-id-ref="holiday-calendar-filters">
            <TextField
              fullWidth
              placeholder={t('holidayCalendar.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      edge="end"
                      data-id-ref="holiday-calendar-clear-search-btn"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              data-id-ref="holiday-calendar-search-input"
            />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-id-ref="holiday-calendar-error-alert">
              {error}
            </Alert>
          )}

          {/* Data Grid */}
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
            }}
            data-id-ref="holiday-calendar-grid-container"
          >
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
                data-id-ref="holiday-calendar-loading"
              >
                <CircularProgress />
              </Box>
            ) : (
              <SyncfusionGridWrapper
                data={filteredCalendars}
                columns={columns}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                pageSettings={{ pageSize: 20 }}
                idRef="holidayCalendarGrid"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {addEditDialogOpen && (
        <Suspense fallback={<CircularProgress />}>
          <AddEditHolidayCalendarDialog
            open={addEditDialogOpen}
            editMode={editMode}
            calendar={selectedCalendar}
            onClose={handleDialogClose}
          />
        </Suspense>
      )}

      {deleteDialogOpen && selectedCalendar && (
        <Suspense fallback={<CircularProgress />}>
          <DeleteHolidayCalendarDialog
            open={deleteDialogOpen}
            calendar={selectedCalendar}
            onClose={handleDialogClose}
          />
        </Suspense>
      )}
    </Container>
  );
};

export default HolidayCalendarPage;
