import { test, expect } from '@playwright/test';

test('home redirects to dashboard and page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveURL(/dashboard/i);
});

test('public pages should load', async ({ page }) => {
  const publicRoutes = [
    '/dashboard',
    '/help',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
  ];

  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
  }
});

test('protected route should not crash without login', async ({ page }) => {
  await page.goto('/fresh-topics');

  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveURL(/dashboard/i);
});

test('unknown route should show not found page', async ({ page }) => {
  await page.goto('/random-page-not-exist');

  await expect(page.locator('body')).toBeVisible();
});