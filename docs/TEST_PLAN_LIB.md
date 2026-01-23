# Test Plan: lib/ Directory

**Generated:** 2026-01-23
**Framework:** Vitest
**Coverage Target:** 80% on critical paths

---

## Executive Summary

The `lib/` directory contains 20 utility files. Currently, only **1 file has comprehensive tests** (`offline-cache.ts`). This document identifies 16 files requiring test coverage, with 127 test specifications across unit tests, edge cases, and error paths.

### Coverage Status

| File | Status | Priority | Test Count |
|------|--------|----------|------------|
| `offline-cache.ts` | TESTED | - | 16 existing |
| `auth-refresh.ts` | UNTESTED | CRITICAL | 15 specs |
| `oauth-state-validation.ts` | UNTESTED | CRITICAL | 12 specs |
| `analytics.ts` | UNTESTED | HIGH | 18 specs |
| `supabase-mobile.ts` | UNTESTED | HIGH | 14 specs |
| `accessibility.ts` | UNTESTED | HIGH | 16 specs |
| `feature-flags.ts` | UNTESTED | MEDIUM | 8 specs |
| `audio.ts` | UNTESTED | MEDIUM | 12 specs |
| `haptics.ts` | UNTESTED | MEDIUM | 10 specs |
| `sentry-client.ts` | UNTESTED | MEDIUM | 10 specs |
| `theme-provider.tsx` | UNTESTED | MEDIUM | 8 specs |
| `app-context.tsx` | UNTESTED | MEDIUM | 8 specs |
| `utils.ts` | UNTESTED | LOW | 4 specs |
| `_core/theme.ts` | UNTESTED | LOW | 6 specs |
| `register-sw.ts` | UNTESTED | LOW | 6 specs |
| `design-tokens.ts` | PURE DATA | - | 0 |
| `optimize-imports.ts` | RE-EXPORT | - | 0 |
| `trpc.ts` | CONFIG | - | 0 |
| `supabase.ts` | CONFIG | - | 0 |
| `_core/nativewind-pressable.ts` | CONFIG | - | 0 |

---

## CRITICAL PRIORITY

### 1. auth-refresh.ts

Token refresh handling is critical for user session stability.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/auth-refresh.ts`

#### Unit Tests

```
describe('getMinutesUntilExpiry')
  - calculates correct minutes from session.expires_at
  - returns 0 when expires_at is missing
  - handles past expiry times (negative result)
  - handles milliseconds-to-minutes conversion correctly

describe('needsRefresh')
  - returns false when session is null
  - returns true when < 5 minutes until expiry
  - returns false when > 5 minutes until expiry
  - correctly calculates boundary at exactly 5 minutes
```

#### Edge Cases

```
describe('refreshSession - edge cases')
  - skips refresh when already refreshing (isRefreshing flag)
  - handles concurrent refresh attempts gracefully
  - resets consecutiveFailures counter on success
  - increments consecutiveFailures on error
```

#### Error Paths

```
describe('refreshSession - error handling')
  - forces logout after 3 consecutive failures
  - returns error message from Supabase error
  - handles missing session in refresh response
  - catches and wraps unexpected exceptions
  - clears isRefreshing flag in finally block

describe('checkAndRefreshSession - error handling')
  - returns null session when not authenticated
  - propagates refresh errors correctly
```

---

### 2. oauth-state-validation.ts

OAuth CSRF protection is critical for security.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/oauth-state-validation.ts`

#### Unit Tests

```
describe('generateOAuthState')
  - generates 64-character hex string
  - stores state with timestamp in AsyncStorage
  - stores provider type (google/apple)
  - generates unique states on consecutive calls

describe('validateOAuthState')
  - returns valid: true for matching, unexpired state
  - returns provider type on success
  - cleans up state after successful validation
```

#### Edge Cases

```
describe('validateOAuthState - edge cases')
  - returns invalid when no stored state exists
  - returns invalid when state expired (> 10 minutes)
  - returns invalid when state mismatches
  - handles malformed JSON in storage
```

#### Error Paths

```
describe('validateOAuthState - error handling')
  - returns invalid on AsyncStorage.getItem failure
  - cleans up state on expiry detection
  - cleans up state on mismatch detection

describe('generateOAuthState - error handling')
  - throws when AsyncStorage.setItem fails
  - propagates crypto errors
```

---

## HIGH PRIORITY

### 3. analytics.ts

Analytics class tracks user behavior across sessions.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/analytics.ts`

#### Unit Tests

```
describe('Analytics.init')
  - loads existing queue from AsyncStorage
  - starts new session when none exists
  - reuses session if < 30 minutes old
  - sets up periodic flush timer
  - prevents double initialization

describe('Analytics.track')
  - adds event to queue with timestamp
  - includes sessionId in event
  - includes platform and appVersion
  - categorizes event correctly (search_, protocol_, etc.)

describe('Analytics.identify')
  - stores userId
  - merges user traits
  - tracks user_identified event

describe('categorizeEvent')
  - returns 'search' for search_ prefixed events
  - returns 'protocol' for protocol_ prefixed events
  - returns 'conversion' for upgrade_/subscription_ events
  - returns 'navigation' for screen_/navigation_ events
  - returns 'error' for error_ events
  - returns 'feature' for unknown prefixes
```

#### Edge Cases

```
describe('Analytics - queue management')
  - trims queue when > 500 events (MAX_QUEUE_SIZE)
  - auto-flushes when queue reaches 20 events (BATCH_SIZE)
  - persists queue after each event
```

#### Error Paths

```
describe('Analytics.flush')
  - re-queues events on network failure
  - re-queues events on non-200 response
  - handles empty queue gracefully (no-op)
  - silently fails without throwing

describe('Analytics - storage errors')
  - handles AsyncStorage.getItem failure in loadQueue
  - handles AsyncStorage.setItem failure in saveQueue
```

---

### 4. supabase-mobile.ts

Mobile OAuth flows for Google/Apple sign-in.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/supabase-mobile.ts`

#### Unit Tests

```
describe('getRedirectUri')
  - returns web origin on Platform.OS === 'web'
  - returns deep link scheme on native platforms
  - uses scheme from Constants.expoConfig

describe('signInWithGoogleMobile')
  - generates OAuth state for CSRF protection
  - calls supabase.auth.signInWithOAuth with correct options
  - opens WebBrowser auth session on native
  - extracts tokens from callback URL hash
  - sets session in Supabase after successful auth

describe('signInWithAppleMobile')
  - generates OAuth state for CSRF protection
  - includes state in queryParams
  - opens WebBrowser auth session on native
  - extracts tokens from callback URL
```

#### Edge Cases

```
describe('signInWithGoogleMobile - edge cases')
  - handles user cancellation (result.type === 'cancel')
  - clears OAuth state on cancellation
  - handles tokens in URL search params (not hash)
  - handles refresh_token being empty string
```

#### Error Paths

```
describe('signInWithGoogleMobile - error handling')
  - returns error from Supabase OAuth failure
  - returns error from session set failure
  - extracts error_description from callback URL
  - clears OAuth state on any error
  - catches and returns unexpected exceptions

describe('linkProvider - error handling')
  - returns error when not signed in
  - handles linkIdentity errors
  - handles user cancellation during linking

describe('unlinkProvider - error handling')
  - returns error when no identities found
  - returns error when provider not linked
  - prevents unlinking last provider
```

---

### 5. accessibility.ts

WCAG compliance utilities for EMS medical app.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/accessibility.ts`

#### Unit Tests

```
describe('getContrastRatio')
  - calculates correct ratio for black/white (21:1)
  - calculates correct ratio for similar colors
  - handles hex colors with/without # prefix
  - is symmetric (ratio(a,b) === ratio(b,a))

describe('meetsContrastAA')
  - returns true when ratio >= 4.5 (normal text)
  - returns true when ratio >= 3.0 (large text)
  - returns false for insufficient contrast

describe('meetsContrastAAA')
  - returns true when ratio >= 7.0 (normal text)
  - returns true when ratio >= 4.5 (large text)
  - returns false for insufficient contrast

describe('createButtonA11y')
  - returns correct accessibilityRole: 'button'
  - includes accessibilityLabel
  - includes accessibilityHint when provided
  - sets disabled state correctly

describe('createListA11y')
  - pluralizes "item" correctly (1 item vs N items)
  - includes item count in hint
```

#### Edge Cases

```
describe('getLuminance - edge cases')
  - handles pure black (#000000)
  - handles pure white (#FFFFFF)
  - handles sRGB gamma correction threshold (0.03928)

describe('announceForAccessibility')
  - uses ARIA live region on web
  - clears announcement after 1 second
  - uses AccessibilityInfo on native
```

#### Error Paths

```
describe('FocusManager')
  - handles empty focusable list
  - handles focusNext on last item (wraps to first)
  - handles focusPrevious on first item (wraps to last)
  - handles ref.current being null
  - handles ref.current.focus not being a function
```

---

## MEDIUM PRIORITY

### 6. feature-flags.ts

Feature toggles for gradual rollout.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/feature-flags.ts`

#### Unit Tests

```
describe('isFeatureEnabled')
  - returns true for enabled flags
  - returns false for disabled flags
  - returns false for unknown flag keys (nullish coalescing)

describe('getEnabledFeatures')
  - returns array of enabled flag keys
  - excludes disabled flags

describe('getFeatureFlagsForEnvironment')
  - enables dev features in development
  - enables staging features for preview deployments
  - returns default FLAGS in production
```

#### Edge Cases

```
describe('getFeatureFlagsForEnvironment - edge cases')
  - handles VERCEL_ENV === 'preview' as staging
  - handles NODE_ENV being undefined
```

---

### 7. audio.ts

Web Audio API wrapper for voice recording.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/audio.ts`

#### Unit Tests

```
describe('Audio.requestPermissionsAsync')
  - returns { granted: true } on permission grant
  - returns { granted: false } on permission deny
  - stops tracks after permission check

describe('Audio.Recording.createAsync')
  - initializes MediaRecorder with correct mimeType
  - prefers opus codec when supported
  - falls back to audio/webm when opus unavailable
  - starts recording with 100ms intervals

describe('WebRecording.stopAndUnloadAsync')
  - creates Blob from audio chunks
  - creates object URL for playback
  - stops all media tracks
  - resolves when recording already inactive

describe('useAudioRecorder')
  - record() creates new recording
  - stop() updates uri property
  - uri is null before recording
```

#### Edge Cases

```
describe('Audio - edge cases')
  - handles MediaRecorder.isTypeSupported being false
  - handles navigator.mediaDevices being undefined
  - handles ondataavailable with empty data
```

---

### 8. haptics.ts

Platform-aware haptic feedback.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/haptics.ts`

#### Unit Tests

```
describe('impactAsync')
  - uses navigator.vibrate on web
  - maps style to correct duration (light=15, medium=30, heavy=50)
  - uses expo-haptics on native platforms
  - handles default style (medium)

describe('notificationAsync')
  - uses triple pulse for error on web
  - uses double pulse for warning on web
  - uses single pulse for success on web

describe('protocolHaptics')
  - criticalAlert fires two heavy impacts
  - emergencyAction fires three heavy impacts with delays
```

#### Edge Cases

```
describe('haptics - edge cases')
  - handles navigator.vibrate being undefined
  - handles expo-haptics import failure
  - caches expo-haptics module after first load
```

---

### 9. sentry-client.ts

Client-side error reporting.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/sentry-client.ts`

#### Unit Tests

```
describe('captureError')
  - logs error to console
  - includes componentStack when provided
  - skips reporting in __DEV__ by default
  - reports in __DEV__ when EXPO_PUBLIC_REPORT_DEV_ERRORS set

describe('addBreadcrumb')
  - adds breadcrumb to array
  - limits breadcrumbs to 20 (MAX_BREADCRUMBS)
  - includes timestamp

describe('setUser')
  - stores user context for error reporting
  - handles null to clear user
```

#### Error Paths

```
describe('reportErrorToServer')
  - silently fails on fetch error
  - limits stack trace to 2000 characters
  - limits componentStack to 1000 characters
  - fires and forgets (non-blocking)

describe('getApiBaseUrl')
  - handles missing EXPO_PUBLIC_API_BASE_URL
  - derives API URL from web hostname
  - maps 8081 port to 3000
```

---

### 10. theme-provider.tsx

Theme management with system preference support.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/theme-provider.tsx`

#### Unit Tests

```
describe('ThemeProvider')
  - provides colorScheme context
  - toggleTheme switches between light/dark
  - setThemePreference persists to localStorage
  - applies CSS variables to document root

describe('useThemeContext')
  - throws when used outside provider
  - returns current colorScheme
  - returns themePreference
```

#### Edge Cases

```
describe('ThemeProvider - edge cases')
  - handles localStorage being unavailable
  - handles window.matchMedia being undefined
  - listens for system theme changes when preference === 'system'
  - removes listener on unmount
```

---

### 11. app-context.tsx

Application state context provider.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/app-context.tsx`

#### Unit Tests

```
describe('AppProvider')
  - provides selectedCounty context
  - provides messages context
  - loads saved county from AsyncStorage on mount
  - persists county to AsyncStorage on change

describe('useAppContext')
  - throws when used outside provider
  - addMessage adds message with generated id and timestamp
  - clearMessages empties messages array
  - setSelectedCounty clears messages
```

#### Error Paths

```
describe('AppProvider - error handling')
  - handles AsyncStorage.getItem failure gracefully
  - handles AsyncStorage.setItem failure gracefully
  - logs errors without crashing
```

---

## LOW PRIORITY

### 12. utils.ts

Tailwind class merging utility.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/utils.ts`

#### Unit Tests

```
describe('cn')
  - merges class names correctly
  - handles conditional classes (false values excluded)
  - resolves Tailwind conflicts (later wins)
  - handles undefined/null inputs
```

---

### 13. _core/theme.ts

Theme color palette builder.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/_core/theme.ts`

#### Unit Tests

```
describe('buildSchemePalette')
  - creates light and dark palettes
  - includes all theme color tokens

describe('buildRuntimePalette')
  - adds semantic aliases (text, background, tint, etc.)
  - maps foreground to text
  - maps primary to tint

describe('Fonts')
  - returns platform-specific font families
  - provides sans, serif, rounded, mono variants
```

---

### 14. register-sw.ts

Service worker registration for PWA.

**File:** `/Users/tanner-osterkamp/Protocol Guide Manus/lib/register-sw.ts`

#### Unit Tests

```
describe('registerServiceWorker')
  - no-op on server (typeof window === 'undefined')
  - no-op when serviceWorker not supported
  - registers /sw.js with root scope
  - sets up hourly update check
```

#### Edge Cases

```
describe('registerServiceWorker - edge cases')
  - handles registration failure
  - handles updatefound event
  - shows notification when update available
```

---

## Files Not Requiring Tests

| File | Reason |
|------|--------|
| `design-tokens.ts` | Pure data constants, no logic |
| `optimize-imports.ts` | Simple re-export, no logic |
| `trpc.ts` | Configuration only, tested via integration |
| `supabase.ts` | Configuration + thin wrappers, tested via integration |
| `_core/nativewind-pressable.ts` | 3-line config, no logic |

---

## Test Implementation Notes

### Mocking Patterns

```typescript
// AsyncStorage mock (reuse pattern from offline-cache.test.ts)
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key, value) => { mockStorage[key] = value; return Promise.resolve(); }),
    removeItem: vi.fn((key) => { delete mockStorage[key]; return Promise.resolve(); }),
  },
}));

// Platform mock
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

// Supabase mock
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));
```

### Test File Naming Convention

```
tests/lib/
  auth-refresh.test.ts
  oauth-state-validation.test.ts
  analytics.test.ts
  supabase-mobile.test.ts
  accessibility.test.ts
  feature-flags.test.ts
  audio.test.ts
  haptics.test.ts
  sentry-client.test.ts
  theme-provider.test.tsx
  app-context.test.tsx
  utils.test.ts
  theme.test.ts
  register-sw.test.ts
```

### Priority Implementation Order

1. **Week 1 (Critical):** auth-refresh, oauth-state-validation
2. **Week 2 (High):** analytics, supabase-mobile, accessibility
3. **Week 3 (Medium):** feature-flags, audio, haptics, sentry-client
4. **Week 4 (Medium):** theme-provider, app-context
5. **Week 5 (Low):** utils, theme, register-sw

---

## Coverage Metrics Target

| Category | Target |
|----------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 85% |
| Lines | 80% |

Run coverage with:
```bash
npm run test:coverage
```
