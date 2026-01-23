/**
 * Design Token System for Protocol Guide
 *
 * Centralized design constants that complement the existing theme system.
 * Use these tokens for consistent styling across all components.
 */

/**
 * Spacing scale based on 4px base unit
 * Use for margins, padding, and gaps
 */
export const spacing = {
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Medium-small spacing */
  md: 12,
  /** 16px - Medium spacing */
  base: 16,
  /** 20px - Medium-large spacing */
  lg: 20,
  /** 24px - Large spacing */
  xl: 24,
  /** 32px - Extra large spacing */
  '2xl': 32,
  /** 40px - 2x extra large spacing */
  '3xl': 40,
  /** 48px - 3x extra large spacing */
  '4xl': 48,
} as const;

/**
 * Typography scale for consistent text sizing
 * Maps to Tailwind text size classes
 */
export const typography = {
  sizes: {
    /** 10px - Extra small text */
    xs: 10,
    /** 12px - Small text (captions, labels) */
    sm: 12,
    /** 14px - Base text size */
    base: 14,
    /** 16px - Large text */
    lg: 16,
    /** 18px - Extra large text */
    xl: 18,
    /** 20px - 2x extra large */
    '2xl': 20,
    /** 24px - 3x extra large (section headers) */
    '3xl': 24,
    /** 30px - 4x extra large (page titles) */
    '4xl': 30,
    /** 36px - 5x extra large (display text) */
    '5xl': 36,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Border radius values for consistent rounded corners
 */
export const radii = {
  /** 0px - No radius */
  none: 0,
  /** 4px - Small radius */
  sm: 4,
  /** 8px - Medium radius (buttons, inputs) */
  md: 8,
  /** 12px - Large radius (cards) */
  lg: 12,
  /** 16px - Extra large radius */
  xl: 16,
  /** 24px - 2x extra large radius */
  '2xl': 24,
  /** Full rounding for circular elements */
  full: 9999,
} as const;

/**
 * Shadow definitions for elevation
 * Use sparingly in dark mode
 */
export const shadows = {
  none: 'none',
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Animation durations in milliseconds
 */
export const durations = {
  /** 100ms - Fast transitions (hover states) */
  fast: 100,
  /** 200ms - Normal transitions */
  normal: 200,
  /** 300ms - Slow transitions (modals, overlays) */
  slow: 300,
  /** 500ms - Very slow transitions */
  slower: 500,
} as const;

/**
 * Z-index scale for layering
 */
export const zIndex = {
  /** Base layer */
  base: 0,
  /** Dropdown menus */
  dropdown: 10,
  /** Sticky elements */
  sticky: 20,
  /** Fixed headers */
  fixed: 30,
  /** Modal backdrop */
  modalBackdrop: 40,
  /** Modal content */
  modal: 50,
  /** Tooltips */
  tooltip: 60,
  /** Toast notifications */
  toast: 70,
} as const;

/**
 * Touch target sizes for accessibility
 * Minimum 44x44 points for gloved use in EMS environments
 */
export const touchTargets = {
  /** 44px - Minimum touch target (WCAG) */
  minimum: 44,
  /** 48px - Standard touch target */
  standard: 48,
  /** 56px - Large touch target */
  large: 56,
} as const;

/**
 * Semantic color mappings
 * These map to the theme colors but provide semantic naming
 */
export const semanticColors = {
  /** For interactive elements */
  interactive: {
    primary: 'primary',
    secondary: 'muted',
  },
  /** For feedback states */
  feedback: {
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'primary',
  },
  /** For text hierarchy */
  text: {
    primary: 'foreground',
    secondary: 'muted',
    disabled: 'muted',
  },
  /** For surfaces */
  surface: {
    default: 'background',
    elevated: 'surface',
    overlay: 'surface',
  },
} as const;

/**
 * Opacity values for consistent transparency
 */
export const opacity = {
  /** Fully transparent */
  transparent: 0,
  /** Disabled elements */
  disabled: 0.5,
  /** Pressed/active state */
  pressed: 0.7,
  /** Hover state */
  hover: 0.8,
  /** Overlay backdrop */
  overlay: 0.5,
  /** Fully opaque */
  opaque: 1,
} as const;

// Type exports for TypeScript users
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type Radii = typeof radii;
export type Shadows = typeof shadows;
export type Durations = typeof durations;
export type ZIndex = typeof zIndex;
export type TouchTargets = typeof touchTargets;
export type SemanticColors = typeof semanticColors;
export type Opacity = typeof opacity;

// Default export for convenient access
const designTokens = {
  spacing,
  typography,
  radii,
  shadows,
  durations,
  zIndex,
  touchTargets,
  semanticColors,
  opacity,
} as const;

export default designTokens;
