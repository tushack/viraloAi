import { expect } from '@playwright/test';

export async function loginWithEmail(page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required.');
  }

  await page.goto('/dashboard');

  await page.getByRole('button', { name: /sign in/i }).click();

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder(/12–24 letters and numbers/i).fill(password);

  await page.getByRole('button', { name: /^sign in$/i }).click();

  await expect(page.locator('body')).toBeVisible();
}