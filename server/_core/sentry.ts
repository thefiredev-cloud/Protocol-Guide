/**
 * Protocol Guide - Sentry Error Tracking Configuration
 *
 * Provides error tracking and performance monitoring via Sentry.
 * REQUIRED for production deployments - set SENTRY_DSN environment variable.
 *
 * Sentry is a required dependency for this application.
 */

import * as Sentry from '@sentry/node';
import { ENV } from './env';

// Track if Sentry has been initialized
let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 *
 * Call this at server startup, before any routes are registered.
 * In production, missing SENTRY_DSN will log a warning but not fail.
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    if (ENV.isProduction) {
      console.warn(
        '[Sentry] WARNING: SENTRY_DSN is not configured in production environment!\n' +
        '[Sentry] Error tracking is disabled. This is strongly discouraged for production.\n' +
        '[Sentry] Set SENTRY_DSN environment variable to enable error monitoring.'
      );
    } else {
      console.log('[Sentry] No SENTRY_DSN configured, error tracking disabled (development mode)');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: ENV.isProduction ? 'production' : 'development',
      release: process.env.npm_package_version || '1.0.0',

      // Performance monitoring - sample 10% of transactions in production
      tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,

      // Filter out expected/noisy errors
      beforeSend(event) {
        const message = event?.message || '';

        // Don't send rate limit errors (expected behavior)
        if (message.includes('rate limit') || message.includes('Too Many Requests')) {
          return null;
        }

        // Don't send auth errors (user error, not system error)
        if (message.includes('Unauthorized') || message.includes('Invalid token')) {
          return null;
        }

        return event;
      },
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized for', ENV.isProduction ? 'production' : 'development');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    if (ENV.isProduction) {
      console.warn('[Sentry] WARNING: Sentry initialization failed in production!');
    }
  }
}

/**
 * Capture an exception to Sentry
 */
export function captureException(error: Error): void {
  if (sentryInitialized) {
    Sentry.captureException(error);
  }
  // Always log to console as well
  console.error('[Error]', error.message, error.stack);
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (sentryInitialized) {
    Sentry.captureMessage(message, level);
  }
  console.log('[Sentry Message]', message);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; email?: string } | null): void {
  if (sentryInitialized) {
    Sentry.setUser(user);
  }
}

/**
 * Express error handler middleware for Sentry
 *
 * Use as the LAST error handler in your Express app:
 *   app.use(sentryErrorHandler);
 */
export function sentryErrorHandler(
  err: Error,
  _req: unknown,
  res: { status: (code: number) => { json: (data: unknown) => void } },
  next: (err?: Error) => void
): void {
  captureException(err);

  // If response hasn't been sent, send generic error
  if (res && typeof res.status === 'function') {
    res.status(500).json({
      error: 'Internal Server Error',
      message: ENV.isProduction ? 'An unexpected error occurred' : err.message,
    });
  } else {
    next(err);
  }
}

/**
 * Get the Sentry instance (if initialized)
 * Returns the Sentry module for advanced usage
 */
export function getSentry(): typeof Sentry | null {
  return sentryInitialized ? Sentry : null;
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}
