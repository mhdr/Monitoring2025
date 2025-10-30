/**
 * Device Detection Utility
 * Provides responsive breakpoint detection and device type identification
 * Follows MUI breakpoint system: xs, sm, md, lg, xl
 */

import { createLogger } from './logger';

const logger = createLogger('DeviceDetection');

/**
 * MUI Breakpoint Constants (in pixels)
 */
export const BREAKPOINTS = {
  xs: 0,      // Small phones
  sm: 600,    // Phones
  md: 900,    // Tablets
  lg: 1200,   // Desktops
  xl: 1536,   // Large desktops
} as const;

/**
 * Common device resolution presets for testing
 */
export const TEST_RESOLUTIONS = {
  FULL_HD: { width: 1920, height: 1080, label: 'Full HD Desktop' },
  LAPTOP: { width: 1366, height: 768, label: 'Laptop' },
  TABLET_PORTRAIT: { width: 768, height: 1024, label: 'Tablet Portrait' },
  TABLET_LANDSCAPE: { width: 1024, height: 768, label: 'Tablet Landscape' },
  IPHONE_SE: { width: 375, height: 667, label: 'iPhone SE' },
  IPHONE_XR: { width: 414, height: 896, label: 'iPhone XR/11' },
  GALAXY_S20: { width: 360, height: 800, label: 'Samsung Galaxy S20' },
} as const;

/**
 * Get current window width
 */
export const getWindowWidth = (): number => {
  if (typeof window === 'undefined') return BREAKPOINTS.lg; // SSR fallback
  return window.innerWidth;
};

/**
 * Get current window height
 */
export const getWindowHeight = (): number => {
  if (typeof window === 'undefined') return 800; // SSR fallback
  return window.innerHeight;
};

/**
 * Check if device is mobile (xs or sm breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isMobile = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  const result = w < BREAKPOINTS.md; // < 900px
  logger.log('isMobile check:', { width: w, isMobile: result });
  return result;
};

/**
 * Check if device is tablet (md breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isTablet = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  const result = w >= BREAKPOINTS.md && w < BREAKPOINTS.lg; // 900px - 1199px
  logger.log('isTablet check:', { width: w, isTablet: result });
  return result;
};

/**
 * Check if device is desktop (lg or xl breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isDesktop = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  const result = w >= BREAKPOINTS.lg; // >= 1200px
  logger.log('isDesktop check:', { width: w, isDesktop: result });
  return result;
};

/**
 * Check if device is extra small (xs breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isExtraSmall = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  return w < BREAKPOINTS.sm; // < 600px
};

/**
 * Check if device is small (sm breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isSmall = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  return w >= BREAKPOINTS.sm && w < BREAKPOINTS.md; // 600px - 899px
};

/**
 * Check if device is medium (md breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isMedium = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  return w >= BREAKPOINTS.md && w < BREAKPOINTS.lg; // 900px - 1199px
};

/**
 * Check if device is large (lg breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isLarge = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  return w >= BREAKPOINTS.lg && w < BREAKPOINTS.xl; // 1200px - 1535px
};

/**
 * Check if device is extra large (xl breakpoint)
 * @param width - Optional width to check (defaults to window width)
 */
export const isExtraLarge = (width?: number): boolean => {
  const w = width ?? getWindowWidth();
  return w >= BREAKPOINTS.xl; // >= 1536px
};

/**
 * Get current breakpoint name
 */
export const getCurrentBreakpoint = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
  const w = getWindowWidth();
  if (w < BREAKPOINTS.sm) return 'xs';
  if (w < BREAKPOINTS.md) return 'sm';
  if (w < BREAKPOINTS.lg) return 'md';
  if (w < BREAKPOINTS.xl) return 'lg';
  return 'xl';
};

/**
 * Check if device has touch support
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Check if device is in portrait orientation
 */
export const isPortrait = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.innerHeight > window.innerWidth;
};

/**
 * Check if device is in landscape orientation
 */
export const isLandscape = (): boolean => {
  return !isPortrait();
};

/**
 * Get device pixel ratio (for retina displays)
 */
export const getPixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
};

/**
 * Get device information object
 */
export const getDeviceInfo = () => {
  const width = getWindowWidth();
  const height = getWindowHeight();
  const breakpoint = getCurrentBreakpoint();
  
  return {
    width,
    height,
    breakpoint,
    isMobile: isMobile(width),
    isTablet: isTablet(width),
    isDesktop: isDesktop(width),
    isTouch: isTouchDevice(),
    isPortrait: isPortrait(),
    isLandscape: isLandscape(),
    pixelRatio: getPixelRatio(),
  };
};

/**
 * Log current device information (development only)
 */
export const logDeviceInfo = () => {
  const info = getDeviceInfo();
  logger.log('Device Information:', info);
  return info;
};
