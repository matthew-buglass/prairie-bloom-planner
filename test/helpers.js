const path = require('path');
const url = require('url');
const { expect } = require('@playwright/test');

// Absolute file:// URL to the app. The app is offline static HTML; there is no server.
const APP_URL = url.pathToFileURL(
  path.join(__dirname, '..', 'index.html')
).href;

/**
 * Start with a clean slate: load the page, clear localStorage, reload so the
 * app boots without leaked plan/name state.
 */
async function openClean(page) {
  await page.goto(APP_URL);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (_) { /* file:// can throw */ }
  });
  await page.reload();
}

/**
 * Collect console errors and uncaught page errors. Returns a live array; assert
 * it is empty at the end of a test (or after an action in the monkey loop).
 */
function trackErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return errors;
}

/**
 * The invariants from test/monkey_testing.md. Call after any interaction.
 */
async function assertInvariants(page) {
  // Exactly one selected tab and one active panel, and they match.
  const nav = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tab')];
    const selected = tabs.filter(t => t.getAttribute('aria-selected') === 'true');
    const panels = [...document.querySelectorAll('.panel.active')];
    return {
      selectedCount: selected.length,
      activeCount: panels.length,
      match: selected.length === 1 && panels.length === 1 &&
        panels[0].id === 'panel-' + selected[0].dataset.tab,
    };
  });
  expect(nav.selectedCount, 'one selected tab').toBe(1);
  expect(nav.activeCount, 'one active panel').toBe(1);
  expect(nav.match, 'selected tab matches active panel').toBe(true);

  // Plan badge == rendered plan rows == localStorage plan size.
  const plan = await page.evaluate(() => {
    const badge = parseInt(document.querySelector('#planBadge').textContent, 10) || 0;
    const rows = document.querySelectorAll('#planListWrap [data-remove]').length;
    let stored = 0;
    try {
      const raw = localStorage.getItem('prairie-plan-v1'); // KEY in js/core.js
      if (raw) stored = Object.keys(JSON.parse(raw)).length;
    } catch (_) { /* ignore */ }
    return { badge, rows, stored };
  });
  expect(plan.rows, 'plan rows match badge').toBe(plan.badge);
  expect(plan.stored, 'localStorage plan matches badge').toBe(plan.badge);

  // Result count line matches rendered cards (Explore tab only).
  const explore = await page.evaluate(() => {
    if (!document.querySelector('#panel-explore.active')) return null;
    const m = (document.querySelector('#countLine').textContent || '').match(/\d+/);
    return { stated: m ? parseInt(m[0], 10) : null, cards: document.querySelectorAll('#cardGrid .card').length };
  });
  if (explore && explore.stated !== null) {
    expect(explore.cards, 'count line matches card grid').toBe(explore.stated);
  }

  // No rendering leaks anywhere in the body text.
  const bodyText = await page.evaluate(() => document.body.innerText);
  for (const bad of ['undefined', 'NaN', '[object Object]', '\\u00']) {
    expect(bodyText, `no "${bad}" leaked into DOM`).not.toContain(bad);
  }
}

module.exports = { APP_URL, openClean, trackErrors, assertInvariants };
