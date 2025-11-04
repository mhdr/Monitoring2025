/**
 * Example usage of the AddAlarm API endpoint
 * 
 * This file demonstrates how to use the /api/Monitoring/AddAlarm endpoint
 * to create new alarm configurations for monitoring items.
 * 
 * DO NOT import this file in production code - it's for reference only.
 */

import { addAlarm } from '../services/monitoringApi';
import type { AddAlarmRequestDto, AddAlarmResponseDto } from '../types/api';
import { 
  AlarmTypeEnum, 
  AlarmPriorityEnum, 
  CompareTypeEnum 
} from '../types/api';
import { createLogger } from '../utils/logger';

const logger = createLogger('AddAlarmExample');

/**
 * Example 1: Create a high temperature alarm (threshold-based)
 * Triggers when temperature exceeds 80 degrees
 */
export const createHighTemperatureAlarm = async (itemId: string): Promise<void> => {
  try {
    const request: AddAlarmRequestDto = {
      itemId: itemId, // UUID of the temperature sensor item
      isDisabled: false, // Alarm is active
      alarmDelay: 5, // Wait 5 seconds before triggering (prevents false alarms)
      message: 'High temperature detected - immediate action required',
      messageFa: 'دمای بالا شناسایی شد - اقدام فوری لازم است',
      value1: '80', // Threshold value (temperature in °C)
      value2: null, // Not used for single threshold comparison
      timeout: 3600, // Auto-acknowledge after 1 hour (3600 seconds)
      alarmType: AlarmTypeEnum.Comparative, // Threshold-based alarm
      alarmPriority: AlarmPriorityEnum.Alarm, // Critical priority
      compareType: CompareTypeEnum.Higher, // Trigger when value > threshold
    };

    const response: AddAlarmResponseDto = await addAlarm(request);

    if (response.success) {
      logger.log('High temperature alarm created successfully:', {
        alarmId: response.alarmId,
        message: response.message,
      });
    } else {
      logger.error('Failed to create alarm:', response.message);
    }
  } catch (error) {
    logger.error('Error creating high temperature alarm:', error);
  }
};

/**
 * Example 2: Create a temperature range alarm
 * Triggers when temperature is between 20-30 degrees (e.g., "too cold" warning)
 */
export const createTemperatureRangeAlarm = async (itemId: string): Promise<void> => {
  try {
    const request: AddAlarmRequestDto = {
      itemId: itemId,
      isDisabled: false,
      alarmDelay: 10, // 10 second delay
      message: 'Temperature in warning range (20-30°C)',
      messageFa: 'دما در محدوده هشدار (۲۰-۳۰ درجه سانتیگراد)',
      value1: '20', // Lower bound
      value2: '30', // Upper bound
      timeout: null, // No auto-acknowledgment
      alarmType: AlarmTypeEnum.Comparative,
      alarmPriority: AlarmPriorityEnum.Warning, // Warning level
      compareType: CompareTypeEnum.Between, // Trigger when value is between bounds
    };

    const response = await addAlarm(request);

    if (response.success) {
      logger.log('Temperature range alarm created:', response.alarmId);
    }
  } catch (error) {
    logger.error('Error creating temperature range alarm:', error);
  }
};

/**
 * Example 3: Create a digital input alarm (door open/close)
 * Triggers when door status equals "open" (value = 1)
 */
export const createDoorOpenAlarm = async (itemId: string): Promise<void> => {
  try {
    const request: AddAlarmRequestDto = {
      itemId: itemId,
      isDisabled: false,
      alarmDelay: 2, // 2 second delay
      message: 'Unauthorized door access detected',
      messageFa: 'دسترسی غیرمجاز به در شناسایی شد',
      value1: '1', // 1 = Door open (digital value)
      value2: null,
      timeout: 7200, // Auto-acknowledge after 2 hours
      alarmType: AlarmTypeEnum.Comparative,
      alarmPriority: AlarmPriorityEnum.Alarm,
      compareType: CompareTypeEnum.Equal, // Trigger when value equals 1
    };

    const response = await addAlarm(request);

    if (response.success) {
      logger.log('Door open alarm created:', response.alarmId);
    }
  } catch (error) {
    logger.error('Error creating door open alarm:', error);
  }
};

/**
 * Example 4: Create a disabled alarm (for future activation)
 * Useful for creating alarm configurations that will be enabled later
 */
export const createDisabledLowPressureAlarm = async (itemId: string): Promise<void> => {
  try {
    const request: AddAlarmRequestDto = {
      itemId: itemId,
      isDisabled: true, // Alarm is disabled (won't trigger)
      alarmDelay: 0, // No delay
      message: 'Low pressure warning',
      messageFa: 'هشدار فشار پایین',
      value1: '30', // Threshold value (pressure in bar)
      value2: null,
      timeout: null,
      alarmType: AlarmTypeEnum.Comparative,
      alarmPriority: AlarmPriorityEnum.Warning,
      compareType: CompareTypeEnum.Lower, // Trigger when value < threshold
    };

    const response = await addAlarm(request);

    if (response.success) {
      logger.log('Disabled low pressure alarm created:', response.alarmId);
      logger.log('Remember to enable this alarm when ready!');
    }
  } catch (error) {
    logger.error('Error creating disabled alarm:', error);
  }
};

/**
 * Example 5: Create a timeout-based alarm
 * Triggers after a certain time period without value change
 */
export const createTimeoutAlarm = async (itemId: string): Promise<void> => {
  try {
    const request: AddAlarmRequestDto = {
      itemId: itemId,
      isDisabled: false,
      alarmDelay: 0,
      message: 'Sensor has not responded for extended period',
      messageFa: 'سنسور برای مدت طولانی پاسخ نداده است',
      value1: null, // Not used for timeout alarms
      value2: null,
      timeout: 1800, // Trigger after 30 minutes (1800 seconds)
      alarmType: AlarmTypeEnum.Timeout, // Time-based alarm
      alarmPriority: AlarmPriorityEnum.Warning,
      compareType: CompareTypeEnum.Equal, // Required field (use Equal as default)
    };

    const response = await addAlarm(request);

    if (response.success) {
      logger.log('Timeout alarm created:', response.alarmId);
    }
  } catch (error) {
    logger.error('Error creating timeout alarm:', error);
  }
};

/**
 * Example 6: React component usage with form handling
 * Shows how to integrate AddAlarm API in a React component
 */
/*
import React, { useState } from 'react';
import { Button, TextField, Select, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { addAlarm } from '../services/monitoringApi';
import { AlarmTypeEnum, AlarmPriorityEnum, CompareTypeEnum } from '../types/api';
import type { AddAlarmRequestDto } from '../types/api';

export const AddAlarmForm: React.FC<{ itemId: string }> = ({ itemId }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AddAlarmRequestDto>({
    itemId: itemId,
    isDisabled: false,
    alarmDelay: 5,
    message: '',
    messageFa: '',
    value1: '',
    value2: null,
    timeout: null,
    alarmType: AlarmTypeEnum.Comparative,
    alarmPriority: AlarmPriorityEnum.Warning,
    compareType: CompareTypeEnum.Higher,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await addAlarm(formData);
      
      if (response.isSuccessful) {
        alert(t('alarm.addSuccess', { alarmId: response.alarmId }));
        // Reset form or redirect
      } else {
        alert(t('alarm.addError', { message: response.message }));
      }
    } catch (error) {
      alert(t('alarm.addException'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-id-ref="add-alarm-form">
      <TextField
        label={t('alarm.message')}
        value={formData.message || ''}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        fullWidth
        margin="normal"
        data-id-ref="alarm-message-input"
      />
      
      <TextField
        label={t('alarm.messageFa')}
        value={formData.messageFa || ''}
        onChange={(e) => setFormData({ ...formData, messageFa: e.target.value })}
        fullWidth
        margin="normal"
        data-id-ref="alarm-message-fa-input"
      />
      
      <TextField
        label={t('alarm.threshold')}
        value={formData.value1 || ''}
        onChange={(e) => setFormData({ ...formData, value1: e.target.value })}
        type="number"
        fullWidth
        margin="normal"
        data-id-ref="alarm-value1-input"
      />
      
      <Select
        label={t('alarm.priority')}
        value={formData.alarmPriority}
        onChange={(e) => setFormData({ ...formData, alarmPriority: e.target.value as AlarmPriority })}
        fullWidth
        margin="dense"
        data-id-ref="alarm-priority-select"
      >
        <MenuItem value={AlarmPriorityEnum.Warning}>{t('alarm.priority.warning')}</MenuItem>
        <MenuItem value={AlarmPriorityEnum.Alarm}>{t('alarm.priority.critical')}</MenuItem>
      </Select>
      
      <Select
        label={t('alarm.compareType')}
        value={formData.compareType}
        onChange={(e) => setFormData({ ...formData, compareType: e.target.value as CompareType })}
        fullWidth
        margin="dense"
        data-id-ref="alarm-comparetype-select"
      >
        <MenuItem value={CompareTypeEnum.Equal}>{t('alarm.compare.equal')}</MenuItem>
        <MenuItem value={CompareTypeEnum.NotEqual}>{t('alarm.compare.notEqual')}</MenuItem>
        <MenuItem value={CompareTypeEnum.Higher}>{t('alarm.compare.higher')}</MenuItem>
        <MenuItem value={CompareTypeEnum.Lower}>{t('alarm.compare.lower')}</MenuItem>
        <MenuItem value={CompareTypeEnum.Between}>{t('alarm.compare.between')}</MenuItem>
      </Select>
      
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.isDisabled}
            onChange={(e) => setFormData({ ...formData, isDisabled: e.target.checked })}
            data-id-ref="alarm-disabled-checkbox"
          />
        }
        label={t('alarm.disabled')}
      />
      
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        disabled={loading}
        data-id-ref="add-alarm-submit-button"
      >
        {t('common.buttons.submit')}
      </Button>
    </form>
  );
};
*/

/**
 * Key Points:
 * 
 * 1. Enum Usage: Always use the typed enums (AlarmTypeEnum, AlarmPriorityEnum, CompareTypeEnum)
 *    instead of hardcoded numbers for better type safety and code readability.
 * 
 * 2. Validation: The backend validates:
 *    - alarmDelay: 0-3600 seconds (1 hour max)
 *    - message: max 500 characters
 *    - value1/value2: max 100 characters each
 *    - timeout: 0-86400 seconds (24 hours max)
 * 
 * 3. Compare Types:
 *    - Equal: Trigger when value == value1
 *    - NotEqual: Trigger when value != value1
 *    - Higher: Trigger when value > value1
 *    - Lower: Trigger when value < value1
 *    - Between: Trigger when value1 <= value <= value2 (requires both value1 and value2)
 * 
 * 4. Alarm Types:
 *    - Comparative (1): Threshold/value-based alarms (most common)
 *    - Timeout (2): Time-based alarms (triggers after inactivity period)
 * 
 * 5. Priority Levels:
 *    - Warning (1): Lower priority, informational
 *    - Alarm (2): Critical priority, requires immediate attention
 * 
 * 6. Response Handling:
 *    - Always check response.isSuccessful before assuming success
 *    - response.alarmId contains the new alarm's UUID on success
 *    - response.message provides human-readable feedback
 * 
 * 7. Error Handling:
 *    - API throws errors on network failures (caught by handleApiError)
 *    - Backend returns isSuccessful: false for validation errors
 *    - Always wrap calls in try-catch blocks
 */
