import { test, expect } from '@playwright/test';

test('dashboard page loads', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('body')).toBeVisible();
});

test('public pages load', async ({ page }) => {
  const pages = ['/help', '/about', '/contact', '/terms', '/privacy'];

  for (const url of pages) {
    await page.goto(url);
    await expect(page.locator('body')).toBeVisible();
  }
});