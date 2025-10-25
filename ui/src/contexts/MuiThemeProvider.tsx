/**
 * MUI Theme Provider Wrapper
 * Integrates MUI theming with language context for RTL support
 */

import { useMemo, useState, useEffect, useCallback, createContext } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import CssBaseline from '@mui/material/CssBaseline';
import { useLanguage } from '../hooks/useLanguage';
import { createMuiTheme } from '../utils/muiThemeUtils';
import { getDefaultMuiTheme } from '../types/muiThemes';
import type { MuiThemePreset } from '../types/muiThemes';
import { getItem, setItem } from '../utils/indexedDbStorage';
import { createLogger } from '../utils/logger';

const logger = createLogger('MuiThemeProvider');

const THEME_STORAGE_KEY = 'muiTheme_currentTheme';

/**
 * MUI Theme Context
 */
interface MuiThemeContextType {
  currentTheme: MuiThemePreset;
  setTheme: (theme: MuiThemePreset) => Promise<void>;
}

export const MuiThemeContext = createContext<MuiThemeContextType | undefined>(undefined);

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
  const [currentTheme, setCurrentTheme] = useState<MuiThemePreset>(getDefaultMuiTheme());

  // Initialize theme from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await getItem<MuiThemePreset>(THEME_STORAGE_KEY);
        if (storedTheme) {
          setCurrentTheme(storedTheme);
          logger.log('Theme loaded from IndexedDB:', storedTheme);
        }
      } catch (error) {
        logger.error('Failed to load theme from IndexedDB:', error);
      }
    })();
  }, []);

  // Function to update theme and persist to IndexedDB
  const setTheme = useCallback(async (theme: MuiThemePreset) => {
    setCurrentTheme(theme);
    try {
      await setItem(THEME_STORAGE_KEY, theme);
      logger.log('Theme saved to IndexedDB:', theme);
    } catch (error) {
      logger.error('Failed to save theme to IndexedDB:', error);
    }
  }, []);

  // Determine if RTL based on language
  const isRTL = language === 'fa';

  // Create theme based on current preset and language direction
  const theme = useMemo(() => {
    const direction = isRTL ? 'rtl' : 'ltr';
    const newTheme = createMuiTheme(currentTheme, direction);
    logger.log('[MuiThemeProvider] Theme created:', {
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

  // Context value
  const contextValue = useMemo(
    () => ({ currentTheme, setTheme }),
    [currentTheme, setTheme]
  );

  // Render immediately with default theme to prevent blocking app initialization
  // Theme will update from IndexedDB when isInitialized becomes true
  return (
    <MuiThemeContext.Provider value={contextValue}>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </MuiThemeContext.Provider>
  );
}
