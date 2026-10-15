import { expect, test } from '@playwright/test';
import { PASSWORD, reopenLater, signIn, typePin } from './helpers';

test('signs in, sets a PIN and shows Home with totals inside their cards', async ({ page }) => {
  await signIn(page, 'prernaa@example.com');
  await expect(page.locator('.tabbar')).toBeVisible();
  for (const card of await page.locator('.cur-card').all()) {
    const fits = await card.evaluate((c) => {
      const a = c.querySelector('.cur-card-amount') as HTMLElement;
      const pad = parseFloat(getComputedStyle(c).paddingLeft) + parseFloat(getComputedStyle(c).paddingRight);
      return a.scrollWidth <= c.clientWidth - pad + 1;
    });
    expect(fits).toBe(true);
  }
});

test('switches Pocket from the deck', async ({ page }) => {
  await signIn(page, 'prernaa@example.com');
  const front = page.locator('.deck-front .deck-name');
  const before = await front.textContent();
  const other = page.locator('.deck-card:not(.deck-add)').first();
  const target = await other.locator('.deck-card-name').textContent();
  await other.click();
  await expect(front).toHaveText(target!);
  expect(target).not.toBe(before);
});

test('adds an expense and shows it in Recent', async ({ page }) => {
  await signIn(page, 'aakash@example.com');
  await page.locator('.action-pill.primary').click();
  const sheet = page.locator('.expense-sheet');
  await expect(sheet).toBeVisible();
  const pound = sheet.getByRole('button', { name: /Pound/ });
  if (await pound.isVisible()) await pound.click();
  for (const k of ['4', '2']) await sheet.locator(`.amount-key[aria-label="${k}"]`).click();
  await expect(sheet.getByRole('button', { name: 'Amount' })).toContainText('42');
  // No category yet: Save asks for one first.
  await sheet.getByRole('button', { name: 'Save expense' }).click();
  await page.getByRole('menuitemradio', { name: /Groceries/ }).click();
  await sheet.getByRole('button', { name: 'Save expense' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.recent')).toContainText('£42.00');
});

test('reopening within 5 minutes skips the PIN', async ({ page }) => {
  await signIn(page, 'aakash@example.com', '8642');
  await page.reload();
  await expect(page.locator('.deck-front')).toBeVisible();
  await expect(page.locator('.pin-title')).toHaveCount(0);
});

test('locks when reopened after 5 minutes and unlocks with the PIN', async ({ page }) => {
  await signIn(page, 'aakash@example.com', '2468');
  await reopenLater(page);
  // The PIN comes first, not Home while the account loads.
  await expect(page.locator('.pin-title')).toHaveText(/Enter your PIN/);
  await expect(page.locator('.deck-front')).toHaveCount(0);
  await typePin(page, '1111');
  // A wrong PIN shakes and clears; wait for the empty dots before trying again.
  await expect(page.getByLabel('0 of 4 digits entered')).toBeVisible();
  await expect(page.locator('.pin-title')).toHaveText(/Enter your PIN/);
  await typePin(page, '2468');
  await expect(page.locator('.deck-front')).toBeVisible();
});

test('resets a forgotten PIN with the account password', async ({ page }) => {
  await signIn(page, 'aakash@example.com', '1357');
  await reopenLater(page);
  await page.locator('.pin-forgot').click();
  await expect(page.locator('.flow-title')).toHaveText('Reset your PIN');
  await page.getByLabel('Password').fill('not-the-password');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.helper.error')).toHaveText("That password isn't right.");
  await page.getByLabel('Password').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.pin-title')).toHaveText(/Set an app PIN/);
});

test('opens every tab and a Settings page (screens that load on demand)', async ({ page }) => {
  await signIn(page, 'prernaa@example.com');
  await page.getByRole('button', { name: 'Transactions' }).click();
  await expect(page.getByRole('button', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Settings' }).click();
  // The live screen, not the outgoing one's fading copy.
  await expect(page.locator('.tab-screen .page-title')).toHaveText('Settings');
  await page.getByText('Monthly budgets').click();
  await expect(page).toHaveURL(/\/settings\/budgets$/);
});
