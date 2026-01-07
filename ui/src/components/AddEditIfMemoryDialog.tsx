import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  IconButton,
  Autocomplete,
  Chip,
  Paper,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  AccountTree as BranchIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addIfMemory, editIfMemory, testIfCondition, getGlobalVariables } from '../services/extendedApi';
import type { IfMemory, MonitoringItem, VariableAlias, GlobalVariable } from '../types/api';
import { ItemTypeEnum, IfMemoryOutputType, TimeoutSourceType } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditIfMemoryDialog');

// Maximum branches allowed
const MAX_BRANCHES = 20;

interface AddEditIfMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ifMemory: IfMemory | null;
  editMode: boolean;
}

interface VariableMapping {
  alias: string;
  itemId: string;
  itemName?: string;
}

interface BranchForm {
  id: string;
  order: number;
  condition: string;
  outputValue: number;
  hysteresis: number;
  name: string;
}

interface FormData {
  name: string;
  branches: BranchForm[];
  defaultValue: number;
  variableMappings: VariableMapping[];
  outputDestinationType: number;
  outputReference: string;
  outputItemId?: string | null;
  outputType: number;
  interval: number;
  isDisabled: boolean;
  description: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

interface TestResult {
  branchId: string;
  isValid: boolean;
  result?: boolean;
  errorMessage?: string;
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Parse branches JSON string to BranchForm array
 */
const parseBranches = (branchesJson: string): BranchForm[] => {
  try {
    const parsed = JSON.parse(branchesJson || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed.map((b, index) => ({
      id: b.id || generateTempId(),
      order: b.order ?? index,
      condition: b.condition || '',
      outputValue: b.outputValue ?? 1,
      hysteresis: b.hysteresis ?? 0,
      name: b.name || '',
    }));
  } catch {
    return [];
  }
};

/**
 * Parse variable aliases JSON string to VariableMapping array
 */
const parseVariableAliases = (variableAliasesJson: string): VariableMapping[] => {
  try {
    const parsed = JSON.parse(variableAliasesJson || '{}');
    if (typeof parsed !== 'object') return [];

    return Object.entries(parsed).map(([alias, itemId]) => ({
      alias,
      itemId: itemId as string,
    }));
  } catch {
    return [];
  }
};

/**
 * Convert BranchForm array to JSON string for API
 */
const branchesToJson = (branches: BranchForm[]): string => {
  const arr = branches.map((b, index) => ({
    id: b.id,
    order: index,
    condition: b.condition,
    outputValue: b.outputValue,
    hysteresis: b.hysteresis,
    name: b.name || undefined,
  }));
  return JSON.stringify(arr);
};

/**
 * Convert VariableMapping array to JSON string for API
 */
const variableMappingsToJson = (mappings: VariableMapping[]): string => {
  const obj: Record<string, string> = {};
  mappings.forEach((m) => {
    if (m.alias && m.itemId) {
      obj[m.alias] = m.itemId;
    }
  });
  return JSON.stringify(obj);
};

const AddEditIfMemoryDialog: React.FC<AddEditIfMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  ifMemory,
  editMode,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [variablesExpanded, setVariablesExpanded] = useState(true);
  const [branchesExpanded, setBranchesExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Help popover states
  const [helpAnchorEl, setHelpAnchorEl] = useState<Record<string, HTMLElement | null>>({});

  const handleHelpOpen = (fieldKey: string) => (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: event.currentTarget }));
  };

  const handleHelpClose = (fieldKey: string) => () => {
    setHelpAnchorEl((prev) => ({ ...prev, [fieldKey]: null }));
  };

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Test condition states
  const [testing, setTesting] = useState<string | null>(null); // branch ID being tested
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    branches: [],
    defaultValue: 0,
    variableMappings: [],
    outputItemId: '',
    outputType: IfMemoryOutputType.Digital,
    interval: 1,
    isDisabled: false,
    description: '',
  });

  // Initialize form data from IF memory in edit mode
  useEffect(() => {
    if (editMode && ifMemory) {
      const branches = parseBranches(ifMemory.branches);
      const mappings = parseVariableAliases(ifMemory.variableAliases);

      setFormData({
        name: ifMemory.name || '',
        branches,
        defaultValue: ifMemory.defaultValue,
        variableMappings: mappings,
        outputItemId: ifMemory.outputItemId,
        outputType: ifMemory.outputType,
        interval: ifMemory.interval,
        isDisabled: ifMemory.isDisabled,
        description: ifMemory.description || '',
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        branches: [],
        defaultValue: 0,
        variableMappings: [],
        outputItemId: '',
        outputType: IfMemoryOutputType.Digital,
        interval: 1,
        isDisabled: false,
        description: '',
      });
    }
    setTestResults({});
    setError(null);
    setFormErrors({});
  }, [editMode, ifMemory, open]);

  // Filter items by type for inputs (all types can be used)
  const inputItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.itemType === ItemTypeEnum.AnalogInput ||
          item.itemType === ItemTypeEnum.AnalogOutput ||
          item.itemType === ItemTypeEnum.DigitalInput ||
          item.itemType === ItemTypeEnum.DigitalOutput
      ),
    [items]
  );

  // Filter items by type for output based on output type
  const outputItems = useMemo(() => {
    if (formData.outputType === IfMemoryOutputType.Digital) {
      return items.filter((item) => item.itemType === ItemTypeEnum.DigitalOutput);
    } else {
      return items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput);
    }
  }, [items, formData.outputType]);

  // Get selected output item
  const selectedOutputItem = useMemo(
    () => items.find((item) => item.id === formData.outputItemId),
    [items, formData.outputItemId]
  );

  // Helper to get item label
  const getItemLabel = useCallback(
    (item: MonitoringItem): string => {
      const name = language === 'fa' ? item.nameFa || item.name : item.name;
      return `${item.pointNumber} - ${name}`;
    },
    [language]
  );

  // Helper to get item type color
  const getItemTypeColor = (
    itemType: number
  ): 'primary' | 'secondary' | 'info' | 'success' => {
    switch (itemType) {
      case ItemTypeEnum.AnalogInput:
        return 'primary';
      case ItemTypeEnum.AnalogOutput:
        return 'secondary';
      case ItemTypeEnum.DigitalInput:
        return 'info';
      case ItemTypeEnum.DigitalOutput:
        return 'success';
      default:
        return 'primary';
    }
  };

  // Helper to get item type label
  const getItemTypeLabel = useCallback(
    (itemType: number): string => {
      switch (itemType) {
        case ItemTypeEnum.AnalogInput:
          return t('itemType.analogInput');
        case ItemTypeEnum.AnalogOutput:
          return t('itemType.analogOutput');
        case ItemTypeEnum.DigitalInput:
          return t('itemType.digitalInput');
        case ItemTypeEnum.DigitalOutput:
          return t('itemType.digitalOutput');
        default:
          return String(itemType);
      }
    },
    [t]
  );

  /**
   * Generate next auto alias (v1, v2, v3, ...)
   */
  const getNextAutoAlias = useCallback((): string => {
    const existingNumbers = formData.variableMappings
      .map((m) => {
        const match = m.alias.match(/^v(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `v${maxNumber + 1}`;
  }, [formData.variableMappings]);

  /**
   * Add new variable mapping
   */
  const handleAddVariable = useCallback(() => {
    const newAlias = getNextAutoAlias();
    setFormData((prev) => ({
      ...prev,
      variableMappings: [...prev.variableMappings, { alias: newAlias, itemId: '' }],
    }));
  }, [getNextAutoAlias]);

  /**
   * Remove variable mapping
   */
  const handleRemoveVariable = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      variableMappings: prev.variableMappings.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Update variable mapping
   */
  const handleVariableChange = useCallback(
    (index: number, field: 'alias' | 'itemId', value: string) => {
      setFormData((prev) => {
        const newMappings = [...prev.variableMappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        return { ...prev, variableMappings: newMappings };
      });
    },
    []
  );

  /**
   * Add new branch
   */
  const handleAddBranch = useCallback(() => {
    if (formData.branches.length >= MAX_BRANCHES) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          id: generateTempId(),
          order: prev.branches.length,
          condition: '',
          outputValue: formData.outputType === IfMemoryOutputType.Digital ? 1 : 0,
          hysteresis: 0,
          name: '',
        },
      ],
    }));
  }, [formData.branches.length, formData.outputType]);

  /**
   * Remove branch
   */
  const handleRemoveBranch = useCallback((branchId: string) => {
    setFormData((prev) => ({
      ...prev,
      branches: prev.branches.filter((b) => b.id !== branchId),
    }));
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[branchId];
      return newResults;
    });
  }, []);

  /**
   * Update branch field
   */
  const handleBranchChange = useCallback(
    (branchId: string, field: keyof BranchForm, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        branches: prev.branches.map((b) =>
          b.id === branchId ? { ...b, [field]: value } : b
        ),
      }));
      // Clear test result when condition changes
      if (field === 'condition') {
        setTestResults((prev) => {
          const newResults = { ...prev };
          delete newResults[branchId];
          return newResults;
        });
      }
    },
    []
  );

  /**
   * Move branch up
   */
  const handleMoveBranchUp = useCallback((index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const newBranches = [...prev.branches];
      [newBranches[index - 1], newBranches[index]] = [newBranches[index], newBranches[index - 1]];
      return { ...prev, branches: newBranches };
    });
  }, []);

  /**
   * Move branch down
   */
  const handleMoveBranchDown = useCallback((index: number) => {
    setFormData((prev) => {
      if (index >= prev.branches.length - 1) return prev;
      const newBranches = [...prev.branches];
      [newBranches[index], newBranches[index + 1]] = [newBranches[index + 1], newBranches[index]];
      return { ...prev, branches: newBranches };
    });
  }, []);

  const handleFieldChange = (
    field: keyof FormData,
    value: string | number | boolean | VariableMapping[] | BranchForm[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Clear output item when output type changes
    if (field === 'outputType') {
      setFormData((prev) => ({
        ...prev,
        outputItemId: '',
        outputType: value as number,
      }));
    }
  };

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.outputItemId) {
      errors.outputItemId = t('ifMemory.validation.outputItemRequired');
    }

    // Validate branches
    if (formData.branches.length === 0) {
      errors.branches = t('ifMemory.validation.atLeastOneBranch');
    }

    formData.branches.forEach((branch) => {
      if (!branch.condition.trim()) {
        errors[`branch_${branch.id}_condition`] = t('ifMemory.validation.conditionRequired');
      }
    });

    // Validate variable mappings
    const aliasSet = new Set<string>();
    formData.variableMappings.forEach((mapping, index) => {
      if (!mapping.alias.trim()) {
        errors[`variable_${index}_alias`] = t('ifMemory.validation.aliasRequired');
      } else if (aliasSet.has(mapping.alias)) {
        errors[`variable_${index}_alias`] = t('ifMemory.validation.duplicateAlias');
      } else {
        aliasSet.add(mapping.alias);
      }

      if (!mapping.itemId) {
        errors[`variable_${index}_item`] = t('ifMemory.validation.itemRequired');
      }
    });

    // Check that output item is not used as input
    if (formData.variableMappings.some((m) => m.itemId === formData.outputItemId)) {
      errors.outputItemId = t('ifMemory.validation.outputUsedAsInput');
    }

    if (formData.interval < 1) {
      errors.interval = t('ifMemory.validation.intervalMin');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Test a single branch condition
   */
  const handleTestCondition = async (branchId: string, condition: string) => {
    if (!condition.trim()) {
      setTestResults((prev) => ({
        ...prev,
        [branchId]: {
          branchId,
          isValid: false,
          errorMessage: t('ifMemory.validation.conditionRequired'),
        },
      }));
      return;
    }

    setTesting(branchId);

    try {
      // Convert variable mappings to the format expected by the API
      const variableAliases: VariableAlias[] = formData.variableMappings.map((m) => ({
        alias: m.alias,
        itemId: m.itemId,
      }));

      const response = await testIfCondition({
        condition,
        variableAliases,
      });

      setTestResults((prev) => ({
        ...prev,
        [branchId]: {
          branchId,
          isValid: response.isSuccessful,
          result: response.result ?? undefined,
          errorMessage: response.errorMessage ?? undefined,
        },
      }));

      if (response.isSuccessful) {
        logger.info('Condition test successful', { branchId, result: response.result });
      } else {
        logger.warn('Condition test failed', { branchId, error: response.errorMessage });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestResults((prev) => ({
        ...prev,
        [branchId]: {
          branchId,
          isValid: false,
          errorMessage,
        },
      }));
      logger.error('Failed to test condition', err);
    } finally {
      setTesting(null);
    }
  };

  /**
   * Save form data
   */
  const handleSave = async () => {
    if (!validate()) {
      setError(t('ifMemory.errors.validationFailed'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const branchesJson = branchesToJson(formData.branches);
      const variableAliasesJson = variableMappingsToJson(formData.variableMappings);

      if (editMode && ifMemory) {
        const response = await editIfMemory({
          id: ifMemory.id,
          name: formData.name || undefined,
          branches: branchesJson,
          defaultValue: formData.defaultValue,
          variableAliases: variableAliasesJson,
          outputItemId: formData.outputItemId,
          outputType: formData.outputType,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          description: formData.description || undefined,
        });

        if (response.isSuccessful) {
          logger.info('IF memory updated successfully');
          onSuccess();
          onClose();
        } else {
          setError(response.errorMessage || t('ifMemory.errors.updateFailed'));
          logger.error('Failed to update IF memory', response.errorMessage);
        }
      } else {
        const response = await addIfMemory({
          name: formData.name || undefined,
          branches: branchesJson,
          defaultValue: formData.defaultValue,
          variableAliases: variableAliasesJson,
          outputItemId: formData.outputItemId,
          outputType: formData.outputType,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          description: formData.description || undefined,
        });

        if (response.isSuccessful) {
          logger.info('IF memory created successfully', { id: response.id });
          onSuccess();
          onClose();
        } else {
          setError(response.errorMessage || t('ifMemory.errors.createFailed'));
          logger.error('Failed to create IF memory', response.errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to save IF memory', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-if-memory-dialog"
    >
      <DialogTitle data-id-ref="if-memory-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BranchIcon color="primary" />
          <Typography variant="h6">
            {editMode ? t('ifMemory.editTitle') : t('ifMemory.addTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers data-id-ref="if-memory-dialog-content">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-id-ref="if-memory-error-alert">
            {error}
          </Alert>
        )}

        {/* Basic Settings Section */}
        <Card sx={{ mb: 2 }} data-id-ref="if-memory-basic-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('ifMemory.sections.basic')}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('ifMemory.help.basicConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="if-memory-basic-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setBasicExpanded(!basicExpanded)}
                data-id-ref="if-memory-basic-expand-btn"
              >
                <ExpandMoreIcon
                  sx={{
                    transform: basicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                />
              </IconButton>
            }
            sx={{ py: 1 }}
          />
          <Collapse in={basicExpanded}>
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2}>
                {/* Name */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    fullWidth
                    label={t('ifMemory.fields.name')}
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    data-id-ref="if-memory-name-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.name')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="if-memory-name-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Output Type */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <FormControl fullWidth data-id-ref="if-memory-output-type-select">
                    <InputLabel>{t('ifMemory.fields.outputType')}</InputLabel>
                    <Select
                      value={formData.outputType}
                      onChange={(e) => handleFieldChange('outputType', e.target.value)}
                      label={t('ifMemory.fields.outputType')}
                    >
                      <MenuItem value={IfMemoryOutputType.Digital}>
                        {t('ifMemory.outputTypes.digital')}
                      </MenuItem>
                      <MenuItem value={IfMemoryOutputType.Analog}>
                        {t('ifMemory.outputTypes.analog')}
                      </MenuItem>
                    </Select>
                    <FormHelperText>{t('ifMemory.fields.outputTypeHelp')}</FormHelperText>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.outputType')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="if-memory-output-type-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Output Item */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Autocomplete
                    fullWidth
                    options={outputItems}
                    value={selectedOutputItem || null}
                    onChange={(_, newValue) => {
                      handleFieldChange('outputItemId', newValue?.id || '');
                    }}
                    getOptionLabel={(option) => getItemLabel(option)}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...otherProps}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Chip
                            label={getItemTypeLabel(option.itemType)}
                            size="small"
                            color={getItemTypeColor(option.itemType)}
                          />
                          <Typography>{getItemLabel(option)}</Typography>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('ifMemory.fields.outputItem')}
                        error={!!formErrors.outputItemId}
                        helperText={formErrors.outputItemId}
                      />
                    )}
                    data-id-ref="if-memory-output-item-autocomplete"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.outputItem')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="if-memory-output-item-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                {/* Interval */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('ifMemory.fields.interval')}
                    value={formData.interval}
                    onChange={(e) => handleFieldChange('interval', parseInt(e.target.value) || 1)}
                    error={!!formErrors.interval}
                    helperText={formErrors.interval || t('ifMemory.fields.intervalHelp')}
                    inputProps={{ min: 1 }}
                    data-id-ref="if-memory-interval-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.interval')}
                    sx={{ p: 0.25, mt: 1 }}
                    data-id-ref="if-memory-interval-help-btn"
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
                        onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                        data-id-ref="if-memory-disabled-switch"
                      />
                    }
                    label={t('ifMemory.fields.isDisabled')}
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.isDisabled')}
                    sx={{ p: 0.25 }}
                    data-id-ref="if-memory-disabled-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        {/* Variables Section */}
        <Card sx={{ mb: 2 }} data-id-ref="if-memory-variables-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('ifMemory.sections.variables')}
                </Typography>
                <Chip label={formData.variableMappings.length} size="small" color="primary" />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('ifMemory.help.variables')}
                  sx={{ p: 0.25 }}
                  data-id-ref="if-memory-variables-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddVariable}
                  size="small"
                  variant="outlined"
                  data-id-ref="if-memory-add-variable-btn"
                >
                  {t('ifMemory.addVariable')}
                </Button>
                <IconButton
                  onClick={() => setVariablesExpanded(!variablesExpanded)}
                  data-id-ref="if-memory-variables-expand-btn"
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: variablesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                    }}
                  />
                </IconButton>
              </Box>
            }
            sx={{ py: 1 }}
          />
          <Collapse in={variablesExpanded}>
            <CardContent sx={{ pt: 0 }}>
              {formData.variableMappings.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  {t('ifMemory.noVariables')}
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '25%' }}>{t('ifMemory.fields.alias')}</TableCell>
                        <TableCell>{t('ifMemory.fields.inputItem')}</TableCell>
                        <TableCell sx={{ width: '60px' }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.variableMappings.map((mapping, index) => (
                        <TableRow key={index} data-id-ref={`if-memory-variable-row-${index}`}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={mapping.alias}
                              onChange={(e) =>
                                handleVariableChange(index, 'alias', e.target.value)
                              }
                              error={!!formErrors[`variable_${index}_alias`]}
                              helperText={formErrors[`variable_${index}_alias`]}
                              placeholder="v1"
                              fullWidth
                              data-id-ref={`if-memory-variable-alias-input-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Autocomplete
                              size="small"
                              options={inputItems}
                              value={items.find((i) => i.id === mapping.itemId) || null}
                              onChange={(_, newValue) => {
                                handleVariableChange(index, 'itemId', newValue?.id || '');
                              }}
                              getOptionLabel={(option) => getItemLabel(option)}
                              renderOption={(props, option) => {
                                const { key, ...otherProps } = props;
                                return (
                                  <Box
                                    component="li"
                                    key={key}
                                    {...otherProps}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                  >
                                    <Chip
                                      label={getItemTypeLabel(option.itemType)}
                                      size="small"
                                      color={getItemTypeColor(option.itemType)}
                                    />
                                    <Typography variant="body2">{getItemLabel(option)}</Typography>
                                  </Box>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  error={!!formErrors[`variable_${index}_item`]}
                                  helperText={formErrors[`variable_${index}_item`]}
                                  placeholder={t('ifMemory.selectItem')}
                                />
                              )}
                              data-id-ref={`if-memory-variable-item-autocomplete-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('common.delete')}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveVariable(index)}
                                data-id-ref={`if-memory-remove-variable-btn-${index}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Collapse>
        </Card>

        {/* Branches Section (IF/ELSE IF/ELSE) */}
        <Card sx={{ mb: 2 }} data-id-ref="if-memory-branches-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('ifMemory.sections.branches')}
                </Typography>
                <Chip
                  label={`${formData.branches.length} / ${MAX_BRANCHES}`}
                  size="small"
                  color={formData.branches.length >= MAX_BRANCHES ? 'error' : 'primary'}
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('ifMemory.help.branches')}
                  sx={{ p: 0.25 }}
                  data-id-ref="if-memory-branches-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddBranch}
                  size="small"
                  variant="outlined"
                  disabled={formData.branches.length >= MAX_BRANCHES}
                  data-id-ref="if-memory-add-branch-btn"
                >
                  {t('ifMemory.addBranch')}
                </Button>
                <IconButton
                  onClick={() => setBranchesExpanded(!branchesExpanded)}
                  data-id-ref="if-memory-branches-expand-btn"
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: branchesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                    }}
                  />
                </IconButton>
              </Box>
            }
            sx={{ py: 1 }}
          />
          <Collapse in={branchesExpanded}>
            <CardContent sx={{ pt: 0 }}>
              {formData.branches.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }} data-id-ref="if-memory-no-branches-alert">
                  {t('ifMemory.noBranches')}
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {formData.branches.map((branch, index) => (
                    <Paper
                      key={branch.id}
                      elevation={1}
                      sx={{ p: 2, border: 1, borderColor: 'divider' }}
                      data-id-ref={`if-memory-branch-card-${index}`}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={index === 0 ? 'IF' : 'ELSE IF'}
                            size="small"
                            color={index === 0 ? 'primary' : 'default'}
                          />
                          <Typography variant="subtitle2">
                            {branch.name || t('ifMemory.branchLabel', { index: index + 1 })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title={t('common.moveUp')}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveBranchUp(index)}
                                disabled={index === 0}
                                data-id-ref={`if-memory-branch-up-btn-${index}`}
                              >
                                <ArrowUpIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.moveDown')}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveBranchDown(index)}
                                disabled={index === formData.branches.length - 1}
                                data-id-ref={`if-memory-branch-down-btn-${index}`}
                              >
                                <ArrowDownIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveBranch(branch.id)}
                              data-id-ref={`if-memory-branch-delete-btn-${index}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Stack spacing={2}>
                        {/* Branch Name (optional) */}
                        <TextField
                          size="small"
                          label={t('ifMemory.fields.branchName')}
                          value={branch.name}
                          onChange={(e) =>
                            handleBranchChange(branch.id, 'name', e.target.value)
                          }
                          placeholder={t('ifMemory.branchNamePlaceholder')}
                          data-id-ref={`if-memory-branch-name-input-${index}`}
                        />

                        {/* Condition */}
                        <Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                              fullWidth
                              size="small"
                              label={t('ifMemory.fields.condition')}
                              value={branch.condition}
                              onChange={(e) =>
                                handleBranchChange(branch.id, 'condition', e.target.value)
                              }
                              error={!!formErrors[`branch_${branch.id}_condition`]}
                              helperText={
                                formErrors[`branch_${branch.id}_condition`] ||
                                t('ifMemory.conditionHelp')
                              }
                              placeholder="[v1] >= 50 && [v2] < 100"
                              data-id-ref={`if-memory-branch-condition-input-${index}`}
                            />
                            <IconButton
                              size="small"
                              onClick={handleHelpOpen('ifMemory.help.condition')}
                              sx={{ p: 0.25, mt: 0.5 }}
                              data-id-ref={`if-memory-branch-condition-help-btn-${index}`}
                            >
                              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                            </IconButton>
                            <Tooltip title={t('ifMemory.testCondition')}>
                              <span>
                                <IconButton
                                  color="primary"
                                  onClick={() =>
                                    handleTestCondition(branch.id, branch.condition)
                                  }
                                  disabled={testing === branch.id || !branch.condition.trim()}
                                  data-id-ref={`if-memory-branch-test-btn-${index}`}
                                >
                                  {testing === branch.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <TestIcon />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                          {testResults[branch.id] && (
                            <Alert
                              severity={testResults[branch.id].isValid ? 'success' : 'error'}
                              icon={
                                testResults[branch.id].isValid ? (
                                  <SuccessIcon />
                                ) : (
                                  <ErrorIcon />
                                )
                              }
                              sx={{ mt: 1 }}
                              data-id-ref={`if-memory-branch-test-result-${index}`}
                            >
                              {testResults[branch.id].isValid
                                ? t('ifMemory.testResult', {
                                    result: testResults[branch.id].result ? 'true' : 'false',
                                  })
                                : testResults[branch.id].errorMessage}
                            </Alert>
                          )}
                        </Box>

                        {/* Output Value and Hysteresis */}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label={t('ifMemory.fields.outputValue')}
                              value={branch.outputValue}
                              onChange={(e) =>
                                handleBranchChange(
                                  branch.id,
                                  'outputValue',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              helperText={
                                formData.outputType === IfMemoryOutputType.Digital
                                  ? t('ifMemory.outputValueDigitalHelp')
                                  : t('ifMemory.outputValueAnalogHelp')
                              }
                              data-id-ref={`if-memory-branch-output-value-input-${index}`}
                            />
                            <IconButton
                              size="small"
                              onClick={handleHelpOpen('ifMemory.help.outputValue')}
                              sx={{ p: 0.25, mt: 0.5 }}
                              data-id-ref={`if-memory-branch-output-help-btn-${index}`}
                            >
                              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                            </IconButton>
                          </Box>
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label={t('ifMemory.fields.hysteresis')}
                              value={branch.hysteresis}
                              onChange={(e) =>
                                handleBranchChange(
                                  branch.id,
                                  'hysteresis',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              inputProps={{ min: 0, step: 0.1 }}
                              helperText={t('ifMemory.hysteresisHelp')}
                              data-id-ref={`if-memory-branch-hysteresis-input-${index}`}
                            />
                            <IconButton
                              size="small"
                              onClick={handleHelpOpen('ifMemory.help.hysteresis')}
                              sx={{ p: 0.25, mt: 0.5 }}
                              data-id-ref={`if-memory-branch-hysteresis-help-btn-${index}`}
                            >
                              <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}

              {/* ELSE (Default Value) Section */}
              <Divider sx={{ my: 2 }} />
              <Paper
                elevation={0}
                sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}
                data-id-ref="if-memory-else-section"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip label="ELSE" size="small" color="secondary" />
                  <Typography variant="subtitle2">{t('ifMemory.elseSection')}</Typography>
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('ifMemory.help.defaultValue')}
                    sx={{ p: 0.25 }}
                    data-id-ref="if-memory-default-value-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>
                <TextField
                  size="small"
                  type="number"
                  label={t('ifMemory.fields.defaultValue')}
                  value={formData.defaultValue}
                  onChange={(e) =>
                    handleFieldChange('defaultValue', parseFloat(e.target.value) || 0)
                  }
                  fullWidth
                  helperText={t('ifMemory.defaultValueHelp')}
                  data-id-ref="if-memory-default-value-input"
                />
              </Paper>
            </CardContent>
          </Collapse>
        </Card>

        {/* Advanced Section */}
        <Card data-id-ref="if-memory-advanced-section">
          <CardHeader
            title={
              <Typography variant="subtitle1" fontWeight="medium">
                {t('ifMemory.sections.advanced')}
              </Typography>
            }
            action={
              <IconButton
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                data-id-ref="if-memory-advanced-expand-btn"
              >
                <ExpandMoreIcon
                  sx={{
                    transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                />
              </IconButton>
            }
            sx={{ py: 1 }}
          />
          <Collapse in={advancedExpanded}>
            <CardContent sx={{ pt: 0 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('ifMemory.fields.description')}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                data-id-ref="if-memory-description-input"
              />
            </CardContent>
          </Collapse>
        </Card>

        {/* Help Popovers */}
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.basicConfiguration']}
          open={Boolean(helpAnchorEl['ifMemory.help.basicConfiguration'])}
          onClose={handleHelpClose('ifMemory.help.basicConfiguration')}
          fieldKey="ifMemory.help.basicConfiguration"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.name']}
          open={Boolean(helpAnchorEl['ifMemory.help.name'])}
          onClose={handleHelpClose('ifMemory.help.name')}
          fieldKey="ifMemory.help.name"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.outputType']}
          open={Boolean(helpAnchorEl['ifMemory.help.outputType'])}
          onClose={handleHelpClose('ifMemory.help.outputType')}
          fieldKey="ifMemory.help.outputType"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.outputItem']}
          open={Boolean(helpAnchorEl['ifMemory.help.outputItem'])}
          onClose={handleHelpClose('ifMemory.help.outputItem')}
          fieldKey="ifMemory.help.outputItem"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.interval']}
          open={Boolean(helpAnchorEl['ifMemory.help.interval'])}
          onClose={handleHelpClose('ifMemory.help.interval')}
          fieldKey="ifMemory.help.interval"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.isDisabled']}
          open={Boolean(helpAnchorEl['ifMemory.help.isDisabled'])}
          onClose={handleHelpClose('ifMemory.help.isDisabled')}
          fieldKey="ifMemory.help.isDisabled"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.variables']}
          open={Boolean(helpAnchorEl['ifMemory.help.variables'])}
          onClose={handleHelpClose('ifMemory.help.variables')}
          fieldKey="ifMemory.help.variables"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.branches']}
          open={Boolean(helpAnchorEl['ifMemory.help.branches'])}
          onClose={handleHelpClose('ifMemory.help.branches')}
          fieldKey="ifMemory.help.branches"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.condition']}
          open={Boolean(helpAnchorEl['ifMemory.help.condition'])}
          onClose={handleHelpClose('ifMemory.help.condition')}
          fieldKey="ifMemory.help.condition"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.outputValue']}
          open={Boolean(helpAnchorEl['ifMemory.help.outputValue'])}
          onClose={handleHelpClose('ifMemory.help.outputValue')}
          fieldKey="ifMemory.help.outputValue"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.hysteresis']}
          open={Boolean(helpAnchorEl['ifMemory.help.hysteresis'])}
          onClose={handleHelpClose('ifMemory.help.hysteresis')}
          fieldKey="ifMemory.help.hysteresis"
        />
        <FieldHelpPopover
          anchorEl={helpAnchorEl['ifMemory.help.defaultValue']}
          open={Boolean(helpAnchorEl['ifMemory.help.defaultValue'])}
          onClose={handleHelpClose('ifMemory.help.defaultValue')}
          fieldKey="ifMemory.help.defaultValue"
        />
      </DialogContent>

      <DialogActions data-id-ref="if-memory-dialog-actions">
        <Button
          onClick={handleCancel}
          disabled={loading}
          startIcon={<CloseIcon />}
          data-id-ref="if-memory-cancel-btn"
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          data-id-ref="if-memory-save-btn"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditIfMemoryDialog;
