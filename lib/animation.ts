/**
 * Cross-platform animation utilities
 * 
 * Uses CSS animations on web for better performance,
 * falls back to reanimated for native.
 */

import { Platform } from 'react-native';

/**
 * Check if we should use CSS animations (web only)
 */
export const useCSSAnimations = Platform.OS === 'web';

/**
 * CSS animation class names for web
 * These correspond to animations defined in global.css
 */
export const cssAnimations = {
  fadeIn: 'animate-fade-in',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  slideInRight: 'animate-slide-in-right',
  slideInLeft: 'animate-slide-in-left',
  scaleIn: 'animate-scale-in',
  pulse: 'animate-pulse',
} as const;

/**
 * Delays for staggered animations (in ms)
 */
export const staggerDelay = (index: number, baseDelay = 100) => index * baseDelay;

/**
 * CSS style for delayed animation
 */
export const withDelay = (delayMs: number) => ({
  animationDelay: `${delayMs}ms`,
});
