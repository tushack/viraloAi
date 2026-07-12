import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:5000';

test('backend API should respond', async ({ request }) => {
  const res = await request.get(`${API_BASE_URL}/`);

  expect(res.status()).toBe(200);

  const data = await res.json();

  expect(data.message).toMatch(/API is running/i);
});