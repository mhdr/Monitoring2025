import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { createLogger } from '../utils/logger';
import { getExternalAlarms, batchEditExternalAlarms } from '../services/monitoringApi';
import type {
  ExternalAlarmEdit,
  ExternalAlarmInfo,
  GetExternalAlarmsRequestDto,
  BatchEditExternalAlarmsRequestDto,
  Item,
} from '../types/api';

const logger = createLogger('ManageExternalAlarmsDialog');

interface ManageExternalAlarmsDialogProps {
  open: boolean;
  onClose: () => void;
  alarmId: string;
  alarmMessage?: string;
  onSuccess?: () => void;
}

interface ExternalAlarmRow {
  id: string; // UUID for existing, temp ID for new
  itemId: string;
  value: boolean;
  isDisabled: boolean;
  isNew?: boolean; // Flag for newly added rows
  isModified?: boolean; // Flag for modified rows
  isDeleted?: boolean; // Flag for deleted rows
}

const ManageExternalAlarmsDialog: React.FC<ManageExternalAlarmsDialogProps> = ({
  open,
  onClose,
  alarmId,
  alarmMessage,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { state } = useMonitoring();

  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [externalAlarms, setExternalAlarms] = useState<ExternalAlarmRow[]>([]);

  // Get digital output items only
  const digitalOutputItems = useMemo(() => {
    return state.items.filter((item: Item) => item.itemType === 2); // ItemTypeEnum.DigitalOutput = 2
  }, [state.items]);

  // Fetch external alarms data
  const fetchExternalAlarms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.log('Fetching external alarms for alarmId:', alarmId);

      const request: GetExternalAlarmsRequestDto = {
        alarmId,
      };

      const response = await getExternalAlarms(request);
      logger.log('External alarms fetched successfully:', {
        count: response.externalAlarms?.length || 0,
        success: response.success,
      });

      if (response.success && response.externalAlarms) {
        const rows: ExternalAlarmRow[] = response.externalAlarms.map((ea: ExternalAlarmInfo) => ({
          id: ea.id || '',
          itemId: ea.itemId || '',
          value: ea.value || false,
          isDisabled: ea.isDisabled || false,
        }));
        setExternalAlarms(rows);
      } else {
        setExternalAlarms([]);
      }
    } catch (err) {
      logger.error('Error fetching external alarms:', err);
      setError(t('externalAlarms.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [alarmId, t]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchExternalAlarms();
    }
  }, [open, fetchExternalAlarms]);

  // Add new external alarm row
  const handleAddRow = useCallback(() => {
    const newRow: ExternalAlarmRow = {
      id: `temp-${Date.now()}`, // Temporary ID for new rows
      itemId: '',
      value: false,
      isDisabled: false,
      isNew: true,
    };
    setExternalAlarms((prev) => [...prev, newRow]);
    logger.log('Added new external alarm row');
  }, []);

  // Delete external alarm row
  const handleDeleteRow = useCallback((rowId: string) => {
    setExternalAlarms((prev) => {
      const row = prev.find((r) => r.id === rowId);
      if (row?.isNew) {
        // If it's a new row, just remove it from the list
        return prev.filter((r) => r.id !== rowId);
      } else {
        // Mark existing row as deleted
        return prev.map((r) => (r.id === rowId ? { ...r, isDeleted: true } : r));
      }
    });
    logger.log('Deleted external alarm row:', rowId);
  }, []);

  // Update external alarm row field
  const handleUpdateRow = useCallback(
    (rowId: string, field: keyof ExternalAlarmRow, value: string | boolean) => {
      setExternalAlarms((prev) =>
        prev.map((row) => {
          if (row.id === rowId) {
            const updated = { ...row, [field]: value };
            // Mark as modified if not new
            if (!row.isNew) {
              updated.isModified = true;
            }
            return updated;
          }
          return row;
        })
      );
    },
    []
  );

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const hasNew = externalAlarms.some((ea) => ea.isNew && !ea.isDeleted);
    const hasModified = externalAlarms.some((ea) => ea.isModified && !ea.isDeleted);
    const hasDeleted = externalAlarms.some((ea) => ea.isDeleted);
    return hasNew || hasModified || hasDeleted;
  }, [externalAlarms]);

  // Validate before saving
  const validateData = useCallback((): string | null => {
    const activeRows = externalAlarms.filter((ea) => !ea.isDeleted);

    // Check for empty itemId
    for (const row of activeRows) {
      if (!row.itemId) {
        return t('externalAlarms.validation.itemRequired');
      }
    }

    // Check for duplicate itemId
    const itemIds = activeRows.map((ea) => ea.itemId);
    const uniqueItemIds = new Set(itemIds);
    if (itemIds.length !== uniqueItemIds.size) {
      return t('externalAlarms.validation.duplicateItem');
    }

    return null;
  }, [externalAlarms, t]);

  // Save external alarms
  const handleSave = useCallback(async () => {
    setSaveError(null);

    // Validate data
    const validationError = validateData();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);

    try {
      // Prepare batch edit request
      const added: ExternalAlarmEdit[] = externalAlarms
        .filter((ea) => ea.isNew && !ea.isDeleted)
        .map((ea) => ({
          id: '00000000-0000-0000-0000-000000000000', // Backend will generate actual ID
          itemId: ea.itemId,
          value: ea.value,
          isDisabled: ea.isDisabled,
        }));

      const changed: ExternalAlarmEdit[] = externalAlarms
        .filter((ea) => ea.isModified && !ea.isNew && !ea.isDeleted)
        .map((ea) => ({
          id: ea.id,
          itemId: ea.itemId,
          value: ea.value,
          isDisabled: ea.isDisabled,
        }));

      const removed: ExternalAlarmEdit[] = externalAlarms
        .filter((ea) => ea.isDeleted && !ea.isNew)
        .map((ea) => ({
          id: ea.id,
          itemId: ea.itemId,
          value: ea.value,
          isDisabled: ea.isDisabled,
        }));

      logger.log('Saving external alarms:', { added: added.length, changed: changed.length, removed: removed.length });

      const request: BatchEditExternalAlarmsRequestDto = {
        alarmId,
        added: added.length > 0 ? added : [],
        changed: changed.length > 0 ? changed : [],
        removed: removed.length > 0 ? removed : [],
      };

      await batchEditExternalAlarms(request);
      logger.log('External alarms saved successfully');

      onSuccess?.();
      onClose();
    } catch (err) {
      logger.error('Error saving external alarms:', err);
      setSaveError(t('externalAlarms.errorSaving'));
    } finally {
      setSaving(false);
    }
  }, [alarmId, externalAlarms, validateData, t, onSuccess, onClose]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (window.confirm(t('externalAlarms.confirmDiscard'))) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose, t]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      data-id-ref="manage-external-alarms-dialog"
      PaperProps={{
        sx: {
          minHeight: isMobile ? '100vh' : '70vh',
          maxHeight: isMobile ? '100vh' : '90vh',
        },
      }}
    >
      <DialogTitle
        data-id-ref="manage-external-alarms-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color="primary" />
          <Typography variant="h6" component="span">
            {t('externalAlarms.title')}
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          aria-label="close"
          data-id-ref="manage-external-alarms-dialog-close-btn"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent data-id-ref="manage-external-alarms-dialog-content" sx={{ pt: 2 }}>
        {/* Alarm Message */}
        {alarmMessage && (
          <Alert severity="info" sx={{ mb: 2 }} data-id-ref="manage-external-alarms-alarm-info">
            <Typography variant="body2">
              <strong>{t('externalAlarms.alarmMessage')}:</strong> {alarmMessage}
            </Typography>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              gap: 2,
            }}
            data-id-ref="manage-external-alarms-loading"
          >
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              {t('loading')}
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert
            severity="error"
            data-id-ref="manage-external-alarms-error"
            action={
              <Button color="inherit" size="small" onClick={fetchExternalAlarms}>
                {t('retry')}
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Save Error */}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="manage-external-alarms-save-error">
            {saveError}
          </Alert>
        )}

        {/* External Alarms List */}
        {!loading && !error && (
          <Box data-id-ref="manage-external-alarms-list">
            {/* Add Button */}
            <Box sx={{ mb: 2 }} data-id-ref="manage-external-alarms-add-section">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddRow}
                disabled={saving}
                data-id-ref="manage-external-alarms-add-btn"
              >
                {t('externalAlarms.addNew')}
              </Button>
            </Box>

            {/* No External Alarms */}
            {externalAlarms.filter((ea) => !ea.isDeleted).length === 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                }}
                data-id-ref="manage-external-alarms-empty"
              >
                <Typography variant="body2" color="text.secondary">
                  {t('externalAlarms.noExternalAlarms')}
                </Typography>
              </Paper>
            )}

            {/* External Alarm Rows */}
            <Stack spacing={2} data-id-ref="manage-external-alarms-rows">
              {externalAlarms
                .filter((ea) => !ea.isDeleted)
                .map((row, index) => (
                  <Paper
                    key={row.id}
                    elevation={1}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: row.isNew ? 'success.main' : row.isModified ? 'warning.main' : 'divider',
                      bgcolor: row.isNew ? 'success.50' : row.isModified ? 'warning.50' : 'background.paper',
                    }}
                    data-id-ref={`manage-external-alarms-row-${index}`}
                  >
                    <Stack spacing={2}>
                      {/* Item Selection */}
                      <FormControl fullWidth data-id-ref={`manage-external-alarms-item-select-${index}`}>
                        <InputLabel id={`item-select-label-${row.id}`}>{t('externalAlarms.item')}</InputLabel>
                        <Select
                          labelId={`item-select-label-${row.id}`}
                          value={row.itemId}
                          label={t('externalAlarms.item')}
                          onChange={(e) => handleUpdateRow(row.id, 'itemId', e.target.value)}
                          disabled={saving}
                          error={!row.itemId}
                        >
                          <MenuItem value="" disabled>
                            <em>{t('externalAlarms.selectItem')}</em>
                          </MenuItem>
                          {digitalOutputItems.map((item: Item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {language === 'fa' ? item.nameFa || item.name : item.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Value and Status Row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                        data-id-ref={`manage-external-alarms-controls-${index}`}
                      >
                        {/* Output Value */}
                        <FormControlLabel
                          control={
                            <Switch
                              checked={row.value}
                              onChange={(e) => handleUpdateRow(row.id, 'value', e.target.checked)}
                              disabled={saving}
                              data-id-ref={`manage-external-alarms-value-switch-${index}`}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {t('externalAlarms.outputValue')}: {row.value ? t('on') : t('off')}
                            </Typography>
                          }
                        />

                        {/* Is Disabled */}
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!row.isDisabled}
                              onChange={(e) => handleUpdateRow(row.id, 'isDisabled', !e.target.checked)}
                              disabled={saving}
                              data-id-ref={`manage-external-alarms-enabled-switch-${index}`}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {row.isDisabled ? t('disabled') : t('enabled')}
                            </Typography>
                          }
                        />

                        {/* Delete Button */}
                        <Tooltip title={t('delete')}>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteRow(row.id)}
                            disabled={saving}
                            data-id-ref={`manage-external-alarms-delete-btn-${index}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions data-id-ref="manage-external-alarms-dialog-actions" sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving} data-id-ref="manage-external-alarms-cancel-btn">
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!hasChanges || saving || loading}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          data-id-ref="manage-external-alarms-save-btn"
        >
          {saving ? t('saving') : t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageExternalAlarmsDialog;
