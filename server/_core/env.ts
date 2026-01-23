/**
 * Protocol Guide (Manus) - Environment Configuration
 *
 * Type-safe environment variable validation using Zod.
 * All environment variables are validated at startup with helpful error messages.
 *
 * Usage:
 *   import { env } from '@/server/_core/env';
 *   const apiKey = env.ANTHROPIC_API_KEY; // Type-safe, guaranteed to exist
 */

import { z } from 'zod';

/**
 * Environment variable schema with validation and helpful error messages
 */
const envSchema = z.object({
  // ===========================================
  // NODE ENVIRONMENT
  // ===========================================
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node environment'),

  PORT: z
    .string()
    .default('3000')
    .regex(/^\d+$/, 'PORT must be a valid number')
    .transform(Number)
    .pipe(z.number().int().positive().max(65535))
    .describe('Server port (1-65535)'),

  // ===========================================
  // AI SERVICES (Required)
  // ===========================================
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, 'ANTHROPIC_API_KEY is required')
    .startsWith('sk-ant-', 'ANTHROPIC_API_KEY must start with "sk-ant-"')
    .describe('Anthropic Claude API key - Get from: https://console.anthropic.com/'),

  VOYAGE_API_KEY: z
    .string()
    .min(1, 'VOYAGE_API_KEY is required')
    .startsWith('pa-', 'VOYAGE_API_KEY must start with "pa-"')
    .describe('Voyage AI API key for embeddings - Get from: https://www.voyageai.com/'),

  // ===========================================
  // DATABASE - SUPABASE (Required)
  // ===========================================
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .startsWith('https://', 'SUPABASE_URL must use HTTPS')
    .describe('Supabase project URL - Get from: Supabase Dashboard > Settings > API'),

  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY is required')
    .startsWith('eyJ', 'SUPABASE_ANON_KEY must be a valid JWT')
    .describe('Supabase anonymous key for client-side access'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .startsWith('eyJ', 'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT')
    .describe('Supabase service role key for server-side access (KEEP SECRET!)'),

  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid connection string')
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string')
    .describe('PostgreSQL connection string for Drizzle ORM'),

  // ===========================================
  // STRIPE PAYMENTS (Required for Pro tier)
  // ===========================================
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .regex(/^sk_(test|live)_/, 'STRIPE_SECRET_KEY must start with "sk_test_" or "sk_live_"')
    .describe('Stripe secret key - Get from: https://dashboard.stripe.com/apikeys'),

  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'STRIPE_PUBLISHABLE_KEY is required')
    .regex(/^pk_(test|live)_/, 'STRIPE_PUBLISHABLE_KEY must start with "pk_test_" or "pk_live_"')
    .describe('Stripe publishable key'),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with "whsec_"')
    .describe('Stripe webhook signing secret - Get from: Stripe Dashboard > Webhooks'),

  // Individual Pro subscription price IDs
  STRIPE_PRO_MONTHLY_PRICE_ID: z
    .string()
    .min(1, 'STRIPE_PRO_MONTHLY_PRICE_ID is required')
    .startsWith('price_', 'STRIPE_PRO_MONTHLY_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for monthly Pro subscription'),

  STRIPE_PRO_ANNUAL_PRICE_ID: z
    .string()
    .min(1, 'STRIPE_PRO_ANNUAL_PRICE_ID is required')
    .startsWith('price_', 'STRIPE_PRO_ANNUAL_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for annual Pro subscription'),

  // Small department (5-20 users) price IDs
  STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('price_'), 'STRIPE_DEPT_SMALL_MONTHLY_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for small department monthly subscription'),

  STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('price_'), 'STRIPE_DEPT_SMALL_ANNUAL_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for small department annual subscription'),

  // Large department (20+ users) price IDs
  STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('price_'), 'STRIPE_DEPT_LARGE_MONTHLY_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for large department monthly subscription'),

  STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('price_'), 'STRIPE_DEPT_LARGE_ANNUAL_PRICE_ID must start with "price_"')
    .describe('Stripe price ID for large department annual subscription'),

  // Trial period configuration
  STRIPE_TRIAL_PERIOD_DAYS: z
    .string()
    .default('7')
    .regex(/^\d+$/, 'STRIPE_TRIAL_PERIOD_DAYS must be a number')
    .transform(Number)
    .pipe(z.number().int().nonnegative().max(365))
    .describe('Stripe trial period in days (0-365)'),

  // ===========================================
  // AUTHENTICATION (Required)
  // ===========================================
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .describe('JWT secret for session cookies - Generate with: openssl rand -base64 32'),

  NEXT_AUTH_SECRET: z
    .string()
    .min(32, 'NEXT_AUTH_SECRET must be at least 32 characters')
    .describe('NextAuth secret for OAuth - Generate with: openssl rand -base64 32'),

  NEXT_AUTH_URL: z
    .string()
    .url('NEXT_AUTH_URL must be a valid URL')
    .default('http://localhost:3000')
    .describe('NextAuth callback URL'),

  // ===========================================
  // REDIS (Optional - Recommended for Production)
  // ===========================================
  REDIS_URL: z
    .string()
    .url('REDIS_URL must be a valid URL')
    .optional()
    .describe('Redis URL for distributed rate limiting - Get from: https://console.upstash.com/'),

  REDIS_TOKEN: z
    .string()
    .optional()
    .describe('Redis auth token'),

  // Alternative Upstash environment variables
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url('UPSTASH_REDIS_REST_URL must be a valid URL')
    .optional()
    .describe('Alternative: Upstash Redis REST URL'),

  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe('Alternative: Upstash Redis REST token'),

  // ===========================================
  // LOGGING (Optional)
  // ===========================================
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info')
    .describe('Log level for application logs'),

  // ===========================================
  // VITE CLIENT ENV VARS (Optional)
  // ===========================================
  VITE_APP_ID: z
    .string()
    .optional()
    .describe('Vite app identifier'),

  // ===========================================
  // LEGACY MANUS (Optional - for migration only)
  // ===========================================
  OAUTH_SERVER_URL: z
    .string()
    .url('OAUTH_SERVER_URL must be a valid URL')
    .optional()
    .describe('Legacy Manus OAuth server URL (optional, for migration)'),

  OWNER_OPEN_ID: z
    .string()
    .optional()
    .describe('Legacy Manus owner OpenID (optional, for migration)'),

  BUILT_IN_FORGE_API_URL: z
    .string()
    .url('BUILT_IN_FORGE_API_URL must be a valid URL')
    .optional()
    .describe('DEPRECATED: Legacy Manus Forge API URL'),

  BUILT_IN_FORGE_API_KEY: z
    .string()
    .optional()
    .describe('DEPRECATED: Legacy Manus Forge API key'),

  // ===========================================
  // EXPO (Optional)
  // ===========================================
  EXPO_PORT: z
    .string()
    .regex(/^\d+$/, 'EXPO_PORT must be a valid number')
    .transform(Number)
    .pipe(z.number().int().positive().max(65535))
    .optional()
    .describe('Expo development server port'),
});

/**
 * Environment variable type inferred from schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validated and typed environment variables
 * Use this instead of process.env for type safety and guaranteed existence
 */
let _env: Env | null = null;

/**
 * Get validated environment variables
 * Throws error if validation fails
 */
export function getEnv(): Env {
  if (_env) {
    return _env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.format();
    console.error('\n❌ Environment validation failed:\n');

    // Format errors with helpful messages
    const errorMessages: string[] = [];

    Object.entries(errors).forEach(([key, value]) => {
      if (key === '_errors' || !value) return;

      const fieldErrors = (value as any)._errors;
      if (fieldErrors && fieldErrors.length > 0) {
        const schema = envSchema.shape[key as keyof typeof envSchema.shape];
        const description = schema?.description || '';

        errorMessages.push(
          `  ${key}:\n` +
          `    Error: ${fieldErrors.join(', ')}\n` +
          (description ? `    Help: ${description}\n` : '')
        );
      }
    });

    console.error(errorMessages.join('\n'));
    console.error('\n📖 See .env.example for required environment variables\n');

    throw new Error('Environment validation failed. Please fix the errors above.');
  }

  _env = result.data;
  return _env;
}

/**
 * Validated environment variables (singleton)
 * Initialize once at startup
 */
export const env = getEnv();

/**
 * Legacy ENV object for backward compatibility
 * @deprecated Use `env` instead for type safety
 */
export const ENV = {
  // App Configuration
  appId: env.VITE_APP_ID ?? "",
  isProduction: env.NODE_ENV === "production",

  // Authentication
  cookieSecret: env.JWT_SECRET,
  nextAuthSecret: env.NEXT_AUTH_SECRET,
  nextAuthUrl: env.NEXT_AUTH_URL,

  // Database (Supabase)
  databaseUrl: env.DATABASE_URL,
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,

  // Redis (for distributed rate limiting and caching)
  redisUrl: env.REDIS_URL ?? env.UPSTASH_REDIS_REST_URL ?? "",
  redisToken: env.REDIS_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // AI Services
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  voyageApiKey: env.VOYAGE_API_KEY,

  // Stripe Payments
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  stripeProMonthlyPriceId: env.STRIPE_PRO_MONTHLY_PRICE_ID,
  stripeProAnnualPriceId: env.STRIPE_PRO_ANNUAL_PRICE_ID,

  // Legacy Manus OAuth (for migration)
  oAuthServerUrl: env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: env.OWNER_OPEN_ID ?? "",
  // DEPRECATED: Legacy Manus Forge API - safe to remove
  forgeApiUrl: env.BUILT_IN_FORGE_API_URL ?? "",
  // DEPRECATED: Legacy Manus Forge API - safe to remove
  forgeApiKey: env.BUILT_IN_FORGE_API_KEY ?? "",
};

/**
 * Validate required environment variables
 * @deprecated Use getEnv() instead - validation happens automatically
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  try {
    getEnv();
    return { valid: true, missing: [] };
  } catch (error) {
    // Extract missing required fields from error
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const missing = Object.keys(result.error.flatten().fieldErrors);
      return { valid: false, missing };
    }
    return { valid: false, missing: [] };
  }
}

/**
 * Log environment status (for debugging)
 */
export function logEnvStatus(): void {
  try {
    const envVars = getEnv();
    console.log('✅ All required environment variables are validated');
    console.log(`📦 Environment: ${envVars.NODE_ENV}`);
    console.log(`🔌 Server port: ${envVars.PORT}`);
    console.log(`🔐 Redis: ${envVars.REDIS_URL || envVars.UPSTASH_REDIS_REST_URL ? 'configured' : 'not configured (using in-memory)'}`);
    console.log(`💳 Stripe: ${envVars.STRIPE_SECRET_KEY.includes('test') ? 'test mode' : 'live mode'}`);
    console.log(`🤖 AI Services: Anthropic + Voyage AI`);
  } catch (error) {
    console.error('⚠️ Environment validation failed:', (error as Error).message);
  }
}

/**
 * Check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if Redis is configured
 */
export const isRedisConfigured = Boolean(
  env.REDIS_URL || env.UPSTASH_REDIS_REST_URL
);
