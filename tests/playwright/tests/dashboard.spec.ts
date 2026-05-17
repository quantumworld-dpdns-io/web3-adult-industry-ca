import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load dashboard page with stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('[data-testid="stats-card"]')).toHaveCount(4);
  });

  test('should navigate to credentials page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Credentials');
    await expect(page).toHaveURL('/credentials');
  });

  test('should navigate to DIDs page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=DIDs');
    await expect(page).toHaveURL('/dids');
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Analytics');
    await expect(page).toHaveURL('/analytics');
  });
});
