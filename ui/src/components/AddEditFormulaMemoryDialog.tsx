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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Divider,
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
  Functions as FormulaIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { addFormulaMemory, editFormulaMemory, testFormulaExpression } from '../services/extendedApi';
import type { FormulaMemory, MonitoringItem, ItemType, VariableAlias } from '../types/api';
import { ItemTypeEnum } from '../types/api';
import { createLogger } from '../utils/logger';
import FieldHelpPopover from './common/FieldHelpPopover';

const logger = createLogger('AddEditFormulaMemoryDialog');

interface AddEditFormulaMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  formulaMemory: FormulaMemory | null;
  editMode: boolean;
}

interface VariableMapping {
  alias: string;
  itemId: string;
  itemName?: string;
}

interface FormData {
  name: string;
  expression: string;
  variableMappings: VariableMapping[];
  outputItemId: string;
  interval: number;
  isDisabled: boolean;
  units: string;
  decimalPlaces: number;
  description: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

interface TestResult {
  isValid: boolean;
  result?: number;
  errorMessage?: string;
}

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

const AddEditFormulaMemoryDialog: React.FC<AddEditFormulaMemoryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  formulaMemory,
  editMode,
}) => {
  const { t, language } = useLanguage();
  const { state } = useMonitoring();
  const { items } = state;

  // Section expansion states
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [variablesExpanded, setVariablesExpanded] = useState(true);
  const [expressionExpanded, setExpressionExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Advanced mode toggle (custom alias names vs auto v1, v2, v3)
  const [advancedAliasMode, setAdvancedAliasMode] = useState(false);

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

  // Test expression states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    expression: '',
    variableMappings: [],
    outputItemId: '',
    interval: 10,
    isDisabled: false,
    units: '',
    decimalPlaces: 2,
    description: '',
  });

  // Initialize form data from formula memory in edit mode
  useEffect(() => {
    if (editMode && formulaMemory) {
      const mappings = parseVariableAliases(formulaMemory.variableAliases);
      
      // Determine if we should use advanced mode based on alias naming
      const hasCustomAliases = mappings.some((m) => !m.alias.match(/^v\d+$/));
      setAdvancedAliasMode(hasCustomAliases);

      setFormData({
        name: formulaMemory.name || '',
        expression: formulaMemory.expression || '',
        variableMappings: mappings,
        outputItemId: formulaMemory.outputItemId,
        interval: formulaMemory.interval,
        isDisabled: formulaMemory.isDisabled,
        units: formulaMemory.units || '',
        decimalPlaces: formulaMemory.decimalPlaces,
        description: formulaMemory.description || '',
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        expression: '',
        variableMappings: [],
        outputItemId: '',
        interval: 10,
        isDisabled: false,
        units: '',
        decimalPlaces: 2,
        description: '',
      });
      setAdvancedAliasMode(false);
    }
    setTestResult(null);
    setError(null);
  }, [editMode, formulaMemory, open]);

  // Filter items by type for inputs (analog inputs and analog outputs can be used as inputs)
  const inputItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.itemType === ItemTypeEnum.AnalogInput || item.itemType === ItemTypeEnum.AnalogOutput
      ),
    [items]
  );

  // Filter items by type for output (analog outputs only)
  const outputItems = useMemo(
    () => items.filter((item) => item.itemType === ItemTypeEnum.AnalogOutput),
    [items]
  );

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
    itemType: ItemType
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
    (itemType: ItemType): string => {
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
    const newAlias = advancedAliasMode ? '' : getNextAutoAlias();
    setFormData((prev) => ({
      ...prev,
      variableMappings: [...prev.variableMappings, { alias: newAlias, itemId: '' }],
    }));
  }, [advancedAliasMode, getNextAutoAlias]);

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
   * Toggle between basic and advanced alias mode
   */
  const handleAliasModeToggle = useCallback(
    (checked: boolean) => {
      setAdvancedAliasMode(checked);

      // If switching to basic mode, rename all aliases to v1, v2, v3, etc.
      if (!checked) {
        setFormData((prev) => ({
          ...prev,
          variableMappings: prev.variableMappings.map((m, index) => ({
            ...m,
            alias: `v${index + 1}`,
          })),
        }));
      }
    },
    []
  );

  const handleFieldChange = (
    field: keyof FormData,
    value: string | number | boolean | VariableMapping[]
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

    // Clear test result when expression changes
    if (field === 'expression') {
      setTestResult(null);
    }
  };

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.expression.trim()) {
      errors.expression = t('formulaMemory.validation.expressionRequired');
    }

    if (!formData.outputItemId) {
      errors.outputItemId = t('formulaMemory.validation.outputItemRequired');
    }

    // Validate variable mappings
    const aliasSet = new Set<string>();
    formData.variableMappings.forEach((mapping, index) => {
      if (!mapping.alias.trim()) {
        errors[`variable_${index}_alias`] = t('formulaMemory.validation.aliasRequired');
      } else if (aliasSet.has(mapping.alias)) {
        errors[`variable_${index}_alias`] = t('formulaMemory.validation.duplicateAlias');
      } else {
        aliasSet.add(mapping.alias);
      }

      if (!mapping.itemId) {
        errors[`variable_${index}_item`] = t('formulaMemory.validation.itemRequired');
      }
    });

    // Check that output item is not used as input
    if (formData.variableMappings.some((m) => m.itemId === formData.outputItemId)) {
      errors.outputItemId = t('formulaMemory.validation.outputUsedAsInput');
    }

    if (formData.interval < 1) {
      errors.interval = t('formulaMemory.validation.intervalMin');
    }

    if (formData.decimalPlaces < 0 || formData.decimalPlaces > 10) {
      errors.decimalPlaces = t('formulaMemory.validation.decimalPlacesRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Test the expression
   */
  const handleTestExpression = async () => {
    if (!formData.expression.trim()) {
      setTestResult({
        isValid: false,
        errorMessage: t('formulaMemory.validation.expressionRequired'),
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Convert variable mappings to the format expected by the API
      const variableAliases: VariableAlias[] = formData.variableMappings.map((m) => ({
        alias: m.alias,
        itemId: m.itemId,
      }));

      const response = await testFormulaExpression({
        expression: formData.expression,
        variableAliases,
      });

      setTestResult({
        isValid: response.isSuccessful,
        result: response.result ?? undefined,
        errorMessage: response.errorMessage ?? undefined,
      });

      if (response.isSuccessful) {
        logger.info('Expression test successful', { result: response.result });
      } else {
        logger.warn('Expression test failed', { error: response.errorMessage });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({
        isValid: false,
        errorMessage,
      });
      logger.error('Failed to test expression', err);
    } finally {
      setTesting(false);
    }
  };

  /**
   * Save form data
   */
  const handleSave = async () => {
    if (!validate()) {
      setError(t('formulaMemory.errors.validationFailed'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const variableAliasesJson = variableMappingsToJson(formData.variableMappings);

      if (editMode && formulaMemory) {
        const response = await editFormulaMemory({
          id: formulaMemory.id,
          name: formData.name || undefined,
          expression: formData.expression,
          variableAliases: variableAliasesJson,
          outputItemId: formData.outputItemId,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          units: formData.units || undefined,
          decimalPlaces: formData.decimalPlaces,
          description: formData.description || undefined,
        });
        
        if (response.isSuccessful) {
          logger.info('Formula memory updated successfully');
          onSuccess();
        } else {
          setError(response.errorMessage ?? t('formulaMemory.errors.saveFailed'));
        }
      } else {
        const response = await addFormulaMemory({
          name: formData.name || undefined,
          expression: formData.expression,
          variableAliases: variableAliasesJson,
          outputItemId: formData.outputItemId,
          interval: formData.interval,
          isDisabled: formData.isDisabled,
          units: formData.units || undefined,
          decimalPlaces: formData.decimalPlaces,
          description: formData.description || undefined,
        });
        
        if (response.isSuccessful) {
          logger.info('Formula memory created successfully');
          onSuccess();
        } else {
          setError(response.errorMessage ?? t('formulaMemory.errors.saveFailed'));
        }
      }
    } catch (err) {
      logger.error(`Failed to ${editMode ? 'update' : 'create'} formula memory`, { error: err });
      setError(t('formulaMemory.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  /**
   * Generate expression preview with syntax highlighting
   */
  const expressionPreview = useMemo(() => {
    if (!formData.expression) return null;

    let preview = formData.expression;

    // Highlight variable references [alias]
    formData.variableMappings.forEach((m) => {
      if (m.alias) {
        const regex = new RegExp(`\\[${m.alias}\\]`, 'g');
        const item = items.find((i) => i.id === m.itemId);
        const itemLabel = item ? getItemLabel(item) : t('common.unknown');
        preview = preview.replace(regex, `【${m.alias}: ${itemLabel}】`);
      }
    });

    return preview;
  }, [formData.expression, formData.variableMappings, items, getItemLabel, t]);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      data-id-ref="add-edit-formula-memory-dialog"
    >
      <DialogTitle data-id-ref="add-edit-formula-memory-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormulaIcon color="primary" />
            <Typography variant="h6">
              {editMode ? t('formulaMemory.editTitle') : t('formulaMemory.addTitle')}
            </Typography>
          </Box>
          <IconButton onClick={handleCancel} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent data-id-ref="add-edit-formula-memory-dialog-content">
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Basic Configuration Section */}
        <Card sx={{ mb: 2 }} data-id-ref="formula-memory-basic-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('formulaMemory.sections.basic')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('formulaMemory.help.basicConfiguration')}
                  sx={{ p: 0.25 }}
                  data-id-ref="formula-memory-basic-config-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setBasicExpanded(!basicExpanded)}
                sx={{
                  transform: basicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="formula-memory-basic-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={basicExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TextField
                  fullWidth
                  label={t('formulaMemory.name')}
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  helperText={t('formulaMemory.nameHelp')}
                  sx={{ mb: 2 }}
                  data-id-ref="formula-memory-name-input"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('formulaMemory.help.name')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="formula-memory-name-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Autocomplete
                  fullWidth
                  options={outputItems}
                  value={selectedOutputItem || null}
                  onChange={(_, newValue) => handleFieldChange('outputItemId', newValue?.id || '')}
                  getOptionLabel={getItemLabel}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {getItemLabel(option)}
                        </Typography>
                        <Chip
                          label={getItemTypeLabel(option.itemType)}
                          size="small"
                          color={getItemTypeColor(option.itemType)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('formulaMemory.outputItem')}
                      error={!!formErrors.outputItemId}
                      helperText={formErrors.outputItemId || t('formulaMemory.outputItemHelp')}
                      required
                    />
                  )}
                  sx={{ mb: 2 }}
                  data-id-ref="formula-memory-output-item-select"
                />
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('formulaMemory.help.outputItem')}
                  sx={{ p: 0.25, mt: -3 }}
                  data-id-ref="formula-memory-output-item-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('formulaMemory.interval')}
                    value={formData.interval}
                    onChange={(e) => handleFieldChange('interval', Number(e.target.value))}
                    error={!!formErrors.interval}
                    helperText={formErrors.interval || t('formulaMemory.intervalHelp')}
                    InputProps={{ inputProps: { min: 1 } }}
                    data-id-ref="formula-memory-interval-input"
                  />
                  <IconButton
                    size="small"
                    onClick={handleHelpOpen('formulaMemory.help.interval')}
                    sx={{ p: 0.25, mt: -3 }}
                    data-id-ref="formula-memory-interval-help-btn"
                  >
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('formulaMemory.decimalPlaces')}
                    value={formData.decimalPlaces}
                    onChange={(e) => handleFieldChange('decimalPlaces', Number(e.target.value))}
                    error={!!formErrors.decimalPlaces}
                    helperText={formErrors.decimalPlaces || t('formulaMemory.decimalPlacesHelp')}
                    InputProps={{ inputProps: { min: 0, max: 10 } }}
                    data-id-ref="formula-memory-decimal-places-input"
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  label={t('formulaMemory.units')}
                  value={formData.units}
                  onChange={(e) => handleFieldChange('units', e.target.value)}
                  helperText={t('formulaMemory.unitsHelp')}
                  data-id-ref="formula-memory-units-input"
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isDisabled}
                      onChange={(e) => handleFieldChange('isDisabled', e.target.checked)}
                      data-id-ref="formula-memory-disabled-switch"
                    />
                  }
                  label={t('formulaMemory.isDisabled')}
                />
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Variables Section */}
        <Card sx={{ mb: 2 }} data-id-ref="formula-memory-variables-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('formulaMemory.sections.variables')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('formulaMemory.help.variables')}
                  sx={{ p: 0.25 }}
                  data-id-ref="formula-memory-variables-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={advancedAliasMode}
                      onChange={(e) => handleAliasModeToggle(e.target.checked)}
                      data-id-ref="formula-memory-advanced-mode-switch"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      {t('formulaMemory.advancedAliasMode')}
                    </Typography>
                  }
                />
                <IconButton
                  onClick={() => setVariablesExpanded(!variablesExpanded)}
                  sx={{
                    transform: variablesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                  data-id-ref="formula-memory-variables-expand-btn"
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            }
          />
          <Collapse in={variablesExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {advancedAliasMode
                  ? t('formulaMemory.variablesAdvancedDescription')
                  : t('formulaMemory.variablesBasicDescription')}
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={advancedAliasMode ? 150 : 80}>
                        {t('formulaMemory.variableAlias')}
                      </TableCell>
                      <TableCell>{t('formulaMemory.variableItem')}</TableCell>
                      <TableCell width={50} align="center">
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.variableMappings.map((mapping, index) => {
                      const selectedItem = items.find((i) => i.id === mapping.itemId);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {advancedAliasMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={mapping.alias}
                                onChange={(e) =>
                                  handleVariableChange(index, 'alias', e.target.value)
                                }
                                error={!!formErrors[`variable_${index}_alias`]}
                                placeholder={t('formulaMemory.aliasPlaceholder')}
                                data-id-ref={`formula-memory-variable-${index}-alias-input`}
                              />
                            ) : (
                              <Chip
                                label={mapping.alias}
                                color="primary"
                                variant="outlined"
                                size="small"
                                sx={{ fontFamily: 'monospace' }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Autocomplete
                              size="small"
                              fullWidth
                              options={inputItems}
                              value={selectedItem || null}
                              onChange={(_, newValue) =>
                                handleVariableChange(index, 'itemId', newValue?.id || '')
                              }
                              getOptionLabel={getItemLabel}
                              renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.id}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      width: '100%',
                                    }}
                                  >
                                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                      {getItemLabel(option)}
                                    </Typography>
                                    <Chip
                                      label={getItemTypeLabel(option.itemType)}
                                      size="small"
                                      color={getItemTypeColor(option.itemType)}
                                      sx={{ height: 18, fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                </Box>
                              )}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  error={!!formErrors[`variable_${index}_item`]}
                                  placeholder={t('formulaMemory.selectItem')}
                                />
                              )}
                              data-id-ref={`formula-memory-variable-${index}-item-select`}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveVariable(index)}
                              data-id-ref={`formula-memory-variable-${index}-remove-btn`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddVariable}
                size="small"
                data-id-ref="formula-memory-add-variable-btn"
              >
                {t('formulaMemory.addVariable')}
              </Button>
            </CardContent>
          </Collapse>
        </Card>

        {/* Expression Section */}
        <Card sx={{ mb: 2 }} data-id-ref="formula-memory-expression-section">
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6">{t('formulaMemory.sections.expression')}</Typography>
                <IconButton
                  size="small"
                  onClick={handleHelpOpen('formulaMemory.help.expression')}
                  sx={{ p: 0.25 }}
                  data-id-ref="formula-memory-expression-help-btn"
                >
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'info.main' }} />
                </IconButton>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setExpressionExpanded(!expressionExpanded)}
                sx={{
                  transform: expressionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="formula-memory-expression-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={expressionExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('formulaMemory.expression')}
                value={formData.expression}
                onChange={(e) => handleFieldChange('expression', e.target.value)}
                error={!!formErrors.expression}
                helperText={formErrors.expression || t('formulaMemory.expressionHelp')}
                placeholder={t('formulaMemory.expressionPlaceholder')}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                }}
                sx={{ mb: 2 }}
                data-id-ref="formula-memory-expression-input"
              />

              {/* Available variables quick reference */}
              {formData.variableMappings.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('formulaMemory.availableVariables')}:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {formData.variableMappings.map((m, index) => (
                      <Chip
                        key={index}
                        label={`[${m.alias}]`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        onClick={() => {
                          handleFieldChange(
                            'expression',
                            formData.expression + `[${m.alias}]`
                          );
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Expression preview */}
              {expressionPreview && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('formulaMemory.expressionPreview')}:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-word' }}
                  >
                    {expressionPreview}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Test Expression */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                  onClick={handleTestExpression}
                  disabled={testing || !formData.expression.trim()}
                  data-id-ref="formula-memory-test-expression-btn"
                >
                  {t('formulaMemory.testExpression')}
                </Button>

                {testResult && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {testResult.isValid ? (
                      <>
                        <SuccessIcon color="success" fontSize="small" />
                        <Typography variant="body2" color="success.main">
                          {t('formulaMemory.testResult')}: {testResult.result?.toFixed(formData.decimalPlaces)}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <ErrorIcon color="error" fontSize="small" />
                        <Typography variant="body2" color="error.main">
                          {testResult.errorMessage}
                        </Typography>
                      </>
                    )}
                  </Box>
                )}
              </Box>

              {/* Custom Functions Reference */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('formulaMemory.customFunctions')}:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {['avg', 'min', 'max', 'clamp', 'scale', 'deadband', 'iff'].map((fn) => (
                    <Tooltip key={fn} title={t(`formulaMemory.functions.${fn}`)}>
                      <Chip
                        label={fn}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Advanced Section */}
        <Card sx={{ mb: 2 }} data-id-ref="formula-memory-advanced-section">
          <CardHeader
            title={
              <Typography variant="h6">{t('formulaMemory.sections.advanced')}</Typography>
            }
            action={
              <IconButton
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                sx={{
                  transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
                data-id-ref="formula-memory-advanced-expand-btn"
              >
                <ExpandMoreIcon />
              </IconButton>
            }
          />
          <Collapse in={advancedExpanded} timeout="auto" unmountOnExit>
            <CardContent>
              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('formulaMemory.descriptionField')}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                helperText={t('formulaMemory.descriptionHelp')}
                data-id-ref="formula-memory-description-input"
              />
            </CardContent>
          </Collapse>
        </Card>

        {/* Help Popovers */}
        {Object.keys(helpAnchorEl).map((fieldKey) => (
          <FieldHelpPopover
            key={fieldKey}
            anchorEl={helpAnchorEl[fieldKey]}
            open={Boolean(helpAnchorEl[fieldKey])}
            onClose={handleHelpClose(fieldKey)}
            fieldKey={fieldKey}
          />
        ))}
      </DialogContent>

      <DialogActions data-id-ref="add-edit-formula-memory-dialog-actions">
        <Button onClick={handleCancel} disabled={loading} data-id-ref="formula-memory-cancel-btn">
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading}
          data-id-ref="formula-memory-save-btn"
        >
          {editMode ? t('common.update') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditFormulaMemoryDialog;
