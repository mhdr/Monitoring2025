# i18next Migration - Summary

## What Was Done

### Problem
The project had **two separate translation systems**:
1. **`src/utils/translations.ts`** - Custom translation object with hardcoded translations
2. **`public/locales/`** - i18next JSON files (but i18next was installed but not configured)

This caused confusion and maintenance issues.

### Solution
Migrated everything to use **i18next** properly with react-i18next integration.

## Changes Made

### 1. Created i18next Configuration
**File**: `src/i18n/config.ts`

- Configured i18next with HTTP backend to load translations from `public/locales/`
- Set up language detection (localStorage + browser)
- Set Persian (fa) as the default language
- Enabled automatic translation loading

### 2. Consolidated All Translations
**Files**: 
- `public/locales/fa/translation.json` (Persian translations)
- `public/locales/en/translation.json` (English translations)

All translations from both the old `translations.ts` and `monitoring.json` files were merged into these comprehensive translation files.

### 3. Updated Application Bootstrap
**File**: `src/main.tsx`

Added `import './i18n/config'` to initialize i18next before React renders.

### 4. Updated Custom Hooks
**File**: `src/hooks/useTranslation.ts`

Replaced custom translation logic with a thin wrapper around react-i18next's `useTranslation` hook for compatibility.

### 5. Updated Language Context
**File**: `src/contexts/LanguageContext.tsx`

Modified to use i18next's `changeLanguage()` method and listen to language change events. Now properly syncs with i18next state.

### 6. Updated Redux Language Slice
**File**: `src/store/slices/languageSlice.ts`

Updated to use i18next for language changes instead of the old translations object. Also uses `i18nextLng` localStorage key for consistency.

### 7. Cleaned Up Old Files
- Removed `public/locales/fa/monitoring.json`
- Removed `public/locales/en/monitoring.json`
- Updated `src/utils/translations.ts` to only export types (kept for backward compatibility)

## How to Use

### In Components
```tsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t, language } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('systemDescription')}</p>
    </div>
  );
}
```

### Changing Language
```tsx
import { useLanguage } from '../hooks/useLanguage';

function LanguageSwitcher() {
  const { changeLanguage, language } = useLanguage();
  
  return (
    <button onClick={() => changeLanguage(language === 'fa' ? 'en' : 'fa')}>
      Switch Language
    </button>
  );
}
```

### Adding New Translations
1. Add the key and value to `public/locales/fa/translation.json`
2. Add the key and value to `public/locales/en/translation.json`
3. Use it in components with `t('yourNewKey')`

## Benefits

✅ **Single source of truth** - All translations in one place  
✅ **Easier maintenance** - JSON files are easier to edit than TypeScript  
✅ **Better performance** - Lazy loading of translations  
✅ **Industry standard** - Using the most popular i18n library  
✅ **Better tooling** - i18next has excellent debugging tools  
✅ **Namespace support** - Can organize translations by feature  
✅ **Automatic language detection** - Detects user's preferred language  

## Translation File Structure

All translations are now in:
```
public/
  locales/
    fa/
      translation.json  (Persian - Primary language)
    en/
      translation.json  (English)
```

## Configuration Details

- **Default Language**: Persian (fa)
- **Fallback Language**: Persian (fa)
- **Language Detection**: localStorage → browser navigator
- **Storage Key**: `i18nextLng`
- **Translation Loading**: HTTP backend from `/locales/{{lng}}/{{ns}}.json`

## RTL Support

The application automatically handles RTL/LTR switching:
- Persian (fa) → RTL layout
- English (en) → LTR layout

Document properties are updated automatically:
- `document.documentElement.dir` → 'rtl' or 'ltr'
- `document.documentElement.lang` → 'fa' or 'en'
- `document.body.className` → 'rtl' or 'ltr'
