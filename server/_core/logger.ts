/**
 * Protocol Guide - Structured Logging with Pino
 *
 * Provides structured JSON logging for all server operations.
 * Includes request ID tracking, user context, and performance timing.
 */

import pino from "pino";
import pinoHttp from "pino-http";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";

// Base logger configuration
export const logger = pino.default ? pino.default({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});

// HTTP request logger middleware
export const httpLogger = pinoHttp({
  logger,
  // Generate unique request ID for tracing
  genReqId: (req) => {
    const existingId = req.headers["x-request-id"];
    return (existingId as string) || randomUUID();
  },
  // Custom request ID header
  requestIdHeader: "x-request-id",
  // Include request ID in response
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  // Customize logged properties
  customProps: (req: Request, res: Response) => ({
    userId: (req as any).userId,
    userEmail: (req as any).userEmail,
    subscriptionTier: (req as any).subscriptionTier,
  }),
  // Automatically log request/response
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks to reduce noise
      return req.url === "/api/health";
    },
  },
  // Custom log level based on status code
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
});

/**
 * Create a child logger with additional context
 */
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: Record<string, any>
) {
  logger.info(
    {
      operation,
      durationMs,
      ...metadata,
    },
    `Performance: ${operation} took ${durationMs}ms`
  );
}

/**
 * Log error with full context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    },
    `Error: ${error.message}`
  );
}
