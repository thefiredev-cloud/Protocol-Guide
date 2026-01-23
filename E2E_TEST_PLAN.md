# Protocol Guide E2E Test Plan

## Overview
This document defines comprehensive end-to-end test scenarios for Protocol Guide's three critical user flows. The plan ensures coverage of happy paths, edge cases, error handling, and cross-browser compatibility.

**Testing Framework**: Playwright
**Test Environment**: Local dev server (http://localhost:8081)
**Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
**Strategy**: Progressive enhancement - test with mock data first, then integrate with live services

---

## 1. User Authentication Flow

### 1.1 Test Objectives
- Verify OAuth authentication with Google and Apple
- Ensure proper session management and token refresh
- Validate protected route access control
- Test authentication error handling
- Verify logout and session cleanup

### 1.2 Test Scenarios

#### 1.2.1 Initial Landing Experience
**Test ID**: `AUTH-001`
**Scenario**: Unauthenticated user visits the app
**Steps**:
1. Navigate to home page `/`
2. Wait for page to fully load (2s timeout for React Native Web)
3. Verify "Sign In" or "Get Started" button is visible

**Expected Behavior**:
- Landing page displays without errors
- Authentication CTA is prominently visible
- No sensitive user data is exposed
- Page loads within 3 seconds

**Critical Assertions**:
```typescript
await expect(page.getByRole('button', { name: /sign in|get started/i })).toBeVisible();
await expect(page).toHaveURL('/');
```

---

#### 1.2.2 Google OAuth Initiation
**Test ID**: `AUTH-002`
**Scenario**: User clicks "Sign in with Google"
**Steps**:
1. Click primary sign-in button
2. Wait for OAuth modal/redirect
3. Verify Google OAuth button is present
4. Click Google sign-in button

**Expected Behavior**:
- OAuth modal opens or navigation occurs
- Google logo/branding is visible
- Button includes "Google" text
- No JavaScript errors in console

**Critical Assertions**:
```typescript
const googleButton = page.getByRole('button', { name: /google/i });
await expect(googleButton).toBeVisible();
await expect(googleButton).toBeEnabled();
```

**Mock Strategy**:
- Use Playwright route interception to mock OAuth redirect
- Mock Supabase auth response with test token
- Simulate successful callback with user data

---

#### 1.2.3 Apple OAuth Initiation
**Test ID**: `AUTH-003`
**Scenario**: User clicks "Sign in with Apple"
**Steps**:
1. Navigate to login page
2. Locate Apple sign-in button
3. Verify Apple branding is present
4. Click Apple sign-in button

**Expected Behavior**:
- Apple OAuth button is available
- Button displays Apple logo
- OAuth flow initiates correctly
- Works on both iOS and web platforms

**Critical Assertions**:
```typescript
const appleButton = page.getByRole('button', { name: /apple/i });
await expect(appleButton).toBeVisible();
```

---

#### 1.2.4 OAuth Callback Success
**Test ID**: `AUTH-004`
**Scenario**: User returns from successful OAuth
**Steps**:
1. Simulate OAuth callback with valid code
2. Navigate to `/oauth/callback?code=mock_auth_code`
3. Wait for token exchange
4. Verify redirect to home page

**Expected Behavior**:
- Callback page processes auth code
- Session token is stored in AsyncStorage
- User is redirected to home page (/)
- Profile/account menu now shows user as authenticated

**Critical Assertions**:
```typescript
await page.goto('/oauth/callback?code=test_code_123');
await page.waitForURL('/');
const profileLink = page.getByRole('link', { name: /profile|account/i });
await expect(profileLink).toBeVisible();
```

---

#### 1.2.5 OAuth Error Handling - Access Denied
**Test ID**: `AUTH-005`
**Scenario**: User denies OAuth permission
**Steps**:
1. Navigate to `/oauth/callback?error=access_denied`
2. Wait for error handling
3. Verify user-friendly error message

**Expected Behavior**:
- Error is caught and handled gracefully
- User sees clear error message
- User can retry authentication
- No app crash or white screen

**Critical Assertions**:
```typescript
await page.goto('/oauth/callback?error=access_denied');
const errorMessage = page.getByText(/denied|cancelled|error/i);
await expect(errorMessage).toBeVisible();
await expect(page).not.toHaveURL(/undefined/);
```

---

#### 1.2.6 OAuth Error Handling - Missing Code
**Test ID**: `AUTH-006`
**Scenario**: Callback URL missing auth code
**Steps**:
1. Navigate to `/oauth/callback` (no code parameter)
2. Wait for error handling
3. Verify safe fallback behavior

**Expected Behavior**:
- Missing code is detected
- Error message or redirect occurs
- No console errors about undefined
- User can navigate back to login

**Critical Assertions**:
```typescript
await page.goto('/oauth/callback');
await page.waitForLoadState('networkidle');
const pageContent = await page.textContent('body');
expect(pageContent).toBeTruthy();
```

---

#### 1.2.7 Protected Route Access - Profile
**Test ID**: `AUTH-007`
**Scenario**: Unauthenticated user tries to access profile
**Steps**:
1. Clear session/cookies
2. Navigate directly to `/(tabs)/profile`
3. Wait for auth check
4. Verify sign-in prompt

**Expected Behavior**:
- Profile page shows sign-in prompt
- User data is not visible
- "Sign in to view profile" message appears
- OAuth buttons are present

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/profile?e2e=true');
await page.waitForTimeout(2000);
const pageContent = await page.textContent('body');
expect(pageContent?.toLowerCase()).toContain('sign in');
```

---

#### 1.2.8 Protected Route Access - History
**Test ID**: `AUTH-008`
**Scenario**: Unauthenticated user tries to access search history
**Steps**:
1. Navigate to `/(tabs)/history`
2. Wait for content load
3. Verify authentication prompt

**Expected Behavior**:
- History page shows sign-in message
- "Please sign in to view your history" text
- No search history data visible
- Sign-in button is available

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/history?e2e=true');
const signInPrompt = page.getByText(/please sign in/i);
await expect(signInPrompt).toBeVisible();
```

---

#### 1.2.9 Session Persistence
**Test ID**: `AUTH-009`
**Scenario**: Authenticated user refreshes page
**Steps**:
1. Complete authentication
2. Navigate to profile page
3. Refresh the page
4. Verify user still authenticated

**Expected Behavior**:
- Session persists across page refreshes
- User data reloads from storage
- No re-authentication required
- Profile data displays correctly

**Critical Assertions**:
```typescript
// After successful auth
await page.reload();
await page.waitForLoadState('networkidle');
const profileLink = page.getByRole('link', { name: /profile/i });
await expect(profileLink).toBeVisible();
```

---

#### 1.2.10 Token Refresh
**Test ID**: `AUTH-010`
**Scenario**: Access token expires and needs refresh
**Steps**:
1. Authenticate user
2. Mock expired token (set timestamp in past)
3. Make API call that requires auth
4. Verify token refresh occurs

**Expected Behavior**:
- Expired token is detected
- Refresh token is used to get new access token
- API call succeeds after refresh
- User remains logged in

**Critical Assertions**:
```typescript
// Mock expired token
await page.evaluate(() => {
  localStorage.setItem('supabase.auth.token', JSON.stringify({
    access_token: 'expired_token',
    expires_at: Date.now() - 1000
  }));
});
// Make authenticated request
await page.goto('/(tabs)/profile');
// Should auto-refresh and show profile
```

---

#### 1.2.11 Logout Flow
**Test ID**: `AUTH-011`
**Scenario**: Authenticated user logs out
**Steps**:
1. Authenticate user
2. Navigate to profile
3. Click logout button
4. Verify logout completes

**Expected Behavior**:
- Logout button is visible on profile
- Click triggers sign-out process
- Session token is cleared
- User redirected to home page
- Auth state resets to unauthenticated

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/profile');
const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
await logoutButton.click();
await page.waitForURL('/');
// Verify sign-in button is back
const signInButton = page.getByRole('button', { name: /sign in/i });
await expect(signInButton).toBeVisible();
```

---

#### 1.2.12 Concurrent Session Handling
**Test ID**: `AUTH-012`
**Scenario**: User logs in on multiple devices
**Steps**:
1. Authenticate in first browser context
2. Authenticate in second browser context
3. Verify both sessions remain valid

**Expected Behavior**:
- Multiple sessions are supported
- Each session has valid token
- No session conflict errors
- Both contexts can make API calls

---

#### 1.2.13 Network Error During Auth
**Test ID**: `AUTH-013`
**Scenario**: Network fails during OAuth flow
**Steps**:
1. Initiate OAuth flow
2. Simulate network offline during callback
3. Verify error handling

**Expected Behavior**:
- Network error is caught
- User sees offline/network error message
- Retry option is available
- App doesn't crash

**Critical Assertions**:
```typescript
await page.route('**/oauth/**', route => route.abort());
await page.goto('/oauth/callback?code=test');
const errorMessage = page.getByText(/network|connection|offline/i);
await expect(errorMessage).toBeVisible();
```

---

### 1.3 Authentication Flow Test Matrix

| Test ID | Scenario | Priority | Browsers | Mobile |
|---------|----------|----------|----------|--------|
| AUTH-001 | Landing page | P0 | All | Yes |
| AUTH-002 | Google OAuth | P0 | All | Yes |
| AUTH-003 | Apple OAuth | P0 | Safari | iOS |
| AUTH-004 | OAuth success | P0 | All | Yes |
| AUTH-005 | Access denied | P1 | Chrome | No |
| AUTH-006 | Missing code | P1 | Chrome | No |
| AUTH-007 | Protected profile | P0 | All | Yes |
| AUTH-008 | Protected history | P0 | All | Yes |
| AUTH-009 | Session persist | P0 | All | Yes |
| AUTH-010 | Token refresh | P1 | Chrome | No |
| AUTH-011 | Logout | P0 | All | Yes |
| AUTH-012 | Multi-session | P2 | Chrome | No |
| AUTH-013 | Network error | P1 | All | Yes |

---

## 2. Protocol Search Flow

### 2.1 Test Objectives
- Verify semantic search functionality
- Test state and agency filtering
- Validate search result display and relevance
- Test voice search integration
- Verify error handling and edge cases
- Test disclaimer acknowledgment blocking

### 2.2 Test Scenarios

#### 2.2.1 Search UI Display
**Test ID**: `SEARCH-001`
**Scenario**: User sees search interface on home page
**Steps**:
1. Navigate to home page `/(tabs)/`
2. Wait for React Native Web to render (2s)
3. Verify search input is visible

**Expected Behavior**:
- Search input field is prominently displayed
- Placeholder text provides guidance (e.g., "cardiac arrest adult...")
- Voice search button is visible
- Recent searches section appears
- Example queries are shown

**Critical Assertions**:
```typescript
const searchInput = page.locator('[data-testid="search-input"]')
  .or(page.locator('input[placeholder*="protocol"]'));
await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

// Verify voice button
const voiceButton = page.getByRole('button', { name: /voice|microphone/i });
await expect(voiceButton).toBeVisible();
```

---

#### 2.2.2 Basic Text Search - Cardiac Arrest
**Test ID**: `SEARCH-002`
**Scenario**: User searches for "cardiac arrest"
**Steps**:
1. Enter "cardiac arrest" in search input
2. Press Enter or click search button
3. Wait for results to load
4. Verify relevant protocols appear

**Expected Behavior**:
- Search submits successfully
- Loading indicator appears
- Results returned within 3 seconds
- Protocols related to cardiac arrest are displayed
- Result includes protocol title, number, and summary

**Critical Assertions**:
```typescript
const searchInput = page.locator('[data-testid="search-input"]').first();
await searchInput.fill('cardiac arrest');
await searchInput.press('Enter');
await page.waitForLoadState('networkidle');

const pageContent = await page.textContent('body');
expect(pageContent?.toLowerCase()).toMatch(/cardiac|arrest|cpr|aed/);
```

---

#### 2.2.3 Medical Condition Search - Stroke
**Test ID**: `SEARCH-003`
**Scenario**: User searches for stroke protocol
**Steps**:
1. Search for "stroke"
2. Submit search
3. Wait for results
4. Verify stroke-related protocols

**Expected Behavior**:
- Stroke protocols appear
- Results include time-sensitive information (stroke scale, tPA window)
- Protocol year badge is visible
- Relevance score or ranking is applied

**Critical Assertions**:
```typescript
await searchInput.fill('stroke');
await searchInput.press('Enter');
await page.waitForTimeout(2000);

// Check for stroke-related content
const results = page.locator('[data-testid="protocol-result"]');
await expect(results.first()).toBeVisible();
```

---

#### 2.2.4 Medication Dosage Search
**Test ID**: `SEARCH-004`
**Scenario**: User searches for specific medication
**Steps**:
1. Search for "epinephrine dose cardiac arrest"
2. Submit search
3. Verify medication information in results

**Expected Behavior**:
- Results show protocols containing epinephrine
- Dosage information is visible
- Route of administration is mentioned (IV/IO)
- Protocol summary highlights medication steps

**Critical Assertions**:
```typescript
await searchInput.fill('epinephrine dose cardiac arrest');
await searchInput.press('Enter');
await page.waitForLoadState('networkidle');

const summary = page.locator('.protocol-summary, .summary-card');
await expect(summary.first()).toContainText(/epinephrine|epi/i);
```

---

#### 2.2.5 Empty Search Handling
**Test ID**: `SEARCH-005`
**Scenario**: User submits empty search
**Steps**:
1. Leave search input empty
2. Press Enter
3. Verify graceful handling

**Expected Behavior**:
- No error is thrown
- User remains on search page
- Helpful message or validation prompt
- Recent searches remain visible

**Critical Assertions**:
```typescript
await searchInput.fill('');
await searchInput.press('Enter');
await expect(page).not.toHaveURL(/error/);

// Should show recent searches or placeholder
const recentSearches = page.getByText(/recent searches/i);
expect(await recentSearches.isVisible().catch(() => false)).toBeTruthy();
```

---

#### 2.2.6 No Results Found
**Test ID**: `SEARCH-006`
**Scenario**: User searches for nonsense query
**Steps**:
1. Search for "xyzzy12345nonsensequery"
2. Submit search
3. Verify no results message

**Expected Behavior**:
- "No results found" message appears
- Suggestions to try different keywords
- No protocol cards are shown
- Search input remains populated for editing

**Critical Assertions**:
```typescript
await searchInput.fill('xyzzy12345nonsensequery');
await searchInput.press('Enter');
await page.waitForLoadState('networkidle');

const noResults = page.getByText(/no results|not found|try different/i);
await expect(noResults.first()).toBeVisible();
```

---

#### 2.2.7 State Filter - California
**Test ID**: `SEARCH-007`
**Scenario**: User filters protocols by California
**Steps**:
1. Click state filter dropdown
2. Select "California"
3. Verify filter is applied
4. Perform search
5. Verify only CA protocols appear

**Expected Behavior**:
- State dropdown opens
- California is in the list
- Filter badge appears after selection
- Search results respect state filter
- Protocol results show CA agencies

**Critical Assertions**:
```typescript
// Open state dropdown
const stateButton = page.getByRole('button', { name: /state/i });
await stateButton.click();

// Select California
const californiaOption = page.getByText(/California/i);
await californiaOption.first().click();

// Verify filter badge
const filterBadge = page.getByText('California');
await expect(filterBadge).toBeVisible();
```

---

#### 2.2.8 Agency Filter - LA County
**Test ID**: `SEARCH-008`
**Scenario**: User filters by specific agency
**Steps**:
1. Select California as state
2. Click agency filter dropdown
3. Select "Los Angeles County"
4. Verify county restriction handling (free tier limit)
5. Perform search

**Expected Behavior**:
- Agency dropdown shows after state selection
- LA County appears in list with protocol count
- If free tier: county limit modal may appear
- Search results limited to selected agency
- Agency badge displays in UI

**Critical Assertions**:
```typescript
// After selecting California
const agencyButton = page.getByRole('button', { name: /agency/i });
await agencyButton.click();

const laCounty = page.getByText(/Los Angeles County/i);
await laCounty.first().click();

// Verify filter
const agencyBadge = page.locator('.filter-badge, [class*="badge"]');
await expect(agencyBadge).toContainText(/LA|Los Angeles/i);
```

---

#### 2.2.9 Clear Filters
**Test ID**: `SEARCH-009`
**Scenario**: User clears applied filters
**Steps**:
1. Apply state and agency filters
2. Click clear/reset button (X on filter badge)
3. Verify filters are removed
4. Perform search shows all results

**Expected Behavior**:
- Clear button is visible when filters active
- Click removes all filters
- Filter badges disappear
- State/Agency dropdowns reset to "All"

**Critical Assertions**:
```typescript
// After applying filters
const clearButton = page.locator('[aria-label*="clear"]')
  .or(page.getByRole('button', { name: /clear|reset/i }));
await clearButton.click();

// Verify filters cleared
const stateBadge = page.getByText(/California/i);
await expect(stateBadge).not.toBeVisible();
```

---

#### 2.2.10 Search Result Display - Protocol Card
**Test ID**: `SEARCH-010`
**Scenario**: User examines search result protocol card
**Steps**:
1. Perform search
2. Examine first result card
3. Verify all required information is present

**Expected Behavior**:
- Protocol title is displayed
- Protocol number is visible
- Protocol year badge shown with color coding:
  - Green: Current year/1 year old
  - Blue: 2 years old
  - Orange/Yellow: 3+ years old
- Summary text is concise and relevant
- Source PDF link is available (if exists)
- Medical disclaimer is shown

**Critical Assertions**:
```typescript
const firstResult = page.locator('[data-testid="protocol-result"]').first();
await expect(firstResult).toBeVisible();

// Check components
await expect(firstResult.locator('.protocol-title')).toBeVisible();
await expect(firstResult.locator('.protocol-year')).toBeVisible();
await expect(firstResult.locator('.summary-text')).toBeVisible();
```

---

#### 2.2.11 Click Result for Details
**Test ID**: `SEARCH-011`
**Scenario**: User clicks on protocol result
**Steps**:
1. Perform search
2. Click on first protocol result
3. Verify detail view or PDF opens

**Expected Behavior**:
- Result card is clickable
- Click opens protocol detail view or PDF viewer
- Full protocol content is accessible
- User can navigate back to search

**Critical Assertions**:
```typescript
const firstResult = page.locator('[data-testid="protocol-result"]').first();
await firstResult.click();

// Should navigate or open modal
await page.waitForLoadState('networkidle');
// Verify detail view or PDF viewer
```

---

#### 2.2.12 Voice Search - Basic Query
**Test ID**: `SEARCH-012`
**Scenario**: User performs voice search
**Steps**:
1. Click microphone button
2. Allow microphone permissions (mock)
3. Speak "chest pain protocol" (mock transcription)
4. Verify search executes automatically

**Expected Behavior**:
- Microphone button is visible
- Permission request appears (or is mocked)
- Voice recording starts (visual indicator)
- Speech is transcribed
- Search executes automatically with transcribed text
- Voice input populates search field

**Critical Assertions**:
```typescript
// Mock voice transcription
await page.evaluate(() => {
  window.mockVoiceTranscription = 'chest pain protocol';
});

const voiceButton = page.getByRole('button', { name: /voice|microphone/i });
await voiceButton.click();

// Should trigger search automatically
await page.waitForTimeout(1000);
const searchInput = page.locator('[data-testid="search-input"]').first();
await expect(searchInput).toHaveValue(/chest pain/i);
```

---

#### 2.2.13 Voice Search Error Handling
**Test ID**: `SEARCH-013`
**Scenario**: Voice search fails (no permission or error)
**Steps**:
1. Click microphone button
2. Simulate permission denied or transcription error
3. Verify error message

**Expected Behavior**:
- Error banner appears with clear message
- Error auto-dismisses after 3 seconds
- User can retry voice search
- App doesn't crash

**Critical Assertions**:
```typescript
// Mock voice error
await page.evaluate(() => {
  window.mockVoiceError = 'Microphone permission denied';
});

await voiceButton.click();

const errorBanner = page.locator('[class*="error"]').filter({ hasText: /microphone|permission/i });
await expect(errorBanner).toBeVisible();
```

---

#### 2.2.14 Recent Searches Display
**Test ID**: `SEARCH-014`
**Scenario**: User sees and uses recent searches
**Steps**:
1. Perform 3 different searches
2. Return to home page
3. Verify recent searches are shown
4. Click on a recent search
5. Verify search executes

**Expected Behavior**:
- Recent searches section appears below search input
- Last 5-10 searches are shown
- Clicking recent search re-executes it
- Recent searches persist across sessions (AsyncStorage)

**Critical Assertions**:
```typescript
// After performing searches
await page.goto('/(tabs)/');
const recentSearches = page.locator('[data-testid="recent-search"]');
await expect(recentSearches.first()).toBeVisible();

// Click recent search
await recentSearches.first().click();
// Should execute search
```

---

#### 2.2.15 Disclaimer Blocking Search
**Test ID**: `SEARCH-015`
**Scenario**: Authenticated user hasn't acknowledged disclaimer
**Steps**:
1. Log in as new user (no disclaimer acknowledgment)
2. Try to perform search
3. Verify disclaimer modal appears
4. Search is blocked until acknowledged

**Expected Behavior**:
- Disclaimer modal appears on first search attempt
- Search does not execute
- Modal explains medical disclaimer
- User must click "I Understand" to proceed
- After acknowledgment, search executes normally

**Critical Assertions**:
```typescript
// Mock authenticated but no disclaimer
await page.evaluate(() => {
  localStorage.setItem('hasAcknowledgedDisclaimer', 'false');
});

await searchInput.fill('cardiac arrest');
await searchInput.press('Enter');

// Disclaimer modal should appear
const disclaimerModal = page.getByRole('dialog').filter({ hasText: /medical disclaimer/i });
await expect(disclaimerModal).toBeVisible();

// Acknowledge
const acknowledgeButton = page.getByRole('button', { name: /I understand|acknowledge/i });
await acknowledgeButton.click();

// Now search should work
```

---

#### 2.2.16 Search Performance - Large Results
**Test ID**: `SEARCH-016`
**Scenario**: Search returns many results (50+)
**Steps**:
1. Search for generic term like "protocol"
2. Measure load time
3. Verify results render correctly

**Expected Behavior**:
- Results load within 3 seconds
- Only top 3 results shown by default
- Pagination or "load more" if applicable
- No UI lag or freezing
- Skeleton loaders shown during load

**Performance Criteria**:
- Initial search: < 2 seconds
- Result render: < 1 second
- Total: < 3 seconds

---

#### 2.2.17 Search While Offline
**Test ID**: `SEARCH-017`
**Scenario**: User tries to search with no network
**Steps**:
1. Simulate offline mode
2. Try to perform search
3. Verify offline handling

**Expected Behavior**:
- Offline banner appears at top
- Search shows error: "No connection"
- Cached recent searches still visible
- User can retry when online

**Critical Assertions**:
```typescript
await page.route('**/*', route => route.abort());

await searchInput.fill('test');
await searchInput.press('Enter');

const offlineBanner = page.getByText(/offline|no connection/i);
await expect(offlineBanner).toBeVisible();
```

---

#### 2.2.18 Long Query Handling
**Test ID**: `SEARCH-018`
**Scenario**: User enters very long search query
**Steps**:
1. Enter 200+ character query
2. Submit search
3. Verify handling

**Expected Behavior**:
- Query is truncated or limited to reasonable length
- Search still executes
- No UI overflow issues
- Relevant results returned

---

### 2.3 Protocol Search Flow Test Matrix

| Test ID | Scenario | Priority | Browsers | Mobile |
|---------|----------|----------|----------|--------|
| SEARCH-001 | Search UI | P0 | All | Yes |
| SEARCH-002 | Cardiac arrest | P0 | All | Yes |
| SEARCH-003 | Stroke | P0 | All | Yes |
| SEARCH-004 | Medication dose | P0 | All | Yes |
| SEARCH-005 | Empty search | P1 | All | Yes |
| SEARCH-006 | No results | P1 | All | Yes |
| SEARCH-007 | State filter | P0 | All | Yes |
| SEARCH-008 | Agency filter | P0 | All | Yes |
| SEARCH-009 | Clear filters | P1 | All | Yes |
| SEARCH-010 | Result display | P0 | All | Yes |
| SEARCH-011 | Click result | P0 | All | Yes |
| SEARCH-012 | Voice search | P1 | Chrome | Yes |
| SEARCH-013 | Voice error | P2 | Chrome | Yes |
| SEARCH-014 | Recent searches | P1 | All | Yes |
| SEARCH-015 | Disclaimer block | P0 | All | Yes |
| SEARCH-016 | Performance | P1 | Chrome | No |
| SEARCH-017 | Offline search | P1 | All | Yes |
| SEARCH-018 | Long query | P2 | Chrome | No |

---

## 3. Subscription Checkout Flow

### 3.1 Test Objectives
- Verify pricing display and upgrade CTA
- Test Stripe checkout integration
- Validate subscription tier enforcement
- Test billing portal access
- Verify webhook handling for subscription events
- Test free tier limitations

### 3.2 Test Scenarios

#### 3.2.1 Pricing Display - Unauthenticated
**Test ID**: `SUB-001`
**Scenario**: Unauthenticated user views pricing
**Steps**:
1. Navigate to home page as guest
2. Look for upgrade/pricing CTA
3. Verify pricing information is accessible

**Expected Behavior**:
- "Upgrade" or "Go Pro" button is visible
- Pricing link in navigation/menu
- Pricing information is visible without login
- Clear value proposition shown

**Critical Assertions**:
```typescript
const upgradeButton = page.getByRole('button', { name: /upgrade|pro|premium/i })
  .or(page.getByRole('link', { name: /upgrade|pricing/i }));
await expect(upgradeButton.first()).toBeVisible();
```

---

#### 3.2.2 Pricing Plans Display
**Test ID**: `SUB-002`
**Scenario**: User views pricing plans
**Steps**:
1. Click upgrade/pricing button
2. View pricing page
3. Verify both monthly and annual options shown

**Expected Behavior**:
- Two pricing tiers visible: Monthly and Annual
- Monthly price clearly displayed (e.g., $4.99/month)
- Annual price shown with savings (e.g., $49.99/year)
- "Save X%" badge on annual plan
- Feature comparison list shown
- Department pricing mentioned (if applicable)

**Critical Assertions**:
```typescript
await upgradeButton.click();
await page.waitForLoadState('networkidle');

const pageContent = await page.textContent('body');
expect(pageContent?.toLowerCase()).toContain('month');
expect(pageContent?.toLowerCase()).toMatch(/annual|year/);
expect(pageContent?.toLowerCase()).toMatch(/save|discount/);
```

---

#### 3.2.3 Free Tier Feature Display
**Test ID**: `SUB-003`
**Scenario**: User views free tier limitations
**Steps**:
1. View pricing page
2. Examine free tier features
3. Compare with Pro tier

**Expected Behavior**:
- Free tier shows "1 county access"
- Pro tier shows "Unlimited counties"
- Free tier shows limited features
- Clear comparison between tiers
- No hidden limitations

**Critical Assertions**:
```typescript
const freeTier = page.locator('[data-testid="free-tier"]')
  .or(page.getByText(/free/i).locator('..'));

await expect(freeTier).toContainText(/1 county/i);

const proTier = page.locator('[data-testid="pro-tier"]')
  .or(page.getByText(/pro/i).locator('..'));

await expect(proTier).toContainText(/unlimited/i);
```

---

#### 3.2.4 County Limit Modal - Free User
**Test ID**: `SUB-004`
**Scenario**: Free user tries to add 2nd county
**Steps**:
1. Log in as free tier user
2. Select a state and county
3. Try to select a second county
4. Verify upgrade modal appears

**Expected Behavior**:
- User can select 1st county without issue
- Attempting 2nd county triggers modal
- Modal explains "Free tier: 1 county limit"
- "Upgrade to Pro" CTA in modal
- Modal shows current count: "1/1 counties used"

**Critical Assertions**:
```typescript
// After selecting first county
const agencyButton = page.getByRole('button', { name: /agency/i });
await agencyButton.click();

// Try to select second county
const secondCounty = page.getByText(/Orange County/i);
await secondCounty.click();

// County limit modal should appear
const limitModal = page.getByRole('dialog').filter({ hasText: /county limit|upgrade/i });
await expect(limitModal).toBeVisible();
await expect(limitModal).toContainText(/1\/1|limit reached/i);
```

---

#### 3.2.5 Upgrade CTA Click - Must Login First
**Test ID**: `SUB-005`
**Scenario**: Guest clicks upgrade button
**Steps**:
1. As unauthenticated user, click "Upgrade to Pro"
2. Verify redirect to login
3. After login, verify redirect back to checkout

**Expected Behavior**:
- Clicking upgrade as guest redirects to login
- After successful login, user returns to upgrade flow
- Upgrade intent is preserved across login
- Seamless flow from guest → login → checkout

**Critical Assertions**:
```typescript
await page.goto('/');
const upgradeButton = page.getByRole('button', { name: /upgrade|pro/i });
await upgradeButton.click();

// Should redirect to login or show login modal
await page.waitForTimeout(1000);
const loginPrompt = page.getByText(/sign in|log in/i);
await expect(loginPrompt).toBeVisible();
```

---

#### 3.2.6 Stripe Checkout - Monthly Plan
**Test ID**: `SUB-006`
**Scenario**: Authenticated user initiates monthly checkout
**Steps**:
1. Login as free tier user
2. Navigate to upgrade page
3. Click "Subscribe Monthly" button
4. Verify redirect to Stripe Checkout

**Expected Behavior**:
- Monthly plan button is clickable
- Click creates Stripe Checkout session
- Redirects to `checkout.stripe.com`
- Stripe page shows correct price ($4.99/month)
- Cancel button returns to app

**Critical Assertions**:
```typescript
// Mock authenticated session
await page.goto('/upgrade');

const monthlyButton = page.getByRole('button', { name: /monthly|month/i });
await monthlyButton.click();

// Wait for Stripe redirect
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });
expect(page.url()).toContain('checkout.stripe.com');
```

---

#### 3.2.7 Stripe Checkout - Annual Plan
**Test ID**: `SUB-007`
**Scenario**: User subscribes to annual plan
**Steps**:
1. Login as free tier user
2. Click "Subscribe Annually" button
3. Verify redirect to Stripe Checkout
4. Verify annual pricing shown

**Expected Behavior**:
- Annual button is clickable
- Redirects to Stripe with annual price ($49.99/year)
- Shows "Save 17%" or equivalent
- Annual billing cycle is clear

**Critical Assertions**:
```typescript
const annualButton = page.getByRole('button', { name: /annual|year/i });
await annualButton.click();

await page.waitForURL(/checkout\.stripe\.com/);
expect(page.url()).toContain('checkout.stripe.com');

// Verify annual price on Stripe page
const stripePage = await page.textContent('body');
expect(stripePage).toMatch(/49\.99|year/i);
```

---

#### 3.2.8 Stripe Test Card - Successful Payment
**Test ID**: `SUB-008`
**Scenario**: User completes payment with test card
**Steps**:
1. Initiate checkout flow
2. On Stripe page, enter test card: 4242 4242 4242 4242
3. Fill in email, expiry (future date), CVC (any 3 digits)
4. Submit payment
5. Verify success redirect

**Expected Behavior**:
- Test card is accepted
- Payment processes successfully
- Redirects to success URL: `/?checkout=success`
- Success message shown
- User subscription status updates to "pro"

**Critical Assertions**:
```typescript
// On Stripe checkout page
await page.fill('[name="cardNumber"]', '4242424242424242');
await page.fill('[name="cardExpiry"]', '12/34');
await page.fill('[name="cardCvc"]', '123');
await page.fill('[name="billingName"]', 'Test User');

const submitButton = page.getByRole('button', { name: /subscribe|pay/i });
await submitButton.click();

// Wait for redirect back to app
await page.waitForURL(/\?checkout=success/, { timeout: 15000 });
expect(page.url()).toContain('checkout=success');
```

---

#### 3.2.9 Checkout Success Handling
**Test ID**: `SUB-009`
**Scenario**: User returns from successful checkout
**Steps**:
1. Simulate return from Stripe: `/?checkout=success`
2. Verify success message
3. Verify subscription status updates

**Expected Behavior**:
- Success message/modal appears
- "Welcome to Pro!" or similar message
- Profile shows Pro status
- County limit removed (unlimited access)
- Thank you message displayed

**Critical Assertions**:
```typescript
await page.goto('/?checkout=success');
await page.waitForLoadState('networkidle');

// Success indicator
const successMessage = page.getByText(/success|welcome to pro|thank you/i);
await expect(successMessage).toBeVisible();

// Check profile shows Pro
await page.goto('/(tabs)/profile');
const proStatus = page.getByText(/pro|premium/i);
await expect(proStatus).toBeVisible();
```

---

#### 3.2.10 Checkout Cancellation
**Test ID**: `SUB-010`
**Scenario**: User cancels checkout on Stripe
**Steps**:
1. Initiate checkout
2. On Stripe page, click back/cancel
3. Verify return to app
4. Verify no subscription created

**Expected Behavior**:
- Cancel button is visible on Stripe page
- Clicking cancel returns to app: `/?checkout=cancelled`
- App shows "Checkout cancelled" message
- User remains on free tier
- Can retry checkout

**Critical Assertions**:
```typescript
await page.goto('/?checkout=cancelled');
await page.waitForLoadState('networkidle');

// App should handle gracefully
const pageContent = await page.textContent('body');
expect(pageContent).toBeTruthy();

// User still free tier
await page.goto('/(tabs)/profile');
const freeStatus = page.getByText(/free|upgrade/i);
await expect(freeStatus).toBeVisible();
```

---

#### 3.2.11 Stripe Test Card - Payment Declined
**Test ID**: `SUB-011`
**Scenario**: Payment fails with declined card
**Steps**:
1. Initiate checkout
2. Enter declined test card: 4000 0000 0000 0002
3. Submit payment
4. Verify error handling

**Expected Behavior**:
- Stripe shows "Card declined" error
- User can try different card
- User can return to app
- No subscription created
- Error is logged

**Critical Assertions**:
```typescript
// On Stripe page
await page.fill('[name="cardNumber"]', '4000000000000002');
await page.fill('[name="cardExpiry"]', '12/34');
await page.fill('[name="cardCvc"]', '123');

await submitButton.click();

// Should show error on Stripe page
const errorMessage = page.getByText(/declined|failed|error/i);
await expect(errorMessage).toBeVisible();
```

---

#### 3.2.12 Customer Portal Access - Pro User
**Test ID**: `SUB-012`
**Scenario**: Pro user accesses billing portal
**Steps**:
1. Login as Pro subscriber
2. Navigate to profile
3. Click "Manage Subscription" button
4. Verify redirect to Stripe Customer Portal

**Expected Behavior**:
- "Manage Subscription" button visible on profile
- Click redirects to `billing.stripe.com`
- Portal shows current subscription
- User can update payment method
- User can cancel subscription

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/profile');

const manageButton = page.getByRole('button', { name: /manage subscription|billing/i })
  .or(page.getByRole('link', { name: /manage subscription|billing/i }));

await expect(manageButton).toBeVisible();
await manageButton.click();

await page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 });
expect(page.url()).toContain('billing.stripe.com');
```

---

#### 3.2.13 Subscription Status Display - Profile
**Test ID**: `SUB-013`
**Scenario**: User views subscription status on profile
**Steps**:
1. Login as Pro user
2. Navigate to profile page
3. Verify subscription details shown

**Expected Behavior**:
- Profile shows "Pro" badge
- Current plan displayed (Monthly/Annual)
- Next billing date shown
- "Manage Subscription" link available
- Usage stats show unlimited

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/profile');

// Pro badge
const proBadge = page.locator('[data-testid="subscription-badge"]')
  .or(page.getByText(/pro|premium/i));
await expect(proBadge).toBeVisible();

// Billing info
const billingInfo = page.getByText(/next billing|renews on/i);
await expect(billingInfo).toBeVisible();
```

---

#### 3.2.14 Free Tier Usage Display
**Test ID**: `SUB-014`
**Scenario**: Free user views usage limits
**Steps**:
1. Login as free tier user
2. View profile page
3. Verify usage information

**Expected Behavior**:
- Shows "Free" tier badge
- Displays "1/1 counties used" (or 0/1)
- Upgrade CTA is prominent
- Feature limitations listed
- Clear upgrade path

**Critical Assertions**:
```typescript
await page.goto('/(tabs)/profile');

const freeStatus = page.getByText(/free tier|free/i);
await expect(freeStatus).toBeVisible();

const countyUsage = page.getByText(/\d\/1 count/i);
await expect(countyUsage).toBeVisible();

const upgradeCTA = page.getByRole('button', { name: /upgrade/i });
await expect(upgradeCTA).toBeVisible();
```

---

#### 3.2.15 Subscription Webhook - Activated
**Test ID**: `SUB-015`
**Scenario**: Stripe webhook activates subscription
**Steps**:
1. Complete checkout successfully
2. Wait for webhook processing
3. Verify subscription activates in real-time

**Expected Behavior**:
- Webhook received within 5 seconds
- User subscription status updates to "active"
- Database record created in `subscriptions` table
- User immediately has Pro access
- No page refresh required

**Test Strategy**:
- Use Stripe CLI to send test webhook
- Monitor webhook endpoint logs
- Verify database update

---

#### 3.2.16 Subscription Webhook - Payment Failed
**Test ID**: `SUB-016`
**Scenario**: Recurring payment fails (webhook)
**Steps**:
1. Simulate `invoice.payment_failed` webhook
2. Verify subscription status updates
3. User is downgraded or notified

**Expected Behavior**:
- Webhook updates subscription to "past_due"
- User receives notification
- Grace period before downgrade (if applicable)
- User prompted to update payment method

---

#### 3.2.17 Subscription Webhook - Cancelled
**Test ID**: `SUB-017`
**Scenario**: User cancels subscription
**Steps**:
1. Pro user cancels via Customer Portal
2. Webhook received: `customer.subscription.deleted`
3. Verify downgrade to free tier

**Expected Behavior**:
- Webhook updates status to "cancelled"
- User retains access until end of billing period
- After period ends, downgrade to free tier
- County limit re-enforced
- User notified of cancellation

---

#### 3.2.18 Department Pricing Access
**Test ID**: `SUB-018`
**Scenario**: User views department/team pricing
**Steps**:
1. Navigate to pricing page
2. Look for "Department" or "Team" pricing option
3. Verify contact CTA

**Expected Behavior**:
- Department pricing section visible
- "Contact Sales" or "Request Quote" button
- Mentions multi-user access
- Custom pricing indicated
- Email or form for contact

**Critical Assertions**:
```typescript
await page.goto('/pricing');

const deptPricing = page.getByText(/department|team|enterprise/i);
await expect(deptPricing).toBeVisible();

const contactButton = page.getByRole('button', { name: /contact|quote/i });
await expect(contactButton).toBeVisible();
```

---

#### 3.2.19 Pricing Page Mobile Responsive
**Test ID**: `SUB-019`
**Scenario**: User views pricing on mobile device
**Steps**:
1. Open pricing page on mobile viewport
2. Verify layout is responsive
3. Check buttons are tappable

**Expected Behavior**:
- Pricing cards stack vertically on mobile
- Text is readable (not too small)
- Buttons are large enough to tap (min 44x44px)
- No horizontal scrolling required
- Annual savings badge remains visible

**Test on**: Mobile Chrome, Mobile Safari

---

#### 3.2.20 Checkout Session Timeout
**Test ID**: `SUB-020`
**Scenario**: Stripe checkout session expires
**Steps**:
1. Create checkout session
2. Wait for session expiration (24 hours or mock)
3. Try to access expired session URL

**Expected Behavior**:
- Stripe shows "Session expired" message
- User redirected back to app
- Can create new checkout session
- No broken state in app

---

### 3.3 Subscription Checkout Flow Test Matrix

| Test ID | Scenario | Priority | Browsers | Mobile |
|---------|----------|----------|----------|--------|
| SUB-001 | Pricing display | P0 | All | Yes |
| SUB-002 | Plans display | P0 | All | Yes |
| SUB-003 | Free tier | P0 | All | Yes |
| SUB-004 | County limit | P0 | All | Yes |
| SUB-005 | Guest upgrade | P1 | All | Yes |
| SUB-006 | Monthly checkout | P0 | All | Yes |
| SUB-007 | Annual checkout | P0 | All | Yes |
| SUB-008 | Test card payment | P0 | Chrome | No |
| SUB-009 | Success handling | P0 | All | Yes |
| SUB-010 | Cancellation | P1 | All | Yes |
| SUB-011 | Declined card | P1 | Chrome | No |
| SUB-012 | Portal access | P0 | All | Yes |
| SUB-013 | Pro status | P0 | All | Yes |
| SUB-014 | Free usage | P0 | All | Yes |
| SUB-015 | Webhook activate | P0 | Chrome | No |
| SUB-016 | Webhook failed | P1 | Chrome | No |
| SUB-017 | Webhook cancel | P1 | Chrome | No |
| SUB-018 | Dept pricing | P2 | All | Yes |
| SUB-019 | Mobile responsive | P1 | - | Yes |
| SUB-020 | Session timeout | P2 | Chrome | No |

---

## 4. Test Execution Strategy

### 4.1 Test Environment Setup

#### Local Development
```bash
# Start app with test environment
E2E_BASE_URL=http://localhost:8081 pnpm dev

# Run E2E tests
pnpm test:e2e

# Run with UI mode (debugging)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed
```

#### Environment Variables
```bash
# .env.test
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
E2E_TEST_MODE=true
```

### 4.2 Test Data Management

#### Test Users
```typescript
// test-users.ts
export const TEST_USERS = {
  freeUser: {
    email: 'free-user@test.com',
    id: 'test-free-001',
    tier: 'free',
  },
  proUser: {
    email: 'pro-user@test.com',
    id: 'test-pro-001',
    tier: 'pro',
    stripeCustomerId: 'cus_test_123',
  },
  newUser: {
    email: 'new-user@test.com',
    id: 'test-new-001',
    disclaimerAcknowledged: false,
  },
};
```

#### Test Protocols
```typescript
// Seed test database with protocols
export const TEST_PROTOCOLS = {
  cardiacArrest: {
    id: 1,
    title: 'Cardiac Arrest - Adult',
    state: 'California',
    agency: 'Los Angeles County',
  },
  stroke: {
    id: 2,
    title: 'Acute Stroke',
    state: 'California',
    agency: 'Los Angeles County',
  },
};
```

### 4.3 Mock Strategies

#### OAuth Mocking
```typescript
// Mock Supabase auth
await page.route('**/auth/v1/**', async route => {
  if (route.request().url().includes('token')) {
    return route.fulfill({
      status: 200,
      body: JSON.stringify({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        user: TEST_USERS.freeUser,
      }),
    });
  }
  return route.continue();
});
```

#### Stripe Mocking
```typescript
// Mock Stripe Checkout creation
await page.route('**/api/subscription/create-checkout', async route => {
  return route.fulfill({
    status: 200,
    body: JSON.stringify({
      url: 'https://checkout.stripe.com/test/c/pay/cs_test_123',
    }),
  });
});
```

#### Search API Mocking
```typescript
// Mock search results
await page.route('**/api/search/**', async route => {
  return route.fulfill({
    status: 200,
    body: JSON.stringify({
      results: [TEST_PROTOCOLS.cardiacArrest],
    }),
  });
});
```

### 4.4 Test Fixtures

```typescript
// fixtures/auth.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated session
    await page.goto('/');
    await mockAuthentication(page, TEST_USERS.freeUser);
    await use(page);
  },

  proUserPage: async ({ page }, use) => {
    await page.goto('/');
    await mockAuthentication(page, TEST_USERS.proUser);
    await use(page);
  },
});
```

### 4.5 Continuous Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start dev server
        run: pnpm dev &

      - name: Wait for server
        run: npx wait-on http://localhost:8081

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          CI: true
          E2E_BASE_URL: http://localhost:8081

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 4.6 Test Reporting

#### Test Reports Include:
- **Pass/Fail Status**: For each test scenario
- **Screenshots**: On failure (automatically captured)
- **Videos**: On failure (retain-on-failure mode)
- **Traces**: For debugging (on-first-retry)
- **Performance Metrics**: Page load times, API response times
- **Coverage**: % of critical paths tested

#### Report Formats:
- HTML report: `playwright-report/index.html`
- JSON report: For CI integration
- JUnit XML: For test management tools

---

## 5. Success Criteria

### 5.1 Coverage Goals
- **P0 Tests**: 100% passing
- **P1 Tests**: 95% passing
- **P2 Tests**: 90% passing

### 5.2 Performance Benchmarks
- Authentication: < 2 seconds
- Search: < 3 seconds
- Checkout redirect: < 5 seconds

### 5.3 Browser Compatibility
- Chrome: 100% passing
- Firefox: 100% passing
- Safari: 100% passing
- Mobile Chrome: 95% passing
- Mobile Safari: 95% passing

### 5.4 Stability Requirements
- Flakiness rate: < 5%
- Test execution time: < 10 minutes for full suite
- Retry success rate: > 90%

---

## 6. Maintenance Plan

### 6.1 Test Review Cadence
- **Weekly**: Review failing tests
- **Bi-weekly**: Update mocks for API changes
- **Monthly**: Add new test scenarios for features
- **Quarterly**: Full test suite audit

### 6.2 Test Data Refresh
- Reset test database daily in CI
- Clear test user data after each run
- Regenerate test tokens weekly

### 6.3 Playwright Version Updates
- Update Playwright monthly
- Test on latest browser versions
- Update fixtures for breaking changes

---

## 7. Quick Reference

### 7.1 Run Specific Test Suites
```bash
# Authentication tests only
npx playwright test e2e/auth.spec.ts

# Search tests only
npx playwright test e2e/search.spec.ts

# Checkout tests only
npx playwright test e2e/checkout.spec.ts

# Specific test by name
npx playwright test -g "AUTH-001"

# Debug mode for single test
npx playwright test --debug -g "SEARCH-002"
```

### 7.2 Common Test Commands
```bash
# Generate code (record actions)
npx playwright codegen http://localhost:8081

# Open trace viewer
npx playwright show-trace trace.zip

# Show HTML report
npx playwright show-report

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=webkit

# Run tests in headed mode
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
```

### 7.3 Key Test Patterns

#### Wait for Network Idle
```typescript
await page.waitForLoadState('networkidle');
```

#### Assert with Timeout
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

#### Retry Actions
```typescript
await expect(async () => {
  await button.click();
  await expect(result).toBeVisible();
}).toPass({ timeout: 5000 });
```

---

## 8. Appendix

### 8.1 Test Selectors Best Practices
- **Prefer**: `data-testid` attributes
- **Second**: Role-based selectors (accessibility)
- **Avoid**: CSS class names (brittle)
- **Never**: XPath (hard to maintain)

### 8.2 Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Expired Card: 4000 0000 0000 0069
Processing Error: 4000 0000 0000 0119
```

### 8.3 Common Issues & Solutions

#### Issue: Test timeouts
**Solution**: Increase timeout, check network speed, optimize page load

#### Issue: Flaky tests
**Solution**: Use waitForLoadState, avoid fixed setTimeout, retry logic

#### Issue: Element not found
**Solution**: Use better selectors, wait for element, check React Native Web rendering

#### Issue: OAuth redirect fails
**Solution**: Mock OAuth endpoints, check callback URL configuration

---

**Document Version**: 1.0
**Last Updated**: 2026-01-23
**Owner**: E2E Testing Team
**Next Review**: 2026-02-23
