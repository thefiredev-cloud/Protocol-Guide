# TypeScript Strict Mode Fixes - Protocol Guide

## Summary
Enabled strict mode and fixed TypeScript errors across the codebase.

## Key Changes Made

### 1. Schema Updates (drizzle/schema.ts)
- Extended `AuditAction` type to include all actions used in the codebase:
  - Added: FEEDBACK_STATUS_CHANGED, USER_ROLE_CHANGED, CONTACT_STATUS_CHANGED, PROTOCOL_MODIFIED

### 2. Database Type Fixes (server/db.ts)
- Removed imports for non-existent tables (userStates, userAgencies, agencyInvitations, analytics tables)
- Added proper imports for existing tables (userCounties, searchHistory, stripeWebhookEvents)
- Fixed Date to string conversions for timestamp fields:
  - `lastSignedIn`: Now uses `.toISOString()`
  - `disclaimerAcknowledgedAt`: Now uses `.toISOString()`
  - `publishedAt`: Now uses `.toISOString()`
- Fixed `$returningId()` return type with proper type assertion
- Commented out `updateProtocolUploadStatus` implementation (schema mismatch - needs migration)

### 3. User Counties Type Fixes (server/db-user-counties.ts)
- Fixed `isPrimary` field type mismatch (database uses tinyint, TypeScript expects boolean):
  - Database operations now use `0` and `1` instead of `false` and `true`
  - Interface methods still use boolean for clean API
  - Conversion: `Boolean(r.isPrimary)` when reading, `isPrimary ? 1 : 0` when writing
- Fixed `SearchHistoryEntry` interface to match actual schema:
  - Renamed `queryText` → `searchQuery`
  - Renamed `timestamp` → `createdAt`
  - Added `resultsCount` field
  - Removed `deviceId` field (not in schema)
- Updated search history functions to match new field names
- Fixed string to Date conversions: `new Date(r.createdAt)`

### 4. Dependencies Added
- `@types/express` - Type definitions for Express
- `@types/pdf-parse` - Type definitions for PDF parsing

## Known Library Issues (Not Our Code)
- `drizzle-orm/gel-core` has missing 'gel' module declarations
- These are from the library itself and don't affect our application code

## Remaining Issues to Address

### Schema Mismatches (Need Database Migrations)
1. **protocol_uploads table** - Missing fields used in code:
   - `status`, `progress`, `chunksCreated`, `errorMessage`
   - `processingStartedAt`, `completedAt`, `agencyId`
   
2. **protocol_versions table** - Missing fields:
   - `protocolNumber`, `title`, `sourceFileUrl`, `metadata`, `chunksGenerated`
   - `approvedBy`, `approvedAt` (code uses these but they're not in schema)

3. **agency_members table** - Missing field:
   - `status` (referenced in queries)

4. **agencies table** - Missing fields:
   - `contactEmail`, `stateCode`

5. **audit_logs table** - Missing field:
   - `targetType` (used in code but column is `entityType`)

### Type Safety Improvements Needed
1. **Generic 'any' types** - Several files still use implicit any:
   - `server/_core/claude.ts`: Parameter types in array methods
   - `server/_core/timeout.ts`: Transform stream arguments
   - `server/_core/env.ts`: Zod error configuration

2. **Null safety checks** - Add null checks for:
   - Database query results before accessing properties
   - Optional chain operators where appropriate

3. **Return type annotations** - Needed for:
   - Express route handlers
   - TRPC procedures with complex return types

## Testing Required
After applying these fixes:
1. Run full TypeScript compilation: `npx tsc --noEmit`
2. Test database operations for user counties
3. Test search history CRUD operations
4. Verify audit logging still works
5. Test protocol upload flow (currently stubbed out)

## Migration Plan
To fully resolve schema mismatches, create migrations:
```sql
-- Add missing protocol_uploads fields
ALTER TABLE protocol_uploads 
  ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN progress INT DEFAULT 0,
  ADD COLUMN chunksCreated INT,
  ADD COLUMN errorMessage TEXT,
  ADD COLUMN processingStartedAt TIMESTAMP,
  ADD COLUMN completedAt TIMESTAMP,
  ADD COLUMN agencyId INT;

-- Add missing protocol_versions fields
ALTER TABLE protocol_versions
  ADD COLUMN protocolNumber VARCHAR(50),
  ADD COLUMN title VARCHAR(255),
  ADD COLUMN sourceFileUrl TEXT,
  ADD COLUMN metadata JSON,
  ADD COLUMN chunksGenerated INT,
  ADD COLUMN approvedBy INT,
  ADD COLUMN approvedAt TIMESTAMP;

-- Add missing agency_members field
ALTER TABLE agency_members
  ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Add missing agencies fields
ALTER TABLE agencies
  ADD COLUMN contactEmail VARCHAR(320),
  ADD COLUMN stateCode VARCHAR(2);
```

## Files Modified
1. `/drizzle/schema.ts` - Type definitions
2. `/server/db.ts` - Main database functions
3. `/server/db-user-counties.ts` - User counties and search history
4. `/package.json` - Added type dependencies

## Next Steps
1. Create database migrations for schema mismatches
2. Update drizzle schema.ts with new fields
3. Uncomment protocol upload status tracking code
4. Add proper null checks throughout codebase
5. Replace remaining 'any' types with proper generics
6. Add integration tests for type-critical paths
