import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Cron from 'react-cron-generator';
import './CronExpressionInput.css';
import { useLanguage } from '../hooks/useLanguage';

interface CronExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  'data-id-ref'?: string;
}

/**
 * CronExpressionInput Component
 * 
 * A user-friendly cron expression editor that combines a text field
 * with a visual cron builder dialog. Supports standard 5-field cron format.
 */
const CronExpressionInput: React.FC<CronExpressionInputProps> = ({
  value,
  onChange,
  error = false,
  helperText,
  label,
  placeholder = '0 0 * * *',
  disabled = false,
  fullWidth = true,
  'data-id-ref': dataIdRef,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || '0 0 * * *');
  const [cronDescription, setCronDescription] = useState('');

  // Update temp value when external value changes
  useEffect(() => {
    if (value) {
      setTempValue(value);
    }
  }, [value]);

  // Generate human-readable description
  useEffect(() => {
    const description = generateCronDescription(tempValue);
    setCronDescription(description);
  }, [tempValue]);

  /**
   * Generate human-readable cron description
   */
  const generateCronDescription = (cronExpression: string): string => {
    if (!cronExpression) return '';

    try {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) return t('cron.invalidFormat');

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // Daily at specific time
      if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        if (minute === '0' && hour === '0') {
          return t('cron.descriptions.dailyAtMidnight');
        }
        if (minute === '0') {
          return t('cron.descriptions.dailyAtHour', { hour });
        }
        if (hour === '*') {
          return t('cron.descriptions.everyHour');
        }
        return t('cron.descriptions.dailyAt', { hour, minute });
      }

      // Monthly
      if (month === '*' && dayOfWeek === '*' && dayOfMonth !== '*') {
        return t('cron.descriptions.monthlyOnDay', { day: dayOfMonth, hour, minute });
      }

      // Weekly
      if (dayOfWeek !== '*' && dayOfMonth === '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
        return t('cron.descriptions.weeklyOnDay', { day: dayName, hour, minute });
      }

      return t('cron.descriptions.custom');
    } catch (err) {
      return t('cron.invalidFormat');
    }
  };

  const handleOpenDialog = () => {
    setTempValue(value || '0 0 * * *');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleApply = () => {
    onChange(tempValue);
    setDialogOpen(false);
  };

  const handleCronChange = (newValue: string) => {
    setTempValue(newValue);
  };

  const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setTempValue(newValue);
    onChange(newValue);
  };

  return (
    <Box data-id-ref={dataIdRef}>
      <TextField
        fullWidth={fullWidth}
        label={label}
        value={value || ''}
        onChange={handleTextFieldChange}
        error={error}
        helperText={helperText}
        placeholder={placeholder}
        disabled={disabled}
        InputProps={{
          endAdornment: (
            <IconButton
              onClick={handleOpenDialog}
              disabled={disabled}
              edge="end"
              data-id-ref={`${dataIdRef}-open-builder-btn`}
              sx={{ mr: -1 }}
            >
              <ScheduleIcon />
            </IconButton>
          ),
        }}
        data-id-ref={`${dataIdRef}-text-field`}
      />

      {value && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {cronDescription}
        </Typography>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        data-id-ref={`${dataIdRef}-dialog`}
      >
        <DialogTitle data-id-ref={`${dataIdRef}-dialog-title`}>
          {t('cron.builderTitle')}
          <IconButton
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
            data-id-ref={`${dataIdRef}-dialog-close-btn`}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent data-id-ref={`${dataIdRef}-dialog-content`}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {t('cron.builderDescription')}
            </Typography>
          </Alert>

          <Box
            sx={{
              '& .cron_builder': {
                fontFamily: theme.typography.fontFamily,
                '& input, & select': {
                  padding: '8px 12px',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                  fontSize: theme.typography.body1.fontSize,
                  '&:focus': {
                    outline: 'none',
                    borderColor: theme.palette.primary.main,
                  },
                },
                '& label': {
                  fontSize: theme.typography.body2.fontSize,
                  fontWeight: theme.typography.fontWeightMedium,
                  marginBottom: theme.spacing(0.5),
                },
                '& .error': {
                  color: theme.palette.error.main,
                },
              },
            }}
          >
            <Cron
              onChange={handleCronChange}
              value={tempValue}
              showResultText={true}
              showResultCron={true}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('cron.preview')}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" fontFamily="monospace">
                {tempValue}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {cronDescription}
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>{t('cron.examples.title')}</strong>
              <br />
              • <code>0 0 * * *</code> - {t('cron.examples.dailyAtMidnight')}
              <br />
              • <code>0 * * * *</code> - {t('cron.examples.everyHour')}
              <br />
              • <code>0 0 1 * *</code> - {t('cron.examples.monthlyFirst')}
              <br />
              • <code>0 0 * * 0</code> - {t('cron.examples.weeklySunday')}
              <br />
              • <code>*/15 * * * *</code> - {t('cron.examples.every15Minutes')}
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions data-id-ref={`${dataIdRef}-dialog-actions`}>
          <Button
            onClick={handleCloseDialog}
            data-id-ref={`${dataIdRef}-cancel-btn`}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleApply}
            variant="contained"
            data-id-ref={`${dataIdRef}-apply-btn`}
          >
            {t('common.apply')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CronExpressionInput;
