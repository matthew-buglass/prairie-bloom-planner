const { test, expect } = require('@playwright/test');
const { openClean, trackErrors, assertInvariants } = require('./helpers');

// Monkey / fuzz spec. Implements the monkey prompt in test/monkey_testing.md:
// random actions, invariants + console errors re-checked after every step, the
// action sequence logged so any failure is reproducible.
//
//   MONKEY_SEED   fix the PRNG seed (default 1) - reuse it to replay a failure
//   MONKEY_STEPS  number of random actions (default 120)

const SEED = parseInt(process.env.MONKEY_SEED || '1', 10);
const STEPS = parseInt(process.env.MONKEY_STEPS || '120', 10);

// mulberry32: small, seeded, deterministic. Math.random would make failures
// impossible to reproduce.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TABS = ['explore', 'calendar', 'plan', 'notes'];
const SELECTS = ['#monthSel', '#edibSel', '#behavSel', '#heightSel', '#moistSel', '#fertSel', '#sortSel'];
const SEARCHES = ['', 'zzzz', 'blaz', 'clover', '<b>x</b>', '🌼', 'aster milkweed'];
const QTY_INPUTS = ['0', '-1', '999999', '1.5', 'abc', '', '3'];

test(`monkey: ${STEPS} random actions stay within invariants (seed ${SEED})`, async ({ page }) => {
  test.setTimeout(120_000);
  const rng = makeRng(SEED);
  const pick = arr => arr[Math.floor(rng() * arr.length)];

  // Auto-dismiss every dialog (Clear plan confirm), consume downloads, and
  // dismiss the import file chooser so nothing blocks the loop.
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('download', d => d.delete().catch(() => {}));
  page.on('filechooser', fc => fc.setFiles([]).catch(() => {}));
  await page.addInitScript(() => { window.print = () => {}; });

  const errors = trackErrors(page);
  await openClean(page);

  // Each action returns a short label for the reproduction log. Actions are
  // best-effort: a control that isn't on the current tab is skipped instantly
  // (isVisible() does not wait), so the loop never stalls. Only invariant
  // violations and console errors fail the test.
  const click = async (sel, label) => {
    const el = page.locator(sel).first();
    if (!(await el.isVisible())) return `skip ${label}`;
    await el.click({ timeout: 1500 }).catch(() => {});
    return label;
  };

  const actions = [
    async () => click(`button.tab[data-tab="${pick(TABS)}"]`, 'tab'),
    async () => click('#cardGrid [data-toggle]', 'toggle-card'),
    async () => click(pick(['[data-color]', '[data-attract]']), 'filter-chip'),
    async () => {
      const sel = pick(SELECTS);
      if (!(await page.locator(sel).isVisible())) return `skip select ${sel}`;
      const n = await page.locator(`${sel} option`).count();
      await page.selectOption(sel, { index: Math.floor(rng() * n) }, { timeout: 1500 }).catch(() => {});
      return `select ${sel}`;
    },
    async () => {
      if (!(await page.locator('#search').isVisible())) return 'skip search';
      await page.fill('#search', pick(SEARCHES), { timeout: 1500 }).catch(() => {});
      return 'search';
    },
    async () => click(pick(['[data-inc]', '[data-dec]']), 'qty-step'),
    async () => {
      const q = page.locator('.qty-in[data-qty]').first();
      if (!(await q.isVisible())) return 'skip qty-fill';
      await q.fill(pick(QTY_INPUTS), { timeout: 1500 }).catch(() => {});
      await q.blur().catch(() => {});
      return 'qty-fill';
    },
    async () => click('#starterBtn', 'starter'),
    async () => click('#clearPlan', 'clear'),
    async () => click('#exportBtn', 'export'),
    async () => click('#pdfBtn', 'pdf'),
  ];

  const log = [`seed=${SEED} steps=${STEPS}`];
  for (let i = 0; i < STEPS; i++) {
    const label = await pick(actions)();
    log.push(`${i}: ${label}`);
    try {
      await assertInvariants(page);
      expect(errors, 'no console / page errors').toEqual([]);
    } catch (err) {
      console.error('Monkey reproduction log:\n' + log.join('\n'));
      throw err;
    }
  }
});
