/**
 * Bootswatch Theme Loader Utility
 * 
 * This utility dynamically loads Bootswatch CSS files from local node_modules
 * and extracts colors from the loaded theme to update custom CSS variables for charts, icons, and other elements.
 * 
 * All theme files are bundled offline for use without internet access.
 */

import type { BootswatchTheme } from '../types/themes';

/**
 * Bootstrap color variables extracted from loaded theme
 */
interface BootstrapColors {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  light: string;
  dark: string;
  bodyBg: string;
  bodyColor: string;
  borderColor: string;
  emphasisColor: string;
}

/**
 * Current theme colors interface for custom CSS variables
 */
export interface CurrentThemeColors extends Record<string, string> {
  primaryDark: string;
  primaryMedium: string;
  primaryLight: string;
  accentPrimary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
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
        // Increased delay to ensure CSS is fully applied (especially for dark themes)
        setTimeout(() => {
          extractAndApplyThemeColors();
          resolve();
        }, 300);
      };

      // Handle load error with detailed information
      link.onerror = (event) => {
        const errorMessage = `Failed to load theme: ${theme.name} (${theme.id}) from ${cssUrl}`;
        console.error(errorMessage, event);
        
        // Fallback: try to extract colors from any existing CSS (graceful degradation)
        setTimeout(() => {
          try {
            extractAndApplyThemeColors();
          } catch (extractError) {
            console.error('Failed to extract fallback colors:', extractError);
          }
        }, 100);
        
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
 * Extract Bootstrap CSS variables from the loaded theme
 * and update custom CSS variables for charts, icons, and other elements
 * 
 * @throws Error if CSS variable extraction fails critically
 */
export const extractAndApplyThemeColors = (): void => {
  try {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Extract Bootstrap color variables with fallbacks
    const bootstrapColors: BootstrapColors = {
      // Primary Bootstrap colors
      primary: computedStyle.getPropertyValue('--bs-primary').trim() || '#0d6efd',
      secondary: computedStyle.getPropertyValue('--bs-secondary').trim() || '#6c757d',
      success: computedStyle.getPropertyValue('--bs-success').trim() || '#198754',
      danger: computedStyle.getPropertyValue('--bs-danger').trim() || '#dc3545',
      warning: computedStyle.getPropertyValue('--bs-warning').trim() || '#ffc107',
      info: computedStyle.getPropertyValue('--bs-info').trim() || '#0dcaf0',
      light: computedStyle.getPropertyValue('--bs-light').trim() || '#f8f9fa',
      dark: computedStyle.getPropertyValue('--bs-dark').trim() || '#212529',
      
      // Body and text colors
      bodyBg: computedStyle.getPropertyValue('--bs-body-bg').trim() || '#ffffff',
      bodyColor: computedStyle.getPropertyValue('--bs-body-color').trim() || '#212529',
      
      // Border and emphasis colors
      borderColor: computedStyle.getPropertyValue('--bs-border-color').trim() || '#dee2e6',
      emphasisColor: computedStyle.getPropertyValue('--bs-emphasis-color').trim() || '#000000',
    };

    // Validate critical color values
    if (!bootstrapColors.bodyBg || !bootstrapColors.bodyColor) {
      console.warn('Theme CSS may not be fully loaded. Using fallback colors.');
    }

    // Update custom CSS variables for application elements
    updateCustomVariables(bootstrapColors);
  } catch (error) {
    console.error('Failed to extract and apply theme colors:', error);
    // Continue with fallback colors - don't break the application
  }
};

/**
 * Update custom CSS variables to match the loaded Bootstrap theme
 * This ensures charts, icons, and other elements use theme colors
 * 
 * @param colors - Bootstrap color variables extracted from theme
 */
const updateCustomVariables = (colors: BootstrapColors): void => {
  const root = document.documentElement;

  // Update primary colors for sidebar, navbar, and main UI elements
  root.style.setProperty('--primary-dark', colors.dark);
  root.style.setProperty('--primary-medium', colors.secondary);
  root.style.setProperty('--primary-light', colors.primary);
  root.style.setProperty('--primary-lighter', lightenColor(colors.primary, 20));
  root.style.setProperty('--primary-darker', darkenColor(colors.dark, 20));

  // Update RGB values for rgba() usage
  root.style.setProperty('--primary-dark-rgb', hexToRgb(colors.dark));
  root.style.setProperty('--primary-medium-rgb', hexToRgb(colors.secondary));
  root.style.setProperty('--primary-light-rgb', hexToRgb(colors.primary));
  root.style.setProperty('--primary-lighter-rgb', hexToRgb(lightenColor(colors.primary, 20)));
  root.style.setProperty('--primary-darker-rgb', hexToRgb(darkenColor(colors.dark, 20)));

  // Update accent colors for buttons and interactive elements
  root.style.setProperty('--accent-primary', colors.primary);
  root.style.setProperty('--accent-hover', darkenColor(colors.primary, 10));
  root.style.setProperty('--accent-active', darkenColor(colors.primary, 20));

  // Update RGB values for accent colors
  root.style.setProperty('--accent-primary-rgb', hexToRgb(colors.primary));
  root.style.setProperty('--accent-hover-rgb', hexToRgb(darkenColor(colors.primary, 10)));
  root.style.setProperty('--accent-active-rgb', hexToRgb(darkenColor(colors.primary, 20)));

  // Update semantic colors
  root.style.setProperty('--success', colors.success);
  root.style.setProperty('--success-rgb', hexToRgb(colors.success));
  root.style.setProperty('--warning', colors.warning);
  root.style.setProperty('--warning-rgb', hexToRgb(colors.warning));
  root.style.setProperty('--error', colors.danger);
  root.style.setProperty('--error-rgb', hexToRgb(colors.danger));
  root.style.setProperty('--info', colors.info);
  root.style.setProperty('--info-rgb', hexToRgb(colors.info));

  // Update gradient colors for visual effects
  root.style.setProperty('--gradient-purple-start', colors.primary);
  root.style.setProperty('--gradient-purple-end', darkenColor(colors.primary, 15));
  root.style.setProperty('--gradient-indigo-start', colors.primary);
  root.style.setProperty('--gradient-indigo-end', darkenColor(colors.primary, 10));
  root.style.setProperty('--gradient-indigo-hover-start', darkenColor(colors.primary, 10));
  root.style.setProperty('--gradient-indigo-hover-end', darkenColor(colors.primary, 20));
  root.style.setProperty('--gradient-gray-start', colors.secondary);
  root.style.setProperty('--gradient-gray-end', lightenColor(colors.secondary, 30));

  // Update sidebar and navbar gradients
  root.style.setProperty('--gradient-sidebar-start', colors.dark);
  root.style.setProperty('--gradient-sidebar-end', colors.secondary);

  // Update pre-configured gradients
  updateGradients(colors);

  // Update text colors based on theme
  updateTextColors(colors);

  // Update background colors
  root.style.setProperty('--bg-primary-light', colors.bodyBg);
  root.style.setProperty('--bg-secondary-light', colors.light);

  // Update border colors
  root.style.setProperty('--border-light', colors.borderColor);
  root.style.setProperty('--border-medium', darkenColor(colors.borderColor, 10));
  root.style.setProperty('--border-dark', colors.dark);
};

/**
 * Update pre-configured gradient CSS variables
 * 
 * @param colors - Bootstrap color variables extracted from theme
 */
const updateGradients = (colors: BootstrapColors): void => {
  const root = document.documentElement;

  // Primary gradient (login page, loading screens)
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, ${colors.primary} 0%, ${darkenColor(colors.primary, 15)} 100%)`
  );

  // Sidebar gradient
  root.style.setProperty(
    '--gradient-sidebar',
    `linear-gradient(180deg, ${colors.dark} 0%, ${colors.secondary} 100%)`
  );

  // Navbar gradient
  root.style.setProperty(
    '--gradient-navbar',
    `linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%)`
  );

  // Button gradients
  root.style.setProperty(
    '--gradient-button',
    `linear-gradient(135deg, ${colors.primary} 0%, ${darkenColor(colors.primary, 10)} 100%)`
  );

  root.style.setProperty(
    '--gradient-button-hover',
    `linear-gradient(135deg, ${darkenColor(colors.primary, 10)} 0%, ${darkenColor(colors.primary, 20)} 100%)`
  );

  root.style.setProperty(
    '--gradient-button-disabled',
    `linear-gradient(135deg, ${colors.secondary} 0%, ${lightenColor(colors.secondary, 30)} 100%)`
  );

  // Accent gradients (for hover effects)
  root.style.setProperty(
    '--gradient-accent-horizontal',
    `linear-gradient(90deg, rgba(${hexToRgb(colors.primary)}, 0.15) 0%, rgba(${hexToRgb(colors.primary)}, 0.05) 100%)`
  );

  root.style.setProperty(
    '--gradient-accent-active',
    `linear-gradient(90deg, rgba(${hexToRgb(colors.primary)}, 0.25) 0%, rgba(${hexToRgb(colors.primary)}, 0.1) 100%)`
  );

  // Text gradient
  root.style.setProperty(
    '--gradient-text',
    `linear-gradient(45deg, ${lightenColor(colors.primary, 30)}, ${colors.primary})`
  );
};

/**
 * Update text colors based on theme background
 * 
 * @param colors - Bootstrap color variables extracted from theme
 */
const updateTextColors = (colors: BootstrapColors): void => {
  const root = document.documentElement;

  // Determine if theme is dark or light based on body background
  const isDarkTheme = isColorDark(colors.bodyBg);

  if (isDarkTheme) {
    // Dark theme: use light text
    root.style.setProperty('--text-primary-light', '#ecf0f1');
    root.style.setProperty('--text-secondary-light', '#bdc3c7');
    root.style.setProperty('--text-primary-dark', colors.bodyColor);
    root.style.setProperty('--text-secondary-dark', lightenColor(colors.bodyColor, 30));
  } else {
    // Light theme: use dark text
    root.style.setProperty('--text-primary-light', '#ecf0f1');
    root.style.setProperty('--text-secondary-light', '#bdc3c7');
    root.style.setProperty('--text-primary-dark', colors.bodyColor);
    root.style.setProperty('--text-secondary-dark', lightenColor(colors.bodyColor, 20));
  }
};

/**
 * Convert hex color to RGB values
 * Returns RGB values as a string "r, g, b" for use in rgba()
 */
export const hexToRgb = (hex: string): string => {
  // Handle short hex format
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
};

/**
 * Lighten a color by a percentage
 * 
 * @param hex - Hex color code
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export const lightenColor = (hex: string, percent: number): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle short hex format
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse hex values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Lighten
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

/**
 * Darken a color by a percentage
 * 
 * @param hex - Hex color code
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export const darkenColor = (hex: string, percent: number): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle short hex format
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse hex values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Darken
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));

  // Convert back to hex
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

/**
 * Determine if a color is dark or light
 * 
 * @param hex - Hex color code
 * @returns true if color is dark, false if light
 */
export const isColorDark = (hex: string): boolean => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle short hex format
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance is less than 0.5, it's a dark color
  return luminance < 0.5;
};

/**
 * Get current theme colors from CSS variables
 * Used for debugging, theme detection, or dynamic color access in components
 * 
 * @returns Object containing current theme color values
 */
export const getCurrentThemeColors = (): CurrentThemeColors => {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    primaryDark: style.getPropertyValue('--primary-dark').trim(),
    primaryMedium: style.getPropertyValue('--primary-medium').trim(),
    primaryLight: style.getPropertyValue('--primary-light').trim(),
    accentPrimary: style.getPropertyValue('--accent-primary').trim(),
    success: style.getPropertyValue('--success').trim(),
    warning: style.getPropertyValue('--warning').trim(),
    error: style.getPropertyValue('--error').trim(),
    info: style.getPropertyValue('--info').trim(),
  };
};
