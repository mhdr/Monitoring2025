# Quick Test Guide for Jalali Date Picker

## Testing the Implementation

### Prerequisites
1. The application should be running on `https://localhost:5174` (or your Vite dev server port)
2. You should have access to both English and Persian language modes

### Test 1: English Mode (Baseline)
1. Open the application in English mode
2. Navigate to **Dashboard → Monitoring → Select any item → Trend Analysis** (or use direct URL with itemId query parameter)
3. Click the **"Custom Range"** button
4. Verify:
   - ✅ Two datetime-local inputs appear for "Start Date" and "End Date"
   - ✅ Clicking on the inputs opens the standard browser date picker
   - ✅ Selected dates are in Gregorian calendar
   - ✅ Date format is `YYYY-MM-DD HH:mm`

### Test 2: Persian Mode (Jalali Calendar)
1. Switch language to Persian (click "فارسی" in the language switcher)
2. Navigate to **داشبورد → مانیتورینگ → Select any item → تحلیل روند**
3. Click the **"بازه سفارشی"** button
4. Verify:
   - ✅ Two text inputs appear for "تاریخ شروع" and "تاریخ پایان"
   - ✅ Inputs are read-only (cannot type directly)
   - ✅ Clicking on the inputs opens the Jalali calendar picker
   - ✅ Calendar shows Persian month names:
     - فروردین، اردیبهشت، خرداد، تیر، مرداد، شهریور
     - مهر، آبان، آذر، دی، بهمن، اسفند
   - ✅ Time selector appears with hour and minute dropdowns
   - ✅ Date format is `YYYY/MM/DD HH:mm` (Shamsi calendar)
   - ✅ Selecting a date closes the picker and fills the input

### Test 3: Date Conversion Accuracy
1. In English mode, set custom range:
   - Start: `2025-10-05T00:00` (October 5, 2025)
   - End: `2025-10-15T23:59` (October 15, 2025)
2. Switch to Persian mode
3. Verify dates are converted correctly:
   - Start: `1404/07/13 00:00` (13 Mehr 1404)
   - End: `1404/07/23 23:59` (23 Mehr 1404)
4. Switch back to English mode
5. Verify dates remain:
   - Start: `2025-10-05T00:00`
   - End: `2025-10-15T23:59`

### Test 4: Data Fetch Functionality
1. In Persian mode with custom range selected
2. Select a Jalali date range (e.g., last week in Shamsi calendar)
3. Click **"تازه‌سازی"** (Refresh) button
4. Verify:
   - ✅ Loading spinner appears
   - ✅ Chart data is fetched from API
   - ✅ Chart displays correctly with the selected date range
   - ✅ No console errors in browser DevTools

### Test 5: Edge Cases
1. **Empty State**: Click custom range without selecting dates - should handle gracefully
2. **Invalid Range**: Select end date before start date - should show error message
3. **Language Switch Mid-Selection**: 
   - Open date picker in Persian mode
   - Switch language while picker is open
   - Verify no crashes or errors

### Expected Behavior Summary

| Mode    | Input Type          | Date Format          | Calendar Type | Editable |
|---------|---------------------|----------------------|---------------|----------|
| English | `datetime-local`    | `2025-10-05T14:30`   | Gregorian     | Yes      |
| Persian | `text` + JDP plugin | `1404/07/13 14:30`   | Jalali        | No*      |

*Read-only input that opens calendar picker on click

## Browser Console Verification

Open browser DevTools (F12) and check:
- ✅ No TypeScript/React errors in Console tab
- ✅ Network requests to API show correct Unix timestamps
- ✅ Date conversion logs (if any) show correct values

## Common Issues and Solutions

### Issue: Calendar picker doesn't open in Persian mode
- **Solution**: Check browser console for JavaScript errors
- **Verify**: JalaliDatePicker CSS is loaded (`@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css`)

### Issue: Dates don't convert correctly between calendars
- **Solution**: Check `jalaali-js` library is installed: `npm list jalaali-js`
- **Verify**: Conversion functions in `JalaliDateTimePicker.tsx` are using correct API

### Issue: Calendar appears in wrong position (off-screen)
- **Solution**: This is a known issue with JalaliDatePicker library - it should auto-adjust
- **Workaround**: Scroll page to bring input into better view before clicking

### Issue: Persian digits not showing
- **Solution**: The `persianDigits` option is set to `true` in the component
- **Note**: This is controlled by the JalaliDatePicker library configuration

## Screenshot Checklist

When testing, take screenshots of:
1. ✅ English mode custom date inputs
2. ✅ Persian mode custom date inputs
3. ✅ Jalali calendar picker opened and showing Persian months
4. ✅ Chart displaying data with custom Jalali date range
5. ✅ Browser console showing no errors

---

**Test Completion**: Mark each test as ✅ when passed, ❌ if failed  
**Report Issues**: Document any failures with browser, date range used, and error messages
