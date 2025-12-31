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
  FormHelperText,
  Tooltip,
  Paper,
  Stack,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addComparisonMemory, editComparisonMemory } from '../services/extendedApi';
import type { ComparisonMemory, ComparisonGroup, MonitoringItem, ItemType, CompareType } from '../types/api';
import { ItemTypeEnum, GroupOperator, ComparisonMode, CompareTypeEnum } from '../types/api';
import FieldHelpPopover from './common/FieldHelpPopover';

interface AddEditComparisonMemoryDialogProps {
  open: boolean;
  editMode: boolean;
  comparisonMemory: ComparisonMemory | null;
  onClose: (shouldRefresh: boolean) => void;
}

interface ComparisonGroupForm {
  id: string;
  inputItemIds: string[];
  requiredVotes: number;
  comparisonMode: number; // 1 = Analog, 2 = Digital
  compareType: number; // 1-5
  threshold1: number | null;
  threshold2: number | null;
  thresholdHysteresis: number;
  votingHysteresis: number;
  digitalValue: string;
  name: string;
}

interface FormData {
  name: string;
  comparisonGroups: ComparisonGroupForm[];
  groupOperator: number;
  outputItemId: string;
  interval: number;
  duration: number;
  isDisabled: boolean;
  invertOutput: boolean;
}

interface FormErrors {
  name?: string;
  outputItemId?: string;
  interval?: string;
  duration?: string;
  comparisonGroups?: string;
  groups?: { [key: number]: { [field: string]: string } };
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get ItemType color for badge
 */
const getItemTypeColor = (itemType: ItemType): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return 'info';
    case ItemTypeEnum.DigitalOutput:
      return 'success';
    case ItemTypeEnum.AnalogInput:
      return 'primary';
    case ItemTypeEnum.AnalogOutput:
      return 'secondary';
    default:
      return 'default';
  }
};

/**
 * Get ItemType label
 */
const getItemTypeLabel = (itemType: ItemType, t: (key: string) => string): string => {
  switch (itemType) {
    case ItemTypeEnum.DigitalInput:
      return t('itemType.digitalInput');
    case ItemTypeEnum.DigitalOutput:
      return t('itemType.digitalOutput');
    case ItemTypeEnum.AnalogInput:
      return t('itemType.analogInput');
    case ItemTypeEnum.AnalogOutput:
      return t('itemType.analogOutput');
    default:
      return String(itemType);
  }
};

const AddEditComparisonMemoryDialog: React.FC<AddEditComparisonMemoryDialogProps> = ({
  open,
  editMode,
  comparisonMemory,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const items = state.items;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    comparisonGroups: [],
    groupOperator: GroupOperator.And,
    outputItemId: '',
    interval: 1,
    duration: 10,
    isDisabled: false,
    invertOutput: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Filter items by type
  const digitalOutputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.DigitalOutput),
    [items]
  );

  const analogItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogInput || item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

  const digitalItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.DigitalInput || item.itemType === ItemTypeEnum.DigitalOutput),
    [items]
  );

  // Get item label
  const getItemLabel = useCallback((item: MonitoringItem) => {
    return `${item.pointNumber} - ${language === 'fa' ? item.nameFa : item.name}`;
  }, [language]);

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (editMode && comparisonMemory) {
        let groups: ComparisonGroupForm[] = [];
        try {
          const parsed = JSON.parse(comparisonMemory.comparisonGroups) as ComparisonGroup[];
          groups = parsed.map((g) => ({
            id: g.id || generateTempId(),
            inputItemIds: g.inputItemIds || [],
            requiredVotes: g.requiredVotes || 1,
            comparisonMode: g.comparisonMode || ComparisonMode.Digital,
            compareType: g.compareType || CompareTypeEnum.Equal,
            threshold1: g.threshold1 ?? null,
            threshold2: g.threshold2 ?? null,
            thresholdHysteresis: g.thresholdHysteresis || 0,
            votingHysteresis: g.votingHysteresis || 0,
            digitalValue: g.digitalValue || '1',
            name: g.name || '',
          }));
        } catch {
          groups = [];
        }

        setFormData({
          name: comparisonMemory.name || '',
          comparisonGroups: groups,
          groupOperator: comparisonMemory.groupOperator || GroupOperator.And,
          outputItemId: comparisonMemory.outputItemId,
          interval: comparisonMemory.interval,
          duration: comparisonMemory.duration ?? 10,
          isDisabled: comparisonMemory.isDisabled,
          invertOutput: comparisonMemory.invertOutput,
        });
      } else {
        // Reset to defaults for add mode
        setFormData({
          name: '',
          comparisonGroups: [],
          groupOperator: GroupOperator.And,
          outputItemId: '',
          interval: 1,
          duration: 10,
          isDisabled: false,
          invertOutput: false,
        });
      }
      setFormErrors({});
      setError(null);
    }
  }, [open, editMode, comparisonMemory]);

  // Add new group
  const handleAddGroup = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      comparisonGroups: [
        ...prev.comparisonGroups,
        {
          id: generateTempId(),
          inputItemIds: [],
          requiredVotes: 1,
          comparisonMode: ComparisonMode.Digital,
          compareType: CompareTypeEnum.Equal,
          threshold1: null,
          threshold2: null,
          thresholdHysteresis: 0,
          votingHysteresis: 0,
          digitalValue: '1',
          name: '',
        },
      ],
    }));
  }, []);

  // Remove group
  const handleRemoveGroup = useCallback((groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      comparisonGroups: prev.comparisonGroups.filter((g) => g.id !== groupId),
    }));
  }, []);

  // Update group field
  const handleGroupChange = useCallback((groupId: string, field: keyof ComparisonGroupForm, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      comparisonGroups: prev.comparisonGroups.map((g) =>
        g.id === groupId ? { ...g, [field]: value } : g
      ),
    }));
  }, []);

  // Update group input items
  const handleGroupInputsChange = useCallback((groupId: string, newItems: MonitoringItem[]) => {
    const newIds = newItems.map((item) => item.id);
    setFormData((prev) => ({
      ...prev,
      comparisonGroups: prev.comparisonGroups.map((g) => {
        if (g.id === groupId) {
          // Adjust requiredVotes if it exceeds the new count
          const newRequiredVotes = Math.min(g.requiredVotes, Math.max(1, newIds.length));
          return { ...g, inputItemIds: newIds, requiredVotes: newIds.length > 0 ? newRequiredVotes : 1 };
        }
        return g;
      }),
    }));
  }, []);

  // Validation
  const validate = (): boolean => {
    const errors: FormErrors = { groups: {} };

    if (!formData.outputItemId) {
      errors.outputItemId = t('comparisonMemory.validation.outputItemRequired');
    }

    if (formData.interval <= 0) {
      errors.interval = t('comparisonMemory.validation.intervalPositive');
    }

    if (formData.duration < 0) {
      errors.duration = t('comparisonMemory.validation.durationInvalid');
    }

    if (formData.comparisonGroups.length === 0) {
      errors.comparisonGroups = t('comparisonMemory.validation.atLeastOneGroup');
    }

    // Validate each group
    formData.comparisonGroups.forEach((group, index) => {
      const groupErrors: { [field: string]: string } = {};

      if (group.inputItemIds.length === 0) {
        groupErrors.inputItemIds = t('comparisonMemory.validation.inputItemsRequired');
      }

      if (group.requiredVotes < 1) {
        groupErrors.requiredVotes = t('comparisonMemory.validation.requiredVotesMinimum');
      }

      if (group.requiredVotes > group.inputItemIds.length && group.inputItemIds.length > 0) {
        groupErrors.requiredVotes = t('comparisonMemory.validation.requiredVotesExceedsInputs', {
          required: group.requiredVotes,
          available: group.inputItemIds.length,
        });
      }

      if (group.comparisonMode === ComparisonMode.Analog) {
        if (group.threshold1 === null) {
          groupErrors.threshold1 = t('comparisonMemory.validation.threshold1Required');
        }
        if (group.compareType === CompareTypeEnum.Between && group.threshold2 === null) {
          groupErrors.threshold2 = t('comparisonMemory.validation.threshold2Required');
        }
        if (group.thresholdHysteresis < 0) {
          groupErrors.thresholdHysteresis = t('comparisonMemory.validation.hysteresisNonNegative');
        }
      }

      if (group.comparisonMode === ComparisonMode.Digital) {
        if (group.digitalValue !== '0' && group.digitalValue !== '1') {
          groupErrors.digitalValue = t('comparisonMemory.validation.digitalValueInvalid');
        }
      }

      if (group.votingHysteresis < 0) {
        groupErrors.votingHysteresis = t('comparisonMemory.validation.hysteresisNonNegative');
      }

      // Check voting hysteresis doesn't make condition impossible
      if (group.votingHysteresis > 0 && group.inputItemIds.length > 0) {
        const minVotesToTurnOn = group.requiredVotes + group.votingHysteresis;
        if (minVotesToTurnOn > group.inputItemIds.length) {
          groupErrors.votingHysteresis = t('comparisonMemory.validation.votingHysteresisTooHigh', {
            required: minVotesToTurnOn,
            available: group.inputItemIds.length,
          });
        }
      }

      if (Object.keys(groupErrors).length > 0) {
        errors.groups![index] = groupErrors;
      }
    });

    // Clean up empty nested errors
    if (Object.keys(errors.groups || {}).length === 0) {
      delete errors.groups;
    }

    setFormErrors(errors);
    return Object.keys(errors).filter(k => k !== 'groups' || Object.keys(errors.groups || {}).length > 0).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      // Convert form groups to API format
      const groups: ComparisonGroup[] = formData.comparisonGroups.map((g) => ({
        id: g.id,
        inputItemIds: g.inputItemIds,
        requiredVotes: g.requiredVotes,
        comparisonMode: g.comparisonMode as typeof ComparisonMode[keyof typeof ComparisonMode],
        compareType: g.compareType as CompareType,
        threshold1: g.comparisonMode === ComparisonMode.Analog ? g.threshold1 : null,
        threshold2: g.comparisonMode === ComparisonMode.Analog && g.compareType === CompareTypeEnum.Between ? g.threshold2 : null,
        thresholdHysteresis: g.comparisonMode === ComparisonMode.Analog ? g.thresholdHysteresis : 0,
        votingHysteresis: g.votingHysteresis,
        digitalValue: g.comparisonMode === ComparisonMode.Digital ? g.digitalValue : null,
        name: g.name || null,
      }));

      const payload = {
        name: formData.name || null,
        comparisonGroups: JSON.stringify(groups),
        groupOperator: formData.groupOperator as typeof GroupOperator[keyof typeof GroupOperator],
        outputItemId: formData.outputItemId,
        interval: formData.interval,
        duration: formData.duration,
        isDisabled: formData.isDisabled,
        invertOutput: formData.invertOutput,
      };

      const response = editMode && comparisonMemory
        ? await editComparisonMemory({ ...payload, id: comparisonMemory.id })
        : await addComparisonMemory(payload);

      if (response.isSuccessful) {
        onClose(true);
      } else {
        setError(response.errorMessage || t('comparisonMemory.errors.saveFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to save comparison memory:', err);
      setError(t('comparisonMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Get compare type label
  const getCompareTypeLabel = (compareType: number): string => {
    switch (compareType) {
      case CompareTypeEnum.Equal:
        return t('comparisonMemory.compareType.equal');
      case CompareTypeEnum.NotEqual:
        return t('comparisonMemory.compareType.notEqual');
      case CompareTypeEnum.Higher:
        return t('comparisonMemory.compareType.higher');
      case CompareTypeEnum.Lower:
        return t('comparisonMemory.compareType.lower');
      case CompareTypeEnum.Between:
        return t('comparisonMemory.compareType.between');
      default:
        return String(compareType);
    }
  };

  // Get group operator label
  const getGroupOperatorLabel = (op: number): string => {
    switch (op) {
      case GroupOperator.And:
        return t('comparisonMemory.groupOperator.and');
      case GroupOperator.Or:
        return t('comparisonMemory.groupOperator.or');
      case GroupOperator.Xor:
        return t('comparisonMemory.groupOperator.xor');
      default:
        return String(op);
    }
  };

  // Render a single comparison group
  const renderGroup = (group: ComparisonGroupForm, index: number) => {
    const groupErrors = formErrors.groups?.[index] || {};
    const isAnalog = group.comparisonMode === ComparisonMode.Analog;
    const inputItemsForMode = isAnalog ? analogItems : digitalItems;
    const selectedInputItems = inputItemsForMode.filter((item) => group.inputItemIds.includes(item.id));

    return (
      <Paper
        key={group.id}
        elevation={1}
        sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}
        data-id-ref={`comparison-memory-group-${index}`}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {group.name || t('comparisonMemory.groupLabel', { index: index + 1 })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={isAnalog ? t('comparisonMemory.mode.analog') : t('comparisonMemory.mode.digital')}
              color={isAnalog ? 'primary' : 'secondary'}
              size="small"
            />
            <Chip
              label={`${group.requiredVotes}/${group.inputItemIds.length}`}
              color="default"
              size="small"
              title={t('comparisonMemory.nOutOfM', { n: group.requiredVotes, m: group.inputItemIds.length })}
            />
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveGroup(group.id)}
                data-id-ref={`comparison-memory-group-${index}-delete-btn`}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Stack spacing={2}>
          {/* Group Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label={t('comparisonMemory.groupName')}
              value={group.name}
              onChange={(e) => handleGroupChange(group.id, 'name', e.target.value)}
              fullWidth
              size="small"
              data-id-ref={`comparison-memory-group-${index}-name-input`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(`comparisonMemory.help.groupName`)}
              sx={{ p: 0.25 }}
              data-id-ref={`comparison-memory-group-${index}-name-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Comparison Mode Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isAnalog}
                  onChange={(e) => {
                    const newMode = e.target.checked ? ComparisonMode.Analog : ComparisonMode.Digital;
                    handleGroupChange(group.id, 'comparisonMode', newMode);
                    // Clear inputs when mode changes
                    handleGroupChange(group.id, 'inputItemIds', []);
                  }}
                  data-id-ref={`comparison-memory-group-${index}-mode-toggle`}
                />
              }
              label={isAnalog ? t('comparisonMemory.mode.analog') : t('comparisonMemory.mode.digital')}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(`comparisonMemory.help.comparisonMode`)}
              sx={{ p: 0.25 }}
              data-id-ref={`comparison-memory-group-${index}-mode-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Input Items */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Autocomplete
              multiple
              options={inputItemsForMode}
              getOptionLabel={getItemLabel}
              value={selectedInputItems}
              onChange={(_, value) => handleGroupInputsChange(group.id, value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('comparisonMemory.inputItems')}
                  error={!!groupErrors.inputItemIds}
                  helperText={groupErrors.inputItemIds}
                  size="small"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, i) => (
                  <Chip
                    label={getItemLabel(option)}
                    {...getTagProps({ index: i })}
                    size="small"
                    key={option.id}
                  />
                ))
              }
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
              fullWidth
              data-id-ref={`comparison-memory-group-${index}-inputs-select`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(`comparisonMemory.help.inputItems`)}
              sx={{ p: 0.25, mt: 1 }}
              data-id-ref={`comparison-memory-group-${index}-inputs-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          {/* Required Votes (N-out-of-M) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label={t('comparisonMemory.requiredVotes')}
              type="number"
              value={group.requiredVotes}
              onChange={(e) => handleGroupChange(group.id, 'requiredVotes', Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              size="small"
              error={!!groupErrors.requiredVotes}
              helperText={groupErrors.requiredVotes || t('comparisonMemory.requiredVotesHelp', { max: group.inputItemIds.length || 1 })}
              InputProps={{
                inputProps: { min: 1, max: Math.max(1, group.inputItemIds.length) },
              }}
              data-id-ref={`comparison-memory-group-${index}-required-votes-input`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(`comparisonMemory.help.requiredVotes`)}
              sx={{ p: 0.25 }}
              data-id-ref={`comparison-memory-group-${index}-required-votes-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>

          <Divider />

          {/* Comparison Settings - Conditional based on mode */}
          {isAnalog ? (
            <>
              {/* Compare Type */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FormControl fullWidth size="small" error={!!groupErrors.compareType}>
                  <InputLabel>{t('comparisonMemory.compareType.label')}</InputLabel>
                  <Select
                    value={group.compareType}
                    onChange={(e) => handleGroupChange(group.id, 'compareType', e.target.value as number)}
                    label={t('comparisonMemory.compareType.label')}
                    data-id-ref={`comparison-memory-group-${index}-compare-type-select`}
                  >
                    <MenuItem value={CompareTypeEnum.Equal}>{getCompareTypeLabel(CompareTypeEnum.Equal)}</MenuItem>
                    <MenuItem value={CompareTypeEnum.NotEqual}>{getCompareTypeLabel(CompareTypeEnum.NotEqual)}</MenuItem>
                    <MenuItem value={CompareTypeEnum.Higher}>{getCompareTypeLabel(CompareTypeEnum.Higher)}</MenuItem>
                    <MenuItem value={CompareTypeEnum.Lower}>{getCompareTypeLabel(CompareTypeEnum.Lower)}</MenuItem>
                    <MenuItem value={CompareTypeEnum.Between}>{getCompareTypeLabel(CompareTypeEnum.Between)}</MenuItem>
                  </Select>
                  {groupErrors.compareType && <FormHelperText>{groupErrors.compareType}</FormHelperText>}
                </FormControl>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen(`comparisonMemory.help.compareType`)}
                  sx={{ p: 0.25 }}
                  data-id-ref={`comparison-memory-group-${index}-compare-type-help-btn`}
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              {/* Threshold 1 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  label={t('comparisonMemory.threshold1')}
                  type="number"
                  value={group.threshold1 ?? ''}
                  onChange={(e) => handleGroupChange(group.id, 'threshold1', e.target.value ? parseFloat(e.target.value) : null)}
                  fullWidth
                  size="small"
                  error={!!groupErrors.threshold1}
                  helperText={groupErrors.threshold1}
                  data-id-ref={`comparison-memory-group-${index}-threshold1-input`}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen(`comparisonMemory.help.threshold1`)}
                  sx={{ p: 0.25 }}
                  data-id-ref={`comparison-memory-group-${index}-threshold1-help-btn`}
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              {/* Threshold 2 (only for Between) */}
              {group.compareType === CompareTypeEnum.Between && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('comparisonMemory.threshold2')}
                    type="number"
                    value={group.threshold2 ?? ''}
                    onChange={(e) => handleGroupChange(group.id, 'threshold2', e.target.value ? parseFloat(e.target.value) : null)}
                    fullWidth
                    size="small"
                    error={!!groupErrors.threshold2}
                    helperText={groupErrors.threshold2}
                    data-id-ref={`comparison-memory-group-${index}-threshold2-input`}
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen(`comparisonMemory.help.threshold2`)}
                    sx={{ p: 0.25 }}
                    data-id-ref={`comparison-memory-group-${index}-threshold2-help-btn`}
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              )}

              {/* Threshold Hysteresis */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  label={t('comparisonMemory.thresholdHysteresis')}
                  type="number"
                  value={group.thresholdHysteresis}
                  onChange={(e) => handleGroupChange(group.id, 'thresholdHysteresis', Math.max(0, parseFloat(e.target.value) || 0))}
                  fullWidth
                  size="small"
                  error={!!groupErrors.thresholdHysteresis}
                  helperText={groupErrors.thresholdHysteresis || t('comparisonMemory.thresholdHysteresisHelp')}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  data-id-ref={`comparison-memory-group-${index}-threshold-hysteresis-input`}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen(`comparisonMemory.help.thresholdHysteresis`)}
                  sx={{ p: 0.25 }}
                  data-id-ref={`comparison-memory-group-${index}-threshold-hysteresis-help-btn`}
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            </>
          ) : (
            /* Digital Mode */
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FormControl fullWidth size="small" error={!!groupErrors.digitalValue}>
                <InputLabel>{t('comparisonMemory.digitalValue')}</InputLabel>
                <Select
                  value={group.digitalValue}
                  onChange={(e) => handleGroupChange(group.id, 'digitalValue', e.target.value)}
                  label={t('comparisonMemory.digitalValue')}
                  data-id-ref={`comparison-memory-group-${index}-digital-value-select`}
                >
                  <MenuItem value="1">{t('comparisonMemory.digitalValue.on')}</MenuItem>
                  <MenuItem value="0">{t('comparisonMemory.digitalValue.off')}</MenuItem>
                </Select>
                {groupErrors.digitalValue && <FormHelperText>{groupErrors.digitalValue}</FormHelperText>}
              </FormControl>
              <IconButton
                size="small"
                onClick={handleHelpOpen(`comparisonMemory.help.digitalValue`)}
                sx={{ p: 0.25 }}
                data-id-ref={`comparison-memory-group-${index}-digital-value-help-btn`}
              >
                <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
              </IconButton>
            </Box>
          )}

          {/* Voting Hysteresis (common to both modes) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label={t('comparisonMemory.votingHysteresis')}
              type="number"
              value={group.votingHysteresis}
              onChange={(e) => handleGroupChange(group.id, 'votingHysteresis', Math.max(0, parseInt(e.target.value) || 0))}
              fullWidth
              size="small"
              error={!!groupErrors.votingHysteresis}
              helperText={groupErrors.votingHysteresis || t('comparisonMemory.votingHysteresisHelp')}
              InputProps={{ inputProps: { min: 0, step: 1 } }}
              data-id-ref={`comparison-memory-group-${index}-voting-hysteresis-input`}
            />
            <IconButton
              size="small"
              onClick={handleHelpOpen(`comparisonMemory.help.votingHysteresis`)}
              sx={{ p: 0.25 }}
              data-id-ref={`comparison-memory-group-${index}-voting-hysteresis-help-btn`}
            >
              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </IconButton>
          </Box>
        </Stack>
      </Paper>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose(false)}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-comparison-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-comparison-memory-dialog-title">
        {editMode ? t('comparisonMemory.editTitle') : t('comparisonMemory.addTitle')}
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-comparison-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Basic Configuration Section */}
        <Card sx={{ mb: 2, mt: 1 }} data-id-ref="comparison-memory-basic-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('comparisonMemory.sections.basic')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('comparisonMemory.help.basicConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="comparison-memory-basic-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton onClick={() => setBasicExpanded(!basicExpanded)}>
                <ExpandMoreIcon sx={{ transform: basicExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
              </IconButton>
            }
          />
          <Collapse in={basicExpanded}>
            <CardContent>
              <Stack spacing={2}>
                {/* Name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('comparisonMemory.name')}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    fullWidth
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    data-id-ref="comparison-memory-name-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.name')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-name-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Output Item */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    options={digitalOutputItems}
                    getOptionLabel={getItemLabel}
                    value={digitalOutputItems.find((item) => item.id === formData.outputItemId) || null}
                    onChange={(_, value) => setFormData((prev) => ({ ...prev, outputItemId: value?.id || '' }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('comparisonMemory.outputItem')}
                        error={!!formErrors.outputItemId}
                        helperText={formErrors.outputItemId || t('comparisonMemory.outputItemHelp')}
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
                    fullWidth
                    data-id-ref="comparison-memory-output-item-select"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.outputItem')}
                    sx={{ p: 0.25, mt: 2 }}
                    data-id-ref="comparison-memory-output-item-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Group Operator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('comparisonMemory.groupOperator')}</InputLabel>
                    <Select
                      value={formData.groupOperator}
                      onChange={(e) => setFormData((prev) => ({ ...prev, groupOperator: e.target.value as number }))}
                      label={t('comparisonMemory.groupOperator')}
                      data-id-ref="comparison-memory-group-operator-select"
                    >
                      <MenuItem value={GroupOperator.And}>{getGroupOperatorLabel(GroupOperator.And)}</MenuItem>
                      <MenuItem value={GroupOperator.Or}>{getGroupOperatorLabel(GroupOperator.Or)}</MenuItem>
                      <MenuItem value={GroupOperator.Xor}>{getGroupOperatorLabel(GroupOperator.Xor)}</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.groupOperator')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-group-operator-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Interval */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('comparisonMemory.interval')}
                    type="number"
                    value={formData.interval}
                    onChange={(e) => setFormData((prev) => ({ ...prev, interval: Math.max(1, parseInt(e.target.value) || 1) }))}
                    fullWidth
                    error={!!formErrors.interval}
                    helperText={formErrors.interval || t('comparisonMemory.intervalHelp')}
                    InputProps={{ inputProps: { min: 1 } }}
                    data-id-ref="comparison-memory-interval-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.interval')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-interval-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Duration */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TextField
                    label={t('comparisonMemory.duration')}
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: Math.max(0, parseInt(e.target.value) || 0) }))}
                    fullWidth
                    error={!!formErrors.duration}
                    helperText={formErrors.duration || t('comparisonMemory.durationHelp')}
                    InputProps={{ inputProps: { min: 0 } }}
                    data-id-ref="comparison-memory-duration-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.duration')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-duration-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        {/* Comparison Groups Section */}
        <Card sx={{ mb: 2 }} data-id-ref="comparison-memory-groups-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('comparisonMemory.sections.groups')}</Typography>
                <Chip label={formData.comparisonGroups.length} size="small" color="primary" />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('comparisonMemory.help.comparisonGroups')}
                  sx={{ p: 0.25 }}
                  data-id-ref="comparison-memory-groups-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddGroup}
                  size="small"
                  variant="outlined"
                  data-id-ref="comparison-memory-add-group-btn"
                >
                  {t('comparisonMemory.addGroup')}
                </Button>
                <IconButton onClick={() => setGroupsExpanded(!groupsExpanded)}>
                  <ExpandMoreIcon sx={{ transform: groupsExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
                </IconButton>
              </Box>
            }
          />
          <Collapse in={groupsExpanded}>
            <CardContent>
              {formErrors.comparisonGroups && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formErrors.comparisonGroups}
                </Alert>
              )}

              {formData.comparisonGroups.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  {t('comparisonMemory.noGroups')}
                </Typography>
              ) : (
                formData.comparisonGroups.map((group, index) => renderGroup(group, index))
              )}
            </CardContent>
          </Collapse>
        </Card>

        {/* Advanced Settings Section */}
        <Card data-id-ref="comparison-memory-advanced-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('comparisonMemory.sections.advanced')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('comparisonMemory.help.advancedSettings')}
                  sx={{ p: 0.25 }}
                  data-id-ref="comparison-memory-advanced-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton onClick={() => setAdvancedExpanded(!advancedExpanded)}>
                <ExpandMoreIcon sx={{ transform: advancedExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
              </IconButton>
            }
          />
          <Collapse in={advancedExpanded}>
            <CardContent>
              <Stack spacing={2}>
                {/* Invert Output */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.invertOutput}
                        onChange={(e) => setFormData((prev) => ({ ...prev, invertOutput: e.target.checked }))}
                        data-id-ref="comparison-memory-invert-output-toggle"
                      />
                    }
                    label={t('comparisonMemory.invertOutput')}
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.invertOutput')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-invert-output-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Is Disabled */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isDisabled}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isDisabled: e.target.checked }))}
                        data-id-ref="comparison-memory-is-disabled-toggle"
                      />
                    }
                    label={t('comparisonMemory.isDisabled')}
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('comparisonMemory.help.isDisabled')}
                    sx={{ p: 0.25 }}
                    data-id-ref="comparison-memory-is-disabled-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        {/* Help Popovers */}
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.basicConfiguration']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.basicConfiguration'])}
          onClose={handleHelpClose('comparisonMemory.help.basicConfiguration')}
          fieldKey="comparisonMemory.help.basicConfiguration"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.name']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.name'])}
          onClose={handleHelpClose('comparisonMemory.help.name')}
          fieldKey="comparisonMemory.help.name"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.outputItem']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.outputItem'])}
          onClose={handleHelpClose('comparisonMemory.help.outputItem')}
          fieldKey="comparisonMemory.help.outputItem"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.groupOperator']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.groupOperator'])}
          onClose={handleHelpClose('comparisonMemory.help.groupOperator')}
          fieldKey="comparisonMemory.help.groupOperator"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.interval']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.interval'])}
          onClose={handleHelpClose('comparisonMemory.help.interval')}
          fieldKey="comparisonMemory.help.interval"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.comparisonGroups']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.comparisonGroups'])}
          onClose={handleHelpClose('comparisonMemory.help.comparisonGroups')}
          fieldKey="comparisonMemory.help.comparisonGroups"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.groupName']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.groupName'])}
          onClose={handleHelpClose('comparisonMemory.help.groupName')}
          fieldKey="comparisonMemory.help.groupName"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.comparisonMode']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.comparisonMode'])}
          onClose={handleHelpClose('comparisonMemory.help.comparisonMode')}
          fieldKey="comparisonMemory.help.comparisonMode"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.inputItems']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.inputItems'])}
          onClose={handleHelpClose('comparisonMemory.help.inputItems')}
          fieldKey="comparisonMemory.help.inputItems"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.requiredVotes']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.requiredVotes'])}
          onClose={handleHelpClose('comparisonMemory.help.requiredVotes')}
          fieldKey="comparisonMemory.help.requiredVotes"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.compareType']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.compareType'])}
          onClose={handleHelpClose('comparisonMemory.help.compareType')}
          fieldKey="comparisonMemory.help.compareType"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.threshold1']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.threshold1'])}
          onClose={handleHelpClose('comparisonMemory.help.threshold1')}
          fieldKey="comparisonMemory.help.threshold1"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.threshold2']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.threshold2'])}
          onClose={handleHelpClose('comparisonMemory.help.threshold2')}
          fieldKey="comparisonMemory.help.threshold2"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.thresholdHysteresis']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.thresholdHysteresis'])}
          onClose={handleHelpClose('comparisonMemory.help.thresholdHysteresis')}
          fieldKey="comparisonMemory.help.thresholdHysteresis"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.digitalValue']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.digitalValue'])}
          onClose={handleHelpClose('comparisonMemory.help.digitalValue')}
          fieldKey="comparisonMemory.help.digitalValue"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.votingHysteresis']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.votingHysteresis'])}
          onClose={handleHelpClose('comparisonMemory.help.votingHysteresis')}
          fieldKey="comparisonMemory.help.votingHysteresis"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.advancedSettings']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.advancedSettings'])}
          onClose={handleHelpClose('comparisonMemory.help.advancedSettings')}
          fieldKey="comparisonMemory.help.advancedSettings"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.invertOutput']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.invertOutput'])}
          onClose={handleHelpClose('comparisonMemory.help.invertOutput')}
          fieldKey="comparisonMemory.help.invertOutput"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['comparisonMemory.help.isDisabled']}
          open={Boolean(helpAnchorEl['comparisonMemory.help.isDisabled'])}
          onClose={handleHelpClose('comparisonMemory.help.isDisabled')}
          fieldKey="comparisonMemory.help.isDisabled"
        />
      </DialogContent>

      <DialogActions data-id-ref="add-edit-comparison-memory-dialog-actions">
        <Button onClick={() => onClose(false)} disabled={loading} data-id-ref="comparison-memory-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          data-id-ref="comparison-memory-save-btn"
        >
          {loading ? <CircularProgress size={24} /> : editMode ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditComparisonMemoryDialog;
