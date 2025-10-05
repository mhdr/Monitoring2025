/**
 * Theme Presets Configuration
 * 
 * This file defines all available theme presets that users can switch between.
 * Each theme contains all necessary color values and design tokens.
 */

export interface ThemeColors {
  // Primary Colors
  primaryDark: string;
  primaryMedium: string;
  primaryLight: string;
  primaryLighter: string;
  primaryDarker: string;
  
  // Accent Colors
  accentPrimary: string;
  accentHover: string;
  accentActive: string;
  
  // Gradient Colors
  gradientPurpleStart: string;
  gradientPurpleEnd: string;
  gradientIndigoStart: string;
  gradientIndigoEnd: string;
  gradientIndigoHoverStart: string;
  gradientIndigoHoverEnd: string;
  gradientGrayStart: string;
  gradientGrayEnd: string;
}

export interface Theme {
  id: string;
  name: string;
  nameKey: string; // i18n key for theme name
  colors: ThemeColors;
  description?: string;
  emoji?: string;
}

export type ThemeId = 'default' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'indigo';

/**
 * Default Theme - Professional Blue/Slate
 */
const defaultTheme: Theme = {
  id: 'default',
  name: 'Professional Blue',
  nameKey: 'themes.default',
  emoji: '🔵',
  description: 'Professional dark blue/slate theme',
  colors: {
    primaryDark: '#2c3e50',
    primaryMedium: '#34495e',
    primaryLight: '#3498db',
    primaryLighter: '#5dade2',
    primaryDarker: '#1a252f',
    
    accentPrimary: '#3498db',
    accentHover: '#2980b9',
    accentActive: '#21618c',
    
    gradientPurpleStart: '#667eea',
    gradientPurpleEnd: '#764ba2',
    gradientIndigoStart: '#4f46e5',
    gradientIndigoEnd: '#667eea',
    gradientIndigoHoverStart: '#4338ca',
    gradientIndigoHoverEnd: '#5b6de8',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Green Theme - Nature Inspired
 */
const greenTheme: Theme = {
  id: 'green',
  name: 'Nature Green',
  nameKey: 'themes.green',
  emoji: '🟢',
  description: 'Fresh and natural green theme',
  colors: {
    primaryDark: '#1e4620',
    primaryMedium: '#2d5f30',
    primaryLight: '#4caf50',
    primaryLighter: '#66bb6a',
    primaryDarker: '#0d2e0f',
    
    accentPrimary: '#8bc34a',
    accentHover: '#7cb342',
    accentActive: '#689f38',
    
    gradientPurpleStart: '#43a047',
    gradientPurpleEnd: '#2e7d32',
    gradientIndigoStart: '#66bb6a',
    gradientIndigoEnd: '#4caf50',
    gradientIndigoHoverStart: '#558b2f',
    gradientIndigoHoverEnd: '#689f38',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Purple Theme - Creative and Modern
 */
const purpleTheme: Theme = {
  id: 'purple',
  name: 'Royal Purple',
  nameKey: 'themes.purple',
  emoji: '🟣',
  description: 'Elegant and creative purple theme',
  colors: {
    primaryDark: '#4a148c',
    primaryMedium: '#6a1b9a',
    primaryLight: '#9c27b0',
    primaryLighter: '#ba68c8',
    primaryDarker: '#311b92',
    
    accentPrimary: '#e040fb',
    accentHover: '#d500f9',
    accentActive: '#aa00ff',
    
    gradientPurpleStart: '#8e24aa',
    gradientPurpleEnd: '#6a1b9a',
    gradientIndigoStart: '#ab47bc',
    gradientIndigoEnd: '#9c27b0',
    gradientIndigoHoverStart: '#7b1fa2',
    gradientIndigoHoverEnd: '#8e24aa',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Orange Theme - Energetic and Bold
 */
const orangeTheme: Theme = {
  id: 'orange',
  name: 'Vibrant Orange',
  nameKey: 'themes.orange',
  emoji: '🟠',
  description: 'Energetic and warm orange theme',
  colors: {
    primaryDark: '#e65100',
    primaryMedium: '#ef6c00',
    primaryLight: '#ff9800',
    primaryLighter: '#ffb74d',
    primaryDarker: '#bf360c',
    
    accentPrimary: '#ffa726',
    accentHover: '#fb8c00',
    accentActive: '#f57c00',
    
    gradientPurpleStart: '#ff6f00',
    gradientPurpleEnd: '#e65100',
    gradientIndigoStart: '#ffa726',
    gradientIndigoEnd: '#ff9800',
    gradientIndigoHoverStart: '#f57c00',
    gradientIndigoHoverEnd: '#fb8c00',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Red Theme - Powerful and Dynamic
 */
const redTheme: Theme = {
  id: 'red',
  name: 'Dynamic Red',
  nameKey: 'themes.red',
  emoji: '🔴',
  description: 'Bold and powerful red theme',
  colors: {
    primaryDark: '#b71c1c',
    primaryMedium: '#c62828',
    primaryLight: '#f44336',
    primaryLighter: '#ef5350',
    primaryDarker: '#7f0000',
    
    accentPrimary: '#ff5252',
    accentHover: '#ff1744',
    accentActive: '#d50000',
    
    gradientPurpleStart: '#e53935',
    gradientPurpleEnd: '#c62828',
    gradientIndigoStart: '#ef5350',
    gradientIndigoEnd: '#f44336',
    gradientIndigoHoverStart: '#d32f2f',
    gradientIndigoHoverEnd: '#e53935',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Teal Theme - Modern and Fresh
 */
const tealTheme: Theme = {
  id: 'teal',
  name: 'Ocean Teal',
  nameKey: 'themes.teal',
  emoji: '🌊',
  description: 'Cool and refreshing teal theme',
  colors: {
    primaryDark: '#004d40',
    primaryMedium: '#00695c',
    primaryLight: '#009688',
    primaryLighter: '#4db6ac',
    primaryDarker: '#00251a',
    
    accentPrimary: '#26a69a',
    accentHover: '#00897b',
    accentActive: '#00796b',
    
    gradientPurpleStart: '#00897b',
    gradientPurpleEnd: '#00695c',
    gradientIndigoStart: '#26a69a',
    gradientIndigoEnd: '#009688',
    gradientIndigoHoverStart: '#00796b',
    gradientIndigoHoverEnd: '#00897b',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * Indigo Theme - Deep and Professional
 */
const indigoTheme: Theme = {
  id: 'indigo',
  name: 'Deep Indigo',
  nameKey: 'themes.indigo',
  emoji: '🔮',
  description: 'Deep and sophisticated indigo theme',
  colors: {
    primaryDark: '#1a237e',
    primaryMedium: '#283593',
    primaryLight: '#3f51b5',
    primaryLighter: '#5c6bc0',
    primaryDarker: '#0d1642',
    
    accentPrimary: '#536dfe',
    accentHover: '#3d5afe',
    accentActive: '#304ffe',
    
    gradientPurpleStart: '#3949ab',
    gradientPurpleEnd: '#283593',
    gradientIndigoStart: '#5c6bc0',
    gradientIndigoEnd: '#3f51b5',
    gradientIndigoHoverStart: '#303f9f',
    gradientIndigoHoverEnd: '#3949ab',
    gradientGrayStart: '#9ca3af',
    gradientGrayEnd: '#d1d5db',
  },
};

/**
 * All available themes
 */
export const themes: Theme[] = [
  defaultTheme,
  greenTheme,
  purpleTheme,
  orangeTheme,
  redTheme,
  tealTheme,
  indigoTheme,
];

/**
 * All available themes (alias for easier imports)
 */
export const AVAILABLE_THEMES = themes;

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID = 'default';

/**
 * Get theme by ID
 */
export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};

/**
 * Get default theme
 */
export const getDefaultTheme = (): Theme => {
  return defaultTheme;
};
