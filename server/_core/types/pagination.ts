/**
 * Standardized Pagination Types and Utilities
 *
 * Provides consistent pagination across all API endpoints.
 * Use these types and schemas for all paginated responses.
 */

import { z } from "zod";

// ============================================================================
// PAGINATION INPUT SCHEMAS
// ============================================================================

/**
 * Offset-based pagination input schema
 * Use for small datasets or when total count is needed
 */
export const offsetPaginationSchema = z.object({
  /** Number of items to skip (0-indexed) */
  offset: z.number().int().min(0).default(0),
  /** Maximum items to return (1-100) */
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Cursor-based pagination input schema
 * Use for large datasets or infinite scroll
 */
export const cursorPaginationSchema = z.object({
  /** Cursor from previous response (null for first page) */
  cursor: z.string().nullish(),
  /** Maximum items to return (1-100) */
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Page-based pagination input schema
 * Use when page numbers are meaningful to users
 */
export const pagePaginationSchema = z.object({
  /** Page number (1-indexed) */
  page: z.number().int().min(1).default(1),
  /** Items per page (1-100) */
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export type OffsetPaginationInput = z.infer<typeof offsetPaginationSchema>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type PagePaginationInput = z.infer<typeof pagePaginationSchema>;

/**
 * Offset-based pagination metadata
 */
export interface OffsetPaginationMeta {
  /** Total number of items */
  total: number;
  /** Current offset */
  offset: number;
  /** Items per page */
  limit: number;
  /** Whether there are more items */
  hasMore: boolean;
}

/**
 * Cursor-based pagination metadata
 */
export interface CursorPaginationMeta {
  /** Cursor for next page (null if no more pages) */
  nextCursor: string | null;
  /** Whether there are more items */
  hasMore: boolean;
}

/**
 * Page-based pagination metadata
 */
export interface PagePaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrev: boolean;
}

// ============================================================================
// PAGINATED RESPONSE TYPES
// ============================================================================

/**
 * Generic offset-paginated response
 */
export interface OffsetPaginatedResponse<T> {
  items: T[];
  pagination: OffsetPaginationMeta;
}

/**
 * Generic cursor-paginated response
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  pagination: CursorPaginationMeta;
}

/**
 * Generic page-paginated response
 */
export interface PagePaginatedResponse<T> {
  items: T[];
  pagination: PagePaginationMeta;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create offset pagination metadata
 */
export function createOffsetMeta(
  total: number,
  offset: number,
  limit: number
): OffsetPaginationMeta {
  return {
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
  };
}

/**
 * Create cursor pagination metadata
 * @param items The items being returned
 * @param limit The requested limit
 * @param getCursor Function to extract cursor from last item
 */
export function createCursorMeta<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string
): CursorPaginationMeta {
  const hasMore = items.length === limit;
  return {
    nextCursor: hasMore && items.length > 0 ? getCursor(items[items.length - 1]) : null,
    hasMore,
  };
}

/**
 * Create page pagination metadata
 */
export function createPageMeta(
  totalItems: number,
  page: number,
  pageSize: number
): PagePaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Convert page-based input to offset-based for database queries
 */
export function pageToOffset(input: PagePaginationInput): OffsetPaginationInput {
  return {
    offset: (input.page - 1) * input.pageSize,
    limit: input.pageSize,
  };
}

/**
 * Calculate SQL OFFSET and LIMIT from pagination input
 */
export function calculateOffsetLimit(
  input: OffsetPaginationInput | PagePaginationInput
): { offset: number; limit: number } {
  if ("page" in input) {
    return pageToOffset(input as PagePaginationInput);
  }
  return { offset: input.offset, limit: input.limit };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and constrain limit based on tier
 */
export function constrainLimit(
  requested: number,
  tier: "free" | "pro" | "enterprise"
): number {
  const maxLimits = {
    free: 20,
    pro: 50,
    enterprise: 100,
  };
  return Math.min(requested, maxLimits[tier]);
}
