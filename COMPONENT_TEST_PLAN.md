# Protocol Guide Component Test Plan

**Generated:** 2026-01-23
**Status:** Test Gap Analysis
**Current Coverage:** E2E tests only (Playwright)
**Unit Tests:** None identified

---

## Executive Summary

The Protocol Guide application has **0 component unit tests**. The project has 3 E2E tests (`e2e/auth.spec.ts`, `e2e/checkout.spec.ts`, `e2e/search.spec.ts`) using Playwright, but no Vitest/Jest unit tests for React Native components.

### Components Analyzed: 37
### Components Without Tests: 37 (100%)
### Priority: P0 (Critical) - 8, P1 (High) - 12, P2 (Medium) - 11, P3 (Low) - 6

---

## P0 - Critical Components (Must Test First)

### 1. ChatInput (`/components/chat-input.tsx`)

**Props:**
- `onSend: (message: string) => void` - UNTESTED
- `onVoicePress?: () => void` - UNTESTED
- `disabled?: boolean` (default: false) - UNTESTED
- `isRecording?: boolean` (default: false) - UNTESTED
- `isProcessing?: boolean` (default: false) - UNTESTED
- `placeholder?: string` (default: "Ask about a protocol...") - UNTESTED

**Internal State:**
- `message: string` - UNTESTED

**Test Specifications:**
```
- [ ] renders with default placeholder text
- [ ] renders with custom placeholder
- [ ] calls onSend with trimmed message when send button pressed
- [ ] clears input after successful send
- [ ] does NOT call onSend when message is empty/whitespace
- [ ] disables send button when message is empty
- [ ] disables send button when disabled=true
- [ ] disables send button when isProcessing=true
- [ ] shows ActivityIndicator when isProcessing=true
- [ ] shows voice button only when onVoicePress is provided
- [ ] calls onVoicePress when voice button tapped
- [ ] disables voice button when disabled=true
- [ ] voice button shows recording state when isRecording=true
- [ ] clear button appears when message.length > 0
- [ ] clear button disappears when isProcessing=true
- [ ] handleClear focuses input after clearing
- [ ] keyboard dismisses on send (Platform.OS !== web)
- [ ] respects maxLength=500
```

---

### 2. VoiceSearchButton (`/components/VoiceSearchButton.tsx`)

**Props:**
- `onTranscription: (text: string) => void` - UNTESTED
- `onError?: (error: string) => void` - UNTESTED
- `disabled?: boolean` (default: false) - UNTESTED
- `size?: "small" | "medium" | "large"` (default: "medium") - UNTESTED

**Internal State:**
- `recordingState: "idle" | "recording" | "processing"` - UNTESTED
- `statusText: string` - UNTESTED

**Test Specifications:**
```
- [ ] renders in idle state with mic icon
- [ ] renders correct size variants (small/medium/large)
- [ ] transitions to recording state on press
- [ ] shows "Listening..." status text when recording
- [ ] shows "Processing..." status text when processing
- [ ] shows pulse animation when recording (reanimated mock)
- [ ] calls onTranscription with corrected text on success
- [ ] calls onError when recording fails
- [ ] calls onError when transcription fails
- [ ] disabled prop prevents interaction
- [ ] stops recording on second press
- [ ] auto-stops after SILENCE_THRESHOLD (2000ms)
- [ ] auto-stops after MAX_RECORDING_DURATION (30000ms)
- [ ] correctEMSTerminology() fixes common mishearings
  - [ ] "epi pen" -> "EpiPen"
  - [ ] "v tack" -> "VTach"
  - [ ] "c p r" -> "CPR"
- [ ] announces for accessibility on state changes
- [ ] cleanup on unmount clears timeouts
```

---

### 3. DisclaimerConsentModal (`/components/DisclaimerConsentModal.tsx`)

**Props:**
- `visible: boolean` - UNTESTED
- `onAcknowledged: () => void` - UNTESTED

**Internal State:**
- `isChecked: boolean` - UNTESTED
- `isSubmitting: boolean` - UNTESTED

**Test Specifications:**
```
- [ ] renders when visible=true
- [ ] does not render when visible=false
- [ ] cannot be dismissed by backdrop press (legal requirement)
- [ ] checkbox toggles isChecked state
- [ ] continue button disabled when isChecked=false
- [ ] continue button enabled when isChecked=true
- [ ] shows ActivityIndicator when isSubmitting
- [ ] calls tRPC user.acknowledgeDisclaimer.mutate on submit
- [ ] calls onAcknowledged after successful API call
- [ ] shows error alert on API failure
- [ ] "Read Full Disclaimer" link navigates to /disclaimer
- [ ] haptic feedback on checkbox toggle
- [ ] haptic feedback on error
- [ ] haptic feedback on success
```

---

### 4. DoseWeightCalculator (`/components/dose-weight-calculator.tsx`)

**Props:**
- `initialWeight?: number` (default: 70) - UNTESTED
- `categoryFilter?: MedicationCategory` - UNTESTED
- `onWeightChange?: (weight: number) => void` - UNTESTED
- `compact?: boolean` (default: false) - UNTESTED

**Internal State:**
- `weight: number` - UNTESTED
- `weightUnit: "kg" | "lbs"` - UNTESTED
- `selectedCategory: MedicationCategory | null` - UNTESTED
- `expandedMed: string | null` - UNTESTED

**Test Specifications:**
```
- [ ] renders with initialWeight value
- [ ] slider updates weight state
- [ ] calls onWeightChange when slider moves
- [ ] toggleWeightUnit converts kg <-> lbs correctly
- [ ] displays correct patient type based on weight
  - [ ] <3kg = Neonate
  - [ ] <10kg = Infant
  - [ ] <25kg = Child
  - [ ] <40kg = Adolescent
  - [ ] >=40kg = Adult
- [ ] calculateDose returns correct dose for medication
- [ ] calculateDose respects maxDose constraint
- [ ] calculateDose shows warning when below minDose
- [ ] category filter shows only matching medications
- [ ] "All" category shows all medications
- [ ] quick weight buttons update weight
- [ ] medication card expands on tap
- [ ] expanded details show dose formula
- [ ] haptic feedback on slider start
- [ ] haptic feedback on slider complete
- [ ] compact mode hides header
```

---

### 5. ResponseCard (`/components/response-card.tsx`)

**Props:**
- `text: string` - UNTESTED
- `protocolRefs?: string[]` - UNTESTED
- `timestamp?: Date` - UNTESTED

**Internal State:**
- `copied: boolean` - UNTESTED
- `showActions: boolean` - UNTESTED

**Test Specifications:**
```
- [ ] renders protocol header when sections.protocol exists
- [ ] renders content section
- [ ] renders dosage box when dosages are detected
- [ ] renders action items with numbered list
- [ ] renders reference footer
- [ ] parseResponse extracts PROTOCOL: field
- [ ] parseResponse extracts ACTIONS: bullet list
- [ ] parseResponse extracts dosage patterns (mg, mcg, mL)
- [ ] parseResponse extracts REF: field
- [ ] copy button copies text to clipboard
- [ ] shows checkmark icon after copy
- [ ] resets copied state after 2 seconds
- [ ] action menu toggles on ellipsis press
- [ ] "Report Error" navigates to feedback page with protocolRef
- [ ] MedicalDisclaimer is always rendered
- [ ] animation enters with FadeInDown
```

**Sub-component Tests - UserMessageCard:**
```
- [ ] renders user message text
- [ ] applies correct styling for user bubble
```

**Sub-component Tests - LoadingCard:**
```
- [ ] renders loading dots
- [ ] displays "Searching protocols..." text
```

---

### 6. CountySelector (`/components/county-selector.tsx`)

**Props:**
- `visible: boolean` - UNTESTED
- `onClose: () => void` - UNTESTED

**Internal State:**
- `searchQuery: string` - UNTESTED

**Test Specifications:**
```
- [ ] renders Modal when visible=true
- [ ] fetches counties via tRPC when visible
- [ ] shows loading indicator while fetching
- [ ] displays counties grouped by state
- [ ] filters counties by search query (name)
- [ ] filters counties by search query (state)
- [ ] shows "No counties found" when no matches
- [ ] shows "No counties available" when empty data
- [ ] selecting county calls setSelectedCounty from context
- [ ] selecting county calls onClose
- [ ] selected county shows checkmark icon
- [ ] clear search button clears searchQuery
- [ ] close button calls onClose
```

**Sub-component Tests - CountySelectorButton:**
```
- [ ] displays selected county name
- [ ] displays "Select County" when no county selected
- [ ] calls onPress when tapped
```

---

### 7. ErrorBoundary (`/components/ErrorBoundary.tsx`)

**Props:**
- `children: ReactNode` - UNTESTED
- `fallback?: ReactNode` - UNTESTED
- `onError?: (error: Error, errorInfo: ErrorInfo) => void` - UNTESTED
- `showDetails?: boolean` (default: __DEV__) - UNTESTED
- `section?: ErrorSection` - UNTESTED
- `errorTitle?: string` - UNTESTED
- `errorMessage?: string` - UNTESTED
- `showRetry?: boolean` (default: true) - UNTESTED
- `onRetry?: () => void` - UNTESTED
- `compact?: boolean` (default: false) - UNTESTED

**Test Specifications:**
```
- [ ] renders children when no error
- [ ] catches errors in child components
- [ ] displays fallback UI when provided
- [ ] displays default error UI when no fallback
- [ ] shows custom errorTitle
- [ ] shows custom errorMessage
- [ ] calls onError callback with error and errorInfo
- [ ] reports to Sentry via captureError
- [ ] retry button resets error state
- [ ] retry button calls onRetry callback
- [ ] hides retry button when showRetry=false
- [ ] compact mode renders inline error
- [ ] shows error details in dev mode
- [ ] hides error details in production
```

**Specialized Boundaries:**
```
- [ ] SearchErrorBoundary uses section="search"
- [ ] VoiceErrorBoundary uses compact=true
- [ ] ProtocolViewerErrorBoundary uses correct messages
- [ ] withErrorBoundary HOC wraps component correctly
```

---

### 8. ProFeatureLock (`/components/pro-feature-lock.tsx`)

**Props:**
- `locked: boolean` - UNTESTED
- `children: React.ReactNode` - UNTESTED
- `featureName?: string` (default: "Pro Feature") - UNTESTED
- `description?: string` - UNTESTED
- `opaque?: boolean` (default: false) - UNTESTED
- `style?: ViewStyle` - UNTESTED
- `onUpgradePress?: () => void` - UNTESTED

**Test Specifications:**
```
- [ ] renders children without overlay when locked=false
- [ ] renders overlay when locked=true
- [ ] displays featureName in overlay
- [ ] displays description when provided
- [ ] applies opaque background when opaque=true
- [ ] tapping overlay navigates to upgrade screen
- [ ] tapping overlay calls onUpgradePress if provided
- [ ] haptic feedback on press
- [ ] accessibility label includes feature name
```

**Sub-component Tests - ProBadge:**
```
- [ ] renders small size correctly
- [ ] renders medium size correctly
- [ ] displays "PRO" text
```

**Sub-component Tests - LockIcon:**
```
- [ ] renders with correct size
```

---

## P1 - High Priority Components

### 9. Modal (`/components/ui/Modal.tsx`)

**Props:**
- `visible: boolean` - UNTESTED
- `onDismiss: () => void` - UNTESTED
- `title: string` - UNTESTED
- `message?: string` - UNTESTED
- `buttons?: ModalButton[]` - UNTESTED
- `variant?: "alert" | "confirm"` (default: "alert") - UNTESTED
- `children?: React.ReactNode` - UNTESTED
- `testID?: string` - UNTESTED
- `dismissOnBackdrop?: boolean` (default: true) - UNTESTED

**Test Specifications:**
```
- [ ] renders when visible=true
- [ ] animates in with fade and scale
- [ ] displays title
- [ ] displays message when provided
- [ ] renders children instead of message when both provided
- [ ] alert variant shows single OK button
- [ ] confirm variant shows Cancel and Confirm buttons
- [ ] custom buttons override defaults
- [ ] primary button has correct styling
- [ ] secondary button has correct styling
- [ ] destructive button has error color
- [ ] disabled button reduces opacity
- [ ] backdrop press calls onDismiss when dismissOnBackdrop=true
- [ ] backdrop press does NOT call onDismiss when dismissOnBackdrop=false
- [ ] announces for accessibility when opened
```

---

### 10. CountyLimitModal (`/components/county-limit-modal.tsx`)

**Props:**
- `visible: boolean` - UNTESTED
- `onDismiss: () => void` - UNTESTED
- `currentCounties?: number` (default: 1) - UNTESTED
- `maxCounties?: number` (default: 1) - UNTESTED

**Test Specifications:**
```
- [ ] displays current/max county usage
- [ ] lists Pro benefits
- [ ] "Maybe Later" button calls onDismiss
- [ ] "Upgrade to Pro" navigates to upgrade screen
- [ ] haptic feedback on upgrade press
- [ ] displays pricing information
```

---

### 11. WelcomeScreen (`/components/welcome-screen.tsx`)

**Test Specifications:**
```
- [ ] renders logo image
- [ ] renders app name "Protocol Guide"
- [ ] renders tagline
- [ ] renders 3 feature cards
- [ ] "Get Started" button calls signInWithGoogle
- [ ] legal links navigate to correct pages
  - [ ] Terms -> /terms
  - [ ] Privacy -> /privacy
  - [ ] Medical Disclaimer -> /disclaimer
```

---

### 12. QuickActions (`/components/quick-actions.tsx`)

**Props:**
- `onSelect: (query: string) => void` - UNTESTED
- `disabled?: boolean` - UNTESTED

**Test Specifications:**
```
- [ ] renders all 6 quick action buttons
- [ ] each button calls onSelect with correct query
- [ ] buttons have correct icons and colors
- [ ] disabled state reduces opacity
- [ ] disabled state prevents onSelect calls
```

**Sub-component Tests - SuggestedQueries:**
```
- [ ] renders 4 suggestion items
- [ ] clicking suggestion calls onSelect
- [ ] disabled state works correctly
```

---

### 13. RecentSearches (`/components/recent-searches.tsx`)

**Props:**
- `onSelectSearch: (query: string) => void` - UNTESTED

**Test Specifications:**
```
- [ ] loads searches from AsyncStorage on mount
- [ ] renders nothing when no recent searches
- [ ] renders chips for each recent search
- [ ] clicking chip calls onSelectSearch
- [ ] "Clear" button removes all searches from storage
- [ ] "Clear" button clears local state
- [ ] addRecentSearch() adds to front of list
- [ ] addRecentSearch() removes duplicates
- [ ] addRecentSearch() limits to MAX_RECENT_SEARCHES (5)
```

---

### 14. OfflineIndicator (`/components/offline-indicator.tsx`)

**Props:**
- `isOnline: boolean` - UNTESTED

**Test Specifications:**
```
- [ ] renders nothing when isOnline=true
- [ ] renders banner when isOnline=false
- [ ] shows warning icon and message
- [ ] animates in with SlideInUp
- [ ] animates out with SlideOutUp
```

**Sub-component Tests - OfflineBadge:**
```
- [ ] renders badge with "Offline" text
- [ ] applies correct warning color
```

---

### 15. ReferralDashboard (`/components/referral/ReferralDashboard.tsx`)

**Test Specifications:**
```
- [ ] shows loading skeleton while fetching
- [ ] shows error message on API failure
- [ ] displays referral code
- [ ] copy button copies code to clipboard
- [ ] shows "Copied!" feedback after copy
- [ ] SMS share opens SMS app with template
- [ ] WhatsApp share opens WhatsApp URL
- [ ] Email share opens mailto link
- [ ] native share triggers Share API
- [ ] displays stats (totalReferrals, successfulReferrals, proDaysEarned)
- [ ] displays tier badge
- [ ] displays progress bar to next tier
- [ ] displays rewards information
- [ ] tracks viral events via tRPC
```

---

### 16-20. Landing Page Components

**PulsingButton (`/components/landing/simulation.tsx`):**
```
- [ ] renders with label text
- [ ] pulse animation when idle
- [ ] disabled state when isRunning
- [ ] respects prefers-reduced-motion
- [ ] press in/out scale animation
```

**CelebrationEffect:**
```
- [ ] triggers flash on visible=true
- [ ] animates confetti pieces
- [ ] resets animations after completion
```

**ComparisonCard:**
```
- [ ] renders label, value, description
- [ ] "protocol" variant shows red border
- [ ] hover effect on web
```

---

## P2 - Medium Priority Components

### 21. IconSymbol (`/components/ui/icon-symbol.tsx`)

```
- [ ] renders SF Symbol icon on iOS
- [ ] renders fallback on other platforms
- [ ] applies correct size and color
```

### 22. Skeleton (`/components/ui/Skeleton.tsx`)

```
- [ ] renders with specified width/height
- [ ] applies border radius
- [ ] circle variant works correctly
- [ ] animation works (shimmer)
```

### 23. Collapsible (`/components/ui/collapsible.tsx`)

```
- [ ] renders header always
- [ ] renders children when expanded
- [ ] hides children when collapsed
- [ ] toggles on header press
```

### 24. MedicalDisclaimer (`/components/MedicalDisclaimer.tsx`)

```
- [ ] renders inline variant
- [ ] renders full variant
- [ ] displays correct disclaimer text
```

### 25. VoiceInput (`/components/voice-input.tsx`)

```
- [ ] renders mic button
- [ ] handles recording states
```

### 26. ThemeToggle (`/components/theme-toggle.tsx`)

```
- [ ] renders toggle button
- [ ] switches theme on press
```

### 27. HapticTab (`/components/haptic-tab.tsx`)

```
- [ ] triggers haptic feedback on press
- [ ] renders children correctly
```

### 28. ExternalLink (`/components/external-link.tsx`)

```
- [ ] opens URL in browser
- [ ] renders children as link
```

### 29. ParallaxScrollView (`/components/parallax-scroll-view.tsx`)

```
- [ ] renders header and content
- [ ] applies parallax effect on scroll
```

### 30. ScreenContainer (`/components/screen-container.tsx`)

```
- [ ] applies safe area insets
- [ ] renders children
```

### 31. StateDetailView (`/components/state-detail-view.tsx`)

```
- [ ] displays state information
- [ ] lists counties for state
```

---

## P3 - Low Priority Components

### 32. HelloWave (`/components/hello-wave.tsx`)

```
- [ ] renders waving emoji
- [ ] animation works
```

### 33. CachedProtocols (`/components/cached-protocols.tsx`)

```
- [ ] displays cached protocol count
```

### 34. InstallPrompt (`/components/InstallPrompt.tsx`)

```
- [ ] shows PWA install prompt on web
- [ ] handles install flow
```

### 35. UpgradeScreen (`/components/upgrade-screen.tsx`)

```
- [ ] displays pricing tiers
- [ ] handles upgrade flow
```

### 36. FeedbackForm (in `/app/feedback.tsx`)

```
- [ ] validates input
- [ ] submits feedback
```

### 37. ThemedView (`/components/themed-view.tsx`)

```
- [ ] applies theme colors
```

---

## Test Infrastructure Requirements

### 1. Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
});
```

### 2. Test Setup File
```typescript
// test/setup.ts
import '@testing-library/jest-native/extend-expect';
import { vi } from 'vitest';

// Mock React Native modules
vi.mock('react-native', async () => {
  const actual = await vi.importActual('react-native');
  return {
    ...actual,
    Platform: { OS: 'ios', select: vi.fn() },
  };
});

// Mock expo-haptics
vi.mock('@/lib/haptics', () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(),
    // Add specific procedures as needed
  },
}));
```

### 3. Mock Factories

```typescript
// test/factories/protocol.ts
export function createMockProtocol(overrides = {}) {
  return {
    id: 'protocol-123',
    title: 'Cardiac Arrest Protocol',
    content: 'PROTOCOL: Cardiac Arrest\nACTIONS:\n• Start CPR\n• Apply AED',
    category: 'Cardiac',
    state: 'CA',
    county: 'Los Angeles',
    ...overrides,
  };
}

// test/factories/user.ts
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'ems@example.com',
    isPro: false,
    disclaimerAcknowledgedAt: null,
    ...overrides,
  };
}
```

### 4. Custom Render Utility

```typescript
// test/utils/render.tsx
import { render } from '@testing-library/react-native';
import { AppContextProvider } from '@/lib/app-context';
import { TRPCProvider } from '@/lib/trpc';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <TRPCProvider>
      <AppContextProvider>
        {ui}
      </AppContextProvider>
    </TRPCProvider>
  );
}
```

---

## Coverage Targets

| Category | Target | Notes |
|----------|--------|-------|
| Critical Components (P0) | 90% | ChatInput, VoiceSearchButton, DisclaimerConsentModal |
| High Priority (P1) | 80% | Modals, QuickActions, RecentSearches |
| Medium Priority (P2) | 70% | UI primitives, utility components |
| Low Priority (P3) | 50% | Static/presentation components |
| Overall | 75% | Minimum acceptable coverage |

---

## Implementation Priority

### Week 1 - Critical Path
1. Set up Vitest configuration
2. Create test utilities and mocks
3. Write tests for ChatInput (core search functionality)
4. Write tests for DisclaimerConsentModal (legal compliance)
5. Write tests for ResponseCard (core UX)

### Week 2 - User Flows
1. Write tests for VoiceSearchButton
2. Write tests for DoseWeightCalculator
3. Write tests for CountySelector
4. Write tests for ErrorBoundary

### Week 3 - Monetization & Engagement
1. Write tests for ProFeatureLock
2. Write tests for Modal system
3. Write tests for ReferralDashboard
4. Write tests for QuickActions/RecentSearches

### Week 4 - Polish
1. Write tests for remaining P2/P3 components
2. Coverage gap analysis
3. Test refactoring for maintenance
4. CI integration for coverage gates

---

## Notes

- All interaction tests should include accessibility assertions
- Haptic feedback should be mocked and verified
- tRPC calls should be mocked at the procedure level
- Animation tests should verify reanimated shared values
- AsyncStorage tests need proper cleanup between tests
