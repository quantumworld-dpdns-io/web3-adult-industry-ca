import { test, expect } from '@playwright/test';

test.describe('Credentials Management', () => {
  test('should show empty state', async ({ page }) => {
    await page.goto('/credentials');
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('should open issue credential dialog', async ({ page }) => {
    await page.goto('/credentials');
    await page.click('text=Issue Credential');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should open credential form with correct fields', async ({ page }) => {
    await page.goto('/credentials');
    await page.click('text=Issue Credential');
    await expect(page.locator('text=Credential Type')).toBeVisible();
    await expect(page.locator('text=Issuer DID')).toBeVisible();
    await expect(page.locator('text=Subject DID')).toBeVisible();
  });
});
