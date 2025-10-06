/**
 * Number Formatting Utilities
 * Utilities for formatting numbers with locale-specific formatting
 * including Persian digit conversion
 */

/**
 * Persian digit characters (۰-۹)
 */
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Persian thousand separator (U+066C: Arabic Thousands Separator)
 */
const PERSIAN_THOUSAND_SEPARATOR = '٬';

/**
 * Persian decimal separator (U+066B: Arabic Decimal Separator)
 */
const PERSIAN_DECIMAL_SEPARATOR = '٫';

/**
 * Converts English/Western digits (0-9) to Persian digits (۰-۹)
 * @param str - String containing digits to convert
 * @returns String with Persian digits
 */
export function toPersianDigits(str: string | number): string {
  const strValue = String(str);
  return strValue.replace(/\d/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)]);
}

/**
 * Converts Persian digits (۰-۹) to English/Western digits (0-9)
 * @param str - String containing Persian digits to convert
 * @returns String with English digits
 */
export function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (digit) => {
    return String(PERSIAN_DIGITS.indexOf(digit));
  });
}

/**
 * Formats a number for display in Persian locale with proper digit conversion
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted string with Persian digits and separators
 */
export function formatPersianNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }

  // Format using English locale first to get proper decimal/thousand separators
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    ...options,
  });

  // Convert to Persian
  return toPersianDigits(formatted)
    .replace(/,/g, PERSIAN_THOUSAND_SEPARATOR)
    .replace(/\./g, PERSIAN_DECIMAL_SEPARATOR);
}

/**
 * Formats a number for display in English locale
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted string
 */
export function formatEnglishNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }

  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    ...options,
  });
}

/**
 * Formats a number based on the current language
 * @param value - Number to format
 * @param language - Current language ('fa' or 'en')
 * @param options - Intl.NumberFormat options
 * @returns Formatted string
 */
export function formatNumberByLanguage(
  value: number | string | null | undefined,
  language: 'fa' | 'en',
  options?: Intl.NumberFormatOptions
): string {
  if (language === 'fa') {
    return formatPersianNumber(value, options);
  }
  return formatEnglishNumber(value, options);
}

/**
 * Creates a value formatter function for AG Grid that formats numbers
 * based on the current language
 * @param language - Current language ('fa' or 'en')
 * @param options - Intl.NumberFormat options
 * @returns AG Grid value formatter function
 */
export function createAGGridNumberFormatter(
  language: 'fa' | 'en',
  options?: Intl.NumberFormatOptions
) {
  return (params: Record<string, unknown>): string => {
    const rawValue = params.value;
    
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return '-';
    }
    
    const value = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
    
    if (isNaN(value)) {
      return '-';
    }
    
    return formatNumberByLanguage(value, language, options);
  };
}

/**
 * Formats a date for display in Persian or English
 * @param date - Date to format
 * @param language - Current language ('fa' or 'en')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateByLanguage(
  date: Date | number | string,
  language: 'fa' | 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  const formatted = dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  });

  // Convert digits to Persian if needed
  return language === 'fa' ? toPersianDigits(formatted) : formatted;
}
