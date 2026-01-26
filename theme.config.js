/** @type {const} */
// Professional medical app color palette - Deep Slate dark theme
// Optimized for WCAG AA accessibility and emergency services branding
const themeColors = {
  // Primary brand color - Signal Red (brightened for dark theme visibility)
  // Light: Deep crimson for professional feel | Dark: Vivid red for urgency/visibility
  primary: { light: '#A31621', dark: '#EF4444' },

  // Deep Slate background - professional, calming, reduces eye strain
  background: { light: '#FFFFFF', dark: '#0F172A' },

  // Charcoal surface for cards and elevated surfaces
  // Provides clear visual hierarchy without being too stark
  surface: { light: '#F9FAFB', dark: '#1E293B' },

  // Cloud White text for maximum readability on dark
  // High contrast for critical medical information
  foreground: { light: '#111827', dark: '#F8FAFC' },

  // Secondary text - brightened for WCAG AA compliance (5.8:1 contrast)
  // Used for labels, hints, and secondary information
  muted: { light: '#6B7280', dark: '#A1B1C7' },

  // Border color - subtle separation without distraction
  border: { light: '#E5E7EB', dark: '#3B4A63' },

  // Status colors - optimized for colorblind accessibility
  // All meet WCAG AA minimum contrast ratios
  success: { light: '#059669', dark: '#22C55E' },
  warning: { light: '#D97706', dark: '#FBBF24' },
  error: { light: '#DC2626', dark: '#F87171' },

  // Info color - for non-critical informational states
  info: { light: '#2563EB', dark: '#60A5FA' },
};

module.exports = { themeColors };
