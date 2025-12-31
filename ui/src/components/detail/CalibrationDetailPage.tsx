import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../hooks/useLanguage';
import { useMonitoring } from '../../hooks/useMonitoring';
import { useAuth } from '../../hooks/useAuth';
import { editItem } from '../../services/monitoringApi';
import { CardHeader } from '../shared/CardHeader';
import { createLogger } from '../../utils/logger';
import type { Item, EditItemRequestDto } from '../../types/api';

const logger = createLogger('CalibrationDetailPage');

/**
 * Calibration Detail Page
 * 
 * Provides a dedicated interface for viewing and editing calibration settings
 * for a monitoring item. The calibration uses a linear transformation formula:
 * Calibrated Value = A × Raw Value + B
 * 
 * Where:
 * - A is the multiplier coefficient (CalibrationA)
 * - B is the offset coefficient (CalibrationB)
 */
const CalibrationDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  
  const { t, language } = useLanguage();
  const { state, syncItems } = useMonitoring();
  const { user } = useAuth();
  
  // Check if user has Admin or Manager role
  const hasAdminOrManagerRole = user?.roles?.includes('Admin') || user?.roles?.includes('Manager') || false;
  
  // Form state
  const [isCalibrationEnabled, setIsCalibrationEnabled] = useState<boolean>(false);
  const [calibrationA, setCalibrationA] = useState<number>(1);
  const [calibrationB, setCalibrationB] = useState<number>(0);
  const [testRawValue, setTestRawValue] = useState<string>('100');
  
  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Find the current item from monitoring state
  const currentItem = useMemo(() => {
    if (!itemId) return null;
    return state.items.find((item: Item) => item.id === itemId) || null;
  }, [itemId, state.items]);

  // Get display name based on language
  const getItemName = useCallback((item: Item | null): string => {
    if (!item) return t('unknown');
    if (language === 'fa') {
      return item.nameFa || item.name || t('unknown');
    }
    return item.name || t('unknown');
  }, [language, t]);

  // Initialize form from current item
  useEffect(() => {
    if (currentItem) {
      setIsCalibrationEnabled(currentItem.isCalibrationEnabled ?? false);
      setCalibrationA(currentItem.calibrationA ?? 1);
      setCalibrationB(currentItem.calibrationB ?? 0);
      setHasChanges(false);
      setError(null);
      setSuccessMessage(null);
      logger.log('Loaded calibration settings for item:', { 
        itemId, 
        isEnabled: currentItem.isCalibrationEnabled,
        a: currentItem.calibrationA,
        b: currentItem.calibrationB
      });
    }
  }, [currentItem, itemId]);

  // Calculate calibrated value for preview
  const calibratedValue = useMemo(() => {
    const rawValue = parseFloat(testRawValue);
    if (isNaN(rawValue)) return null;
    
    if (!isCalibrationEnabled) {
      return rawValue;
    }
    
    const result = calibrationA * rawValue + calibrationB;
    return parseFloat(result.toFixed(4));
  }, [testRawValue, isCalibrationEnabled, calibrationA, calibrationB]);

  // Handle form field changes
  const handleCalibrationEnabledChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCalibrationEnabled(event.target.checked);
    setHasChanges(true);
    setSuccessMessage(null);
  }, []);

  const handleCalibrationAChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setCalibrationA(isNaN(value) ? 1 : value);
    setHasChanges(true);
    setSuccessMessage(null);
  }, []);

  const handleCalibrationBChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setCalibrationB(isNaN(value) ? 0 : value);
    setHasChanges(true);
    setSuccessMessage(null);
  }, []);

  const handleTestValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTestRawValue(event.target.value);
  }, []);

  // Reset form to current item values
  const handleReset = useCallback(() => {
    if (currentItem) {
      setIsCalibrationEnabled(currentItem.isCalibrationEnabled ?? false);
      setCalibrationA(currentItem.calibrationA ?? 1);
      setCalibrationB(currentItem.calibrationB ?? 0);
      setHasChanges(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [currentItem]);

  // Save calibration settings
  const handleSave = useCallback(async () => {
    if (!currentItem || !itemId) {
      setError(t('calibrationPage.errors.noItemSelected'));
      return;
    }

    // Check permission: Admin/Manager can edit, or the item must be editable
    if (!hasAdminOrManagerRole && !currentItem.isEditable) {
      setError(t('calibrationPage.errors.notEditable'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      logger.log('Saving calibration settings:', {
        itemId,
        isCalibrationEnabled,
        calibrationA,
        calibrationB
      });

      // Build the edit request with all required fields from current item
      const request: EditItemRequestDto = {
        id: itemId,
        itemType: currentItem.itemType,
        itemName: currentItem.name || '',
        itemNameFa: currentItem.nameFa,
        pointNumber: currentItem.pointNumber,
        shouldScale: currentItem.shouldScale,
        normMin: currentItem.normMin,
        normMax: currentItem.normMax,
        scaleMin: currentItem.scaleMin,
        scaleMax: currentItem.scaleMax,
        saveInterval: currentItem.saveInterval,
        saveHistoricalInterval: currentItem.saveHistoricalInterval,
        calculationMethod: currentItem.calculationMethod,
        numberOfSamples: currentItem.numberOfSamples,
        saveOnChange: currentItem.saveOnChange,
        saveOnChangeRange: currentItem.saveOnChangeRange,
        onText: currentItem.onText,
        onTextFa: currentItem.onTextFa,
        offText: currentItem.offText,
        offTextFa: currentItem.offTextFa,
        unit: currentItem.unit,
        unitFa: currentItem.unitFa,
        isDisabled: currentItem.isDisabled ?? false,
        isCalibrationEnabled,
        calibrationA,
        calibrationB,
        interfaceType: currentItem.interfaceType,
        isEditable: currentItem.isEditable,
      };

      const response = await editItem(request);

      if (response.success) {
        setSuccessMessage(t('calibrationPage.saveSuccess'));
        setHasChanges(false);
        // Refresh items to get updated data
        await syncItems();
        logger.log('Calibration settings saved successfully');
      } else {
        setError(response.message || t('calibrationPage.errors.saveFailed'));
        logger.error('Failed to save calibration settings:', response.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('calibrationPage.errors.saveFailed');
      setError(errorMessage);
      logger.error('Error saving calibration settings:', err);
    } finally {
      setSaving(false);
    }
  }, [currentItem, itemId, isCalibrationEnabled, calibrationA, calibrationB, syncItems, t, hasAdminOrManagerRole]);

  // No itemId provided
  if (!itemId) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
        }}
        data-id-ref="calibration-page-no-item-container"
      >
        <Alert severity="warning" data-id-ref="calibration-page-no-item-alert">
          {t('noItemIdProvided')}
        </Alert>
      </Box>
    );
  }

  // Loading state while items are being fetched
  if (state.itemsLoading && !currentItem) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-id-ref="calibration-page-loading-container"
      >
        <CircularProgress data-id-ref="calibration-page-loading-spinner" />
      </Box>
    );
  }

  // Item not found
  if (!currentItem) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
        }}
        data-id-ref="calibration-page-not-found-container"
      >
        <Alert severity="error" data-id-ref="calibration-page-not-found-alert">
          {t('calibrationPage.errors.itemNotFound')}
        </Alert>
      </Box>
    );
  }

  // Determine if the form should be read-only
  // Admin and Manager roles can always edit, others need isEditable permission
  const isReadOnly = !hasAdminOrManagerRole && !currentItem.isEditable;
  const unit = language === 'fa' ? (currentItem.unitFa || currentItem.unit || '') : (currentItem.unit || '');

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        gap: 3,
      }}
      data-id-ref="calibration-page-container"
    >
      {/* Main Card */}
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-id-ref="calibration-page-card"
      >
        <CardHeader 
          title={t('calibrationPage.title')}
          subtitle={getItemName(currentItem)}
          dataIdRef="calibration-page-header"
        />
        
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
          data-id-ref="calibration-page-content"
        >
          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              data-id-ref="calibration-page-error-alert"
            >
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert 
              severity="success" 
              onClose={() => setSuccessMessage(null)}
              data-id-ref="calibration-page-success-alert"
            >
              {successMessage}
            </Alert>
          )}

          {/* Read-only warning */}
          {isReadOnly && (
            <Alert severity="info" data-id-ref="calibration-page-readonly-alert">
              {t('calibrationPage.readOnlyWarning')}
            </Alert>
          )}

          {/* Formula Explanation */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'action.hover',
              borderRadius: 2,
            }}
            data-id-ref="calibration-page-formula-explanation"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CalculateIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                {t('calibrationPage.formulaTitle')}
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                color: 'primary.main',
              }}
            >
              {t('calibrationPage.formula')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('calibrationPage.formulaDescription')}
            </Typography>
          </Paper>

          <Divider />

          {/* Calibration Enable Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={isCalibrationEnabled}
                onChange={handleCalibrationEnabledChange}
                disabled={saving || isReadOnly}
                data-id-ref="calibration-page-enable-switch"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{t('calibrationPage.enableCalibration')}</Typography>
                <Tooltip title={t('calibrationPage.enableCalibrationTooltip')}>
                  <IconButton size="small" data-id-ref="calibration-page-enable-info-btn">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            data-id-ref="calibration-page-enable-control"
          />

          {/* Coefficient Inputs */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              opacity: isCalibrationEnabled ? 1 : 0.5,
              transition: 'opacity 0.3s',
            }}
            data-id-ref="calibration-page-coefficients-container"
          >
            <TextField
              fullWidth
              label={t('calibrationPage.coefficientA')}
              type="number"
              value={calibrationA}
              onChange={handleCalibrationAChange}
              disabled={saving || isReadOnly || !isCalibrationEnabled}
              inputProps={{ step: 0.01 }}
              helperText={t('calibrationPage.coefficientAHelper')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">A =</InputAdornment>
                ),
              }}
              data-id-ref="calibration-page-coefficient-a-input"
            />
            <TextField
              fullWidth
              label={t('calibrationPage.coefficientB')}
              type="number"
              value={calibrationB}
              onChange={handleCalibrationBChange}
              disabled={saving || isReadOnly || !isCalibrationEnabled}
              inputProps={{ step: 0.01 }}
              helperText={t('calibrationPage.coefficientBHelper')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">B =</InputAdornment>
                ),
              }}
              data-id-ref="calibration-page-coefficient-b-input"
            />
          </Box>

          <Divider />

          {/* Live Preview Section */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'background.default',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
            data-id-ref="calibration-page-preview-section"
          >
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
              {t('calibrationPage.previewTitle')}
            </Typography>
            
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
              }}
            >
              <TextField
                label={t('calibrationPage.testRawValue')}
                type="number"
                value={testRawValue}
                onChange={handleTestValueChange}
                size="small"
                sx={{ minWidth: 150 }}
                InputProps={{
                  endAdornment: unit ? (
                    <InputAdornment position="end">{unit}</InputAdornment>
                  ) : undefined,
                }}
                data-id-ref="calibration-page-test-raw-input"
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" color="text.secondary">→</Typography>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('calibrationPage.calibratedResult')}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color="primary"
                    fontWeight="bold"
                    data-id-ref="calibration-page-preview-result"
                  >
                    {calibratedValue !== null ? (
                      <>
                        {calibratedValue} {unit}
                      </>
                    ) : (
                      '—'
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {isCalibrationEnabled && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                {t('calibrationPage.previewFormula', {
                  a: calibrationA,
                  raw: testRawValue || '0',
                  b: calibrationB >= 0 ? `+ ${calibrationB}` : `- ${Math.abs(calibrationB)}`,
                  result: calibratedValue ?? '—',
                })}
              </Typography>
            )}
          </Paper>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'flex-end',
              mt: 'auto',
              pt: 2,
            }}
            data-id-ref="calibration-page-actions"
          >
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={saving || !hasChanges}
              data-id-ref="calibration-page-reset-btn"
            >
              {t('calibrationPage.reset')}
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || isReadOnly || !hasChanges}
              data-id-ref="calibration-page-save-btn"
            >
              {saving ? t('calibrationPage.saving') : t('calibrationPage.save')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CalibrationDetailPage;
