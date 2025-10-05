import React, { useEffect, useRef, useCallback, useState } from 'react';
import jalaali from 'jalaali-js';
import { useLanguage } from '../hooks/useLanguage';

// Declare global jalaliDatepicker
declare global {
  interface Window {
    jalaliDatepicker?: {
      show: (input: HTMLInputElement, options?: Record<string, unknown>) => void;
      hide: () => void;
      startWatch: (options?: Record<string, unknown>) => void;
    };
  }
}

interface SeparatedDateTimePickerProps {
  id: string;
  value: string; // ISO datetime-local string (YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
  'data-id-ref': string;
  className?: string;
  dateLabel?: string;
  timeLabel?: string;
}

/**
 * SeparatedDateTimePicker Component
 * 
 * A bilingual date-time picker with SEPARATED date and time inputs:
 * - Jalali (Shamsi) calendar for dates in Persian mode
 * - Gregorian calendar for dates in English mode
 * - Standard time input (HH:mm) for both modes
 * 
 * This component solves the issue where JalaliDatePicker doesn't support time selection.
 */
const SeparatedDateTimePicker: React.FC<SeparatedDateTimePickerProps> = ({
  id,
  value,
  onChange,
  'data-id-ref': dataIdRef,
  className = '',
  dateLabel,
  timeLabel,
}) => {
  const { language } = useLanguage();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Internal state for date and time parts
  const [dateValue, setDateValue] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('');

  // Parse ISO datetime-local into date and time parts
  const parseIsoDateTime = useCallback((isoString: string): { date: string; time: string } => {
    if (!isoString) return { date: '', time: '' };
    
    const [datePart, timePart] = isoString.split('T');
    return { date: datePart || '', time: timePart || '' };
  }, []);

  // Convert ISO date (YYYY-MM-DD) to Jalali format (YYYY/MM/DD)
  const isoDateToJalali = useCallback((isoDate: string): string => {
    if (!isoDate) return '';
    
    try {
      const [gy, gm, gd] = isoDate.split('-').map(Number);
      const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
      return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error converting ISO date to Jalali:', error);
      return '';
    }
  }, []);

  // Convert Jalali date (YYYY/MM/DD) to ISO format (YYYY-MM-DD)
  const jalaliDateToIso = useCallback((jalaliDate: string): string => {
    if (!jalaliDate) return '';
    
    try {
      const match = jalaliDate.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (!match) return '';

      const [, jy, jm, jd] = match;
      const { gy, gm, gd } = jalaali.toGregorian(
        parseInt(jy),
        parseInt(jm),
        parseInt(jd)
      );
      
      const yyyy = String(gy);
      const mm = String(gm).padStart(2, '0');
      const dd = String(gd).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error('Error converting Jalali date to ISO:', error);
      return '';
    }
  }, []);

  // Combine date and time into ISO datetime-local format
  const combineDateAndTime = useCallback((date: string, time: string): string => {
    if (!date || !time) return '';
    return `${date}T${time}`;
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    const { date, time } = parseIsoDateTime(value);
    
    if (language === 'fa' && date) {
      setDateValue(isoDateToJalali(date));
    } else {
      setDateValue(date);
    }
    
    setTimeValue(time);
  }, [value, language, parseIsoDateTime, isoDateToJalali]);

  // Update date input display when dateValue changes (for Persian mode)
  useEffect(() => {
    if (language === 'fa' && dateInputRef.current && dateValue) {
      dateInputRef.current.value = dateValue;
    }
  }, [language, dateValue]);

  // Listen for changes to the date input (for Persian mode) in case the Jalali picker doesn't call our onChange callback
  useEffect(() => {
    if (language !== 'fa' || !dateInputRef.current) return;
    
    const inputElement = dateInputRef.current;
    
    const handleNativeChange = () => {
      const newJalaliDate = inputElement.value;
      if (newJalaliDate && newJalaliDate !== dateValue) {
        const newIsoDate = jalaliDateToIso(newJalaliDate);
        
        if (newIsoDate) {
          setDateValue(newJalaliDate);
          const newIsoDateTime = combineDateAndTime(newIsoDate, timeValue);
          if (newIsoDateTime) {
            onChange(newIsoDateTime);
          }
        }
      }
    };
    
    // Listen to the native 'change' event
    inputElement.addEventListener('change', handleNativeChange);
    
    return () => {
      inputElement.removeEventListener('change', handleNativeChange);
    };
  }, [language, dateValue, timeValue, jalaliDateToIso, combineDateAndTime, onChange]);

  // Load JalaliDatePicker script on mount
  useEffect(() => {
    if (language !== 'fa') return;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (window.jalaliDatepicker) {
          resolve();
          return;
        }

        // Check if script element exists
        const scriptId = 'jalali-datepicker-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;

        if (script) {
          // Script is loading, wait for it
          const checkLoaded = setInterval(() => {
            if (window.jalaliDatepicker) {
              clearInterval(checkLoaded);
              resolve();
            }
          }, 50);
          return;
        }

        // Create and load the script
        script = document.createElement('script');
        script.id = scriptId;
        script.src = '/lib/jalalidatepicker/jalalidatepicker.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load JalaliDatePicker'));
        document.head.appendChild(script);
      });
    };

    loadScript().catch((error) => {
      console.error('Error loading JalaliDatePicker:', error);
    });
  }, [language]);

  // Handle date change in Persian mode (from JalaliDatePicker)
  const handleJalaliDateChange = useCallback(() => {
    if (!dateInputRef.current) return;
    
    const newJalaliDate = dateInputRef.current.value;
    const newIsoDate = jalaliDateToIso(newJalaliDate);
    
    if (newIsoDate) {
      setDateValue(newJalaliDate);
      const newIsoDateTime = combineDateAndTime(newIsoDate, timeValue);
      if (newIsoDateTime) {
        onChange(newIsoDateTime);
      }
    }
  }, [jalaliDateToIso, timeValue, combineDateAndTime, onChange]);

  // Handle date change in English mode
  const handleGregorianDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateValue(newDate);
    
    const newIsoDateTime = combineDateAndTime(newDate, timeValue);
    if (newIsoDateTime) {
      onChange(newIsoDateTime);
    }
  };

  // Handle time change (works for both modes)
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    
    // Get the ISO date (convert from Jalali if needed)
    let isoDate = dateValue;
    if (language === 'fa' && dateValue) {
      isoDate = jalaliDateToIso(dateValue);
    }
    
    const newIsoDateTime = combineDateAndTime(isoDate, newTime);
    if (newIsoDateTime) {
      onChange(newIsoDateTime);
    }
  };

  // Show Jalali date picker
  const showJalaliPicker = useCallback((e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (!window.jalaliDatepicker || !dateInputRef.current) {
      console.warn('JalaliDatePicker not loaded yet');
      return;
    }

    window.jalaliDatepicker.show(dateInputRef.current, {
      time: false, // Only date selection
      date: true,
      autoHide: true,
      hideAfterChange: true,
      persianDigits: true,
      initDate: dateInputRef.current.value || undefined,
      onChange: handleJalaliDateChange,
    });
  }, [handleJalaliDateChange]);

  if (language === 'fa') {
    // Persian mode: Jalali date picker + time input
    return (
      <div className={className} data-id-ref={`${dataIdRef}-container`}>
        <div className="row g-2">
          {/* Jalali Date Input */}
          <div className="col-12 col-sm-6">
            {dateLabel && (
              <label htmlFor={`${id}-date`} className="form-label small mb-1" data-id-ref={`${dataIdRef}-date-label`}>
                {dateLabel}
              </label>
            )}
            <input
              ref={dateInputRef}
              type="text"
              className="form-control form-control-sm"
              id={`${id}-date`}
              data-id-ref={`${dataIdRef}-date`}
              placeholder="____/__/__"
              onClick={showJalaliPicker}
              onFocus={showJalaliPicker}
              readOnly
            />
          </div>
          
          {/* Time Input */}
          <div className="col-12 col-sm-6">
            {timeLabel && (
              <label htmlFor={`${id}-time`} className="form-label small mb-1" data-id-ref={`${dataIdRef}-time-label`}>
                {timeLabel}
              </label>
            )}
            <input
              type="time"
              className="form-control form-control-sm"
              id={`${id}-time`}
              value={timeValue}
              onChange={handleTimeChange}
              data-id-ref={`${dataIdRef}-time`}
            />
          </div>
        </div>
      </div>
    );
  }

  // English mode: Gregorian date input + time input
  return (
    <div className={className} data-id-ref={`${dataIdRef}-container`}>
      <div className="row g-2">
        {/* Date Input */}
        <div className="col-12 col-sm-6">
          {dateLabel && (
            <label htmlFor={`${id}-date`} className="form-label small mb-1" data-id-ref={`${dataIdRef}-date-label`}>
              {dateLabel}
            </label>
          )}
          <input
            type="date"
            className="form-control form-control-sm"
            id={`${id}-date`}
            value={dateValue}
            onChange={handleGregorianDateChange}
            data-id-ref={`${dataIdRef}-date`}
          />
        </div>
        
        {/* Time Input */}
        <div className="col-12 col-sm-6">
          {timeLabel && (
            <label htmlFor={`${id}-time`} className="form-label small mb-1" data-id-ref={`${dataIdRef}-time-label`}>
              {timeLabel}
            </label>
          )}
          <input
            type="time"
            className="form-control form-control-sm"
            id={`${id}-time`}
            value={timeValue}
            onChange={handleTimeChange}
            data-id-ref={`${dataIdRef}-time`}
          />
        </div>
      </div>
    </div>
  );
};

export default SeparatedDateTimePicker;
