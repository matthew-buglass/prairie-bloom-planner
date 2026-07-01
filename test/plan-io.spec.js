const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { openClean, assertInvariants } = require('./helpers');

// Import / export / PDF scaffold. Mirrors prompt 5 in test/monkey_testing.md.
// Export uses a real download event; import uses setInputFiles with an in-memory
// buffer (no temp files); PDF stubs window.print so headless never blocks on the
// native print dialog and we assert the rebuilt #printDoc instead.

async function firstSpeciesIds(page, n) {
  return page.evaluate((count) => SPECIES.slice(0, count).map(s => s.id), n);
}

test.describe('Plan I/O', () => {
  test('export writes a JSON plan with the expected shape', async ({ page }) => {
    await openClean(page);
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#starterBtn');
    await page.fill('#planName', 'My test bed');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportBtn'),
    ]);
    expect(download.suggestedFilename()).toBe('my-prairie-plan.json');

    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(data.tool).toBe('Prairie Bloom Planner');
    expect(data.name).toBe('My test bed');
    expect(data.location).toContain('Saskatoon');
    expect(Object.keys(data.plants).length).toBeGreaterThan(0);
    // species[] and plants{} must agree.
    expect([...data.species].sort()).toEqual(Object.keys(data.plants).sort());
  });

  test('import round-trips a valid plan file', async ({ page }) => {
    await openClean(page);
    const [a, b] = await firstSpeciesIds(page, 2);
    const buffer = Buffer.from(JSON.stringify({
      name: 'Imported bed',
      plants: { [a]: 2, [b]: 5 },
    }));

    await page.click('button.tab[data-tab="plan"]');
    await page.setInputFiles('#importFile', { name: 'plan.json', mimeType: 'application/json', buffer });

    await expect(page.locator('#toast')).toHaveText('Imported 2 species');
    await expect(page.locator('#planBadge')).toHaveText('2');
    await expect(page.locator('#planName')).toHaveValue('Imported bed');
    await assertInvariants(page);
  });

  test('malformed JSON is rejected and leaves the plan untouched', async ({ page }) => {
    await openClean(page);
    await page.locator('#cardGrid [data-toggle]').first().click();
    await expect(page.locator('#planBadge')).toHaveText('1');

    await page.click('button.tab[data-tab="plan"]');
    await page.setInputFiles('#importFile', {
      name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ not valid json'),
    });

    await expect(page.locator('#toast')).toHaveText("Couldn't read that file");
    await expect(page.locator('#planBadge')).toHaveText('1');
    await assertInvariants(page);
  });

  test('a file with no known species ids is rejected', async ({ page }) => {
    await openClean(page);
    await page.locator('#cardGrid [data-toggle]').first().click();
    await expect(page.locator('#planBadge')).toHaveText('1');

    await page.click('button.tab[data-tab="plan"]');
    await page.setInputFiles('#importFile', {
      name: 'unknown.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ plants: { 'not-a-real-species': 3 } })),
    });

    await expect(page.locator('#toast')).toHaveText('No matching species in that file');
    await expect(page.locator('#planBadge')).toHaveText('1');
    await assertInvariants(page);
  });

  test('PDF export rebuilds #printDoc with the plant-list table', async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await openClean(page);
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#starterBtn');
    await page.fill('#planName', 'Printable bed');
    await page.click('#pdfBtn');

    const table = page.locator('#printDoc table.pd-table');
    await expect(table).toHaveCount(1);
    await expect(table.locator('thead th', { hasText: 'Tags' })).toHaveCount(1);
    // Edible/Toxic pill renders beside at least one species name.
    expect(await page.locator('#printDoc .pd-tag').count()).toBeGreaterThan(0);
    // Print filename derives from the plan name.
    expect(await page.title()).toContain('Printable bed');
  });

  test('PDF export on an empty plan is guarded', async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await openClean(page);
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#pdfBtn');

    await expect(page.locator('#toast')).toHaveText('Add some species to your plan first');
    await expect(page.locator('#printDoc table.pd-table')).toHaveCount(0);
  });
});
