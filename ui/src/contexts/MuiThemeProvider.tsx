/**
 * MUI Theme Provider Wrapper
 * Provides MUI theming with RTL support based on language
 * No React Context - uses Zustand stores directly
 */

import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import CssBaseline from '@mui/material/CssBaseline';
import { useLanguageStore } from '../stores/languageStore';
import { useThemeStore } from '../stores/themeStore';
import { createMuiTheme } from '../utils/muiThemeUtils';
import { createLogger } from '../utils/logger';

const logger = createLogger('MuiThemeWrapper');

/**
 * Create RTL cache for Persian language
 */
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

/**
 * Create LTR cache for English language
 */
const cacheLtr = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
});

interface MuiThemeProviderProps {
  children: React.ReactNode;
}

/**
 * MUI Theme Wrapper with RTL support
 * Automatically switches theme direction based on current language
 * Uses Zustand stores directly - no Context API needed
 */
export function MuiThemeWrapper({ children }: MuiThemeProviderProps): React.ReactElement {
  const language = useLanguageStore((state) => state.language);
  const currentTheme = useThemeStore((state) => state.currentTheme);

  // Determine if RTL based on language
  const isRTL = language === 'fa';

  // Create theme based on current preset and language direction
  const theme = useMemo(() => {
    const direction = isRTL ? 'rtl' : 'ltr';
    const newTheme = createMuiTheme(currentTheme, direction);
    logger.log('[MuiThemeWrapper] Theme created:', {
      currentTheme,
      direction,
      language,
      isRTL,
      themeDirection: newTheme.direction
    });
    return newTheme;
  }, [currentTheme, isRTL, language]);

  // Select appropriate cache based on direction
  const cache = isRTL ? cacheRtl : cacheLtr;

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

/**
 * @deprecated Use MuiThemeWrapper instead
 * Legacy export for backward compatibility
 */
export const MuiThemeProvider = MuiThemeWrapper;
