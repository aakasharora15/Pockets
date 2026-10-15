import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'password123';

/** Taps a PIN key (they're labels wrapping a hidden switch, so a click is a real tap). */
export async function typePin(page: Page, pin: string) {
  for (const d of pin) await page.locator(`.pin-key[aria-label="${d}"]`).click();
}

/** Signs in with email and password and sets this device's PIN, ending on Home. */
export async function signIn(page: Page, email: string, pin = '1234') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.pin-title')).toHaveText(/Set an app PIN/);
  await typePin(page, pin);
  await typePin(page, pin);
  await expect(page.locator('.deck-front')).toBeVisible();
}

/**
 * Reopens the app as if it was last used more than 5 minutes ago: back-dates the "last seen" mark and
 * stops this page from refreshing it on the way out, then reloads.
 */
export async function reopenLater(page: Page) {
  await page.evaluate(() => {
    const seen = JSON.parse(localStorage.getItem('spendr.lastSeen') ?? 'null') as { uid: string } | null;
    if (seen) localStorage.setItem('spendr.lastSeen', JSON.stringify({ uid: seen.uid, at: Date.now() - 6 * 60 * 1000 }));
    Storage.prototype.setItem = () => {};
  });
  await page.reload();
}
