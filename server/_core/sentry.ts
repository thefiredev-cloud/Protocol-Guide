/**
 * Protocol Guide - Sentry Error Tracking Configuration
 *
 * Provides error tracking and performance monitoring via Sentry.
 * Enable by setting SENTRY_DSN environment variable.
 *
 * Installation (when ready to enable):
 *   pnpm add @sentry/node
 */

import { ENV } from './env';

// Sentry module reference (loaded dynamically)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryInstance: any = null;

/**
 * Initialize Sentry error tracking
 *
 * Call this at server startup, before any routes are registered.
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] No SENTRY_DSN configured, error tracking disabled');
    return;
  }

  try {
    // Dynamic require to avoid bundling Sentry if not installed
    // This allows the app to run without Sentry as a dependency
    const moduleName = '@sentry/node';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SentryInstance = require(moduleName);

    if (!SentryInstance || !SentryInstance.init) {
      console.log('[Sentry] @sentry/node not installed, run: pnpm add @sentry/node');
      return;
    }

    SentryInstance.init({
      dsn,
      environment: ENV.isProduction ? 'production' : 'development',
      release: process.env.npm_package_version || '1.0.0',

      // Performance monitoring - sample 10% of transactions in production
      tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,

      // Filter out expected/noisy errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend(event: any) {
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

    console.log('[Sentry] Initialized for', ENV.isProduction ? 'production' : 'development');
  } catch (error) {
    // Module not installed - this is expected if Sentry isn't configured
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      console.log('[Sentry] @sentry/node not installed, run: pnpm add @sentry/node');
    } else {
      console.error('[Sentry] Failed to initialize:', error);
    }
  }
}

/**
 * Capture an exception to Sentry
 */
export function captureException(error: Error): void {
  if (SentryInstance?.captureException) {
    SentryInstance.captureException(error);
  }
  // Always log to console as well
  console.error('[Error]', error.message, error.stack);
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string): void {
  if (SentryInstance?.captureMessage) {
    SentryInstance.captureMessage(message);
  }
  console.log('[Sentry Message]', message);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; email?: string } | null): void {
  if (SentryInstance?.setUser) {
    SentryInstance.setUser(user);
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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSentry(): any {
  return SentryInstance;
}
