import { toPersianDigits } from './numberFormatting';
import { createLogger } from './logger';

const logger = createLogger('dateFormatting');

/**
 * Date Formatting Utilities
 * Global utilities for consistent date and time formatting across the application
 * Supports both Persian (Shamsi/Jalali) and Gregorian calendars
 */

/**
 * Convert input to Date object
 * @param date - Date object, ISO string, or Unix timestamp (seconds or milliseconds)
 * @returns Date object
 */
function toDateObject(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'number') {
    // Check if it's Unix timestamp in seconds (less than year 2100 in milliseconds)
    // Unix timestamps in seconds are typically less than 4000000000
    if (date < 10000000000) {
      return new Date(date * 1000); // Convert seconds to milliseconds
    }
    return new Date(date); // Already in milliseconds
  }
  
  // ISO string
  return new Date(date);
}

/**
 * Format date in Persian long format
 * Format: دوشنبه، ۵ آبان ۱۴۰۴، ساعت ۱۳:۰۳:۴۶
 * (Weekday, Day Month Year, Hour:Minute:Second)
 * 
 * @param date - Date to format (Date object, ISO string, or Unix timestamp)
 * @returns Formatted date string in Persian long format
 * 
 * @example
 * ```typescript
 * formatPersianDateLong(new Date());
 * // => "دوشنبه، ۵ آبان ۱۴۰۴، ساعت ۱۳:۰۳:۴۶"
 * 
 * formatPersianDateLong(1730026426);
 * // => "دوشنبه، ۵ آبان ۱۴۰۴، ساعت ۱۳:۰۳:۴۶"
 * ```
 */
export function formatPersianDateLong(date: Date | string | number): string {
  try {
    const dateObj = toDateObject(date);
    
    // Use formatToParts to get individual date components in correct order
    const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const parts = dateFormatter.formatToParts(dateObj);
    const partsMap: Record<string, string> = {};
    parts.forEach(part => {
      if (part.type !== 'literal') {
        partsMap[part.type] = part.value;
      }
    });
    
    // Manually construct in the format: weekday، day month year
    const datePart = `${partsMap.weekday}، ${partsMap.day} ${partsMap.month} ${partsMap.year}`;
    
    // Format time part
    const timePart = dateObj.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // Combine with "ساعت" (hour) separator and convert to Persian digits
    const formatted = `${datePart}، ساعت ${timePart}`;
    return toPersianDigits(formatted);
  } catch (err) {
    logger.error('Error formatting Persian date (long)', { date, error: err });
    return '-';
  }
}

/**
 * Format date in Persian short format
 * Format: ۱۴۰۴/۸/۵، ۱۳:۰۳:۴۶
 * (YYYY/M/D, HH:MM:SS)
 * 
 * @param date - Date to format (Date object, ISO string, or Unix timestamp)
 * @returns Formatted date string in Persian short format
 * 
 * @example
 * ```typescript
 * formatPersianDateShort(new Date());
 * // => "۱۴۰۴/۸/۵، ۱۳:۰۳:۴۶"
 * 
 * formatPersianDateShort(1730026426);
 * // => "۱۴۰۴/۸/۵، ۱۳:۰۳:۴۶"
 * ```
 */
export function formatPersianDateShort(date: Date | string | number): string {
  try {
    const dateObj = toDateObject(date);
    
    // Format date part with Persian calendar (numeric format)
    const datePart = dateObj.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    // Format time part
    const timePart = dateObj.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // Combine with comma separator and convert to Persian digits
    const formatted = `${datePart}، ${timePart}`;
    return toPersianDigits(formatted);
  } catch (err) {
    logger.error('Error formatting Persian date (short)', { date, error: err });
    return '-';
  }
}

/**
 * Format date in English long format
 * Format: Monday, November 5, 2024, 1:03:46 PM
 * 
 * @param date - Date to format (Date object, ISO string, or Unix timestamp)
 * @returns Formatted date string in English long format
 */
export function formatEnglishDateLong(date: Date | string | number): string {
  try {
    const dateObj = toDateObject(date);
    
    return dateObj.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (err) {
    logger.error('Error formatting English date (long)', { date, error: err });
    return '-';
  }
}

/**
 * Format date in English short format
 * Format: 2024/11/5, 13:03:46
 * 
 * @param date - Date to format (Date object, ISO string, or Unix timestamp)
 * @returns Formatted date string in English short format
 */
export function formatEnglishDateShort(date: Date | string | number): string {
  try {
    const dateObj = toDateObject(date);
    
    const datePart = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    const timePart = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    return `${datePart}, ${timePart}`;
  } catch (err) {
    logger.error('Error formatting English date (short)', { date, error: err });
    return '-';
  }
}

/**
 * Format date based on language and format type
 * This is the main function to use throughout the application
 * 
 * @param date - Date to format (Date object, ISO string, or Unix timestamp)
 * @param language - Language code ('fa' for Persian, 'en' for English)
 * @param format - Format type ('long' or 'short')
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * formatDate(new Date(), 'fa', 'long');
 * // => "دوشنبه، ۵ آبان ۱۴۰۴، ساعت ۱۳:۰۳:۴۶"
 * 
 * formatDate(1730026426, 'fa', 'short');
 * // => "۱۴۰۴/۸/۵، ۱۳:۰۳:۴۶"
 * 
 * formatDate(new Date(), 'en', 'short');
 * // => "2024/11/5, 13:03:46"
 * ```
 */
export function formatDate(
  date: Date | string | number,
  language: 'fa' | 'en',
  format: 'long' | 'short' = 'short'
): string {
  if (language === 'fa') {
    return format === 'long' ? formatPersianDateLong(date) : formatPersianDateShort(date);
  } else {
    return format === 'long' ? formatEnglishDateLong(date) : formatEnglishDateShort(date);
  }
}
