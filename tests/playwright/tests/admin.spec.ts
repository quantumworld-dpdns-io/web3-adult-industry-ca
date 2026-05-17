import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test('should load admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Admin Settings')).toBeVisible();
  });

  test('should show user management section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=User Management')).toBeVisible();
  });
});
