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
  Stack,
  Box,
  Typography,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { addHolidayCalendar, editHolidayCalendar } from '../services/extendedApi';
import type { HolidayCalendar, AddHolidayDateDto } from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddEditHolidayCalendarDialog');

interface AddEditHolidayCalendarDialogProps {
  open: boolean;
  editMode: boolean;
  calendar: HolidayCalendar | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface HolidayDate {
  date: string;
  name: string;
  holidayAnalogValue: string;
  holidayDigitalValue: boolean;
}

interface FormData {
  name: string;
  description: string;
  dates: HolidayDate[];
}

interface FormErrors {
  name?: string;
  description?: string;
  dates?: { [key: number]: { date?: string; name?: string; holidayAnalogValue?: string } };
}

const AddEditHolidayCalendarDialog: React.FC<AddEditHolidayCalendarDialogProps> = ({
  open,
  editMode,
  calendar,
  onClose,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    dates: [],
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Initialize form data when dialog opens or calendar changes
  useEffect(() => {
    if (open) {
      if (editMode && calendar) {
        setFormData({
          name: calendar.name || '',
          description: calendar.description || '',
          dates: (calendar.dates || []).map(d => ({
            date: d.date || '',
            name: d.name || '',
            holidayAnalogValue: d.holidayAnalogValue?.toString() || '',
            holidayDigitalValue: d.holidayDigitalValue || false,
          })),
        });
      } else {
        setFormData({
          name: '',
          description: '',
          dates: [],
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, calendar]);

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (index: number, field: keyof HolidayDate, value: string | boolean) => {
    setFormData(prev => {
      const newDates = [...prev.dates];
      newDates[index] = { ...newDates[index], [field]: value };
      return { ...prev, dates: newDates };
    });
    
    // Clear error for this date field
    if (formErrors.dates && formErrors.dates[index]) {
      setFormErrors(prev => ({
        ...prev,
        dates: {
          ...prev.dates,
          [index]: {
            ...prev.dates![index],
            [field]: undefined,
          },
        },
      }));
    }
  };

  const handleAddDate = () => {
    setFormData(prev => ({
      ...prev,
      dates: [
        ...prev.dates,
        {
          date: new Date().toISOString().split('T')[0],
          name: '',
          holidayAnalogValue: '',
          holidayDigitalValue: false,
        },
      ],
    }));
  };

  const handleRemoveDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index),
    }));
    
    // Clear errors for removed date
    if (formErrors.dates && formErrors.dates[index]) {
      setFormErrors(prev => {
        const newDateErrors = { ...prev.dates };
        delete newDateErrors[index];
        return { ...prev, dates: newDateErrors };
      });
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = { dates: {} };
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = t('holidayCalendar.validation.nameRequired');
    }
    
    // Validate dates
    formData.dates.forEach((date, index) => {
      const dateErrors: { date?: string; name?: string; holidayAnalogValue?: string } = {};
      
      if (!date.date) {
        dateErrors.date = t('holidayCalendar.validation.dateRequired');
      }
      
      // Validate analog value if provided
      if (date.holidayAnalogValue && isNaN(Number(date.holidayAnalogValue))) {
        dateErrors.holidayAnalogValue = t('holidayCalendar.validation.analogValueInvalid');
      }
      
      if (Object.keys(dateErrors).length > 0) {
        errors.dates![index] = dateErrors;
      }
    });
    
    // Remove dates key if no date errors
    if (Object.keys(errors.dates || {}).length === 0) {
      delete errors.dates;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert dates to API format
      const dates: AddHolidayDateDto[] = formData.dates.map(d => ({
        date: d.date,
        name: d.name || undefined,
        holidayAnalogValue: d.holidayAnalogValue ? Number(d.holidayAnalogValue) : undefined,
        holidayDigitalValue: d.holidayDigitalValue,
      }));

      if (editMode && calendar) {
        // Edit existing calendar
        logger.log('Editing holiday calendar', { calendarId: calendar.id, name: formData.name });
        const response = await editHolidayCalendar({
          id: calendar.id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          dates,
        });
        
        if (response.isSuccessful) {
          logger.log('Holiday calendar edited successfully', { calendarId: calendar.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('holidayCalendar.errors.editFailed'));
        }
      } else {
        // Create new calendar
        logger.log('Creating holiday calendar', { name: formData.name });
        const response = await addHolidayCalendar({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          dates,
        });
        
        if (response.isSuccessful) {
          logger.log('Holiday calendar created successfully', { id: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('holidayCalendar.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save holiday calendar', { error: err });
      setError(editMode 
        ? t('holidayCalendar.errors.editFailed')
        : t('holidayCalendar.errors.createFailed')
      );
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
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-holiday-calendar-dialog"
    >
      <DialogTitle data-id-ref="add-edit-holiday-calendar-dialog-title">
        {editMode ? t('holidayCalendar.editCalendar') : t('holidayCalendar.addCalendar')}
      </DialogTitle>
      
      <DialogContent data-id-ref="add-edit-holiday-calendar-dialog-content">
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && (
            <Alert 
              data-id-ref="add-edit-holiday-calendar-error"
              severity="error" 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          {/* Basic Information */}
          <Box data-id-ref="holiday-calendar-basic-info">
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              {t('holidayCalendar.basicInfo')}
            </Typography>
            <Stack spacing={2}>
              <TextField
                data-id-ref="holiday-calendar-name-input"
                label={t('holidayCalendar.name')}
                value={formData.name}
                onChange={handleInputChange('name')}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name || t('holidayCalendar.hints.name')}
                required
                fullWidth
              />
              
              <TextField
                data-id-ref="holiday-calendar-description-input"
                label={t('holidayCalendar.description')}
                value={formData.description}
                onChange={handleInputChange('description')}
                error={Boolean(formErrors.description)}
                helperText={formErrors.description || t('holidayCalendar.hints.description')}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Holiday Dates */}
          <Box data-id-ref="holiday-calendar-dates-section">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t('holidayCalendar.holidays')} ({formData.dates.length})
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddDate}
                size="small"
                variant="outlined"
                data-id-ref="holiday-calendar-add-date-btn"
              >
                {t('holidayCalendar.addHoliday')}
              </Button>
            </Box>

            <Stack spacing={2} data-id-ref="holiday-calendar-dates-list">
              {formData.dates.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}
                  data-id-ref="holiday-calendar-no-dates"
                >
                  <Typography color="text.secondary">
                    {t('holidayCalendar.noDates')}
                  </Typography>
                </Paper>
              ) : (
                formData.dates.map((date, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{ p: 2 }}
                    data-id-ref={`holiday-calendar-date-${index}`}
                  >
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t('holidayCalendar.holidayNumber', { number: index + 1 })}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveDate(index)}
                          data-id-ref={`holiday-calendar-remove-date-${index}-btn`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Stack direction="row" spacing={2}>
                        <TextField
                          type="date"
                          label={t('holidayCalendar.date')}
                          value={date.date}
                          onChange={(e) => handleDateChange(index, 'date', e.target.value)}
                          error={Boolean(formErrors.dates?.[index]?.date)}
                          helperText={formErrors.dates?.[index]?.date}
                          required
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          data-id-ref={`holiday-calendar-date-${index}-input`}
                        />
                        
                        <TextField
                          label={t('holidayCalendar.holidayName')}
                          value={date.name}
                          onChange={(e) => handleDateChange(index, 'name', e.target.value)}
                          error={Boolean(formErrors.dates?.[index]?.name)}
                          helperText={formErrors.dates?.[index]?.name || t('holidayCalendar.hints.holidayName')}
                          fullWidth
                          data-id-ref={`holiday-calendar-name-${index}-input`}
                        />
                      </Stack>

                      <Stack direction="row" spacing={2}>
                        <TextField
                          label={t('holidayCalendar.analogValue')}
                          value={date.holidayAnalogValue}
                          onChange={(e) => handleDateChange(index, 'holidayAnalogValue', e.target.value)}
                          error={Boolean(formErrors.dates?.[index]?.holidayAnalogValue)}
                          helperText={formErrors.dates?.[index]?.holidayAnalogValue || t('holidayCalendar.hints.analogValue')}
                          fullWidth
                          data-id-ref={`holiday-calendar-analog-${index}-input`}
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions data-id-ref="add-edit-holiday-calendar-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          data-id-ref="holiday-calendar-cancel-btn"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="holiday-calendar-save-btn"
        >
          {loading ? <CircularProgress size={24} /> : t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditHolidayCalendarDialog;
