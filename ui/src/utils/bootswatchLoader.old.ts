/**
 * Bootswatch Theme Loader Utility (OLD VERSION)
 * 
 * This is an older version of the bootswatch loader that created custom CSS variables.
 * The new version in bootswatchLoader.ts only loads themes without creating custom variables.
 * 
 * This file exists for reference purposes but should not be used in new code.
 * All colors should now use Bootstrap variables directly.
 */

import type { BootswatchTheme } from '../types/themes';

/**
 * Current theme colors interface for Bootstrap CSS variables
 */
export interface CurrentThemeColors {
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

/**
 * Load a Bootswatch theme dynamically from local node_modules
 * 
 * @param theme - The Bootswatch theme to load
 * @param language - Current language ('fa' for RTL, 'en' for LTR)
 * @returns Promise that resolves when the theme CSS is loaded
 */
export const loadBootswatchTheme = (theme: BootswatchTheme, language: string = 'en'): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Remove existing Bootswatch theme if present
    const existingLink = document.getElementById(BOOTSWATCH_LINK_ID);
    if (existingLink) {
      existingLink.remove();
    }

    // If theme is default (null path), remove theme and use default Bootstrap
    if (!theme.path) {
      // Increased delay to ensure CSS is fully applied after removing Bootswatch
      setTimeout(() => {
        resolve();
      }, 300);
      return;
    }

    try {
      // Determine the correct CSS file based on language direction
      // For RTL (Persian), use bootstrap.rtl.min.css; for LTR (English), use bootstrap.min.css
      const cssFileName = language === 'fa' ? 'bootstrap.rtl.min.css' : 'bootstrap.min.css';
      
      // Construct the path to the Bootswatch CSS file in node_modules
      // Vite will resolve node_modules paths automatically
      // Path format: /node_modules/bootswatch/dist/{themeName}/{cssFileName}
      const themePath = `/node_modules/bootswatch/dist/${theme.path}/${cssFileName}`;
      
      // Create new link element for Bootswatch theme
      // Vite dev server will serve files from node_modules automatically
      // In production build, these will be bundled/copied appropriately
      const link = document.createElement('link');
      link.id = BOOTSWATCH_LINK_ID;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = themePath;

      // Handle successful load
      link.onload = () => {
        // Increased delay to ensure CSS is fully applied (especially for dark themes)
        setTimeout(() => {
          resolve();
        }, 300);
      };

      // Handle load error with detailed information
      link.onerror = (event) => {
        const errorMessage = `Failed to load Bootswatch theme: ${theme.name} (${theme.id}) from ${themePath}`;
        console.error(errorMessage, event);
        
        // Fallback: resolve anyway to prevent breaking the app
        setTimeout(() => {
          resolve();
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
    } catch (error) {
      const errorMessage = `Failed to construct path for Bootswatch theme: ${theme.name} (${theme.id})`;
      console.error(errorMessage, error);
      reject(new Error(errorMessage));
    }
  });
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
    danger: style.getPropertyValue('--bs-danger').trim() || '#dc3545',
    warning: style.getPropertyValue('--bs-warning').trim() || '#ffc107',
    info: style.getPropertyValue('--bs-info').trim() || '#0dcaf0',
    light: style.getPropertyValue('--bs-light').trim() || '#f8f9fa',
    dark: style.getPropertyValue('--bs-dark').trim() || '#212529',
    bodyBg: style.getPropertyValue('--bs-body-bg').trim() || '#ffffff',
    bodyColor: style.getPropertyValue('--bs-body-color').trim() || '#212529',
  };
};