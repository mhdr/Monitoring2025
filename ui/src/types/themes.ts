/**
 * Bootswatch Theme Configuration
 * 
 * This file defines all available Bootswatch themes that users can switch between,
 * including the default Bootstrap theme (no Bootswatch).
 */

export interface BootswatchTheme {
  id: string;
  name: string;
  nameKey: string; // i18n key for theme name
  description?: string;
  emoji?: string;
  path: string | null; // null for default Bootstrap, path for Bootswatch themes
  category: 'light' | 'dark' | 'colorful';
}

// Legacy interface for backwards compatibility
export interface ThemeColors {
  primaryDark: string;
  primaryMedium: string;
  primaryLight: string;
  primaryLighter: string;
  primaryDarker: string;
  accentPrimary: string;
  accentHover: string;
  accentActive: string;
  gradientPurpleStart: string;
  gradientPurpleEnd: string;
  gradientIndigoStart: string;
  gradientIndigoEnd: string;
  gradientIndigoHoverStart: string;
  gradientIndigoHoverEnd: string;
  gradientGrayStart: string;
  gradientGrayEnd: string;
}

// Legacy interface for backwards compatibility
export interface Theme {
  id: string;
  name: string;
  nameKey: string;
  colors: ThemeColors;
  description?: string;
  emoji?: string;
}

export type ThemeId = 
  | 'default'
  | 'cerulean'
  | 'cosmo'
  | 'cyborg'
  | 'darkly'
  | 'flatly'
  | 'journal'
  | 'litera'
  | 'lumen'
  | 'lux'
  | 'materia'
  | 'minty'
  | 'morph'
  | 'pulse'
  | 'quartz'
  | 'sandstone'
  | 'simplex'
  | 'sketchy'
  | 'slate'
  | 'solar'
  | 'spacelab'
  | 'superhero'
  | 'united'
  | 'vapor'
  | 'yeti'
  | 'zephyr';

/**
 * All available Bootswatch themes
 * Bootstrap 5.3 compatible themes from Bootswatch
 */
export const AVAILABLE_THEMES: BootswatchTheme[] = [
  // Default Bootstrap (no Bootswatch theme)
  {
    id: 'default',
    name: 'Default Bootstrap',
    nameKey: 'theme.default',
    emoji: '🔵',
    description: 'Standard Bootstrap 5 theme',
    path: null,
    category: 'light',
  },
  
  // Light Themes
  {
    id: 'cerulean',
    name: 'Cerulean',
    nameKey: 'theme.cerulean',
    emoji: '🌊',
    description: 'A calm blue sky',
    path: 'cerulean',
    category: 'light',
  },
  {
    id: 'cosmo',
    name: 'Cosmo',
    nameKey: 'theme.cosmo',
    emoji: '🌸',
    description: 'An ode to Metro',
    path: 'cosmo',
    category: 'light',
  },
  {
    id: 'flatly',
    name: 'Flatly',
    nameKey: 'theme.flatly',
    emoji: '🎨',
    description: 'Flat and modern',
    path: 'flatly',
    category: 'light',
  },
  {
    id: 'journal',
    name: 'Journal',
    nameKey: 'theme.journal',
    emoji: '📰',
    description: 'Crisp like a new sheet of paper',
    path: 'journal',
    category: 'light',
  },
  {
    id: 'litera',
    name: 'Litera',
    nameKey: 'theme.litera',
    emoji: '📖',
    description: 'The medium is the message',
    path: 'litera',
    category: 'light',
  },
  {
    id: 'lumen',
    name: 'Lumen',
    nameKey: 'theme.lumen',
    emoji: '�',
    description: 'Light and shadow',
    path: 'lumen',
    category: 'light',
  },
  {
    id: 'lux',
    name: 'Lux',
    nameKey: 'theme.lux',
    emoji: '✨',
    description: 'A touch of class',
    path: 'lux',
    category: 'light',
  },
  {
    id: 'materia',
    name: 'Materia',
    nameKey: 'theme.materia',
    emoji: '🎯',
    description: 'Material is the metaphor',
    path: 'materia',
    category: 'light',
  },
  {
    id: 'minty',
    name: 'Minty',
    nameKey: 'theme.minty',
    emoji: '🍃',
    description: 'A fresh feel',
    path: 'minty',
    category: 'light',
  },
  {
    id: 'morph',
    name: 'Morph',
    nameKey: 'theme.morph',
    emoji: '�',
    description: 'A neumorphic design',
    path: 'morph',
    category: 'light',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    nameKey: 'theme.pulse',
    emoji: '💓',
    description: 'A trace of purple',
    path: 'pulse',
    category: 'light',
  },
  {
    id: 'quartz',
    name: 'Quartz',
    nameKey: 'theme.quartz',
    emoji: '💎',
    description: 'A glassmorphic design',
    path: 'quartz',
    category: 'light',
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    nameKey: 'theme.sandstone',
    emoji: '🏜️',
    description: 'A touch of warmth',
    path: 'sandstone',
    category: 'light',
  },
  {
    id: 'simplex',
    name: 'Simplex',
    nameKey: 'theme.simplex',
    emoji: '⚪',
    description: 'Mini and minimalist',
    path: 'simplex',
    category: 'light',
  },
  {
    id: 'sketchy',
    name: 'Sketchy',
    nameKey: 'theme.sketchy',
    emoji: '✏️',
    description: 'A hand-drawn look',
    path: 'sketchy',
    category: 'colorful',
  },
  {
    id: 'spacelab',
    name: 'Spacelab',
    nameKey: 'theme.spacelab',
    emoji: '🚀',
    description: 'Silvery and sleek',
    path: 'spacelab',
    category: 'light',
  },
  {
    id: 'united',
    name: 'United',
    nameKey: 'theme.united',
    emoji: '�🇸',
    description: 'Ubuntu orange and unique font',
    path: 'united',
    category: 'colorful',
  },
  {
    id: 'yeti',
    name: 'Yeti',
    nameKey: 'theme.yeti',
    emoji: '❄️',
    description: 'A friendly foundation',
    path: 'yeti',
    category: 'light',
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    nameKey: 'theme.zephyr',
    emoji: '🌬️',
    description: 'Breezy and beautiful',
    path: 'zephyr',
    category: 'light',
  },
  
  // Dark Themes
  {
    id: 'cyborg',
    name: 'Cyborg',
    nameKey: 'theme.cyborg',
    emoji: '🤖',
    description: 'Jet black and electric blue',
    path: 'cyborg',
    category: 'dark',
  },
  {
    id: 'darkly',
    name: 'Darkly',
    nameKey: 'theme.darkly',
    emoji: '🌑',
    description: 'Flatly in night mode',
    path: 'darkly',
    category: 'dark',
  },
  {
    id: 'slate',
    name: 'Slate',
    nameKey: 'theme.slate',
    emoji: '🪨',
    description: 'Shades of gunmetal gray',
    path: 'slate',
    category: 'dark',
  },
  {
    id: 'solar',
    name: 'Solar',
    nameKey: 'theme.solar',
    emoji: '☀️',
    description: 'A spin on Solarized',
    path: 'solar',
    category: 'dark',
  },
  {
    id: 'superhero',
    name: 'Superhero',
    nameKey: 'theme.superhero',
    emoji: '🦸',
    description: 'The brave and the blue',
    path: 'superhero',
    category: 'dark',
  },
  {
    id: 'vapor',
    name: 'Vapor',
    nameKey: 'theme.vapor',
    emoji: '🌈',
    description: 'A cyberpunk aesthetic',
    path: 'vapor',
    category: 'dark',
  },
];

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID: ThemeId = 'default';

/**
 * Get theme by ID
 */
export const getThemeById = (themeId: string): BootswatchTheme | undefined => {
  return AVAILABLE_THEMES.find((theme) => theme.id === themeId);
};

/**
 * Get themes by category
 */
export const getThemesByCategory = (category: 'light' | 'dark' | 'colorful'): BootswatchTheme[] => {
  return AVAILABLE_THEMES.filter((theme) => theme.category === category);
};

// Legacy exports for backwards compatibility
export const themes = AVAILABLE_THEMES;
export const getDefaultTheme = () => getThemeById(DEFAULT_THEME_ID);
