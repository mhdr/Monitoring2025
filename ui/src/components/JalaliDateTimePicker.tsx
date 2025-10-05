import React, { useEffect, useRef, useCallback } from 'react';
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

interface JalaliDateTimePickerProps {
  id: string;
  value: string; // ISO datetime-local string (YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
  'data-id-ref': string;
  className?: string;
  label?: string;
}

/**
 * JalaliDateTimePicker Component
 * 
 * A bilingual date-time picker that displays:
 * - Jalali (Shamsi) calendar in Persian mode
 * - Gregorian calendar in English mode
 * 
 * Uses @majidh1/jalalidatepicker for Jalali calendar support
 * and jalaali-js for accurate calendar conversion.
 */
const JalaliDateTimePicker: React.FC<JalaliDateTimePickerProps> = ({
  id,
  value,
  onChange,
  'data-id-ref': dataIdRef,
  className = '',
  label,
}) => {
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert ISO datetime-local to Jalali format (YYYY/MM/DD HH:mm)
  const isoToJalali = useCallback((isoString: string): string => {
    if (!isoString) return '';
    
    try {
      // Parse datetime-local format: YYYY-MM-DDTHH:mm
      const [datePart, timePart] = isoString.split('T');
      const [gy, gm, gd] = datePart.split('-').map(Number);
      
      // Convert Gregorian to Jalali
      const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
      
      // Format: YYYY/MM/DD HH:mm
      const jalaliDate = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
      return timePart ? `${jalaliDate} ${timePart}` : jalaliDate;
    } catch (error) {
      console.error('Error converting ISO to Jalali:', error);
      return '';
    }
  }, []);

  // Convert Jalali format to ISO datetime-local format
  const jalaliToIso = useCallback((jalaliString: string): string => {
    if (!jalaliString) return '';
    
    try {
      // Parse Jalali date string (format: YYYY/MM/DD HH:mm or YYYY/MM/DD)
      const match = jalaliString.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
      if (!match) return '';

      const [, jy, jm, jd, hour = '00', minute = '00'] = match;
      
      // Convert Jalali to Gregorian
      const { gy, gm, gd } = jalaali.toGregorian(
        parseInt(jy),
        parseInt(jm),
        parseInt(jd)
      );
      
      // Format to datetime-local format (YYYY-MM-DDTHH:mm)
      const yyyy = String(gy);
      const mm = String(gm).padStart(2, '0');
      const dd = String(gd).padStart(2, '0');
      const hh = String(hour).padStart(2, '0');
      const min = String(minute).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch (error) {
      console.error('Error converting Jalali to ISO:', error);
      return '';
    }
  }, []);

  // Initialize JalaliDatePicker for Persian mode
  useEffect(() => {
    if (language !== 'fa' || !inputRef.current) return;

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

    const initializePicker = async () => {
      try {
        await loadScript();

        if (!window.jalaliDatepicker || !inputRef.current) {
          console.error('JalaliDatePicker not available');
          return;
        }

        // Clean up any existing instance
        try {
          window.jalaliDatepicker.hide();
        } catch {
          // Ignore cleanup errors
        }

        // Set initial value
        const jalaliValue = isoToJalali(value);
        if (inputRef.current) {
          inputRef.current.value = jalaliValue;
        }

        // Initialize the date picker
        window.jalaliDatepicker.show(inputRef.current, {
          time: true,
          date: true,
          autoHide: true,
          hideAfterChange: true,
          persianDigits: true,
          initDate: jalaliValue || undefined,
          onChange: () => {
            if (inputRef.current) {
              const newJalaliValue = inputRef.current.value;
              const newIsoValue = jalaliToIso(newJalaliValue);
              onChange(newIsoValue);
            }
          },
        });
      } catch (error) {
        console.error('Error initializing JalaliDatePicker:', error);
      }
    };

    initializePicker();

    // Cleanup function
    return () => {
      if (window.jalaliDatepicker) {
        try {
          window.jalaliDatepicker.hide();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [language, value, onChange, isoToJalali, jalaliToIso]);

  // Handle change for Gregorian mode
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (language === 'fa') {
    // Jalali mode
    return (
      <div className={className}>
        {label && (
          <label htmlFor={id} className="form-label small mb-1" data-id-ref={`${dataIdRef}-label`}>
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          type="text"
          className="form-control form-control-sm"
          id={id}
          data-id-ref={dataIdRef}
          readOnly
          placeholder="____/__/__ __:__"
        />
      </div>
    );
  }

  // Gregorian mode (English)
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="form-label small mb-1" data-id-ref={`${dataIdRef}-label`}>
          {label}
        </label>
      )}
      <input
        type="datetime-local"
        className="form-control form-control-sm"
        id={id}
        value={value}
        onChange={handleChange}
        data-id-ref={dataIdRef}
      />
    </div>
  );
};

export default JalaliDateTimePicker;
