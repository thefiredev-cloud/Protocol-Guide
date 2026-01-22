/**
 * Protocol Guide - Sentry Error Tracking Configuration
 *
 * Provides error tracking and performance monitoring via Sentry.
 * Enable by setting SENTRY_DSN environment variable.
 *
 * Installation (when ready to enable):
 *   pnpm add @sentry/node
 *
 * Note: This module is a placeholder. Once @sentry/node is installed,
 * uncomment the implementation and import in index.ts.
 */

import { ENV } from './env';

// Placeholder types until Sentry is installed
type SentryModule = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: Error) => void;
  captureMessage: (message: string) => void;
  setUser: (user: { id?: string; email?: string } | null) => void;
  Integrations: Record<string, new () => unknown>;
};

let Sentry: SentryModule | null = null;

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
    // Dynamic import to avoid bundling Sentry if not used
    Sentry = await import('@sentry/node').catch(() => null) as SentryModule | null;

    if (!Sentry) {
      console.log('[Sentry] @sentry/node not installed, run: pnpm add @sentry/node');
      return;
    }

    Sentry.init({
      dsn,
      environment: ENV.isProduction ? 'production' : 'development',
      release: process.env.npm_package_version || '1.0.0',

      // Performance monitoring - sample 10% of transactions in production
      tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,

      // Filter out expected/noisy errors
      beforeSend(event: Record<string, unknown>) {
        const message = (event.message as string) || '';

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
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an exception to Sentry
 */
export function captureException(error: Error): void {
  if (Sentry) {
    Sentry.captureException(error);
  }
  // Always log to console as well
  console.error('[Error]', error.message, error.stack);
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string): void {
  if (Sentry) {
    Sentry.captureMessage(message);
  }
  console.log('[Sentry Message]', message);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; email?: string } | null): void {
  if (Sentry) {
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

export { Sentry };
