/**
 * Protocol Guide - Distributed Tracing
 *
 * Provides request ID generation, trace context management, and
 * utilities for tracking requests across the entire lifecycle.
 *
 * Features:
 * - Unique request ID generation with configurable prefix
 * - Trace context propagation through tRPC context
 * - Child logger creation with trace context
 * - Performance timing utilities
 * - Error enrichment with trace data
 */

import { randomUUID } from "crypto";
import { logger, createContextLogger } from "./logger";
import type { Logger } from "pino";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trace context attached to every request
 */
export interface TraceContext {
  /** Unique request identifier (format: req_<uuid>) */
  requestId: string;
  /** Timestamp when request started (ms since epoch) */
  startTime: number;
  /** Optional parent trace ID for distributed tracing */
  parentTraceId?: string;
  /** Optional span ID for nested operations */
  spanId?: string;
  /** Source of the request (web, mobile, api) */
  source?: "web" | "mobile" | "api" | "internal";
  /** User ID if authenticated */
  userId?: string;
  /** User's subscription tier */
  userTier?: string;
}

/**
 * Span for tracking nested operations within a request
 */
export interface Span {
  spanId: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: "pending" | "success" | "error";
  attributes: Record<string, unknown>;
  parentSpanId?: string;
}

/**
 * Complete trace data for a request
 */
export interface TraceData {
  context: TraceContext;
  spans: Span[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

const REQUEST_ID_PREFIX = "req_";
const SPAN_ID_PREFIX = "span_";

/**
 * Generate a unique request ID
 * Format: req_<uuid> (e.g., req_550e8400-e29b-41d4-a716-446655440000)
 */
export function generateRequestId(): string {
  return `${REQUEST_ID_PREFIX}${randomUUID()}`;
}

/**
 * Generate a unique span ID
 * Format: span_<uuid> (e.g., span_550e8400-e29b-41d4-a716-446655440000)
 */
export function generateSpanId(): string {
  return `${SPAN_ID_PREFIX}${randomUUID()}`;
}

/**
 * Validate a request ID format
 */
export function isValidRequestId(id: string): boolean {
  return id.startsWith(REQUEST_ID_PREFIX) && id.length === REQUEST_ID_PREFIX.length + 36;
}

/**
 * Extract request ID from various header formats
 * Supports: x-request-id, x-correlation-id, x-trace-id
 */
export function extractRequestId(headers: Record<string, string | string[] | undefined>): string | undefined {
  const headerNames = ["x-request-id", "x-correlation-id", "x-trace-id"];

  for (const name of headerNames) {
    const value = headers[name];
    if (typeof value === "string" && value.length > 0) {
      // If it's already in our format, use it
      if (isValidRequestId(value)) {
        return value;
      }
      // Otherwise, generate a new one but log the external ID
      return undefined; // Will generate new ID, but external ID can be logged
    }
  }

  return undefined;
}

// ============================================================================
// TRACE CONTEXT CREATION
// ============================================================================

/**
 * Create a new trace context for a request
 */
export function createTraceContext(options?: {
  existingRequestId?: string;
  parentTraceId?: string;
  source?: TraceContext["source"];
  userId?: string;
  userTier?: string;
}): TraceContext {
  return {
    requestId: options?.existingRequestId || generateRequestId(),
    startTime: Date.now(),
    parentTraceId: options?.parentTraceId,
    spanId: generateSpanId(),
    source: options?.source,
    userId: options?.userId,
    userTier: options?.userTier,
  };
}

/**
 * Create a child trace context for nested operations
 */
export function createChildTraceContext(
  parent: TraceContext,
  operationName: string
): TraceContext {
  return {
    ...parent,
    spanId: generateSpanId(),
    parentTraceId: parent.requestId,
  };
}

// ============================================================================
// TRACE LOGGER
// ============================================================================

/**
 * Create a logger with trace context attached
 * All log entries will include requestId, spanId, etc.
 */
export function createTraceLogger(traceContext: TraceContext): Logger {
  return createContextLogger({
    requestId: traceContext.requestId,
    spanId: traceContext.spanId,
    parentTraceId: traceContext.parentTraceId,
    source: traceContext.source,
    userId: traceContext.userId,
    userTier: traceContext.userTier,
  }) as Logger;
}

// ============================================================================
// SPAN MANAGEMENT
// ============================================================================

/**
 * Create a new span for tracking an operation
 */
export function createSpan(
  name: string,
  attributes?: Record<string, unknown>,
  parentSpanId?: string
): Span {
  return {
    spanId: generateSpanId(),
    name,
    startTime: Date.now(),
    status: "pending",
    attributes: attributes || {},
    parentSpanId,
  };
}

/**
 * End a span and calculate duration
 */
export function endSpan(span: Span, status: "success" | "error" = "success"): Span {
  const endTime = Date.now();
  return {
    ...span,
    endTime,
    durationMs: endTime - span.startTime,
    status,
  };
}

/**
 * Execute a function within a traced span
 * Automatically handles timing and error status
 */
export async function withSpan<T>(
  traceContext: TraceContext,
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const span = createSpan(spanName, attributes, traceContext.spanId);
  const traceLogger = createTraceLogger(traceContext);

  traceLogger.debug(
    { spanId: span.spanId, spanName: span.name },
    `Span started: ${spanName}`
  );

  try {
    const result = await fn(span);
    const completedSpan = endSpan(span, "success");

    traceLogger.debug(
      {
        spanId: completedSpan.spanId,
        spanName: completedSpan.name,
        durationMs: completedSpan.durationMs,
      },
      `Span completed: ${spanName} (${completedSpan.durationMs}ms)`
    );

    return result;
  } catch (error) {
    const failedSpan = endSpan(span, "error");

    traceLogger.error(
      {
        spanId: failedSpan.spanId,
        spanName: failedSpan.name,
        durationMs: failedSpan.durationMs,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      `Span failed: ${spanName}`
    );

    throw error;
  }
}

// ============================================================================
// PERFORMANCE TIMING
// ============================================================================

/**
 * Timer utility for measuring operation duration
 */
export class TraceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a point in time
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * Get elapsed time since start
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get elapsed time since a mark
   */
  elapsedSince(markName: string): number | undefined {
    const markTime = this.marks.get(markName);
    return markTime ? Date.now() - markTime : undefined;
  }

  /**
   * Get all timings as a record
   */
  getTimings(): Record<string, number> {
    const timings: Record<string, number> = {
      total: this.elapsed(),
    };

    let prevTime = this.startTime;
    for (const [name, time] of this.marks) {
      timings[name] = time - prevTime;
      prevTime = time;
    }

    return timings;
  }
}

// ============================================================================
// ERROR ENRICHMENT
// ============================================================================

/**
 * Enrich an error with trace context for debugging
 */
export function enrichErrorWithTrace(
  error: Error,
  traceContext: TraceContext
): Error & { traceContext: TraceContext } {
  return Object.assign(error, { traceContext });
}

/**
 * Extract trace context from an error if present
 */
export function extractTraceFromError(error: unknown): TraceContext | undefined {
  if (error && typeof error === "object" && "traceContext" in error) {
    return (error as { traceContext: TraceContext }).traceContext;
  }
  return undefined;
}

// ============================================================================
// RESPONSE HEADERS
// ============================================================================

/**
 * Get headers to include trace context in responses
 */
export function getTraceResponseHeaders(traceContext: TraceContext): Record<string, string> {
  return {
    "x-request-id": traceContext.requestId,
    "x-response-time": `${Date.now() - traceContext.startTime}ms`,
  };
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log a procedure call start
 */
export function logProcedureStart(
  traceContext: TraceContext,
  path: string,
  type: "query" | "mutation" | "subscription",
  input?: unknown
): void {
  const traceLogger = createTraceLogger(traceContext);
  traceLogger.info(
    {
      procedure: path,
      type,
      hasInput: input !== undefined,
    },
    `tRPC ${type} started: ${path}`
  );
}

/**
 * Log a procedure call completion
 */
export function logProcedureComplete(
  traceContext: TraceContext,
  path: string,
  type: "query" | "mutation" | "subscription",
  durationMs: number,
  success: boolean
): void {
  const traceLogger = createTraceLogger(traceContext);
  const level = success ? "info" : "warn";

  traceLogger[level](
    {
      procedure: path,
      type,
      durationMs,
      success,
    },
    `tRPC ${type} ${success ? "completed" : "failed"}: ${path} (${durationMs}ms)`
  );
}

/**
 * Log a procedure error
 */
export function logProcedureError(
  traceContext: TraceContext,
  path: string,
  type: "query" | "mutation" | "subscription",
  error: unknown,
  durationMs: number
): void {
  const traceLogger = createTraceLogger(traceContext);

  traceLogger.error(
    {
      procedure: path,
      type,
      durationMs,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    },
    `tRPC ${type} error: ${path}`
  );
}
