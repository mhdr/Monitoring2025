/**
 * Bootswatch Theme Loader Utility
 * 
 * This utility dynamically loads Bootswatch CSS files from local node_modules.
 * 
 * All theme files are bundled offline for use without internet access.
 * 
 * IMPORTANT: This loader does NOT create custom CSS variables.
 * All colors come directly from Bootstrap CSS variables (--bs-primary, --bs-secondary, etc.)
 * which are defined by the loaded Bootswatch theme.
 */

import type { BootswatchTheme } from '../types/themes';

/**
 * Current theme colors interface - reads from Bootstrap CSS variables
 */
export interface CurrentThemeColors extends Record<string, string> {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  light: string;
  dark: string;
  bodyBg: string;
  bodyColor: string;
}

// ID for the dynamically loaded Bootswatch theme stylesheet
const BOOTSWATCH_LINK_ID = 'bootswatch-theme-stylesheet';

// Dynamic imports for all Bootswatch themes (LTR and RTL)
// Vite will process these at build time and bundle them for offline use
const bootswatchThemes: Record<string, Record<string, () => Promise<{ default: string }>>> = {
  ltr: {
    // Default Bootstrap theme (not a Bootswatch theme)
    default: () => import('bootstrap/dist/css/bootstrap.min.css?url'),
    cerulean: () => import('bootswatch/dist/cerulean/bootstrap.min.css?url'),
    cosmo: () => import('bootswatch/dist/cosmo/bootstrap.min.css?url'),
    cyborg: () => import('bootswatch/dist/cyborg/bootstrap.min.css?url'),
    darkly: () => import('bootswatch/dist/darkly/bootstrap.min.css?url'),
    flatly: () => import('bootswatch/dist/flatly/bootstrap.min.css?url'),
    journal: () => import('bootswatch/dist/journal/bootstrap.min.css?url'),
    litera: () => import('bootswatch/dist/litera/bootstrap.min.css?url'),
    lumen: () => import('bootswatch/dist/lumen/bootstrap.min.css?url'),
    lux: () => import('bootswatch/dist/lux/bootstrap.min.css?url'),
    materia: () => import('bootswatch/dist/materia/bootstrap.min.css?url'),
    minty: () => import('bootswatch/dist/minty/bootstrap.min.css?url'),
    morph: () => import('bootswatch/dist/morph/bootstrap.min.css?url'),
    pulse: () => import('bootswatch/dist/pulse/bootstrap.min.css?url'),
    quartz: () => import('bootswatch/dist/quartz/bootstrap.min.css?url'),
    sandstone: () => import('bootswatch/dist/sandstone/bootstrap.min.css?url'),
    simplex: () => import('bootswatch/dist/simplex/bootstrap.min.css?url'),
    sketchy: () => import('bootswatch/dist/sketchy/bootstrap.min.css?url'),
    slate: () => import('bootswatch/dist/slate/bootstrap.min.css?url'),
    solar: () => import('bootswatch/dist/solar/bootstrap.min.css?url'),
    spacelab: () => import('bootswatch/dist/spacelab/bootstrap.min.css?url'),
    superhero: () => import('bootswatch/dist/superhero/bootstrap.min.css?url'),
    united: () => import('bootswatch/dist/united/bootstrap.min.css?url'),
    vapor: () => import('bootswatch/dist/vapor/bootstrap.min.css?url'),
    yeti: () => import('bootswatch/dist/yeti/bootstrap.min.css?url'),
    zephyr: () => import('bootswatch/dist/zephyr/bootstrap.min.css?url'),
  },
  rtl: {
    // Default Bootstrap theme RTL variant
    default: () => import('bootstrap/dist/css/bootstrap.rtl.min.css?url'),
    cerulean: () => import('bootswatch/dist/cerulean/bootstrap.rtl.min.css?url'),
    cosmo: () => import('bootswatch/dist/cosmo/bootstrap.rtl.min.css?url'),
    cyborg: () => import('bootswatch/dist/cyborg/bootstrap.rtl.min.css?url'),
    darkly: () => import('bootswatch/dist/darkly/bootstrap.rtl.min.css?url'),
    flatly: () => import('bootswatch/dist/flatly/bootstrap.rtl.min.css?url'),
    journal: () => import('bootswatch/dist/journal/bootstrap.rtl.min.css?url'),
    litera: () => import('bootswatch/dist/litera/bootstrap.rtl.min.css?url'),
    lumen: () => import('bootswatch/dist/lumen/bootstrap.rtl.min.css?url'),
    lux: () => import('bootswatch/dist/lux/bootstrap.rtl.min.css?url'),
    materia: () => import('bootswatch/dist/materia/bootstrap.rtl.min.css?url'),
    minty: () => import('bootswatch/dist/minty/bootstrap.rtl.min.css?url'),
    morph: () => import('bootswatch/dist/morph/bootstrap.rtl.min.css?url'),
    pulse: () => import('bootswatch/dist/pulse/bootstrap.rtl.min.css?url'),
    quartz: () => import('bootswatch/dist/quartz/bootstrap.rtl.min.css?url'),
    sandstone: () => import('bootswatch/dist/sandstone/bootstrap.rtl.min.css?url'),
    simplex: () => import('bootswatch/dist/simplex/bootstrap.rtl.min.css?url'),
    sketchy: () => import('bootswatch/dist/sketchy/bootstrap.rtl.min.css?url'),
    slate: () => import('bootswatch/dist/slate/bootstrap.rtl.min.css?url'),
    solar: () => import('bootswatch/dist/solar/bootstrap.rtl.min.css?url'),
    spacelab: () => import('bootswatch/dist/spacelab/bootstrap.rtl.min.css?url'),
    superhero: () => import('bootswatch/dist/superhero/bootstrap.rtl.min.css?url'),
    united: () => import('bootswatch/dist/united/bootstrap.rtl.min.css?url'),
    vapor: () => import('bootswatch/dist/vapor/bootstrap.rtl.min.css?url'),
    yeti: () => import('bootswatch/dist/yeti/bootstrap.rtl.min.css?url'),
    zephyr: () => import('bootswatch/dist/zephyr/bootstrap.rtl.min.css?url'),
  },
};

/**
 * Load a Bootswatch theme dynamically from local node_modules
 * Uses Vite's dynamic import with ?url to get the resolved CSS file path
 * All CSS files are bundled at build time for offline use
 * 
 * Bootstrap/Bootswatch themes provide all color variables natively,
 * so this function only loads the CSS - no custom variable generation needed.
 * 
 * @param theme - The Bootswatch theme to load (including default Bootstrap)
 * @param language - Current language ('fa' for RTL, 'en' for LTR)
 * @returns Promise that resolves when the theme CSS is loaded
 */
export const loadBootswatchTheme = async (theme: BootswatchTheme, language: string = 'en'): Promise<void> => {
  // Remove existing theme stylesheet if present
  const existingLink = document.getElementById(BOOTSWATCH_LINK_ID);
  if (existingLink) {
    existingLink.remove();
  }

  try {
    // Determine direction based on language
    const direction = language === 'fa' ? 'rtl' : 'ltr';
    
    // For default theme (null path), use 'default' key to load Bootstrap CSS
    const themePath = theme.path || 'default';
    
    // Get the theme loader function
    const themeLoader = bootswatchThemes[direction][themePath];
    if (!themeLoader) {
      throw new Error(`Theme not found: ${themePath} (${direction})`);
    }

    // Dynamically import the CSS file and get its URL
    // Vite will bundle this CSS file and provide a URL to it
    const cssModule = await themeLoader();
    const cssUrl = cssModule.default;

    // Create new link element for the theme
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = BOOTSWATCH_LINK_ID;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = cssUrl;

      // Handle successful load
      link.onload = () => {
        // Small delay to ensure CSS is fully applied
        setTimeout(() => {
          resolve();
        }, 100);
      };

      // Handle load error with detailed information
      link.onerror = (event) => {
        const errorMessage = `Failed to load theme: ${theme.name} (${theme.id}) from ${cssUrl}`;
        console.error(errorMessage, event);
        reject(new Error(errorMessage));
      };

      // Insert link element before the first stylesheet (high priority)
      const firstLink = document.querySelector('link[rel="stylesheet"]');
      if (firstLink && firstLink.parentNode) {
        firstLink.parentNode.insertBefore(link, firstLink);
      } else {
        document.head.appendChild(link);
      }
    });
  } catch (error) {
    const errorMessage = `Failed to load theme: ${theme.name} (${theme.id})`;
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};



/**
 * Get current theme colors from Bootstrap CSS variables
 * Used for debugging, theme detection, or dynamic color access in components
 * 
 * @returns Object containing current Bootstrap theme color values
 */
export const getCurrentThemeColors = (): CurrentThemeColors => {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    primary: style.getPropertyValue('--bs-primary').trim() || '#0d6efd',
    secondary: style.getPropertyValue('--bs-secondary').trim() || '#6c757d',
    success: style.getPropertyValue('--bs-success').trim() || '#198754',
    warning: style.getPropertyValue('--bs-warning').trim() || '#ffc107',
    danger: style.getPropertyValue('--bs-danger').trim() || '#dc3545',
    info: style.getPropertyValue('--bs-info').trim() || '#0dcaf0',
    light: style.getPropertyValue('--bs-light').trim() || '#f8f9fa',
    dark: style.getPropertyValue('--bs-dark').trim() || '#212529',
    bodyBg: style.getPropertyValue('--bs-body-bg').trim() || '#ffffff',
    bodyColor: style.getPropertyValue('--bs-body-color').trim() || '#212529',
  };
};
