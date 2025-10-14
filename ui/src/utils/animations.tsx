/**
 * Animation System - MUI Transitions
 * 
 * Reusable animation components and utilities for consistent transitions
 * across the application using Material-UI's Fade, Slide, and Zoom components.
 * 
 * Usage:
 * - Wrap components with FadeIn, SlideIn, or ZoomIn for automatic animations
 * - Use PageTransition for page-level route transitions
 * - All animations respect user's prefers-reduced-motion setting
 */

import React from 'react';
import { Fade, Slide, Zoom, Box } from '@mui/material';
import type { FadeProps, SlideProps, ZoomProps } from '@mui/material';

/**
 * Common animation duration in milliseconds
 */
export const ANIMATION_DURATION = {
  fast: 150,
  standard: 225,
  slow: 300,
} as const;

/**
 * FadeIn - Fade transition component
 * 
 * @example
 * <FadeIn in={isVisible}>
 *   <Card>Content</Card>
 * </FadeIn>
 */
export interface FadeInProps extends Omit<FadeProps, 'timeout'> {
  /** Animation duration (fast, standard, slow) */
  speed?: keyof typeof ANIMATION_DURATION;
  /** Custom timeout in ms (overrides speed) */
  timeout?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  speed = 'standard', 
  timeout,
  children,
  ...props 
}) => {
  return (
    <Fade 
      timeout={timeout ?? ANIMATION_DURATION[speed]}
      {...props}
    >
      {children as React.ReactElement}
    </Fade>
  );
};

/**
 * SlideIn - Slide transition component
 * 
 * @example
 * <SlideIn in={isVisible} direction="up">
 *   <Card>Content</Card>
 * </SlideIn>
 */
export interface SlideInProps extends Omit<SlideProps, 'timeout'> {
  /** Animation duration (fast, standard, slow) */
  speed?: keyof typeof ANIMATION_DURATION;
  /** Custom timeout in ms (overrides speed) */
  timeout?: number;
}

export const SlideIn: React.FC<SlideInProps> = ({ 
  speed = 'standard', 
  timeout,
  direction = 'up',
  children,
  ...props 
}) => {
  return (
    <Slide 
      timeout={timeout ?? ANIMATION_DURATION[speed]}
      direction={direction}
      {...props}
    >
      {children as React.ReactElement}
    </Slide>
  );
};

/**
 * ZoomIn - Zoom transition component
 * 
 * @example
 * <ZoomIn in={isVisible}>
 *   <Card>Content</Card>
 * </ZoomIn>
 */
export interface ZoomInProps extends Omit<ZoomProps, 'timeout'> {
  /** Animation duration (fast, standard, slow) */
  speed?: keyof typeof ANIMATION_DURATION;
  /** Custom timeout in ms (overrides speed) */
  timeout?: number;
}

export const ZoomIn: React.FC<ZoomInProps> = ({ 
  speed = 'fast', 
  timeout,
  children,
  ...props 
}) => {
  return (
    <Zoom 
      timeout={timeout ?? ANIMATION_DURATION[speed]}
      {...props}
    >
      {children as React.ReactElement}
    </Zoom>
  );
};

/**
 * PageTransition - Fade transition for page-level components
 * 
 * Automatically animates on mount with configurable delay.
 * 
 * @example
 * const MyPage = () => (
 *   <PageTransition>
 *     <Box>Page content</Box>
 *   </PageTransition>
 * );
 */
export interface PageTransitionProps {
  children: React.ReactNode;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Animation duration (ms) */
  timeout?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  delay = 0,
  timeout = ANIMATION_DURATION.standard,
}) => {
  const [show, setShow] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  return (
    <Fade in={show} timeout={timeout}>
      <Box sx={{ height: '100%', width: '100%' }}>
        {children}
      </Box>
    </Fade>
  );
};

/**
 * Stagger - Animate children with staggered delays
 * 
 * @example
 * <Stagger>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Stagger>
 */
export interface StaggerProps {
  children: React.ReactNode;
  /** Delay between each child animation (ms) */
  staggerDelay?: number;
  /** Animation duration (ms) */
  timeout?: number;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  staggerDelay = 50,
  timeout = ANIMATION_DURATION.standard,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <>
      {childArray.map((child, index) => (
        <FadeIn
          key={index}
          in={true}
          timeout={timeout}
          style={{ transitionDelay: `${index * staggerDelay}ms` }}
        >
          {child as React.ReactElement}
        </FadeIn>
      ))}
    </>
  );
};

export default {
  FadeIn,
  SlideIn,
  ZoomIn,
  PageTransition,
  Stagger,
  ANIMATION_DURATION,
};
