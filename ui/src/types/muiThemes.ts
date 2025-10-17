/**
 * MUI Theme Types
 * Defines theme presets and configuration for Material-UI theming
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('MuiThemes');

export type MuiThemeMode = 'light' | 'dark';

export type MuiThemePreset =
  | 'default'
  | 'purple'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'indigo'
  | 'teal'
  | 'dark'
  | 'darkBlue'
  | 'darkGreen';

export interface MuiThemeConfig {
  id: MuiThemePreset;
  name: string;
  nameEn: string;
  nameFa: string;
  mode: MuiThemeMode;
  emoji: string;
  category: 'light' | 'dark' | 'colorful';
  primary: string;
  secondary: string;
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  background?: {
    default?: string;
    paper?: string;
  };
}

/**
 * Available MUI theme presets
 * Replaces the previous Bootswatch themes with MUI-based alternatives
 */
export const MUI_THEME_PRESETS: MuiThemeConfig[] = [
  // Light Themes
  {
    id: 'default',
    name: 'Default',
    nameEn: 'Default',
    nameFa: 'پیش‌فرض',
    mode: 'light',
    emoji: '💙',
    category: 'light',
    primary: '#1976d2',
    secondary: '#dc004e',
  },
  {
    id: 'blue',
    name: 'Blue',
    nameEn: 'Blue',
    nameFa: 'آبی',
    mode: 'light',
    emoji: '🔵',
    category: 'light',
    primary: '#2196f3',
    secondary: '#f50057',
  },
  {
    id: 'green',
    name: 'Green',
    nameEn: 'Green',
    nameFa: 'سبز',
    mode: 'light',
    emoji: '🟢',
    category: 'light',
    primary: '#4caf50',
    secondary: '#ff9800',
  },
  {
    id: 'purple',
    name: 'Purple',
    nameEn: 'Purple',
    nameFa: 'بنفش',
    mode: 'light',
    emoji: '🟣',
    category: 'light',
    primary: '#9c27b0',
    secondary: '#00bcd4',
  },
  {
    id: 'orange',
    name: 'Orange',
    nameEn: 'Orange',
    nameFa: 'نارنجی',
    mode: 'light',
    emoji: '🟠',
    category: 'colorful',
    primary: '#ff9800',
    secondary: '#673ab7',
  },
  {
    id: 'red',
    name: 'Red',
    nameEn: 'Red',
    nameFa: 'قرمز',
    mode: 'light',
    emoji: '🔴',
    category: 'colorful',
    primary: '#f44336',
    secondary: '#3f51b5',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    nameEn: 'Indigo',
    nameFa: 'نیلی',
    mode: 'light',
    emoji: '🔷',
    category: 'light',
    primary: '#3f51b5',
    secondary: '#e91e63',
  },
  {
    id: 'teal',
    name: 'Teal',
    nameEn: 'Teal',
    nameFa: 'فیروزه‌ای',
    mode: 'light',
    emoji: '🩵',
    category: 'light',
    primary: '#009688',
    secondary: '#ff5722',
  },
  // Dark Themes
  {
    id: 'dark',
    name: 'Dark',
    nameEn: 'Dark',
    nameFa: 'تیره',
    mode: 'dark',
    emoji: '🌙',
    category: 'dark',
    primary: '#90caf9',
    secondary: '#f48fb1',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  {
    id: 'darkBlue',
    name: 'Dark Blue',
    nameEn: 'Dark Blue',
    nameFa: 'آبی تیره',
    mode: 'dark',
    emoji: '🌃',
    category: 'dark',
    primary: '#64b5f6',
    secondary: '#ff4081',
    background: {
      default: '#0a1929',
      paper: '#132f4c',
    },
  },
  {
    id: 'darkGreen',
    name: 'Dark Green',
    nameEn: 'Dark Green',
    nameFa: 'سبز تیره',
    mode: 'dark',
    emoji: '🌲',
    category: 'dark',
    primary: '#66bb6a',
    secondary: '#ffca28',
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
  },
];

/**
 * Get theme config by ID
 */
export function getMuiThemeConfig(themeId: MuiThemePreset): MuiThemeConfig {
  const theme = MUI_THEME_PRESETS.find((t) => t.id === themeId);
  if (!theme) {
    logger.warn(`Theme ${themeId} not found, falling back to default`);
    return MUI_THEME_PRESETS[0];
  }
  return theme;
}

/**
 * Get themes by category
 */
export function getMuiThemesByCategory(category: 'light' | 'dark' | 'colorful'): MuiThemeConfig[] {
  return MUI_THEME_PRESETS.filter((theme) => theme.category === category);
}

/**
 * Get default theme ID
 */
export function getDefaultMuiTheme(): MuiThemePreset {
  return 'default';
}
