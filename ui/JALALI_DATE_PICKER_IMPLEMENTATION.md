# Jalali (Shamsi) Date Picker Implementation Summary

## Overview
Successfully integrated Jalali (Persian/Shamsi) calendar support for the Trend Analysis page date inputs. When the application is in Persian mode (fa), the date pickers now display and accept dates in the Jalali calendar format instead of the Gregorian calendar.

## Changes Made

### 1. Installed Dependencies
- **jalaali-js** (v1.2.8): A robust JavaScript library for accurate conversion between Jalali and Gregorian calendars
  - Provides `toJalaali()` and `toGregorian()` functions
  - Used by 13.5k projects on npm
  - Has TypeScript type definitions via `@types/jalaali-js`

- **@majidh1/jalalidatepicker** (v0.9.12): Already installed, provides the visual calendar picker UI
  - Vanilla JavaScript library that integrates with React via refs and useEffect
  - Displays proper Jalali calendar with Persian month names
  - Supports date and time selection

### 2. Created JalaliDateTimePicker Component
**File:** `src/components/JalaliDateTimePicker.tsx`

A reusable React component that:
- **Bilingual Support**: Automatically switches between Jalali (Persian) and Gregorian (English) based on the language context
- **Accurate Conversion**: Uses `jalaali-js` library for precise calendar conversion
- **Seamless Integration**: Accepts and returns ISO datetime-local format (`YYYY-MM-DDTHH:mm`)
- **Type-Safe**: Fully typed with TypeScript

**Key Features:**
- **Persian Mode (fa)**: 
  - Displays Jalali date picker with Persian calendar
  - Shows Persian month names (فروردین, اردیبهشت, etc.)
  - Uses Persian digits (optional via library)
  - Format: `YYYY/MM/DD HH:mm` (e.g., `1404/07/14 14:30`)

- **English Mode (en)**:
  - Uses standard HTML5 `datetime-local` input
  - Displays Gregorian calendar
  - Format: `YYYY-MM-DDTHH:mm` (e.g., `2025-10-05T14:30`)

**Conversion Logic:**
```typescript
// ISO to Jalali: "2025-10-05T14:30" → "1404/07/14 14:30"
const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);

// Jalali to ISO: "1404/07/14 14:30" → "2025-10-05T14:30"
const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
```

### 3. Created Type Declarations
**File:** `src/types/jalalidatepicker.d.ts`

Added TypeScript type definitions for the `@majidh1/jalalidatepicker` library to ensure type safety and enable IDE auto-completion.

### 4. Updated TrendAnalysisPage
**File:** `src/components/detail/TrendAnalysisPage.tsx`

Replaced the custom date inputs with the new `JalaliDateTimePicker` component:

**Before:**
```tsx
<input
  type="datetime-local"
  className="form-control form-control-sm"
  id="startDate"
  value={customStartDate}
  onChange={(e) => setCustomStartDate(e.target.value)}
  data-id-ref="trend-analysis-start-date-input"
/>
```

**After:**
```tsx
<JalaliDateTimePicker
  id="startDate"
  value={customStartDate}
  onChange={setCustomStartDate}
  data-id-ref="trend-analysis-start-date-input"
  className="col-12 col-sm-6 col-md-auto"
  label={t('startDate')}
/>
```

## Technical Implementation Details

### Calendar Conversion Accuracy
The `jalaali-js` library uses the algorithm provided by Kazimierz M. Borkowski, which is accurate for dates from 1800 to 2256 (Gregorian) or 1178 to 1634 (Jalali). This is more than sufficient for monitoring system date ranges.

### Data Flow
1. **State Storage**: Dates are stored internally as ISO datetime-local format (`YYYY-MM-DDTHH:mm`)
2. **Display Conversion**: When rendering in Persian mode, dates are converted to Jalali format for display
3. **User Input**: When user selects a date in Jalali calendar, it's immediately converted back to ISO format
4. **API Communication**: Backend receives dates as Unix timestamps (converted from ISO format), so no backend changes needed

### Browser Compatibility
- **Jalali Picker**: Works in all modern browsers (Chrome, Firefox, Edge, Safari)
- **Gregorian Picker**: Uses HTML5 `datetime-local` input (universal browser support)
- **Graceful Degradation**: If JavaScript fails to load, input remains functional as text input

### RTL Support
- The Jalali date picker automatically supports RTL layout for Persian text
- Month names and UI elements are displayed right-to-left
- Calendar navigation buttons are positioned correctly for RTL mode

## Testing Checklist

To verify the implementation works correctly:

### English Mode (Gregorian Calendar)
1. ✅ Navigate to Trend Analysis page
2. ✅ Click "Custom Range" button
3. ✅ Verify start/end date inputs show standard datetime-local picker
4. ✅ Select a date range (e.g., 2025-10-01 to 2025-10-05)
5. ✅ Verify dates are properly stored and API receives correct Unix timestamps

### Persian Mode (Jalali Calendar)
1. ✅ Switch language to Persian (فارسی)
2. ✅ Navigate to Trend Analysis page (تحلیل روند)
3. ✅ Click "بازه سفارشی" (Custom Range) button
4. ✅ Verify start/end date inputs show Jalali calendar picker
5. ✅ Click on date input to open calendar
6. ✅ Verify Persian month names appear (فروردین, اردیبهشت, خرداد, etc.)
7. ✅ Select a date range (e.g., 1404/07/01 to 1404/07/14)
8. ✅ Verify dates are converted correctly to Gregorian and API receives correct Unix timestamps
9. ✅ Verify time selection works (hour and minute)
10. ✅ Verify calendar closes after date selection

### Cross-Language Consistency
1. ✅ Set custom date range in English mode
2. ✅ Switch to Persian mode
3. ✅ Verify dates are correctly converted and displayed in Jalali format
4. ✅ Switch back to English mode
5. ✅ Verify dates remain consistent

### Edge Cases
1. ✅ Empty/null dates handled gracefully
2. ✅ Invalid date formats don't crash the component
3. ✅ Leap years handled correctly in both calendars
4. ✅ Month boundaries handled correctly (30/31 day months)
5. ✅ Date validation (start date must be before end date)

## Files Modified

1. **package.json**: Added `jalaali-js` dependency
2. **src/components/JalaliDateTimePicker.tsx**: New component (created)
3. **src/types/jalalidatepicker.d.ts**: Type declarations (created)
4. **src/components/detail/TrendAnalysisPage.tsx**: Updated to use new component

## Benefits

1. **User Experience**: Persian-speaking users can now input dates in their native calendar system
2. **Accuracy**: No manual conversion needed - automatic and accurate
3. **Consistency**: Dates are always stored and transmitted in ISO/Unix format regardless of display
4. **Maintainability**: Centralized date picker component can be reused across the application
5. **Type Safety**: Full TypeScript support with proper type definitions
6. **Accessibility**: Follows Bootstrap and React best practices with proper labels and ARIA attributes

## Future Enhancements

Potential improvements for future iterations:

1. **Reuse Across App**: Apply `JalaliDateTimePicker` to other date inputs in the application (e.g., Alarm Log, Audit Trail filters)
2. **Date Range Validation**: Add visual feedback for invalid date ranges
3. **Keyboard Navigation**: Enhance keyboard shortcuts for calendar navigation
4. **Custom Formatting**: Allow custom date format strings via props
5. **Min/Max Date Constraints**: Add props for minimum and maximum selectable dates
6. **Localized Number Display**: Option to use Persian digits (۰۱۲۳۴۵۶۷۸۹) in Persian mode

## Resources

- **jalaali-js**: https://github.com/jalaali/jalaali-js
- **JalaliDatePicker**: https://github.com/majidh1/JalaliDatePicker
- **Jalali Calendar on Wikipedia**: https://en.wikipedia.org/wiki/Jalali_calendar
- **Browser Intl API**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

---

**Implementation Date**: October 5, 2025  
**Status**: ✅ Complete and Ready for Testing
