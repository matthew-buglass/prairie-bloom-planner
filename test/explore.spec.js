const { test, expect } = require('@playwright/test');
const { openClean, trackErrors, assertInvariants } = require('./helpers');

// Example scaffold. Mirrors the structured prompts in test/monkey_testing.md.
// Copy these patterns to flesh out plan, calendar, import/export, and PDF flows.

test.describe('Prairie Bloom Planner', () => {
  test('tab navigation keeps one active panel and stays error-free', async ({ page }) => {
    const errors = trackErrors(page);
    await openClean(page);

    for (const tab of ['calendar', 'plan', 'notes', 'explore']) {
      await page.click(`button.tab[data-tab="${tab}"]`);
      await expect(page.locator(`#panel-${tab}`)).toHaveClass(/active/);
      await assertInvariants(page);
    }
    expect(errors, 'no console / page errors').toEqual([]);
  });

  test('Clear filters resets to all 31 species', async ({ page }) => {
    await openClean(page);

    await page.fill('#search', 'zzzz-no-such-plant');
    await expect(page.locator('#cardGrid .card')).toHaveCount(0);

    await page.click('#clearFilters');
    await expect(page.locator('#cardGrid .card')).toHaveCount(31);
    await assertInvariants(page);
  });

  test('adding a species updates the badge and survives reload', async ({ page }) => {
    await openClean(page);

    const firstAdd = page.locator('#cardGrid [data-toggle]').first();
    await firstAdd.click();
    await expect(page.locator('#planBadge')).toHaveText('1');
    await assertInvariants(page);

    await page.reload();
    await expect(page.locator('#planBadge')).toHaveText('1');
    await assertInvariants(page);
  });

  test('starter plan lands the nitrogen balance inside its target band', async ({ page }) => {
    await openClean(page);

    await page.click('button.tab[data-tab="plan"]');
    await page.click('#starterBtn');
    await assertInvariants(page);

    // Nitrogen-balance card should report a fixer share within the 10–20% band.
    // The figure is rendered as "(NN%)" inside the card headed "Nitrogen balance".
    const card = page.locator('#analysis .acard', { hasText: 'Nitrogen balance' });
    const m = (await card.innerText()).match(/\((\d+)%\)/);
    expect(m, 'a fixer percentage is shown on the nitrogen card').not.toBeNull();
    const pct = parseInt(m[1], 10);
    expect(pct).toBeGreaterThanOrEqual(10);
    expect(pct).toBeLessThanOrEqual(20);
  });

  test('qty clamps to the 1–999 range', async ({ page }) => {
    await openClean(page);
    await page.locator('#cardGrid [data-toggle]').first().click();
    await page.click('button.tab[data-tab="plan"]');

    const qty = page.locator('.qty-in[data-qty]').first();
    await qty.fill('0');
    await qty.blur();
    await expect(qty).toHaveValue('1');

    await qty.fill('999999');
    await qty.blur();
    await expect(qty).toHaveValue('999');
    await assertInvariants(page);
  });
});
