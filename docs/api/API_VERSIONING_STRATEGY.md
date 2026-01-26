# API Versioning Strategy

**Version**: 1.0  
**Last Updated**: 2026-01-25  
**Status**: Approved

## Overview

Protocol Guide uses a **type-driven versioning strategy** leveraging tRPC's TypeScript integration. This approach provides compile-time safety while maintaining flexibility for evolution.

---

## Current Strategy: Implicit Versioning

### How It Works

tRPC generates TypeScript types from server code that are directly consumed by clients:

```
Server (types) ──► Shared Package ──► Client (consumes types)
```

**Breaking changes** are caught at compile time:
- Removed procedures → Client compilation error
- Changed input types → Client compilation error
- Changed output types → Client compilation error

### Benefits

1. **Type Safety**: Breaking changes caught during development
2. **Zero Runtime Overhead**: No version negotiation at runtime
3. **Simple Deployment**: Single API endpoint
4. **Developer Experience**: IDE autocomplete, refactoring support

### Limitations

1. Only works for TypeScript clients
2. Requires coordinated deployments
3. No support for third-party API consumers

---

## Evolution Guidelines

### Safe Changes (Non-Breaking)

These changes are always safe:

| Change | Example | Impact |
|--------|---------|--------|
| **Add new procedure** | Add `user.settings` | No impact |
| **Add optional input field** | `{ limit?: number }` | No impact |
| **Add output field** | Return `{ ...data, newField }` | No impact |
| **Widen input type** | `z.string()` → `z.string().optional()` | No impact |

### Breaking Changes (Requires Migration)

These changes require a migration strategy:

| Change | Example | Strategy |
|--------|---------|----------|
| **Remove procedure** | Delete `user.oldMethod` | Deprecate first |
| **Remove input field** | Remove `{ oldField }` | Deprecate first |
| **Change input type** | `z.string()` → `z.number()` | Add new procedure |
| **Change output type** | `string` → `{ value: string }` | Add new procedure |
| **Rename procedure** | `search.query` → `search.semantic` | Keep both |

---

## Deprecation Process

### Step 1: Mark as Deprecated

```typescript
/**
 * @deprecated Use `search.semantic` instead. Will be removed in v3.0.
 */
searchLegacy: publicProcedure
  .input(z.object({ query: z.string() }))
  .query(async ({ input }) => {
    console.warn('[DEPRECATED] search.searchLegacy called');
    // Forward to new implementation
    return searchImpl(input);
  }),
```

### Step 2: Log Usage

Track deprecated endpoint usage:

```typescript
// In procedure handler
logger.warn({
  procedure: 'search.searchLegacy',
  userId: ctx.user?.id,
  deprecatedSince: '2026-01-01',
  removalDate: '2026-04-01',
}, 'Deprecated procedure called');
```

### Step 3: Communicate

1. Update API documentation
2. Notify clients via changelog
3. Add deprecation warning in responses

### Step 4: Remove

After deprecation period (minimum 3 months):
1. Remove from router
2. Remove from documentation
3. Update changelog

---

## Future: Explicit Versioning

When Protocol Guide opens public API access, we'll implement explicit URL-based versioning:

### URL Structure

```
/api/v1/trpc/...   # Stable version (LTS)
/api/v2/trpc/...   # Current version
/api/v3/trpc/...   # Preview/Beta
```

### Version Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    Version Lifecycle                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Preview ──► Current ──► Maintenance ──► Deprecated ──► EOL  │
│    │           │              │              │            │   │
│  6 months   12 months     6 months       3 months        │   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

| Phase | Support | Changes | Duration |
|-------|---------|---------|----------|
| **Preview** | Best effort | Breaking changes allowed | 6 months |
| **Current** | Full support | No breaking changes | 12 months |
| **Maintenance** | Security only | Bug fixes only | 6 months |
| **Deprecated** | None | Read-only | 3 months |
| **EOL** | Removed | N/A | N/A |

### Version Headers

```http
# Request preferred version
API-Version: 2026-01-01

# Response indicates actual version
X-API-Version: 2026-01-01
X-API-Deprecation: 2026-07-01  # If deprecated
```

---

## Migration Patterns

### Pattern 1: Parallel Procedures

Keep both old and new procedures during transition:

```typescript
export const searchRouter = router({
  // Legacy (deprecated)
  query: publicProcedure
    .input(legacySchema)
    .query(legacyHandler),
  
  // New version
  semantic: publicProcedure
    .input(newSchema)
    .query(newHandler),
});
```

### Pattern 2: Input/Output Transformation

Transform between versions at the edge:

```typescript
const legacyToNew = (input: LegacyInput): NewInput => ({
  query: input.searchText,
  filters: { county: input.countyId },
});

const newToLegacy = (output: NewOutput): LegacyOutput => ({
  results: output.items.map(transformResult),
});
```

### Pattern 3: Feature Flags

Control rollout with feature flags:

```typescript
const useNewSearch = await getFeatureFlag('new-search-v2', ctx.user?.id);

if (useNewSearch) {
  return newSearchHandler(input);
} else {
  return legacySearchHandler(input);
}
```

---

## Changelog Management

### Changelog Format

```markdown
## [2026-01-25] - API v2.1

### Added
- `search.semantic` - New semantic search with improved relevance

### Deprecated
- `search.query` - Use `search.semantic` instead (removal: 2026-04-01)

### Changed
- `user.profile` - Added optional `preferences` field

### Fixed
- `query.submit` - Improved error messages for rate limits
```

### Semantic Versioning

For public API versions:

- **MAJOR** (v1 → v2): Breaking changes
- **MINOR** (v2.0 → v2.1): New features, deprecations
- **PATCH** (v2.1.0 → v2.1.1): Bug fixes only

---

## Client Compatibility

### Version Negotiation (Future)

```typescript
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers: {
        'API-Version': '2026-01-01',
      },
    }),
  ],
});
```

### Graceful Degradation

```typescript
async function search(query: string) {
  try {
    // Try new API first
    return await trpc.search.semantic.query({ query });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      // Fall back to legacy
      return await trpc.search.query.query({ searchText: query });
    }
    throw error;
  }
}
```

---

## Documentation Requirements

When making API changes:

1. **Update TypeScript types** - Server types auto-generate
2. **Update API_DOCUMENTATION.md** - Procedure reference
3. **Update CHANGELOG** - In `/docs/api/API_CHANGELOG.md`
4. **Update client code** - React Native app
5. **Run type check** - `npm run typecheck`

---

## Related Documentation

- [API Architecture](./API_ARCHITECTURE.md)
- [API Changelog](../API_CHANGELOG.md)
- [Full API Documentation](../API_DOCUMENTATION.md)
