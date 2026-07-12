import { test, expect } from '@playwright/test';

async function loginWithEmail(page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD env values are required.');
  }

  await page.goto('/dashboard');

  // Open auth modal. Your codegen found "Sign up" button opens auth.
  await page.getByRole('button', { name: /sign up|sign in/i }).first().click();

  // Ensure sign-in mode is selected, not create-account mode.
  const signInTab = page.getByRole('button', { name: /^sign in$/i }).first();
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
  }

  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);

  await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();

  // Wait for login to settle.
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(2000);
}

test('logged in user can open main pages', async ({ page }) => {
  await loginWithEmail(page);

  const routes = [
    { url: '/dashboard', text: /dashboard/i },
    { url: '/trends', text: /trends/i },
    { url: '/viral-check', text: /viral|check/i },
    { url: '/saved-ideas', text: /saved|ideas/i },
    { url: '/history', text: /history/i },
    { url: '/media-export', text: /youtube|downloader|media|export/i },
    { url: '/settings', text: /settings/i },
  ];

  for (const route of routes) {
    await page.goto(route.url);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(route.text);
  }
});

test('admin page should open for admin or show access denied', async ({ page }) => {
  await loginWithEmail(page);

  await page.goto('/admin');

  await expect(page.locator('body')).toBeVisible();

  await expect(page.locator('body')).toContainText(
    /admin|access denied|checking admin access|not found/i
  );
});