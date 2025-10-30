/**
 * useMobile Hook
 * React hook for mobile device detection, responsive behavior, and touch interactions
 */

import { useState, useEffect, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { 
  isMobileDevice, 
  isTabletDevice, 
  supportsHover,
  isStandalone,
  getSafeAreaInsets,
} from '../utils/mobileUtils';

export interface UseMobileResult {
  // Device detection
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  hasHover: boolean;
  isPWA: boolean;
  
  // MUI breakpoint detection
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  
  // Combined responsive states
  isSmallScreen: boolean;   // xs or sm
  isMediumScreen: boolean;  // md
  isLargeScreen: boolean;   // lg or xl
  
  // Safe area insets (for notch support)
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * useMobile Hook
 * Provides comprehensive mobile device detection and responsive utilities
 */
export const useMobile = (): UseMobileResult => {
  const theme = useTheme();
  
  // MUI breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));
  
  // Device detection (client-side only)
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [hasHover, setHasHover] = useState(true);
  const [isPWA, setIsPWA] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  
  useEffect(() => {
    // Run detection on client-side only
    setIsMobile(isMobileDevice());
    setIsTablet(isTabletDevice());
    setHasHover(supportsHover());
    setIsPWA(isStandalone());
    setSafeAreaInsets(getSafeAreaInsets());
    
    // Update on window resize
    const handleResize = () => {
      setIsMobile(isMobileDevice());
      setIsTablet(isTabletDevice());
      setSafeAreaInsets(getSafeAreaInsets());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Derived responsive states
  const isDesktop = useMemo(() => !isMobile && !isTablet, [isMobile, isTablet]);
  const isTouchDevice = useMemo(() => isMobile || isTablet, [isMobile, isTablet]);
  const isSmallScreen = useMemo(() => isXs || isSm, [isXs, isSm]);
  const isMediumScreen = useMemo(() => isMd, [isMd]);
  const isLargeScreen = useMemo(() => isLg || isXl, [isLg, isXl]);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    hasHover,
    isPWA,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    safeAreaInsets,
  };
};

/**
 * useSwipe Hook
 * React hook for handling swipe gestures
 */
export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
}

export const useSwipe = (ref: React.RefObject<HTMLElement>, options: UseSwipeOptions): void => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
  } = options;
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
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
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      // Vertical swipe
      else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, minSwipeDistance]);
};

/**
 * useTouchFeedback Hook
 * React hook for providing haptic feedback on touch interactions
 */
export const useTouchFeedback = () => {
  const { isTouchDevice } = useMobile();
  
  const provideFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isTouchDevice) return;
    
    // Use Vibration API if available
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(patterns[type]);
    }
  };
  
  return provideFeedback;
};
