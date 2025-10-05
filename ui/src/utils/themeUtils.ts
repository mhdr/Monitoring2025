/**
 * Theme Utility Functions
 * 
 * Provides functions to apply theme colors by dynamically updating CSS custom properties
 */

import type { Theme, ThemeColors } from '../types/themes';

/**
 * Apply theme colors to CSS custom properties
 * 
 * This function updates the CSS variables defined in theme.css
 * with the colors from the selected theme.
 */
export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  const colors = theme.colors;

  // Update Primary Colors
  root.style.setProperty('--primary-dark', colors.primaryDark);
  root.style.setProperty('--primary-medium', colors.primaryMedium);
  root.style.setProperty('--primary-light', colors.primaryLight);
  root.style.setProperty('--primary-lighter', colors.primaryLighter);
  root.style.setProperty('--primary-darker', colors.primaryDarker);

  // Update RGB values for rgba() usage
  root.style.setProperty('--primary-dark-rgb', hexToRgb(colors.primaryDark));
  root.style.setProperty('--primary-medium-rgb', hexToRgb(colors.primaryMedium));
  root.style.setProperty('--primary-light-rgb', hexToRgb(colors.primaryLight));
  root.style.setProperty('--primary-lighter-rgb', hexToRgb(colors.primaryLighter));
  root.style.setProperty('--primary-darker-rgb', hexToRgb(colors.primaryDarker));

  // Update Accent Colors
  root.style.setProperty('--accent-primary', colors.accentPrimary);
  root.style.setProperty('--accent-hover', colors.accentHover);
  root.style.setProperty('--accent-active', colors.accentActive);

  // Update RGB values for accent colors
  root.style.setProperty('--accent-primary-rgb', hexToRgb(colors.accentPrimary));
  root.style.setProperty('--accent-hover-rgb', hexToRgb(colors.accentHover));
  root.style.setProperty('--accent-active-rgb', hexToRgb(colors.accentActive));

  // Update Gradient Colors
  root.style.setProperty('--gradient-purple-start', colors.gradientPurpleStart);
  root.style.setProperty('--gradient-purple-end', colors.gradientPurpleEnd);
  root.style.setProperty('--gradient-indigo-start', colors.gradientIndigoStart);
  root.style.setProperty('--gradient-indigo-end', colors.gradientIndigoEnd);
  root.style.setProperty('--gradient-indigo-hover-start', colors.gradientIndigoHoverStart);
  root.style.setProperty('--gradient-indigo-hover-end', colors.gradientIndigoHoverEnd);
  root.style.setProperty('--gradient-gray-start', colors.gradientGrayStart);
  root.style.setProperty('--gradient-gray-end', colors.gradientGrayEnd);

  // Update Sidebar Gradient (uses primary colors)
  root.style.setProperty('--gradient-sidebar-start', colors.primaryDark);
  root.style.setProperty('--gradient-sidebar-end', colors.primaryMedium);

  // Update pre-configured gradients
  updateGradients(colors);

  // Log theme change for debugging
  console.log(`✅ Theme applied: ${theme.name} (${theme.id})`);
};

/**
 * Update pre-configured gradient CSS variables
 */
const updateGradients = (colors: ThemeColors): void => {
  const root = document.documentElement;

  // Primary gradient (login page, loading screens)
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, ${colors.gradientPurpleStart} 0%, ${colors.gradientPurpleEnd} 100%)`
  );

  // Sidebar gradient
  root.style.setProperty(
    '--gradient-sidebar',
    `linear-gradient(180deg, ${colors.primaryDark} 0%, ${colors.primaryMedium} 100%)`
  );

  // Navbar gradient
  root.style.setProperty(
    '--gradient-navbar',
    `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primaryMedium} 100%)`
  );

  // Button gradients
  root.style.setProperty(
    '--gradient-button',
    `linear-gradient(135deg, ${colors.gradientIndigoStart} 0%, ${colors.gradientIndigoEnd} 100%)`
  );

  root.style.setProperty(
    '--gradient-button-hover',
    `linear-gradient(135deg, ${colors.gradientIndigoHoverStart} 0%, ${colors.gradientIndigoHoverEnd} 100%)`
  );

  root.style.setProperty(
    '--gradient-button-disabled',
    `linear-gradient(135deg, ${colors.gradientGrayStart} 0%, ${colors.gradientGrayEnd} 100%)`
  );

  // Accent gradients (for hover effects)
  root.style.setProperty(
    '--gradient-accent-horizontal',
    `linear-gradient(90deg, rgba(${hexToRgb(colors.accentPrimary)}, 0.15) 0%, rgba(${hexToRgb(colors.accentPrimary)}, 0.05) 100%)`
  );

  root.style.setProperty(
    '--gradient-accent-active',
    `linear-gradient(90deg, rgba(${hexToRgb(colors.accentPrimary)}, 0.25) 0%, rgba(${hexToRgb(colors.accentPrimary)}, 0.1) 100%)`
  );

  // Text gradient
  root.style.setProperty(
    '--gradient-text',
    `linear-gradient(45deg, ${colors.primaryLighter}, ${colors.accentPrimary})`
  );
};

/**
 * Convert hex color to RGB values
 * Returns RGB values as a string "r, g, b" for use in rgba()
 */
export const hexToRgb = (hex: string): string => {
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
 * Get the current theme from CSS variables
 * (Used for debugging or theme detection)
 */
export const getCurrentThemeColors = (): Partial<ThemeColors> => {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    primaryDark: style.getPropertyValue('--primary-dark').trim(),
    primaryMedium: style.getPropertyValue('--primary-medium').trim(),
    primaryLight: style.getPropertyValue('--primary-light').trim(),
    accentPrimary: style.getPropertyValue('--accent-primary').trim(),
  };
};

/**
 * Reset theme to CSS defaults
 * (Removes inline style overrides)
 */
export const resetTheme = (): void => {
  const root = document.documentElement;
  
  // Remove all inline style properties
  const propertiesToRemove = [
    '--primary-dark',
    '--primary-medium',
    '--primary-light',
    '--primary-lighter',
    '--primary-darker',
    '--accent-primary',
    '--accent-hover',
    '--accent-active',
    '--gradient-purple-start',
    '--gradient-purple-end',
    '--gradient-indigo-start',
    '--gradient-indigo-end',
    '--gradient-indigo-hover-start',
    '--gradient-indigo-hover-end',
    '--gradient-gray-start',
    '--gradient-gray-end',
  ];

  propertiesToRemove.forEach(prop => {
    root.style.removeProperty(prop);
  });

  console.log('✅ Theme reset to defaults');
};
