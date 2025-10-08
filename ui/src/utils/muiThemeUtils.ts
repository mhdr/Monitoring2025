/**
 * MUI Theme Utilities
 * Creates and configures Material-UI themes
 */

import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { getMuiThemeConfig } from '../types/muiThemes';
import type { MuiThemePreset } from '../types/muiThemes';

/**
 * Create a MUI theme based on preset and language direction
 */
export function createMuiTheme(themePreset: MuiThemePreset, direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  const config = getMuiThemeConfig(themePreset);

  return createTheme({
    direction,
    palette: {
      mode: config.mode,
      primary: {
        main: config.primary,
      },
      secondary: {
        main: config.secondary,
      },
      ...(config.error && {
        error: {
          main: config.error,
        },
      }),
      ...(config.warning && {
        warning: {
          main: config.warning,
        },
      }),
      ...(config.info && {
        info: {
          main: config.info,
        },
      }),
      ...(config.success && {
        success: {
          main: config.success,
        },
      }),
      ...(config.background && {
        background: config.background,
      }),
    },
    typography: {
      fontFamily: [
        // Persian fonts
        'IRANSansX',
        // English fonts
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      // Responsive font sizes
      h1: {
        fontSize: '2.5rem',
        '@media (max-width:600px)': {
          fontSize: '2rem',
        },
      },
      h2: {
        fontSize: '2rem',
        '@media (max-width:600px)': {
          fontSize: '1.75rem',
        },
      },
      h3: {
        fontSize: '1.75rem',
        '@media (max-width:600px)': {
          fontSize: '1.5rem',
        },
      },
      h4: {
        fontSize: '1.5rem',
        '@media (max-width:600px)': {
          fontSize: '1.25rem',
        },
      },
      h5: {
        fontSize: '1.25rem',
        '@media (max-width:600px)': {
          fontSize: '1.1rem',
        },
      },
      h6: {
        fontSize: '1rem',
        '@media (max-width:600px)': {
          fontSize: '0.95rem',
        },
      },
    },
    spacing: 8, // Base spacing unit (8px)
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // Don't uppercase button text
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          elevation1: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
          elevation2: {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
          elevation3: {
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0, // Keep drawer edges square
          },
        },
      },
    },
    // Custom breakpoints matching Bootstrap
    breakpoints: {
      values: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
      },
    },
  });
}

/**
 * Get current theme colors for use in charts, etc.
 */
export function getCurrentThemeColors(theme: Theme): {
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  background: string;
  paper: string;
  text: string;
} {
  return {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    background: theme.palette.background.default,
    paper: theme.palette.background.paper,
    text: theme.palette.text.primary,
  };
}
