/**
 * Search result formatting utilities
 * Pure functions for score colors, labels, date formatting, and currency advice
 */

export type ColorPalette = {
  success: string;
  primary: string;
  warning: string;
  error: string;
  muted: string;
};

/**
 * Get color based on relevance score
 */
export const getScoreColor = (score: number, colors: ColorPalette): string => {
  if (score >= 100) return colors.success;
  if (score >= 50) return colors.primary;
  if (score >= 20) return colors.warning;
  return colors.muted;
};

/**
 * Get human-readable label for relevance score
 */
export const getScoreLabel = (score: number): string => {
  if (score >= 100) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 20) return "Fair";
  return "Related";
};

/**
 * Get color based on protocol currency (age/verification date)
 */
export const getDateColor = (
  protocolYear: number | null,
  lastVerifiedAt: string | null,
  colors: ColorPalette
): string => {
  const currentYear = new Date().getFullYear();
  
  // Check protocol year first
  if (protocolYear) {
    const age = currentYear - protocolYear;
    if (age <= 1) return colors.success; // Current or last year
    if (age <= 2) return colors.primary; // 2 years old
    if (age <= 3) return colors.warning; // 3 years old
    return colors.error; // 4+ years old
  }
  
  // Check last verified date
  if (lastVerifiedAt) {
    const verifiedDate = new Date(lastVerifiedAt);
    const monthsAgo = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 6) return colors.success;
    if (monthsAgo <= 12) return colors.primary;
    if (monthsAgo <= 24) return colors.warning;
    return colors.error;
  }
  
  return colors.muted;
};

/**
 * Format protocol date for display
 */
export const formatProtocolDate = (
  effectiveDate: string | null,
  protocolYear: number | null,
  lastVerifiedAt: string | null
): string => {
  if (effectiveDate) {
    return `Effective: ${effectiveDate}`;
  }
  if (protocolYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - protocolYear;
    if (age === 0) return `${protocolYear} (Current)`;
    if (age === 1) return `${protocolYear} (1 year old)`;
    return `${protocolYear} (${age} years old)`;
  }
  if (lastVerifiedAt) {
    const date = new Date(lastVerifiedAt);
    return `Verified: ${date.toLocaleDateString()}`;
  }
  return "Date unknown";
};

/**
 * Get advice based on protocol age
 */
export const getCurrencyAdvice = (protocolYear: number): string => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - protocolYear;
  
  if (age <= 1) {
    return "This protocol is current. Always verify with your medical director.";
  }
  if (age <= 2) {
    return "This protocol is relatively recent. Check for updates with your agency.";
  }
  if (age <= 3) {
    return "This protocol may have been updated. Verify current version with your medical director.";
  }
  return "This protocol is over 3 years old. Strongly recommend verifying current guidelines with your medical director.";
};
