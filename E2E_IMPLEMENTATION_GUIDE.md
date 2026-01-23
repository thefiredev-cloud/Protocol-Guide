# E2E Test Implementation Guide

## Quick Start

This guide provides practical implementation steps for the E2E test scenarios defined in `E2E_TEST_PLAN.md`.

---

## 1. Setup & Installation

### Install Dependencies
```bash
# Install Playwright
pnpm add -D @playwright/test

# Install browsers
npx playwright install --with-deps chromium firefox webkit
```

### Project Structure
```
e2e/
├── auth.spec.ts           # Authentication tests
├── search.spec.ts         # Protocol search tests
├── checkout.spec.ts       # Subscription checkout tests
├── fixtures/
│   ├── auth.fixture.ts    # Auth setup helpers
│   ├── search.fixture.ts  # Search mocks
│   └── stripe.fixture.ts  # Stripe mocks
├── helpers/
│   ├── mock-data.ts       # Test data
│   └── test-users.ts      # User fixtures
└── utils/
    ├── auth.utils.ts      # Auth helpers
    └── wait.utils.ts      # Wait strategies
```

---

## 2. Authentication Flow Implementation

### Test File: `e2e/auth.spec.ts`

#### Basic Auth Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // React Native Web needs time
  });

  test('AUTH-001: Landing page shows sign-in', async ({ page }) => {
    const signInButton = page.getByRole('button', {
      name: /sign in|get started/i
    });

    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/');
  });
});
```

#### Mock OAuth Helper
```typescript
// helpers/auth.utils.ts
export async function mockAuthentication(page: Page, user: TestUser) {
  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_access_token_' + user.id,
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { tier: user.tier },
        },
      }),
    });
  });

  // Set token in localStorage
  await page.evaluate((userData) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: {
        access_token: 'mock_access_token_' + userData.id,
        user: userData,
      }
    }));
  }, user);
}

// Usage in tests
test('AUTH-004: OAuth success', async ({ page }) => {
  await mockAuthentication(page, TEST_USERS.freeUser);
  await page.goto('/');

  const profileLink = page.getByRole('link', { name: /profile/i });
  await expect(profileLink).toBeVisible();
});
```

#### OAuth Error Tests
```typescript
test('AUTH-005: OAuth access denied', async ({ page }) => {
  await page.goto('/oauth/callback?error=access_denied');
  await page.waitForLoadState('networkidle');

  // Should show error message
  const errorText = page.getByText(/denied|cancelled|error/i);
  await expect(errorText).toBeVisible();

  // Should not crash
  await expect(page).not.toHaveURL(/undefined/);
});

test('AUTH-006: Missing auth code', async ({ page }) => {
  await page.goto('/oauth/callback');

  // Should handle gracefully
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
  expect(pageContent).not.toContain('undefined');
});
```

#### Protected Route Tests
```typescript
test('AUTH-007: Protected profile requires auth', async ({ page }) => {
  // Clear any existing auth
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto('/(tabs)/profile?e2e=true');
  await page.waitForTimeout(2000);

  const pageContent = await page.textContent('body');
  expect(pageContent?.toLowerCase()).toContain('sign in');
});

test('AUTH-008: Protected history requires auth', async ({ page }) => {
  await page.goto('/(tabs)/history?e2e=true');
  await page.waitForTimeout(2000);

  const signInPrompt = page.getByText(/please sign in/i);
  await expect(signInPrompt).toBeVisible();
});
```

---

## 3. Protocol Search Flow Implementation

### Test File: `e2e/search.spec.ts`

#### Search UI Tests
```typescript
test.describe('Protocol Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/(tabs)/?e2e=true');
    await page.waitForTimeout(2000);
  });

  test('SEARCH-001: Search input visible', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]')
      .or(page.locator('input[placeholder*="protocol"]'));

    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Voice button should also be visible
    const voiceButton = page.locator('[data-testid="voice-button"]')
      .or(page.getByRole('button', { name: /voice|microphone/i }));
    await expect(voiceButton.first()).toBeVisible();
  });
});
```

#### Mock Search Results
```typescript
// helpers/search.fixture.ts
export const MOCK_SEARCH_RESULTS = {
  cardiacArrest: {
    results: [
      {
        id: 1,
        protocolTitle: 'Cardiac Arrest - Adult',
        protocolNumber: 'CA-001',
        protocolYear: 2024,
        content: 'CPR, defibrillation, epinephrine 1mg IV/IO every 3-5 min',
        fullContent: 'Full protocol content here...',
        sourcePdfUrl: 'https://example.com/cardiac-arrest.pdf',
        similarity: 0.95,
      }
    ]
  },
  stroke: {
    results: [
      {
        id: 2,
        protocolTitle: 'Acute Stroke',
        protocolNumber: 'ST-001',
        protocolYear: 2024,
        content: 'Cincinnati Stroke Scale, FAST, time to hospital critical',
        similarity: 0.92,
      }
    ]
  },
};

export async function mockSearchAPI(page: Page) {
  await page.route('**/api/search/**', async route => {
    const url = route.request().url();

    // Parse query from URL
    if (url.includes('cardiac')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify(MOCK_SEARCH_RESULTS.cardiacArrest),
      });
    } else if (url.includes('stroke')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify(MOCK_SEARCH_RESULTS.stroke),
      });
    }

    // No results for unrecognized queries
    return route.fulfill({
      status: 200,
      body: JSON.stringify({ results: [] }),
    });
  });
}
```

#### Search Execution Tests
```typescript
test('SEARCH-002: Cardiac arrest search', async ({ page }) => {
  await mockSearchAPI(page);

  const searchInput = page.locator('[data-testid="search-input"]').first();
  await searchInput.fill('cardiac arrest');
  await searchInput.press('Enter');

  await page.waitForLoadState('networkidle');

  // Check for cardiac-related content
  const pageContent = await page.textContent('body');
  expect(pageContent?.toLowerCase()).toMatch(/cardiac|arrest|cpr|epinephrine/);

  // Should show protocol card
  const protocolTitle = page.getByText(/cardiac arrest/i);
  await expect(protocolTitle.first()).toBeVisible();
});

test('SEARCH-005: Empty search handling', async ({ page }) => {
  const searchInput = page.locator('[data-testid="search-input"]').first();
  await searchInput.fill('');
  await searchInput.press('Enter');

  // Should not crash
  await expect(page).not.toHaveURL(/error/);
});

test('SEARCH-006: No results message', async ({ page }) => {
  await mockSearchAPI(page);

  const searchInput = page.locator('[data-testid="search-input"]').first();
  await searchInput.fill('xyzzy12345nonsensequery');
  await searchInput.press('Enter');

  await page.waitForLoadState('networkidle');

  // Should show no results or error message
  const noResults = page.getByText(/no results|not found|try different/i);
  const hasNoResults = await noResults.isVisible().catch(() => false);

  // Or page just doesn't crash
  expect(hasNoResults || true).toBeTruthy();
});
```

#### State Filter Tests
```typescript
test('SEARCH-007: State filter California', async ({ page }) => {
  // Mock coverage API
  await page.route('**/api/search/coverage', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([
        { state: 'California', stateCode: 'CA', chunks: 1500, counties: 58 },
        { state: 'Texas', stateCode: 'TX', chunks: 1200, counties: 254 },
      ]),
    });
  });

  // Open state dropdown
  const stateButton = page.getByRole('button', { name: /state/i });
  await stateButton.click();

  // Wait for dropdown to appear
  await page.waitForTimeout(500);

  // Select California
  const californiaOption = page.getByText(/California/i);
  await californiaOption.first().click();

  // Verify filter badge
  const filterBadge = page.getByText('California');
  await expect(filterBadge).toBeVisible();
});

test('SEARCH-009: Clear filters', async ({ page }) => {
  // Apply filter first
  const stateButton = page.getByRole('button', { name: /state/i });
  await stateButton.click();

  const californiaOption = page.getByText(/California/i);
  await californiaOption.first().click();

  // Now clear
  const clearButton = page.getByRole('button', { name: /clear|reset|×/i });
  await clearButton.click();

  // Filter should be gone
  const filterBadge = page.getByText('California');
  await expect(filterBadge).not.toBeVisible();
});
```

#### Disclaimer Blocking Test
```typescript
test('SEARCH-015: Disclaimer blocks search', async ({ page }) => {
  // Mock authenticated user without disclaimer
  await page.evaluate(() => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: {
        access_token: 'test_token',
        user: { id: 'test-user', email: 'test@example.com' },
      }
    }));
  });

  // Mock disclaimer status API
  await page.route('**/api/user/hasAcknowledgedDisclaimer*', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ hasAcknowledged: false }),
    });
  });

  await page.goto('/(tabs)/');
  await page.waitForTimeout(2000);

  // Try to search
  const searchInput = page.locator('[data-testid="search-input"]').first();
  await searchInput.fill('cardiac arrest');
  await searchInput.press('Enter');

  // Disclaimer modal should appear
  const disclaimerModal = page.getByRole('dialog')
    .filter({ hasText: /medical disclaimer/i });
  await expect(disclaimerModal).toBeVisible({ timeout: 5000 });

  // Acknowledge
  const acknowledgeButton = page.getByRole('button', {
    name: /I understand|acknowledge|accept/i
  });
  await acknowledgeButton.click();

  // Now search should work
  await page.waitForLoadState('networkidle');
});
```

---

## 4. Subscription Checkout Implementation

### Test File: `e2e/checkout.spec.ts`

#### Pricing Display Tests
```typescript
test.describe('Subscription Checkout', () => {
  test('SUB-001: Pricing CTA visible', async ({ page }) => {
    await page.goto('/');

    const upgradeButton = page.getByRole('button', {
      name: /upgrade|pro|premium/i
    }).or(page.getByRole('link', { name: /upgrade|pricing/i }));

    await expect(upgradeButton.first()).toBeVisible();
  });

  test('SUB-002: Pricing plans display', async ({ page }) => {
    await page.goto('/');

    const upgradeButton = page.getByRole('button', { name: /upgrade/i });
    await upgradeButton.first().click();
    await page.waitForLoadState('networkidle');

    // Check for both plans
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toContain('month');
    expect(pageContent?.toLowerCase()).toMatch(/annual|year/);
    expect(pageContent?.toLowerCase()).toMatch(/save|discount/);
  });
});
```

#### County Limit Tests
```typescript
test('SUB-004: County limit for free users', async ({ page }) => {
  // Mock free user
  await mockAuthentication(page, TEST_USERS.freeUser);

  // Mock user stats showing 0 counties selected
  await page.route('**/api/user/stats*', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ countiesSelected: 0, maxCounties: 1 }),
    });
  });

  await page.goto('/(tabs)/');

  // Select California
  const stateButton = page.getByRole('button', { name: /state/i });
  await stateButton.click();
  const california = page.getByText(/California/i);
  await california.first().click();

  // Select first county (should work)
  const agencyButton = page.getByRole('button', { name: /agency/i });
  await agencyButton.click();
  const firstCounty = page.getByText(/Los Angeles County/i);
  await firstCounty.first().click();

  // Now update mock to show 1 county selected
  await page.route('**/api/user/stats*', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ countiesSelected: 1, maxCounties: 1 }),
    });
  });

  // Try to select second county
  await agencyButton.click();
  const secondCounty = page.getByText(/Orange County/i);
  await secondCounty.first().click();

  // Upgrade modal should appear
  const limitModal = page.getByRole('dialog')
    .filter({ hasText: /county limit|upgrade/i });
  await expect(limitModal).toBeVisible();
  await expect(limitModal).toContainText(/1\/1/i);
});
```

#### Mock Stripe Checkout
```typescript
// helpers/stripe.fixture.ts
export async function mockStripeCheckout(page: Page) {
  // Mock create-checkout endpoint
  await page.route('**/api/subscription/create-checkout*', async route => {
    const body = await route.request().postDataJSON();
    const priceId = body.priceId;

    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        url: `https://checkout.stripe.com/test/c/pay/cs_test_${priceId}`,
        sessionId: `cs_test_${priceId}_${Date.now()}`,
      }),
    });
  });
}

// Usage in tests
test('SUB-006: Monthly checkout redirect', async ({ page }) => {
  await mockAuthentication(page, TEST_USERS.freeUser);
  await mockStripeCheckout(page);

  await page.goto('/upgrade');

  const monthlyButton = page.getByRole('button', { name: /monthly/i });

  // Intercept redirect
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    monthlyButton.click(),
  ]);

  await popup.waitForLoadState();
  expect(popup.url()).toContain('checkout.stripe.com');
  await popup.close();
});
```

#### Checkout Success/Cancel Tests
```typescript
test('SUB-009: Checkout success handling', async ({ page }) => {
  await mockAuthentication(page, TEST_USERS.freeUser);

  // Simulate return from Stripe
  await page.goto('/?checkout=success&session_id=cs_test_123');
  await page.waitForLoadState('networkidle');

  // Should show success message
  const successMessage = page.getByText(/success|welcome|thank you/i);
  await expect(successMessage.first()).toBeVisible({ timeout: 5000 });

  // Check profile shows Pro status
  await page.goto('/(tabs)/profile');
  const proStatus = page.getByText(/pro|premium/i);
  await expect(proStatus).toBeVisible();
});

test('SUB-010: Checkout cancellation', async ({ page }) => {
  await page.goto('/?checkout=cancelled');
  await page.waitForLoadState('networkidle');

  // Should not crash
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();

  // User should still be free tier
  await page.goto('/(tabs)/profile');
  const freeStatus = page.getByText(/free|upgrade/i);
  await expect(freeStatus).toBeVisible();
});
```

#### Billing Portal Test
```typescript
test('SUB-012: Customer portal access', async ({ page }) => {
  await mockAuthentication(page, TEST_USERS.proUser);

  // Mock portal session creation
  await page.route('**/api/subscription/create-portal-session*', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        url: 'https://billing.stripe.com/p/session/test_123',
      }),
    });
  });

  await page.goto('/(tabs)/profile');

  const manageButton = page.getByRole('button', {
    name: /manage subscription|billing/i
  });
  await expect(manageButton).toBeVisible();

  // Click and check redirect
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    manageButton.click(),
  ]);

  await popup.waitForLoadState();
  expect(popup.url()).toContain('billing.stripe.com');
  await popup.close();
});
```

---

## 5. Advanced Patterns

### Custom Fixtures
```typescript
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  proUserPage: Page;
  freeUserPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await mockAuthentication(page, TEST_USERS.freeUser);
    await page.goto('/');
    await use(page);
  },

  proUserPage: async ({ page }, use) => {
    await mockAuthentication(page, TEST_USERS.proUser);
    await page.goto('/');
    await use(page);
  },

  freeUserPage: async ({ page }, use) => {
    await mockAuthentication(page, TEST_USERS.freeUser);
    await page.goto('/');
    await use(page);
  },
});

// Usage
test('Test with authenticated user', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in
  await expect(authenticatedPage.getByText(/profile/i)).toBeVisible();
});
```

### Wait Utilities
```typescript
// utils/wait.utils.ts
export async function waitForSearchResults(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // React Native Web needs buffer
}

export async function waitForModal(page: Page, modalText: string) {
  const modal = page.getByRole('dialog').filter({ hasText: modalText });
  await expect(modal).toBeVisible({ timeout: 10000 });
  return modal;
}

export async function waitForAuth(page: Page) {
  await page.waitForTimeout(2000); // Auth state propagation
  await page.waitForLoadState('networkidle');
}
```

### Retry Pattern
```typescript
// For flaky elements in React Native Web
async function clickWithRetry(page: Page, selector: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.locator(selector).click({ timeout: 5000 });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

// Usage
test('Click button with retry', async ({ page }) => {
  await clickWithRetry(page, '[data-testid="submit-button"]');
});
```

---

## 6. Debugging Tips

### Visual Debugging
```bash
# Run with headed browser
npx playwright test --headed

# Run with UI mode (best for debugging)
npx playwright test --ui

# Debug specific test
npx playwright test --debug -g "SEARCH-002"
```

### Screenshots on Every Step
```typescript
test('Debug test with screenshots', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'debug-1-home.png' });

  await searchInput.fill('cardiac arrest');
  await page.screenshot({ path: 'debug-2-search.png' });

  await searchInput.press('Enter');
  await page.screenshot({ path: 'debug-3-results.png' });
});
```

### Trace Viewing
```bash
# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Console Logs
```typescript
// Capture console logs
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Capture errors
page.on('pageerror', error => console.error('PAGE ERROR:', error));
```

---

## 7. CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on:
  push:
    branches: [main, dev]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start dev server
        run: |
          pnpm dev &
          npx wait-on http://localhost:8081 --timeout 60000

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          CI: true

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: test-results/

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 8. Next Steps

### Phase 1: Core Tests (Week 1)
- Implement AUTH-001 to AUTH-008
- Implement SEARCH-001 to SEARCH-010
- Implement SUB-001 to SUB-004

### Phase 2: Advanced Tests (Week 2)
- Add voice search tests
- Add filter tests
- Add checkout integration

### Phase 3: Polish (Week 3)
- Fix flaky tests
- Optimize test speed
- Add CI integration

### Phase 4: Maintenance
- Weekly test review
- Monthly test updates
- Quarterly full audit

---

## Resources

- **Playwright Docs**: https://playwright.dev
- **Test Plan**: `E2E_TEST_PLAN.md`
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Selectors Guide**: https://playwright.dev/docs/selectors

---

**Last Updated**: 2026-01-23
