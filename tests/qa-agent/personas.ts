/**
 * Demo persona login helper. Hits POST /api/demo/login and stores the
 * demo_user cookie in the playwright context.
 */
import type { BrowserContext, Page } from '@playwright/test';
import { BASE_URL, PERSONAS, Role } from './config';

export async function loginAs(context: BrowserContext, role: Role): Promise<void> {
  // Use the request fixture against the live server to set the cookie.
  const res = await context.request.post(`${BASE_URL}/api/demo/login`, {
    data: { role },
    headers: { 'content-type': 'application/json' },
  });
  if (!res.ok()) throw new Error(`loginAs(${role}) failed: ${res.status()}`);
}

export async function gotoLanding(page: Page, role: Role): Promise<void> {
  const persona = PERSONAS[role];
  await page.goto(`${BASE_URL}${persona.landing}`, { waitUntil: 'domcontentloaded' });
}
