/**
 * Feature Flags for Protocol Guide
 *
 * Centralized feature toggles for gradual rollout and A/B testing.
 * Toggle features without code deploys by updating this file.
 */

export interface FeatureFlags {
  /** Enable ImageTrend deep linking integration - OFF until demo */
  enable_imagetrend_deep_linking: boolean;

  /** Enable enterprise security audit logging */
  enable_enterprise_security_audit: boolean;

  /** Enable offline protocol caching (PWA feature) */
  enable_offline_cache: boolean;

  /** Enable voice-to-text protocol search */
  enable_voice_search: boolean;

  /** Enable search history cloud sync (Pro feature) */
  enable_search_history_sync: boolean;

  /** Enable new monitoring dashboard */
  enable_monitoring_dashboard: boolean;
}

/**
 * Current feature flag configuration
 * Toggle features by changing these values
 */
export const FLAGS: FeatureFlags = {
  // Integration features - ENABLED for partner demo
  enable_imagetrend_deep_linking: true,

  // Enterprise features
  enable_enterprise_security_audit: false,

  // PWA features - enabled
  enable_offline_cache: true,
  enable_voice_search: true,

  // Pro features
  enable_search_history_sync: true,

  // Admin features
  enable_monitoring_dashboard: true,
};

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return FLAGS[flag] ?? false;
}

/**
 * Get all enabled features (for debugging/logging)
 */
export function getEnabledFeatures(): (keyof FeatureFlags)[] {
  return (Object.keys(FLAGS) as (keyof FeatureFlags)[]).filter(
    (key) => FLAGS[key]
  );
}

/**
 * Environment-specific overrides
 * In production, these could be loaded from environment variables or a remote config
 */
export function getFeatureFlagsForEnvironment(): FeatureFlags {
  const env = process.env.NODE_ENV || "development";

  // Development overrides - enable more features for testing
  if (env === "development") {
    return {
      ...FLAGS,
      enable_imagetrend_deep_linking: true, // Enable in dev for testing
      enable_monitoring_dashboard: true,
    };
  }

  // Staging overrides
  if (env === "staging" || process.env.VERCEL_ENV === "preview") {
    return {
      ...FLAGS,
      enable_imagetrend_deep_linking: true, // Enable in staging for demo
    };
  }

  // Production - use default FLAGS
  return FLAGS;
}

/**
 * Runtime feature flag accessor with environment awareness
 */
export function getFlags(): FeatureFlags {
  return getFeatureFlagsForEnvironment();
}
