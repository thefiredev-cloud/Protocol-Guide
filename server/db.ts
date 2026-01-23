/**
 * Database operations (Refactored)
 * This file now re-exports from modular database files in ./db/
 *
 * Refactoring completed: Split 1707-line monolithic file into focused modules:
 * - db/config.ts - Configuration and constants
 * - db/connection.ts - Database connection management
 * - db/users.ts - User CRUD operations
 * - db/users-auth.ts - OAuth and authentication
 * - db/users-usage.ts - Usage tracking and tier management
 * - db/counties.ts - County operations and coverage
 * - db/protocols.ts - Protocol CRUD
 * - db/protocols-search.ts - Semantic search functionality
 * - db/queries.ts - Query history
 * - db/feedback.ts - Feedback and contact submissions
 * - db/admin.ts - Admin operations and audit logs
 * - db/agencies.ts - Agency management
 * - db/protocol-versions.ts - Protocol versioning and uploads
 */

export * from "./db";
