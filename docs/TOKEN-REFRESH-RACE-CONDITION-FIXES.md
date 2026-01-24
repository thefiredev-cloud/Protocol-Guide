# Token Refresh Race Condition Fixes

## Summary

Fixed critical race conditions in token refresh logic that were causing:
- Concurrent refresh requests invalidating each other's tokens
- Stale token usage during refresh operations
- Multiple redundant API calls for the same token

## Issues Found

### 1. **tRPC Client Race Condition** (`lib/trpc.ts`)
**Problem**: Every API request independently called `supabase.auth.getSession()`, causing:
- Multiple concurrent requests fetching tokens simultaneously
- Stale tokens being used while refresh was in progress
- No synchronization between requests

**Fix**: Implemented token cache that provides synchronized access to tokens

### 2. **Supabase Auto-Refresh Conflict** (`lib/supabase.ts`)
**Problem**: Supabase's built-in `autoRefreshToken: true` was racing with custom refresh logic
- Two independent refresh mechanisms competing
- Unpredictable refresh timing
- Potential for refresh loops

**Fix**: Disabled `autoRefreshToken` and use centralized token cache

### 3. **checkAndRefreshSession Race** (`lib/auth-refresh.ts`)
**Problem**: `getSession()` was called before checking if refresh was in progress
- Multiple threads could initiate refresh simultaneously
- No mutex/lock on refresh operations

**Fix**: Replaced with token cache that has built-in mutex for all operations

### 4. **No Token Caching**
**Problem**: Every request fetched tokens from Supabase independently
- Redundant API calls
- Increased latency
- Higher chance of race conditions

**Fix**: Implemented singleton token cache with 30-second buffer

## Files Changed

### New Files

#### `/lib/token-cache.ts` (NEW)
**Purpose**: Singleton token cache with mutex-protected refresh

**Key Features**:
- **Mutex Lock**: Only one refresh operation at a time
- **Token Caching**: 30-second buffer before expiry
- **Automatic Refresh**: Checks expiry and refreshes if needed
- **Promise Reuse**: Concurrent calls get same promise
- **Error Handling**: Clears cache on failure

**API**:
```typescript
tokenCache.getSession()              // Get cached session
tokenCache.refreshSession()          // Force refresh with mutex
tokenCache.getSessionWithRefresh()   // Get session, refresh if needed
tokenCache.clear()                   // Clear cache (logout)
tokenCache.getStatus()               // Debug info

// Convenience functions
getAccessToken()                     // Get token directly
getSession()                         // Get session with auto-refresh
refreshSession()                     // Force refresh
clearTokenCache()                    // Clear cache
```

### Modified Files

#### `/lib/supabase.ts`
**Changes**:
- Disabled `autoRefreshToken: true` → `autoRefreshToken: false`
- Prevents conflict with custom refresh logic

#### `/lib/trpc.ts`
**Changes**:
- Import: `getAccessToken` from `@/lib/token-cache`
- Headers function: Use `getAccessToken()` instead of `supabase.auth.getSession()`
- Result: All API requests use cached tokens, preventing race conditions

#### `/lib/auth-refresh.ts`
**Changes**:
- Import token cache functions
- `refreshSession()`: Use `tokenCache.refreshSession()` with built-in mutex
- `checkAndRefreshSession()`: Use `getCachedSession()` instead of direct Supabase call
- `resetRefreshStatus()`: Clear token cache
- Result: All refresh operations synchronized through cache

#### `/hooks/use-auth.ts`
**Changes**:
- Import: `getCachedSession`, `clearTokenCache` from `@/lib/token-cache`
- `fetchUser()`: Use `getCachedSession()` instead of `supabase.auth.getSession()`
- `logout()`: Call `clearTokenCache()` to prevent stale tokens
- Result: React hook uses synchronized token access

### Test Files

#### `/tests/token-refresh-race-condition.test.ts` (NEW)
**Coverage**:
- ✅ Concurrent refresh prevention (mutex)
- ✅ Session caching (reduces API calls)
- ✅ Automatic refresh when near expiry
- ✅ No refresh when session valid
- ✅ Graceful failure handling
- ✅ Cache clearing on logout
- ✅ Promise reuse for concurrent calls

## Architecture

### Before (Race Conditions)

```
Request 1 → supabase.auth.getSession() → Token A
Request 2 → supabase.auth.getSession() → Token A (stale)
Request 3 → supabase.auth.refreshSession() → Token B
Request 4 → supabase.auth.getSession() → Token A (stale!)
Request 5 → supabase.auth.refreshSession() → Token C (conflict!)
```

### After (Synchronized)

```
Request 1 → tokenCache.getSession() → [Mutex] → Supabase → Token A → Cache
Request 2 → tokenCache.getSession() → [Cache Hit] → Token A
Request 3 → tokenCache.getSession() → [Cache Hit] → Token A
Request 4 → tokenCache.getSession() → [Expiring] → [Mutex] → Refresh → Token B
Request 5 → tokenCache.getSession() → [Waiting on Mutex] → Token B (same as 4)
```

## How It Works

### Token Cache Flow

1. **First Request**:
   - Cache miss → Fetch from Supabase → Store in cache → Return token

2. **Subsequent Requests** (within 30s buffer):
   - Cache hit → Return cached token immediately

3. **Near Expiry** (<5 minutes):
   - Cache checks expiry → Initiates refresh → Updates cache → Returns new token

4. **Concurrent Refresh**:
   - Request A: Starts refresh → Creates promise → Locks mutex
   - Request B: Sees refresh in progress → Returns same promise
   - Request C: Sees refresh in progress → Returns same promise
   - All get same result when promise resolves

### Mutex Implementation

```typescript
class TokenCache {
  private refreshInProgress: Promise<Session | null> | null = null;

  async refreshSession() {
    // If refresh already in progress, return that promise
    if (this.refreshInProgress) {
      return this.refreshInProgress;
    }

    // Create new refresh promise (mutex acquired)
    this.refreshInProgress = (async () => {
      try {
        const result = await supabase.auth.refreshSession();
        return result;
      } finally {
        // Release mutex
        this.refreshInProgress = null;
      }
    })();

    return this.refreshInProgress;
  }
}
```

## Testing

Run the test suite:

```bash
npm test tests/token-refresh-race-condition.test.ts
```

Expected results:
- All 7 tests should pass
- Verify mutex prevents concurrent refreshes
- Verify caching reduces API calls
- Verify automatic refresh works
- Verify cache clears on logout

## Security Improvements

1. **No Token Leakage**: Cache is private to the module
2. **Automatic Cleanup**: Cache cleared on logout
3. **Failure Recovery**: Cache cleared on auth errors
4. **Rate Limiting**: Fewer Supabase API calls
5. **Consistent State**: All components use same token source

## Performance Improvements

1. **Reduced API Calls**: Cache prevents redundant `getSession()` calls
2. **Lower Latency**: Cached tokens returned immediately
3. **Better UX**: No "flashing" from token refresh delays
4. **Network Efficiency**: Fewer HTTP requests to Supabase

## Migration Guide

### If you have custom auth code:

**Before**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

**After**:
```typescript
import { getAccessToken } from '@/lib/token-cache';
const token = await getAccessToken();
```

### For logout:

**Before**:
```typescript
await supabase.auth.signOut();
```

**After**:
```typescript
import { clearTokenCache } from '@/lib/token-cache';
await supabase.auth.signOut();
clearTokenCache(); // Prevent stale tokens
```

## Monitoring

Check token cache status for debugging:

```typescript
import { tokenCache } from '@/lib/token-cache';

const status = tokenCache.getStatus();
console.log({
  hasCachedSession: status.hasCachedSession,
  refreshInProgress: status.refreshInProgress,
  cacheExpiry: new Date(status.cacheExpiry),
  cacheAge: status.cacheAge + 'ms'
});
```

## Related Files

- `/lib/token-cache.ts` - Token cache implementation
- `/lib/supabase.ts` - Supabase client config
- `/lib/trpc.ts` - tRPC client (uses token cache)
- `/lib/auth-refresh.ts` - Refresh monitor (uses token cache)
- `/hooks/use-auth.ts` - Auth React hook (uses token cache)
- `/server/_core/context.ts` - Server-side auth context
- `/server/_core/token-blacklist.ts` - Token revocation
- `/tests/token-refresh-race-condition.test.ts` - Test coverage

## Future Improvements

1. **Redis Cache**: Move token cache to Redis for multi-instance deployments
2. **Token Rotation**: Implement refresh token rotation for enhanced security
3. **Metrics**: Add monitoring for cache hit rate, refresh frequency
4. **Alerts**: Alert on excessive refresh failures
5. **Mobile**: Ensure cache works with React Native AsyncStorage

## Verification Checklist

- [x] Token cache implemented with mutex
- [x] Supabase auto-refresh disabled
- [x] tRPC client uses token cache
- [x] Auth refresh uses token cache
- [x] useAuth hook uses token cache
- [x] Cache cleared on logout
- [x] Test suite created
- [x] Documentation written
- [ ] Tests passing (run `npm test`)
- [ ] Integration testing with real Supabase
- [ ] Load testing for concurrent requests
- [ ] Mobile app testing (if applicable)

## Known Limitations

1. **Client-Side Only**: Token cache is client-side. Server uses different auth flow.
2. **In-Memory**: Cache is in-memory, cleared on page refresh (by design, Supabase persists session)
3. **Single User**: Cache assumes single user per client instance

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Token Management](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
