/**
 * Theme Utility Functions
 * 
 * This file now uses Bootswatch themes instead of custom theme colors.
 * It delegates to the bootswatchLoader for theme application.
 */

import type { BootswatchTheme } from '../types/themes';
import { loadBootswatchTheme, getCurrentThemeColors as getBootswatchColors } from './bootswatchLoader';

/**
 * Apply a Bootswatch theme
 * 
 * This function loads the Bootswatch theme CSS (LTR or RTL variant based on language)
 * and extracts colors to update custom CSS variables.
 * 
 * @param theme - The Bootswatch theme to apply
 * @param language - Current language ('fa' for RTL, 'en' for LTR)
 */
export const applyTheme = async (theme: BootswatchTheme, language: string = 'en'): Promise<void> => {
  try {
    await loadBootswatchTheme(theme, language);
    console.log(`✅ Theme applied: ${theme.name} (${theme.id}) [${language === 'fa' ? 'RTL' : 'LTR'}]`);
  } catch (error) {
    console.error(`❌ Failed to apply theme: ${theme.name}`, error);
    throw error;
  }
};

/**
 * Get the current theme colors from CSS variables
 * (Used for debugging or theme detection)
 */
export const getCurrentThemeColors = (): Record<string, string> => {
  return getBootswatchColors();
};

/**
 * Reset theme to default Bootstrap
 * (Removes Bootswatch theme stylesheet)
 */
export const resetTheme = (): void => {
  const bootswatchLink = document.getElementById('bootswatch-theme-stylesheet');
  if (bootswatchLink) {
    bootswatchLink.remove();
    console.log('✅ Theme reset to default Bootstrap');
  }
};

// Legacy export for backwards compatibility
export const hexToRgb = (hex: string): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle short hex format
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
};
