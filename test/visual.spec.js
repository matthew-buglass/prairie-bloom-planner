const { test, expect } = require('@playwright/test');
const { openClean } = require('./helpers');

// Visual snapshot regression. Baselines live in test/visual.spec.js-snapshots/
// and are platform-specific (Playwright suffixes them with the OS) - regenerate
// with:  npx playwright test visual --update-snapshots
//
// The visible page is date-independent (the only new Date() calls feed the
// export JSON and the print-only #printDoc, neither of which is on screen).
//
// We deliberately snapshot small, bounded regions, never full pages. Tall,
// text-dense surfaces (the 7600px Explore grid, the column-balanced Field Notes
// panel) drift by ~1px between runs - lazy-image .has-img toggles, CSS column
// balancing, glyph AA across thousands of characters - and tip past any sane
// pixel tolerance. Bounded element shots of the representative components
// (toolbar, one card, the table, one article) catch real CSS regressions and
// stay stable across runs and platforms.
const SHOT = { animations: 'disabled', maxDiffPixelRatio: 0.02 };

test.describe('Visual snapshots', () => {
  test('Explore card', async ({ page }) => {
    await openClean(page);
    // Collapse the card's banner photo: lazy loading toggles .has-img (9px <->
    // 132px) nondeterministically. The card structure/typography is what we
    // guard, not the photo.
    await page.addStyleTag({ content: `
      #cardGrid .card-banner { height: 9px !important; }
      #cardGrid .card-banner img { display: none !important; }
      #cardGrid .card-banner .banner-edge { height: 0 !important; }
      #cardGrid .card-banner .credit { display: none !important; }
    ` });
    await expect(page.locator('#cardGrid .card').first()).toHaveScreenshot('explore-card.png', SHOT);
  });

  test('Bloom calendar table', async ({ page }) => {
    await openClean(page);
    await page.click('button.tab[data-tab="calendar"]');
    await expect(page.locator('#panel-calendar table')).toHaveScreenshot('calendar.png', SHOT);
  });

  test('Plan analysis with starter plan', async ({ page }) => {
    await openClean(page);
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#starterBtn');
    await expect(page.locator('#analysis')).toHaveScreenshot('analysis.png', SHOT);
  });

  test('Field Notes article', async ({ page }) => {
    await openClean(page);
    await page.click('button.tab[data-tab="notes"]');
    // One article, not the whole #panel-notes: the panel is CSS column-balanced
    // and its total height is 1px-unstable between runs, which reflows the text
    // and fails the pixel diff. A single .note covers the typography + cited
    // .sources styling without the balancing fragility.
    await expect(page.locator('#panel-notes .note').first()).toHaveScreenshot('notes-article.png', SHOT);
  });
});
