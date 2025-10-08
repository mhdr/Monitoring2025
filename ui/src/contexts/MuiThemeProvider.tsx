/**
 * MUI Theme Provider Wrapper
 * Integrates MUI theming with language context for RTL support
 */

import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import CssBaseline from '@mui/material/CssBaseline';
import { useLanguage } from '../hooks/useLanguage';
import { useAppSelector } from '../hooks/useRedux';
import { selectCurrentMuiTheme } from '../store/slices/muiThemeSlice';
import { createMuiTheme } from '../utils/muiThemeUtils';

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
 * MUI Theme Provider with RTL support
 * Automatically switches theme direction based on current language
 */
export function MuiThemeProvider({ children }: MuiThemeProviderProps): React.ReactElement {
  const { language } = useLanguage();
  const currentTheme = useAppSelector(selectCurrentMuiTheme);

  // Determine if RTL based on language
  const isRTL = language === 'fa';

  // Create theme based on current preset and language direction
  const theme = useMemo(() => {
    const direction = isRTL ? 'rtl' : 'ltr';
    return createMuiTheme(currentTheme, direction);
  }, [currentTheme, isRTL]);

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
