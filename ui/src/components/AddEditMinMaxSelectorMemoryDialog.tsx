import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  CircularProgress,
  Alert,
  Typography,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  FormHelperText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  SwapVert as SwapVertIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addMinMaxSelectorMemory, editMinMaxSelectorMemory } from '../services/extendedApi';
import type {
  MinMaxSelectorMemory,
  MinMaxSelectionMode,
  MinMaxFailoverMode,
  AddMinMaxSelectorMemoryRequestDto,
  EditMinMaxSelectorMemoryRequestDto,
} from '../types/api';
import { MinMaxSelectionModeEnum, MinMaxFailoverModeEnum } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

// Constants for validation
const MIN_INPUT_COUNT = 2;
const MAX_INPUT_COUNT = 16;

interface Props {
  open: boolean;
  editMode: boolean;
  minMaxSelectorMemory: MinMaxSelectorMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface FormData {
  name: string;
  inputItemIds: string[];
  outputItemId: string;
  selectedIndexOutputItemId: string;
  selectionMode: MinMaxSelectionMode;
  failoverMode: MinMaxFailoverMode;
  interval: number;
  duration: number;
  isDisabled: boolean;
}

interface FormErrors {
  name?: string;
  inputItemIds?: string;
  outputItemId?: string;
  selectedIndexOutputItemId?: string;
  interval?: string;
  duration?: string;
}

const AddEditMinMaxSelectorMemoryDialog: React.FC<Props> = ({
  open,
  editMode,
  minMaxSelectorMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    inputItemIds: [],
    outputItemId: '',
    selectedIndexOutputItemId: '',
    selectionMode: MinMaxSelectionModeEnum.Minimum,
    failoverMode: MinMaxFailoverModeEnum.IgnoreBad,
    interval: 1,
    duration: 10,
    isDisabled: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Help popover anchors
  const [helpAnchor, setHelpAnchor] = useState<{ element: HTMLElement | null; field: string }>({
    element: null,
    field: '',
  });

  const handleHelpOpen = (event: React.MouseEvent<HTMLElement>, field: string) => {
    setHelpAnchor({ element: event.currentTarget, field });
  };

  const handleHelpClose = () => {
    setHelpAnchor({ element: null, field: '' });
  };

  // Initialize form when editing
  useEffect(() => {
    if (open) {
      if (editMode && minMaxSelectorMemory) {
        // Parse input item IDs
        let inputIds: string[] = [];
        try {
          inputIds = JSON.parse(minMaxSelectorMemory.inputItemIds || '[]') as string[];
        } catch {
          inputIds = [];
        }

        setFormData({
          name: minMaxSelectorMemory.name || '',
          inputItemIds: inputIds,
          outputItemId: minMaxSelectorMemory.outputItemId || '',
          selectedIndexOutputItemId: minMaxSelectorMemory.selectedIndexOutputItemId || '',
          selectionMode: minMaxSelectorMemory.selectionMode,
          failoverMode: minMaxSelectorMemory.failoverMode,
          interval: minMaxSelectorMemory.interval || 1,
          duration: minMaxSelectorMemory.duration ?? 10,
          isDisabled: minMaxSelectorMemory.isDisabled || false,
        });
      } else {
        // Reset for add mode
        setFormData({
          name: '',
          inputItemIds: [],
          outputItemId: '',
          selectedIndexOutputItemId: '',
          selectionMode: MinMaxSelectionModeEnum.Minimum,
          failoverMode: MinMaxFailoverModeEnum.IgnoreBad,
          interval: 1,
          duration: 10,
          isDisabled: false,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, editMode, minMaxSelectorMemory]);

  // Filter analog items for input/output selection
  const analogItems = useMemo(() => {
    return items.filter((item) => item.itemType === 1); // 1 = Analog
  }, [items]);

  // Get item name for display
  const getItemDisplayName = useCallback(
    (itemId: string): string => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return itemId;
      return (language === 'fa' ? item.nameFa : item.name) || itemId;
    },
    [items, language]
  );

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('minMaxSelectorMemory.errors.nameRequired');
    } else if (formData.name.length > 100) {
      newErrors.name = t('minMaxSelectorMemory.errors.nameTooLong');
    }

    // Input items validation
    if (formData.inputItemIds.length < MIN_INPUT_COUNT) {
      newErrors.inputItemIds = t('minMaxSelectorMemory.errors.minInputs', { count: MIN_INPUT_COUNT });
    } else if (formData.inputItemIds.length > MAX_INPUT_COUNT) {
      newErrors.inputItemIds = t('minMaxSelectorMemory.errors.maxInputs', { count: MAX_INPUT_COUNT });
    }

    // Output item validation
    if (!formData.outputItemId) {
      newErrors.outputItemId = t('minMaxSelectorMemory.errors.outputRequired');
    }

    // Check if output is not in inputs
    if (formData.outputItemId && formData.inputItemIds.includes(formData.outputItemId)) {
      newErrors.outputItemId = t('minMaxSelectorMemory.errors.outputNotInInputs');
    }

    // Check if index output (if provided) is not in inputs or same as output
    if (formData.selectedIndexOutputItemId) {
      if (formData.inputItemIds.includes(formData.selectedIndexOutputItemId)) {
        newErrors.selectedIndexOutputItemId = t('minMaxSelectorMemory.errors.indexOutputNotInInputs');
      }
      if (formData.selectedIndexOutputItemId === formData.outputItemId) {
        newErrors.selectedIndexOutputItemId = t('minMaxSelectorMemory.errors.indexOutputNotSameAsOutput');
      }
    }

    // Interval validation
    if (formData.interval < 1) {
      newErrors.interval = t('minMaxSelectorMemory.errors.intervalMin');
    } else if (formData.interval > 86400) {
      newErrors.interval = t('minMaxSelectorMemory.errors.intervalMax');
    }

    // Duration validation
    if (formData.duration < 0) {
      newErrors.duration = t('minMaxSelectorMemory.validation.durationInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (editMode && minMaxSelectorMemory) {
        const request: EditMinMaxSelectorMemoryRequestDto = {
          id: minMaxSelectorMemory.id,
          name: formData.name.trim(),
          inputItemIds: JSON.stringify(formData.inputItemIds),
          outputItemId: formData.outputItemId,
          selectedIndexOutputItemId: formData.selectedIndexOutputItemId || null,
          selectionMode: formData.selectionMode,
          failoverMode: formData.failoverMode,
          interval: formData.interval,
          duration: formData.duration,
          isDisabled: formData.isDisabled,
        };
        const response = await editMinMaxSelectorMemory(request);
        if (!response.isSuccessful) {
          throw new Error(response.errorMessage || t('minMaxSelectorMemory.errors.editFailed'));
        }
      } else {
        const request: AddMinMaxSelectorMemoryRequestDto = {
          name: formData.name.trim(),
          inputItemIds: JSON.stringify(formData.inputItemIds),
          outputItemId: formData.outputItemId,
          selectedIndexOutputItemId: formData.selectedIndexOutputItemId || null,
          selectionMode: formData.selectionMode,
          failoverMode: formData.failoverMode,
          interval: formData.interval,
          duration: formData.duration,
          isDisabled: formData.isDisabled,
        };
        const response = await addMinMaxSelectorMemory(request);
        if (!response.isSuccessful) {
          throw new Error(response.errorMessage || t('minMaxSelectorMemory.errors.addFailed'));
        }
      }
      onClose(true);
    } catch (err: unknown) {
      console.error('Error saving min/max selector memory:', err);
      setSubmitError(err instanceof Error ? err.message : t('minMaxSelectorMemory.errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="minmax-selector-memory-dialog"
    >
      <DialogTitle data-id-ref="minmax-selector-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapVertIcon color="primary" />
          <Typography variant="h6">
            {editMode
              ? t('minMaxSelectorMemory.editTitle')
              : t('minMaxSelectorMemory.addTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="minmax-selector-memory-dialog-content">
        {submitError && (
          <Alert
            severity="error"
            sx={{ mb: 2, mt: 1 }}
            onClose={() => setSubmitError(null)}
            data-id-ref="minmax-selector-memory-submit-error"
          >
            {submitError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Name */}
          <TextField
            fullWidth
            label={t('minMaxSelectorMemory.name')}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            data-id-ref="minmax-selector-memory-name-input"
          />

          {/* Input Items Multi-Select */}
          <FormControl fullWidth error={!!errors.inputItemIds} required>
            <InputLabel id="input-items-label">{t('minMaxSelectorMemory.inputItems')}</InputLabel>
            <Select
              labelId="input-items-label"
              multiple
              value={formData.inputItemIds}
              onChange={(e) => handleChange('inputItemIds', e.target.value as string[])}
              input={<OutlinedInput label={t('minMaxSelectorMemory.inputItems')} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((id) => (
                    <Chip key={id} label={getItemDisplayName(id)} size="small" />
                  ))}
                </Box>
              )}
              data-id-ref="minmax-selector-memory-inputs-select"
            >
              {analogItems.map((item) => (
                <MenuItem
                  key={item.id}
                  value={item.id}
                  disabled={
                    formData.inputItemIds.length >= MAX_INPUT_COUNT &&
                    !formData.inputItemIds.includes(item.id)
                  }
                >
                  <Checkbox checked={formData.inputItemIds.includes(item.id)} />
                  <ListItemText
                    primary={language === 'fa' ? item.nameFa : item.name}
                  />
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FormHelperText>
                {errors.inputItemIds ||
                  t('minMaxSelectorMemory.inputItemsHelp', {
                    min: MIN_INPUT_COUNT,
                    max: MAX_INPUT_COUNT,
                    current: formData.inputItemIds.length,
                  })}
              </FormHelperText>
              <IconButton
                size="small"
                onClick={(e) => handleHelpOpen(e, 'inputItems')}
                data-id-ref="minmax-selector-memory-inputs-help-btn"
              >
                <HelpOutlineIcon fontSize="small" color="action" />
              </IconButton>
            </Box>
          </FormControl>

          {/* Selection Mode and Failover Mode - Side by Side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Selection Mode */}
            <FormControl fullWidth required>
              <InputLabel id="selection-mode-label">
                {t('minMaxSelectorMemory.selectionMode.label')}
              </InputLabel>
              <Select
                labelId="selection-mode-label"
                value={formData.selectionMode}
                onChange={(e) => handleChange('selectionMode', e.target.value as MinMaxSelectionMode)}
                label={t('minMaxSelectorMemory.selectionMode.label')}
                data-id-ref="minmax-selector-memory-selection-mode-select"
              >
                <MenuItem value={MinMaxSelectionModeEnum.Minimum}>
                  {t('minMaxSelectorMemory.selectionMode.min')}
                </MenuItem>
                <MenuItem value={MinMaxSelectionModeEnum.Maximum}>
                  {t('minMaxSelectorMemory.selectionMode.max')}
                </MenuItem>
              </Select>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormHelperText>{t('minMaxSelectorMemory.selectionModeHelp')}</FormHelperText>
                <IconButton
                  size="small"
                  onClick={(e) => handleHelpOpen(e, 'selectionMode')}
                  data-id-ref="minmax-selector-memory-selection-mode-help-btn"
                >
                  <HelpOutlineIcon fontSize="small" color="action" />
                </IconButton>
              </Box>
            </FormControl>

            {/* Failover Mode */}
            <FormControl fullWidth required>
              <InputLabel id="failover-mode-label">
                {t('minMaxSelectorMemory.failoverMode.label')}
              </InputLabel>
              <Select
                labelId="failover-mode-label"
                value={formData.failoverMode}
                onChange={(e) => handleChange('failoverMode', e.target.value as MinMaxFailoverMode)}
                label={t('minMaxSelectorMemory.failoverMode.label')}
                data-id-ref="minmax-selector-memory-failover-mode-select"
              >
                <MenuItem value={MinMaxFailoverModeEnum.IgnoreBad}>
                  <Tooltip title={t('minMaxSelectorMemory.failoverMode.ignoreBadDesc')}>
                    <span>{t('minMaxSelectorMemory.failoverMode.ignoreBad')}</span>
                  </Tooltip>
                </MenuItem>
                <MenuItem value={MinMaxFailoverModeEnum.FallbackToOpposite}>
                  <Tooltip title={t('minMaxSelectorMemory.failoverMode.fallbackToOppositeDesc')}>
                    <span>{t('minMaxSelectorMemory.failoverMode.fallbackToOpposite')}</span>
                  </Tooltip>
                </MenuItem>
                <MenuItem value={MinMaxFailoverModeEnum.HoldLastGood}>
                  <Tooltip title={t('minMaxSelectorMemory.failoverMode.holdLastGoodDesc')}>
                    <span>{t('minMaxSelectorMemory.failoverMode.holdLastGood')}</span>
                  </Tooltip>
                </MenuItem>
              </Select>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormHelperText>{t('minMaxSelectorMemory.failoverModeHelp')}</FormHelperText>
                <IconButton
                  size="small"
                  onClick={(e) => handleHelpOpen(e, 'failoverMode')}
                  data-id-ref="minmax-selector-memory-failover-mode-help-btn"
                >
                  <HelpOutlineIcon fontSize="small" color="action" />
                </IconButton>
              </Box>
            </FormControl>
          </Box>

          {/* Output Item */}
          <FormControl fullWidth error={!!errors.outputItemId} required>
            <InputLabel id="output-item-label">{t('minMaxSelectorMemory.outputItem')}</InputLabel>
            <Select
              labelId="output-item-label"
              value={formData.outputItemId}
              onChange={(e) => handleChange('outputItemId', e.target.value as string)}
              label={t('minMaxSelectorMemory.outputItem')}
              data-id-ref="minmax-selector-memory-output-select"
            >
              <MenuItem value="">
                <em>{t('common.selectItem')}</em>
              </MenuItem>
              {analogItems
                .filter((item) => !formData.inputItemIds.includes(item.id))
                .map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {language === 'fa' ? item.nameFa : item.name}
                  </MenuItem>
                ))}
            </Select>
            {errors.outputItemId && <FormHelperText>{errors.outputItemId}</FormHelperText>}
          </FormControl>

          {/* Selected Index Output Item (Optional) */}
          <FormControl fullWidth error={!!errors.selectedIndexOutputItemId}>
            <InputLabel id="index-output-item-label">
              {t('minMaxSelectorMemory.selectedIndexOutputItem')}
            </InputLabel>
            <Select
              labelId="index-output-item-label"
              value={formData.selectedIndexOutputItemId}
              onChange={(e) => handleChange('selectedIndexOutputItemId', e.target.value as string)}
              label={t('minMaxSelectorMemory.selectedIndexOutputItem')}
              data-id-ref="minmax-selector-memory-index-output-select"
            >
              <MenuItem value="">
                <em>{t('common.none')}</em>
              </MenuItem>
              {analogItems
                .filter(
                  (item) =>
                    !formData.inputItemIds.includes(item.id) && item.id !== formData.outputItemId
                )
                .map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {language === 'fa' ? item.nameFa : item.name}
                  </MenuItem>
                ))}
            </Select>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FormHelperText error={!!errors.selectedIndexOutputItemId}>
                {errors.selectedIndexOutputItemId || t('minMaxSelectorMemory.selectedIndexOutputItemHelp')}
              </FormHelperText>
              <IconButton
                size="small"
                onClick={(e) => handleHelpOpen(e, 'selectedIndexOutput')}
                data-id-ref="minmax-selector-memory-index-output-help-btn"
              >
                <HelpOutlineIcon fontSize="small" color="action" />
              </IconButton>
            </Box>
          </FormControl>

          {/* Interval */}
          <TextField
            fullWidth
            type="number"
            label={t('minMaxSelectorMemory.interval')}
            value={formData.interval}
            onChange={(e) => handleChange('interval', parseInt(e.target.value, 10) || 1)}
            error={!!errors.interval}
            helperText={errors.interval || t('minMaxSelectorMemory.intervalHelp')}
            inputProps={{ min: 1, max: 86400 }}
            required
            data-id-ref="minmax-selector-memory-interval-input"
          />

          {/* Duration */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <TextField
              fullWidth
              type="number"
              label={t('minMaxSelectorMemory.duration')}
              value={formData.duration}
              onChange={(e) => handleChange('duration', Math.max(0, parseInt(e.target.value, 10) || 0))}
              error={!!errors.duration}
              helperText={errors.duration || t('minMaxSelectorMemory.durationHelp')}
              inputProps={{ min: 0 }}
              data-id-ref="minmax-selector-memory-duration-input"
            />
            <IconButton
              size="small"
              onClick={(e) => handleHelpOpen(e, 'duration')}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref="minmax-selector-memory-duration-help-btn"
            >
              <HelpOutlineIcon fontSize="small" color="action" />
            </IconButton>
          </Box>

          {/* Disabled Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDisabled}
                onChange={(e) => handleChange('isDisabled', e.target.checked)}
                data-id-ref="minmax-selector-memory-disabled-switch"
              />
            }
            label={t('minMaxSelectorMemory.disabled')}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }} data-id-ref="minmax-selector-memory-dialog-actions">
        <Button onClick={() => onClose(false)} disabled={submitting} data-id-ref="minmax-selector-memory-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
          data-id-ref="minmax-selector-memory-save-btn"
        >
          {submitting ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>

      {/* Field Help Popover */}
      <FieldHelpPopover
        anchorEl={helpAnchor.element}
        open={Boolean(helpAnchor.element)}
        onClose={handleHelpClose}
        fieldKey={`minMaxSelectorMemory.help.${helpAnchor.field}`}
      />
    </Dialog>
  );
};

export default AddEditMinMaxSelectorMemoryDialog;
