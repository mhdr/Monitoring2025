/**
 * Mobile Utilities
 * Helper functions for mobile device detection, touch interactions, and responsive behavior
 */

import { createLogger } from './logger';

const logger = createLogger('mobileUtils');

/**
 * Minimum touch target size (44x44px per WCAG 2.1 Level AAA)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Detect if the device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  interface WindowWithOpera extends Window {
    opera?: string;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as WindowWithOpera).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Check touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size (typical mobile max width)
  const isMobileWidth = window.innerWidth <= 768;
  
  return mobileRegex.test(userAgent) || (hasTouch && isMobileWidth);
};

/**
 * Detect if the device is a tablet
 */
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  interface WindowWithOpera extends Window {
    opera?: string;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as WindowWithOpera).opera || '';
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;
  
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isTabletWidth = window.innerWidth > 768 && window.innerWidth <= 1024;
  
  return tabletRegex.test(userAgent) || (hasTouch && isTabletWidth);
};

/**
 * Detect if the device supports hover
 */
export const supportsHover = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Get appropriate icon size based on device
 */
export const getIconSize = (base: number = 24): { fontSize: number } => {
  const isMobile = isMobileDevice();
  const isTablet = isTabletDevice();
  
  if (isMobile) {
    return { fontSize: Math.max(base * 1.2, 28) }; // 20% larger on mobile, min 28px
  }
  if (isTablet) {
    return { fontSize: Math.max(base * 1.1, 26) }; // 10% larger on tablet, min 26px
  }
  return { fontSize: base };
};

/**
 * Get touch-friendly button size
 */
export const getTouchButtonSize = (size: 'small' | 'medium' | 'large' = 'medium'): { 
  minWidth: number; 
  minHeight: number;
  padding?: string;
} => {
  const isMobile = isMobileDevice();
  
  if (!isMobile) {
    // Desktop sizes
    switch (size) {
      case 'small':
        return { minWidth: 32, minHeight: 32 };
      case 'large':
        return { minWidth: 56, minHeight: 56 };
      case 'medium':
      default:
        return { minWidth: 40, minHeight: 40 };
    }
  }
  
  // Mobile sizes - ensure WCAG minimum 44x44px
  switch (size) {
    case 'small':
      return { minWidth: 44, minHeight: 44, padding: '8px' };
    case 'large':
      return { minWidth: 56, minHeight: 56, padding: '12px' };
    case 'medium':
    default:
      return { minWidth: 48, minHeight: 48, padding: '10px' };
  }
};

/**
 * Debounce function for touch events to prevent double-tap issues
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for scroll events
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number = 100
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Prevent default touch behaviors (like pull-to-refresh) on specific elements
 */
export const preventTouchScroll = (element: HTMLElement | null): (() => void) => {
  if (!element) return () => {};
  
  const handler = (e: TouchEvent) => {
    e.preventDefault();
  };
  
  element.addEventListener('touchmove', handler, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchmove', handler);
  };
};

/**
 * Handle swipe gestures
 */
export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useSwipeGesture = (
  element: HTMLElement | null,
  handlers: SwipeHandlers,
  minSwipeDistance: number = 50
): (() => void) => {
  if (!element) return () => {};
  
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  };
  
  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Horizontal swipe
    if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
      if (deltaX > 0) {
        handlers.onSwipeRight?.();
        logger.debug('Swipe right detected');
      } else {
        handlers.onSwipeLeft?.();
        logger.debug('Swipe left detected');
      }
    }
    // Vertical swipe
    else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
      if (deltaY > 0) {
        handlers.onSwipeDown?.();
        logger.debug('Swipe down detected');
      } else {
        handlers.onSwipeUp?.();
        logger.debug('Swipe up detected');
      }
    }
  };
  
  element.addEventListener('touchstart', handleTouchStart);
  element.addEventListener('touchend', handleTouchEnd);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
};

/**
 * Get responsive spacing based on device
 */
export const getResponsiveSpacing = (base: number = 2): { 
  xs: number; 
  sm: number; 
  md: number;
  lg: number;
} => {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // Tighter spacing on mobile
    return {
      xs: base * 0.5,
      sm: base * 0.75,
      md: base,
      lg: base * 1.25,
    };
  }
  
  // Standard spacing on desktop
  return {
    xs: base,
    sm: base * 1.25,
    md: base * 1.5,
    lg: base * 2,
  };
};

/**
 * Get responsive font size based on device and breakpoint
 */
export const getResponsiveFontSize = (
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption'
): { xs: string; sm?: string; md?: string } => {
  const isMobile = isMobileDevice();
  
  const fontSizes = {
    h1: { xs: isMobile ? '1.75rem' : '2rem', md: '2.5rem' },
    h2: { xs: isMobile ? '1.5rem' : '1.75rem', md: '2rem' },
    h3: { xs: isMobile ? '1.25rem' : '1.5rem', md: '1.75rem' },
    h4: { xs: isMobile ? '1.125rem' : '1.25rem', md: '1.5rem' },
    h5: { xs: isMobile ? '1rem' : '1.125rem', md: '1.25rem' },
    h6: { xs: isMobile ? '0.95rem' : '1rem', md: '1.125rem' },
    body1: { xs: isMobile ? '0.9rem' : '1rem' },
    body2: { xs: isMobile ? '0.85rem' : '0.875rem' },
    caption: { xs: isMobile ? '0.7rem' : '0.75rem' },
  };
  
  return fontSizes[variant];
};

/**
 * Haptic feedback for touch interactions (if supported)
 */
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (typeof window === 'undefined') return;
  
  interface NavigatorWithVibrate extends Navigator {
    vibrate?: (pattern: number | number[]) => boolean;
  }
  
  // Check for Vibration API support
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    (navigator as NavigatorWithVibrate).vibrate?.(patterns[type]);
    logger.debug(`Haptic feedback: ${type}`);
  }
};

/**
 * Lock screen orientation for specific pages (if supported)
 */
export const lockOrientation = (orientation: 'portrait' | 'landscape' | 'any' = 'any'): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  
  interface ScreenWithOrientation extends Screen {
    orientation?: {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
  }
  
  const screen = window.screen as ScreenWithOrientation;
  
  if (screen.orientation?.lock) {
    const orientationMap = {
      portrait: 'portrait-primary',
      landscape: 'landscape-primary',
      any: 'any',
    };
    
    return screen.orientation.lock(orientationMap[orientation]).catch((err: Error) => {
      logger.warn('Failed to lock screen orientation:', err);
    });
  }
  
  return Promise.resolve();
};

/**
 * Unlock screen orientation
 */
export const unlockOrientation = (): void => {
  if (typeof window === 'undefined') return;
  
  interface ScreenWithOrientation extends Screen {
    orientation?: {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
  }
  
  const screen = window.screen as ScreenWithOrientation;
  
  if (screen.orientation?.unlock) {
    screen.orientation.unlock();
    logger.debug('Screen orientation unlocked');
  }
};

/**
 * Get safe area insets (for notch support on iOS)
 */
export const getSafeAreaInsets = (): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
};

/**
 * Check if device is in standalone mode (PWA)
 */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
  }
  
  // iOS Safari
  if ((window.navigator as NavigatorWithStandalone).standalone) {
    return true;
  }
  
  // Android Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  return false;
};

/**
 * Prevent zoom on double-tap for specific elements
 */
export const preventDoubleTapZoom = (element: HTMLElement | null): (() => void) => {
  if (!element) return () => {};
  
  let lastTap = 0;
  
  const handler = (e: TouchEvent) => {
    const currentTime = new Date().getTime();
    const tapGap = currentTime - lastTap;
    
    if (tapGap < 300 && tapGap > 0) {
      e.preventDefault();
    }
    
    lastTap = currentTime;
  };
  
  element.addEventListener('touchend', handler);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchend', handler);
  };
};
