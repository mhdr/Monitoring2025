import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Autocomplete,
  Box,
  Chip,
  Typography,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormHelperText,
  Tooltip,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addScheduleMemory, editScheduleMemory, getHolidayCalendars } from '../services/extendedApi';
import type { ScheduleMemory, Item, ItemType, HolidayCalendar, AddScheduleBlockDto } from '../types/api';
import { OverrideExpirationMode, SchedulePriority, ScheduleDayOfWeek } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditScheduleMemoryDialog');

interface AddEditScheduleMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  scheduleMemory: ScheduleMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface ScheduleBlockForm {
  tempId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  priority: number;
  analogOutputValue: number | null;
  digitalOutputValue: boolean | null;
  description: string;
}

interface FormData {
  name: string;
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  holidayCalendarId: string;
  defaultAnalogValue: number | null;
  defaultDigitalValue: boolean | null;
  overrideExpirationMode: number;
  overrideDurationMinutes: number;
  scheduleBlocks: ScheduleBlockForm[];
}

interface FormErrors {
  name?: string;
  outputItemId?: string;
  interval?: string;
  defaultValue?: string;
  overrideDurationMinutes?: string;
  scheduleBlocks?: string;
}

/**
 * Get ItemType color for badge
 */
const getItemTypeColor = (itemType: ItemType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (itemType) {
    case 1: return 'info';
    case 2: return 'success';
    case 3: return 'primary';
    case 4: return 'secondary';
    default: return 'default';
  }
};

/**
 * Get ItemType label
 */
const getItemTypeLabel = (itemType: ItemType, t: (key: string) => string): string => {
  switch (itemType) {
    case 1: return t('itemType.digitalInput');
    case 2: return t('itemType.digitalOutput');
    case 3: return t('itemType.analogInput');
    case 4: return t('itemType.analogOutput');
    default: return String(itemType);
  }
};

const getDayOfWeekLabel = (day: number, t: (key: string) => string): string => {
  const days = [
    t('scheduleMemory.days.sunday'),
    t('scheduleMemory.days.monday'),
    t('scheduleMemory.days.tuesday'),
    t('scheduleMemory.days.wednesday'),
    t('scheduleMemory.days.thursday'),
    t('scheduleMemory.days.friday'),
    t('scheduleMemory.days.saturday'),
  ];
  return days[day] || String(day);
};

const getPriorityLabel = (priority: number, t: (key: string) => string): string => {
  switch (priority) {
    case 1: return t('scheduleMemory.priority.low');
    case 2: return t('scheduleMemory.priority.normal');
    case 3: return t('scheduleMemory.priority.high');
    case 4: return t('scheduleMemory.priority.critical');
    default: return String(priority);
  }
};

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const AddEditScheduleMemoryDialog: React.FC<AddEditScheduleMemoryDialogProps> = ({
  open,
  editMode,
  scheduleMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidayCalendars, setHolidayCalendars] = useState<HolidayCalendar[]>([]);

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [blocksExpanded, setBlocksExpanded] = useState(true);
  const [overrideExpanded, setOverrideExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    outputItemId: '',
    interval: 10,
    isDisabled: false,
    holidayCalendarId: '',
    defaultAnalogValue: null,
    defaultDigitalValue: null,
    overrideExpirationMode: OverrideExpirationMode.TimeBased,
    overrideDurationMinutes: 60,
    scheduleBlocks: [],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Determine if output item is analog or digital
  const selectedOutputItem = useMemo(() => {
    return items.find((item) => item.id === formData.outputItemId) || null;
  }, [items, formData.outputItemId]);

  const isAnalogOutput = selectedOutputItem?.itemType === 4; // AnalogOutput

  // Filter output items to AnalogOutput (4) or DigitalOutput (2)
  const outputItems = useMemo(() => {
    return items.filter((item) => item.itemType === 2 || item.itemType === 4);
  }, [items]);

  // Load holiday calendars
  useEffect(() => {
    if (open) {
      getHolidayCalendars({}).then((response) => {
        if (response.isSuccessful && response.holidayCalendars) {
          setHolidayCalendars(response.holidayCalendars);
        }
      }).catch((err) => {
        logger.error('Failed to load holiday calendars', err);
      });
    }
  }, [open]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (editMode && scheduleMemory) {
        setFormData({
          name: scheduleMemory.name || '',
          outputItemId: scheduleMemory.outputItemId,
          interval: scheduleMemory.interval,
          isDisabled: scheduleMemory.isDisabled,
          holidayCalendarId: scheduleMemory.holidayCalendarId || '',
          defaultAnalogValue: scheduleMemory.defaultAnalogValue ?? null,
          defaultDigitalValue: scheduleMemory.defaultDigitalValue ?? null,
          overrideExpirationMode: scheduleMemory.overrideExpirationMode,
          overrideDurationMinutes: scheduleMemory.overrideDurationMinutes,
          scheduleBlocks: scheduleMemory.scheduleBlocks?.map((b) => ({
            tempId: b.id || generateTempId(),
            dayOfWeek: typeof b.dayOfWeek === 'number' ? b.dayOfWeek : 0,
            startTime: b.startTime,
            endTime: b.endTime,
            priority: typeof b.priority === 'number' ? b.priority : SchedulePriority.Normal,
            analogOutputValue: b.analogOutputValue ?? null,
            digitalOutputValue: b.digitalOutputValue ?? null,
            description: b.description || '',
          })) || [],
        });
      } else {
        setFormData({
          name: '',
          outputItemId: '',
          interval: 10,
          isDisabled: false,
          holidayCalendarId: '',
          defaultAnalogValue: null,
          defaultDigitalValue: null,
          overrideExpirationMode: OverrideExpirationMode.TimeBased,
          overrideDurationMinutes: 60,
          scheduleBlocks: [],
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, scheduleMemory]);

  const handleAddBlock = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      scheduleBlocks: [
        ...prev.scheduleBlocks,
        {
          tempId: generateTempId(),
          dayOfWeek: ScheduleDayOfWeek.Monday,
          startTime: '08:00:00',
          endTime: '17:00:00',
          priority: SchedulePriority.Normal,
          analogOutputValue: isAnalogOutput ? 0 : null,
          digitalOutputValue: !isAnalogOutput ? true : null,
          description: '',
        },
      ],
    }));
  }, [isAnalogOutput]);

  const handleRemoveBlock = useCallback((tempId: string) => {
    setFormData((prev) => ({
      ...prev,
      scheduleBlocks: prev.scheduleBlocks.filter((b) => b.tempId !== tempId),
    }));
  }, []);

  const handleBlockChange = useCallback((tempId: string, field: keyof ScheduleBlockForm, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      scheduleBlocks: prev.scheduleBlocks.map((b) =>
        b.tempId === tempId ? { ...b, [field]: value } : b
      ),
    }));
  }, []);

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.outputItemId) {
      errors.outputItemId = t('scheduleMemory.validation.outputItemRequired');
    }

    if (formData.interval <= 0) {
      errors.interval = t('scheduleMemory.validation.intervalRequired');
    }

    if (formData.overrideExpirationMode === OverrideExpirationMode.TimeBased && formData.overrideDurationMinutes <= 0) {
      errors.overrideDurationMinutes = t('scheduleMemory.validation.durationRequired');
    }

    // Validate schedule blocks
    for (const block of formData.scheduleBlocks) {
      if (!block.startTime || !block.endTime) {
        errors.scheduleBlocks = t('scheduleMemory.validation.blockTimesRequired');
        break;
      }
      if (block.startTime >= block.endTime) {
        errors.scheduleBlocks = t('scheduleMemory.validation.startBeforeEnd');
        break;
      }
      if (isAnalogOutput && block.analogOutputValue === null) {
        errors.scheduleBlocks = t('scheduleMemory.validation.analogValueRequired');
        break;
      }
      if (!isAnalogOutput && block.digitalOutputValue === null) {
        errors.scheduleBlocks = t('scheduleMemory.validation.digitalValueRequired');
        break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const blocks: AddScheduleBlockDto[] = formData.scheduleBlocks.map((b) => ({
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
        priority: b.priority,
        analogOutputValue: isAnalogOutput ? b.analogOutputValue : null,
        digitalOutputValue: !isAnalogOutput ? b.digitalOutputValue : null,
        description: b.description || null,
      }));

      if (editMode && scheduleMemory) {
        const response = await editScheduleMemory({
          id: scheduleMemory.id,
          name: formData.name || null,
          outputItemId: formData.outputItemId,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          holidayCalendarId: formData.holidayCalendarId || null,
          defaultAnalogValue: isAnalogOutput ? formData.defaultAnalogValue : null,
          defaultDigitalValue: !isAnalogOutput ? formData.defaultDigitalValue : null,
          overrideExpirationMode: formData.overrideExpirationMode,
          overrideDurationMinutes: formData.overrideDurationMinutes,
          scheduleBlocks: blocks,
        });

        if (response.isSuccessful) {
          logger.log('Schedule memory edited successfully');
          onClose(true);
        } else {
          setError(response.errorMessage || t('scheduleMemory.errors.updateFailed'));
        }
      } else {
        const response = await addScheduleMemory({
          name: formData.name || null,
          outputItemId: formData.outputItemId,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          holidayCalendarId: formData.holidayCalendarId || null,
          defaultAnalogValue: isAnalogOutput ? formData.defaultAnalogValue : null,
          defaultDigitalValue: !isAnalogOutput ? formData.defaultDigitalValue : null,
          overrideExpirationMode: formData.overrideExpirationMode,
          overrideDurationMinutes: formData.overrideDurationMinutes,
          scheduleBlocks: blocks,
        });

        if (response.isSuccessful) {
          logger.log('Schedule memory created successfully', { id: response.id });
          onClose(true);
        } else {
          setError(response.errorMessage || t('scheduleMemory.errors.createFailed'));
        }
      }
    } catch (err) {
      logger.error('Failed to save schedule memory', { error: err });
      setError(t('scheduleMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getItemLabel = (item: Item): string => {
    const name = language === 'fa' && item.nameFa ? item.nameFa : item.name;
    return `${item.pointNumber} - ${name}`;
  };

  // Convert HH:mm to HH:mm:ss format for API
  const formatTimeForApi = (time: string): string => {
    // If already in HH:mm:ss format, return as is
    if (time.length === 8 && time.includes(':')) return time;
    // Convert HH:mm to HH:mm:ss
    if (time.length === 5) return `${time}:00`;
    return time;
  };

  // Convert HH:mm:ss to HH:mm for HTML5 time input
  const formatTimeForInput = (time: string): string => {
    // Return first 5 characters (HH:mm)
    return time.substring(0, 5);
  };

  const handleTimeChange = (tempId: string, field: 'startTime' | 'endTime', value: string) => {
    // Convert HH:mm from input to HH:mm:ss for storage
    const formatted = formatTimeForApi(value);
    handleBlockChange(tempId, field, formatted);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="xl"
      fullWidth
      data-id-ref="schedule-memory-dialog"
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle data-id-ref="schedule-memory-dialog-title">
        {editMode ? t('scheduleMemory.editTitle') : t('scheduleMemory.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="schedule-memory-dialog-content" sx={{ overflow: 'auto' }}>
        <Stack spacing={2} sx={{ mt: 1 }}>

          {error && (
              <Alert severity="error" data-id-ref="schedule-memory-error-alert">
                {error}
              </Alert>
            )}

            {/* Basic Configuration Section */}
            <Card data-id-ref="schedule-memory-basic-section">
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="h6">{t('scheduleMemory.sections.basic')}</Typography>
                    <IconButton size="small" onClick={handleHelpOpen('scheduleMemory.help.basic')}>
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                action={
                  <IconButton onClick={() => setBasicExpanded(!basicExpanded)}>
                    <ExpandMoreIcon sx={{ transform: basicExpanded ? 'rotate(180deg)' : 'none' }} />
                  </IconButton>
                }
                sx={{ pb: 0 }}
              />
              <Collapse in={basicExpanded}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Name */}
                    <TextField
                      label={t('scheduleMemory.name')}
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={loading}
                      fullWidth
                      data-id-ref="schedule-memory-name-input"
                    />

                    {/* Output Item */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <Autocomplete
                        options={outputItems}
                        getOptionLabel={getItemLabel}
                        value={selectedOutputItem}
                        onChange={(_, value) => setFormData((prev) => ({ ...prev, outputItemId: value?.id || '' }))}
                        disabled={loading}
                        data-id-ref="schedule-memory-output-item-select"
                        sx={{ flex: 1 }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('scheduleMemory.outputItem')}
                            required
                            error={!!formErrors.outputItemId}
                            helperText={formErrors.outputItemId}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props} key={option.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {getItemLabel(option)}
                              </Typography>
                              <Chip
                                label={getItemTypeLabel(option.itemType, t)}
                                size="small"
                                color={getItemTypeColor(option.itemType)}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Box>
                        )}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                      />
                      <IconButton size="small" onClick={handleHelpOpen('scheduleMemory.help.outputItem')} sx={{ mt: 1 }}>
                        <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      </IconButton>
                    </Box>

                    {/* Interval and Holiday Calendar */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label={t('scheduleMemory.interval')}
                        type="number"
                        value={formData.interval}
                        onChange={(e) => setFormData((prev) => ({ ...prev, interval: Number(e.target.value) }))}
                        disabled={loading}
                        required
                        error={!!formErrors.interval}
                        helperText={formErrors.interval || t('scheduleMemory.intervalHelp')}
                        inputProps={{ min: 1 }}
                        sx={{ width: 150 }}
                        data-id-ref="schedule-memory-interval-input"
                      />

                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>{t('scheduleMemory.holidayCalendar')}</InputLabel>
                        <Select
                          value={formData.holidayCalendarId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, holidayCalendarId: e.target.value }))}
                          label={t('scheduleMemory.holidayCalendar')}
                          disabled={loading}
                          data-id-ref="schedule-memory-holiday-calendar-select"
                        >
                          <MenuItem value="">{t('common.none')}</MenuItem>
                          {holidayCalendars.map((cal) => (
                            <MenuItem key={cal.id} value={cal.id}>{cal.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Default Value */}
                    {isAnalogOutput ? (
                      <TextField
                        label={t('scheduleMemory.defaultAnalogValue')}
                        type="number"
                        value={formData.defaultAnalogValue ?? ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, defaultAnalogValue: e.target.value ? Number(e.target.value) : null }))}
                        disabled={loading}
                        fullWidth
                        data-id-ref="schedule-memory-default-analog-input"
                        helperText={t('scheduleMemory.defaultValueHelp')}
                      />
                    ) : (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.defaultDigitalValue ?? false}
                            onChange={(e) => setFormData((prev) => ({ ...prev, defaultDigitalValue: e.target.checked }))}
                            disabled={loading}
                            data-id-ref="schedule-memory-default-digital-switch"
                          />
                        }
                        label={t('scheduleMemory.defaultDigitalValue')}
                      />
                    )}

                    {/* Disabled switch */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isDisabled}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isDisabled: e.target.checked }))}
                          disabled={loading}
                          data-id-ref="schedule-memory-disabled-switch"
                        />
                      }
                      label={t('scheduleMemory.isDisabled')}
                    />
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>

            {/* Schedule Blocks Section */}
            <Card data-id-ref="schedule-memory-blocks-section">
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="h6">{t('scheduleMemory.sections.blocks')}</Typography>
                    <Chip label={formData.scheduleBlocks.length} size="small" color="primary" />
                    <IconButton size="small" onClick={handleHelpOpen('scheduleMemory.help.blocks')}>
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddBlock}
                      disabled={loading || !formData.outputItemId}
                      data-id-ref="schedule-memory-add-block-btn"
                    >
                      {t('scheduleMemory.addBlock')}
                    </Button>
                    <IconButton onClick={() => setBlocksExpanded(!blocksExpanded)}>
                      <ExpandMoreIcon sx={{ transform: blocksExpanded ? 'rotate(180deg)' : 'none' }} />
                    </IconButton>
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <Collapse in={blocksExpanded}>
                <CardContent>
                  {formErrors.scheduleBlocks && (
                    <Alert severity="error" sx={{ mb: 2 }}>{formErrors.scheduleBlocks}</Alert>
                  )}
                  {formData.scheduleBlocks.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      {t('scheduleMemory.noBlocks')}
                    </Typography>
                  ) : (
                    <Box sx={{ overflowX: 'auto', width: '100%' }}>
                      <Table size="small" data-id-ref="schedule-memory-blocks-table" sx={{ minWidth: 1000 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ minWidth: 140 }}>{t('scheduleMemory.dayOfWeek')}</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>{t('scheduleMemory.startTime')}</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>{t('scheduleMemory.endTime')}</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>{t('scheduleMemory.priorityLabel')}</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>{isAnalogOutput ? t('scheduleMemory.analogValue') : t('scheduleMemory.digitalValue')}</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>{t('scheduleMemory.description')}</TableCell>
                            <TableCell sx={{ width: 60 }}></TableCell>
                          </TableRow>
                        </TableHead>
                      <TableBody>
                        {formData.scheduleBlocks.map((block) => (
                          <TableRow key={block.tempId} data-id-ref={`schedule-block-row-${block.tempId}`}>
                            <TableCell>
                              <Select
                                size="small"
                                value={block.dayOfWeek}
                                onChange={(e) => handleBlockChange(block.tempId, 'dayOfWeek', Number(e.target.value))}
                                data-id-ref={`schedule-block-day-${block.tempId}`}
                                sx={{ minWidth: 130, width: '100%' }}
                              >
                                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                  <MenuItem key={day} value={day}>{getDayOfWeekLabel(day, t)}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="time"
                                size="small"
                                value={formatTimeForInput(block.startTime)}
                                onChange={(e) => handleTimeChange(block.tempId, 'startTime', e.target.value)}
                                data-id-ref={`schedule-block-start-${block.tempId}`}
                                sx={{ width: 130 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="time"
                                size="small"
                                value={formatTimeForInput(block.endTime)}
                                onChange={(e) => handleTimeChange(block.tempId, 'endTime', e.target.value)}
                                data-id-ref={`schedule-block-end-${block.tempId}`}
                                sx={{ width: 130 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={block.priority}
                                onChange={(e) => handleBlockChange(block.tempId, 'priority', Number(e.target.value))}
                                data-id-ref={`schedule-block-priority-${block.tempId}`}
                                sx={{ minWidth: 110, width: '100%' }}
                              >
                                {[1, 2, 3, 4].map((p) => (
                                  <MenuItem key={p} value={p}>{getPriorityLabel(p, t)}</MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              {isAnalogOutput ? (
                                <TextField
                                  size="small"
                                  type="number"
                                  value={block.analogOutputValue ?? ''}
                                  onChange={(e) => handleBlockChange(block.tempId, 'analogOutputValue', e.target.value ? Number(e.target.value) : null)}
                                  data-id-ref={`schedule-block-analog-${block.tempId}`}
                                  sx={{ width: 100 }}
                                />
                              ) : (
                                <Switch
                                  checked={block.digitalOutputValue ?? false}
                                  onChange={(e) => handleBlockChange(block.tempId, 'digitalOutputValue', e.target.checked)}
                                  data-id-ref={`schedule-block-digital-${block.tempId}`}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={block.description}
                                onChange={(e) => handleBlockChange(block.tempId, 'description', e.target.value)}
                                data-id-ref={`schedule-block-desc-${block.tempId}`}
                                sx={{ width: 170 }}
                                placeholder={t('scheduleMemory.descriptionPlaceholder')}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={t('common.delete')}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveBlock(block.tempId)}
                                  data-id-ref={`schedule-block-delete-${block.tempId}`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </Box>
                  )}
                </CardContent>
              </Collapse>
            </Card>

            {/* Override Settings Section */}
            <Card data-id-ref="schedule-memory-override-section">
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="h6">{t('scheduleMemory.sections.override')}</Typography>
                    <IconButton size="small" onClick={handleHelpOpen('scheduleMemory.help.override')}>
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                action={
                  <IconButton onClick={() => setOverrideExpanded(!overrideExpanded)}>
                    <ExpandMoreIcon sx={{ transform: overrideExpanded ? 'rotate(180deg)' : 'none' }} />
                  </IconButton>
                }
                sx={{ pb: 0 }}
              />
              <Collapse in={overrideExpanded}>
                <CardContent>
                  <Stack spacing={2}>
                    <FormControl>
                      <InputLabel>{t('scheduleMemory.overrideMode')}</InputLabel>
                      <Select
                        value={formData.overrideExpirationMode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, overrideExpirationMode: Number(e.target.value) }))}
                        label={t('scheduleMemory.overrideMode')}
                        disabled={loading}
                        data-id-ref="schedule-memory-override-mode-select"
                      >
                        <MenuItem value={OverrideExpirationMode.TimeBased}>{t('scheduleMemory.overrideMode.timeBased')}</MenuItem>
                        <MenuItem value={OverrideExpirationMode.EventBased}>{t('scheduleMemory.overrideMode.eventBased')}</MenuItem>
                      </Select>
                      <FormHelperText>{t('scheduleMemory.overrideModeHelp')}</FormHelperText>
                    </FormControl>

                    {formData.overrideExpirationMode === OverrideExpirationMode.TimeBased && (
                      <TextField
                        label={t('scheduleMemory.overrideDuration')}
                        type="number"
                        value={formData.overrideDurationMinutes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, overrideDurationMinutes: Number(e.target.value) }))}
                        disabled={loading}
                        required
                        error={!!formErrors.overrideDurationMinutes}
                        helperText={formErrors.overrideDurationMinutes || t('scheduleMemory.overrideDurationHelp')}
                        inputProps={{ min: 1 }}
                        data-id-ref="schedule-memory-override-duration-input"
                      />
                    )}
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions data-id-ref="schedule-memory-dialog-actions">
          <Button onClick={() => onClose(false)} disabled={loading} data-id-ref="schedule-memory-cancel-btn">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            data-id-ref="schedule-memory-submit-btn"
            startIcon={loading && <CircularProgress size={20} />}
          >
            {editMode ? t('common.save') : t('common.add')}
          </Button>
        </DialogActions>

        {/* Help Popovers */}
        <FieldHelpPopover
          anchorEl={helpAnchorEl['scheduleMemory.help.basic']}
          open={Boolean(helpAnchorEl['scheduleMemory.help.basic'])}
          onClose={handleHelpClose('scheduleMemory.help.basic')}
          fieldKey="scheduleMemory.help.basic"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['scheduleMemory.help.outputItem']}
          open={Boolean(helpAnchorEl['scheduleMemory.help.outputItem'])}
          onClose={handleHelpClose('scheduleMemory.help.outputItem')}
          fieldKey="scheduleMemory.help.outputItem"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['scheduleMemory.help.blocks']}
          open={Boolean(helpAnchorEl['scheduleMemory.help.blocks'])}
          onClose={handleHelpClose('scheduleMemory.help.blocks')}
          fieldKey="scheduleMemory.help.blocks"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['scheduleMemory.help.override']}
          open={Boolean(helpAnchorEl['scheduleMemory.help.override'])}
          onClose={handleHelpClose('scheduleMemory.help.override')}
          fieldKey="scheduleMemory.help.override"
        />
      </Dialog>
  );
};

export default AddEditScheduleMemoryDialog;
