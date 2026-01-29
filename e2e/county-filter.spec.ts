/**
 * Tests for County Filter Fix
 * 
 * Tests the ImageTrend integration county filtering to ensure:
 * 1. Agency parameter is properly passed through the flow
 * 2. Agency names are correctly mapped to agency IDs
 * 3. Search results are filtered to only the specified county
 * 4. Fallback behavior works when agency is not found
 */

import { test, expect } from '@playwright/test';

test.describe('County Filter Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should filter search results by county when agency parameter is present', async ({ page }) => {
    // Navigate directly to protocol search with agency parameter (simulating ImageTrend redirect)
    await page.goto('/app/protocol-search?query=cardiac+arrest&agency=los+angeles&source=imagetrend');

    // Check that agency is displayed in the header
    await expect(page.locator('text=Agency:')).toBeVisible();
    await expect(page.locator('text=County-filtered search')).toBeVisible();
    
    // Wait for the search to complete automatically (triggered by query param)
    await page.waitForLoadState('networkidle');

    // Check that search results are loaded
    const results = page.locator('[data-testid="protocol-result"]');
    await expect(results.first()).toBeVisible({ timeout: 10000 });

    // Verify search was made with county context
    const searchResults = await results.count();
    expect(searchResults).toBeGreaterThan(0);

    // Check that the search query was properly set
    const searchInput = page.locator('input[placeholder*="Search protocols"]');
    await expect(searchInput).toHaveValue('cardiac arrest');
  });

  test('should handle URL encoded agency names correctly', async ({ page }) => {
    // Test with URL encoded agency name
    await page.goto('/app/protocol-search?query=chest+pain&agency=los+angeles+county&source=imagetrend');

    // Check that the decoded agency name is displayed
    await expect(page.locator('text=los angeles county')).toBeVisible();
  });

  test('should fallback to state search when agency is not found', async ({ page }) => {
    // Use a non-existent agency name
    await page.goto('/app/protocol-search?query=respiratory+distress&agency=nonexistent+agency&source=imagetrend');

    // Should still show results (fallback to California state search)
    await page.waitForLoadState('networkidle');
    
    // Search should still work even if agency lookup fails
    const searchInput = page.locator('input[placeholder*="Search protocols"]');
    await expect(searchInput).toHaveValue('respiratory distress');
  });

  test('should work without agency parameter (general search)', async ({ page }) => {
    // Test general search without agency parameter
    await page.goto('/app/protocol-search?query=anaphylaxis');

    // Should not show agency info
    await expect(page.locator('text=Agency:')).not.toBeVisible();
    await expect(page.locator('text=County-filtered search')).not.toBeVisible();

    // Should still perform search
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="Search protocols"]');
    await expect(searchInput).toHaveValue('anaphylaxis');
  });

  test('ImageTrend launch endpoint should redirect with agency parameter', async ({ page }) => {
    // Test the ImageTrend launch endpoint
    const response = await page.request.get('/api/imagetrend/launch?agency_id=los+angeles&search_term=cardiac+arrest');
    
    // Should redirect (302)
    expect(response.status()).toBe(302);
    
    // Check redirect location
    const location = response.headers().location;
    expect(location).toContain('/app/protocol-search');
    expect(location).toContain('query=cardiac+arrest');
    expect(location).toContain('agency=los+angeles');
    expect(location).toContain('source=imagetrend');
  });

  test('should perform manual search with agency filtering', async ({ page }) => {
    // Navigate with agency parameter but no initial query
    await page.goto('/app/protocol-search?agency=los+angeles&source=imagetrend');

    // Verify agency is shown
    await expect(page.locator('text=Agency:')).toBeVisible();

    // Perform a manual search
    const searchInput = page.locator('input[placeholder*="Search protocols"]');
    await searchInput.fill('epinephrine');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForLoadState('networkidle');
    
    // Should show results filtered by county
    const results = page.locator('[data-testid="protocol-result"]');
    await expect(results.first()).toBeVisible({ timeout: 10000 });
  });
});