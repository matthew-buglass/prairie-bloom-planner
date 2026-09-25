const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { APP_URL, trackErrors, assertInvariants } = require('./helpers');

// Tall viewport so the whole canvas and tray are on screen for mouse input. Reduced motion
// turns off the panel fade-in (translateY(4px)), which otherwise shifts the canvas while tests
// convert canvas cm to screen pixels.
test.use({ viewport: { width: 1280, height: 1100 }, contextOptions: { reducedMotion: 'reduce' } });

// 4 m x 3 m bed = 12 m². Crocus: 20 cm mature spread, first flowers in year 3, blooms Apr-Jun, purple.
const RECT = [[100, 100], [500, 100], [500, 400], [100, 400]];

async function openWith(page, plants, layout, tab = 'bubble') {
  await page.goto(APP_URL);
  await page.evaluate(([p, l]) => {
    localStorage.clear();
    localStorage.setItem('prairie-plan-v1', JSON.stringify(p));
    if (l) localStorage.setItem('prairie-layout-v1', JSON.stringify(l));
  }, [plants, layout]);
  await page.reload();
  if (tab) await page.click(`button.tab[data-tab="${tab}"]`);
}
const storedLayout = page =>
  page.evaluate(() => JSON.parse(localStorage.getItem('prairie-layout-v1')));
// Canvas centimetres -> viewport pixels, for page.mouse.
const clientPt = (page, x, y) => page.evaluate(([x, y]) => {
  const p = new DOMPoint(x, y).matrixTransform(document.querySelector('#bubbleSvg').getScreenCTM());
  return { x: p.x, y: p.y };
}, [x, y]);
const circles = page => page.locator('#bubbleSvg circle.bub');

test.describe('Bubble Diagram rendering', () => {
  test('empty plan shows the empty state', async ({ page }) => {
    await openWith(page, {}, null);
    await expect(page.locator('#bubHint')).toHaveText('Add plants in My Plan first.');
    await expect(circles(page)).toHaveCount(0);
    await assertInvariants(page);
  });

  test('renders placed circles, tray, and summary from stored state', async ({ page }) => {
    await openWith(page, { crocus: 2 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] });
    await expect(circles(page)).toHaveCount(1);
    await expect(page.locator('[data-drop="crocus"]')).toHaveText('Prairie Crocus - 1 of 2 unplaced');
    await expect(page.locator('#bubUnplaced')).toHaveText('1');
    await expect(page.locator('#bubOutside')).toHaveText('0');
    await expect(page.locator('#bubArea')).toHaveText('12.0 m²');
    await expect(page.locator('#bubbleSvg polygon.bub-yard')).toHaveCount(1);
    await assertInvariants(page);
  });

  test('year and month sliders change size and bloom colour', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] });
    const c = circles(page).first();
    // Defaults: June, year 3 -> full size, in bloom.
    await expect(c).toHaveAttribute('r', '10.0');
    await expect(c).toHaveAttribute('style', /var\(--c-purple\)/);
    // Year 1: a third of the size, and too young to flower even in a bloom month.
    await page.locator('#bubYear').fill('1');
    await expect(c).toHaveAttribute('r', '3.3');
    await expect(c).toHaveAttribute('style', /var\(--green\)/);
    await expect(page.locator('#bubYearLbl')).toHaveText('1');
    // Year 3 in August: full size, out of bloom.
    await page.locator('#bubYear').fill('3');
    await page.locator('#bubMonth').fill('8');
    await expect(page.locator('#bubMonthLbl')).toHaveText('Aug');
    await expect(c).toHaveAttribute('style', /var\(--green\)/);
  });

  test('crowded and outside-the-bed plants are flagged', async ({ page }) => {
    await openWith(page, { crocus: 3 }, { yard: RECT, scale: 1000, plants: [
      { id: 'crocus', plantNumber: 0, x: 300, y: 250 },
      { id: 'crocus', plantNumber: 1, x: 302, y: 250 },
      { id: 'crocus', plantNumber: 2, x: 800, y: 500 },
    ] });
    await expect(page.locator('#bubbleSvg circle.bub.flag')).toHaveCount(3);
    await expect(page.locator('#bubCrowded')).toHaveText('2');
    await expect(page.locator('#bubOutside')).toHaveText('1');
  });

  test('lowering a quantity in My Plan removes its circle', async ({ page }) => {
    await openWith(page, { crocus: 2 }, { yard: RECT, scale: 1000, plants: [
      { id: 'crocus', plantNumber: 0, x: 200, y: 200 }, { id: 'crocus', plantNumber: 1, x: 400, y: 200 },
    ] });
    await page.click('button.tab[data-tab="plan"]');
    await page.click('[data-dec="crocus"]');
    await page.click('button.tab[data-tab="bubble"]');
    await expect(circles(page)).toHaveCount(1);
    expect((await storedLayout(page)).plants).toEqual([{ id: 'crocus', plantNumber: 0, x: 200, y: 200 }]);
  });

  test('loading with a stored layout on another tab renders without errors', async ({ page }) => {
    const errors = trackErrors(page);
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] }, null);
    await expect(circles(page)).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('Fit to yard moves the view onto a far-away yard without moving it', async ({ page }) => {
    const far = [[5000, 5000], [5400, 5000], [5400, 5300]];
    await openWith(page, { crocus: 1 }, { yard: far, scale: 1000, plants: [] });
    await page.click('#bubFit');
    const lay = await storedLayout(page);
    expect(lay.yard).toEqual(far);
    for (const [x, y] of lay.yard) {
      expect(x).toBeGreaterThanOrEqual(lay.originX); expect(x).toBeLessThanOrEqual(lay.originX + lay.scale);
      expect(y).toBeGreaterThanOrEqual(lay.originY); expect(y).toBeLessThanOrEqual(lay.originY + lay.scale * 0.625);
    }
    await expect(page.locator('#bubbleSvg')).toHaveAttribute('viewBox', `${lay.originX} ${lay.originY} ${lay.scale} ${lay.scale * 0.625}`);
  });
});

test.describe('Bubble Diagram: draw yard', () => {
  test('click corners, then click the first corner to close', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    await page.click('#bubModeDraw');
    for (const [x, y] of [[100, 100], [500, 100], [300, 400]]) {
      const p = await clientPt(page, x, y);
      await page.mouse.click(p.x, p.y);
    }
    await expect(page.locator('#bubbleSvg polyline.bub-draft')).toHaveCount(1);
    await page.locator('#bubbleSvg circle.vtx.first').click();
    const lay = await storedLayout(page);
    expect(lay.yard).toHaveLength(3);
    expect(lay.yard[1][0]).toBeCloseTo(500, -1);
    await expect(page.locator('#bubbleSvg polygon.bub-yard')).toHaveCount(1);
    await expect(page.locator('#bubbleSvg polyline.bub-draft')).toHaveCount(0);
  });

  test('double-click closes the shape without adding a duplicate corner', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    await page.click('#bubModeDraw');
    for (const [x, y] of [[100, 100], [500, 100]]) {
      const p = await clientPt(page, x, y);
      await page.mouse.click(p.x, p.y);
    }
    const last = await clientPt(page, 300, 400);
    await page.mouse.dblclick(last.x, last.y);
    expect((await storedLayout(page)).yard).toHaveLength(3);
  });

  test('drag a corner to reshape', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('#bubModeDraw');
    const from = await clientPt(page, 100, 100);
    const to = await clientPt(page, 50, 60);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    const [x, y] = (await storedLayout(page)).yard[0];
    expect(x).toBeCloseTo(50, -1);
    expect(y).toBeCloseTo(60, -1);
  });

  test('clicking an edge handle inserts a corner at the midpoint', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('#bubModeDraw');
    await page.locator('#bubbleSvg circle.mid[data-i="0"]').click();
    const yard = (await storedLayout(page)).yard;
    expect(yard).toHaveLength(5);
    expect(yard[1]).toEqual([300, 100]);
  });

  test('right-click removes a corner, but never below 3', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('#bubModeDraw');
    await page.locator('#bubbleSvg circle.vtx[data-i="0"]').click({ button: 'right' });
    expect((await storedLayout(page)).yard).toHaveLength(3);
    await page.locator('#bubbleSvg circle.vtx[data-i="0"]').click({ button: 'right' });
    expect((await storedLayout(page)).yard).toHaveLength(3);
    await expect(page.locator('#toast')).toHaveText('A yard needs at least 3 corners');
  });

  test('Clear yard asks first, then removes the shape but keeps plants', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] });
    page.once('dialog', d => d.accept());
    await page.click('#bubClearYard');
    const lay = await storedLayout(page);
    expect(lay.yard).toEqual([]);
    expect(lay.plants).toHaveLength(1);
    await expect(page.locator('#bubModeDraw')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Bubble Diagram: arrange', () => {
  test('arming a tray row and clicking the canvas drops a spaced cluster', async ({ page }) => {
    await openWith(page, { crocus: 3 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('[data-drop="crocus"]');
    await expect(page.locator('#bubHint')).toHaveText('Click the canvas to place Prairie Crocus.');
    const p = await clientPt(page, 300, 250);
    await page.mouse.click(p.x, p.y);
    await expect(circles(page)).toHaveCount(3);
    await expect(page.locator('[data-drop="crocus"]')).toHaveCount(0);
    await expect(page.locator('#toast')).toHaveText('Placed 3 Prairie Crocus');
    const pts = (await storedLayout(page)).plants;
    expect(pts.map(q => q.plantNumber).sort()).toEqual([0, 1, 2]);
    // Spaced at mature spread (crocus maxSpreadCm 20).
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(20 - 1e-6);
  });

  test('arming from Draw mode switches to Arrange', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('#bubModeDraw');
    await page.click('[data-drop="crocus"]');
    await expect(page.locator('#bubModeArrange')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-drop="crocus"]')).toHaveClass(/armed/);
  });

  test('drag a circle to move it', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 200, y: 200 }] });
    const from = await clientPt(page, 200, 200);
    const to = await clientPt(page, 350, 300);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    const [p] = (await storedLayout(page)).plants;
    expect(p.x).toBeCloseTo(350, -1);
    expect(p.y).toBeCloseTo(300, -1);
  });

  test('dragging a circle onto the tray unplaces it', async ({ page }) => {
    await openWith(page, { crocus: 2 }, { yard: RECT, scale: 1000, plants: [
      { id: 'crocus', plantNumber: 0, x: 200, y: 200 }, { id: 'crocus', plantNumber: 1, x: 400, y: 200 },
    ] });
    const from = await clientPt(page, 200, 200);
    const tray = await page.locator('#bubbleTray').boundingBox();
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(tray.x + 20, tray.y + 10, { steps: 8 });
    await page.mouse.up();
    await expect(circles(page)).toHaveCount(1);
    await expect(page.locator('[data-drop="crocus"]')).toHaveText('Prairie Crocus - 1 of 2 unplaced');
    expect((await storedLayout(page)).plants.map(q => q.plantNumber)).toEqual([1]);
  });
});

async function importFile(page, obj) {
  await page.click('button.tab[data-tab="plan"]');
  await page.setInputFiles('#importFile', {
    name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)),
  });
}

test.describe('Bubble Diagram: export / import', () => {
  test('export includes the layout', async ({ page }) => {
    const plants = [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }];
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants }, 'plan');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(data.layout).toEqual({ yard: RECT, scale: 1000, originX: 0, originY: 0, plants });
    expect(data.plants).toEqual({ crocus: 1 });
  });

  test('import restores a layout', async ({ page }) => {
    await openWith(page, {}, null, null);
    await importFile(page, {
      plants: { crocus: 2 },
      layout: { yard: RECT, scale: 1200, plants: [{ id: 'crocus', plantNumber: 1, x: 250, y: 250 }] },
    });
    await expect(page.locator('#toast')).toHaveText('Imported 1 species');
    await page.click('button.tab[data-tab="bubble"]');
    await expect(circles(page)).toHaveCount(1);
    await expect(page.locator('#bubbleSvg')).toHaveAttribute('viewBox', '0 0 1200 750');
    await expect(page.locator('[data-drop="crocus"]')).toHaveText('Prairie Crocus - 1 of 2 unplaced');
  });

  test('an older file without a layout keeps the current layout', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] }, null);
    await importFile(page, { plants: { crocus: 1, flax: 2 } });
    await page.click('button.tab[data-tab="bubble"]');
    await expect(circles(page)).toHaveCount(1);
    expect((await storedLayout(page)).yard).toEqual(RECT);
  });

  test('layout circles for species not in the imported plan are dropped', async ({ page }) => {
    await openWith(page, {}, null, null);
    await importFile(page, {
      plants: { crocus: 1 },
      layout: { yard: RECT, scale: 1000, plants: [
        { id: 'crocus', plantNumber: 0, x: 200, y: 200 }, { id: 'flax', plantNumber: 0, x: 300, y: 200 },
      ] },
    });
    await page.click('button.tab[data-tab="bubble"]');
    await expect(circles(page)).toHaveCount(1);
    expect((await storedLayout(page)).plants.map(p => p.id)).toEqual(['crocus']);
  });
});

test.describe('Bubble Diagram: PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
  });

  test('adds a diagram page with caption and legend when a yard exists', async ({ page }) => {
    await openWith(page, { crocus: 2, flax: 1 }, { yard: RECT, scale: 1000, plants: [
      { id: 'crocus', plantNumber: 0, x: 200, y: 200 }, { id: 'flax', plantNumber: 0, x: 300, y: 200 },
    ] });
    await page.locator('#bubMonth').fill('7');
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#pdfBtn');
    const sec = page.locator('#printDoc .pd-bubble');
    await expect(sec).toHaveCount(1);
    await expect(sec.locator('.pd-cap')).toHaveText('July, Year 3');
    await expect(sec.locator('svg circle.bub')).toHaveCount(2);
    await expect(sec.locator('svg text.bub-num')).toHaveCount(2);
    await expect(sec.locator('.pd-legend li')).toHaveText(['Prairie Crocus', 'Wild Blue Flax']);
  });

  test('no yard, no diagram page', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: [], scale: 1000, plants: [{ id: 'crocus', plantNumber: 0, x: 200, y: 200 }] }, 'plan');
    await page.click('#pdfBtn');
    await expect(page.locator('#printDoc table.pd-table')).toHaveCount(1);
    await expect(page.locator('#printDoc .pd-bubble')).toHaveCount(0);
  });
});

test.describe('Bubble Diagram: review fixes', () => {
  test('an unknown species id in the stored plan does not block saving plan changes', async ({ page }) => {
    const errors = trackErrors(page);
    await openWith(page, { ghost: 1 }, null, 'plan');
    await page.click('#starterBtn');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('prairie-plan-v1')));
    expect(stored.crocus).toBe(3);
    await page.click('button.tab[data-tab="bubble"]');
    await expect(page.locator('[data-drop="crocus"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('a slow mouse drag on a corner moves it instead of deleting it', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    await page.click('#bubModeDraw');
    const from = await clientPt(page, 100, 100);
    const to = await clientPt(page, 50, 60);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    const yard = (await storedLayout(page)).yard;
    expect(yard).toHaveLength(4);
    expect(yard[0][0]).toBeCloseTo(50, -1);
  });
});

// Canvas point currently under a viewport pixel.
const canvasPt = (page, x, y) => page.evaluate(([x, y]) => {
  const p = new DOMPoint(x, y).matrixTransform(document.querySelector('#bubbleSvg').getScreenCTM().inverse());
  return [p.x, p.y];
}, [x, y]);

test.describe('Bubble Diagram: zoom and pan', () => {
  test('wheel zooms about the cursor and does not scroll the page', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    const p = await clientPt(page, 300, 200);
    await page.mouse.move(p.x, p.y);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 200);
    await expect.poll(async () => (await storedLayout(page)).scale).toBeGreaterThan(1200);
    const [x, y] = await canvasPt(page, p.x, p.y);
    expect(x).toBeCloseTo(300, -1);
    expect(y).toBeCloseTo(200, -1);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test('middle-drag pans the view', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 1000, plants: [] });
    const p = await clientPt(page, 300, 200);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(p.x + 100, p.y + 50, { steps: 5 });
    await page.mouse.up({ button: 'middle' });
    const lay = await storedLayout(page);
    expect(lay.originX).toBeLessThan(-50);
    expect(lay.originY).toBeLessThan(-25);
    expect(lay.yard).toEqual(RECT);
  });

  test('Space+drag pans in Draw mode without adding a corner', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    await page.click('#bubModeDraw');
    const p = await clientPt(page, 300, 200);
    await page.mouse.move(p.x, p.y);
    await page.keyboard.down('Space');
    await page.mouse.down();
    await page.mouse.move(p.x - 100, p.y, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    expect((await storedLayout(page)).originX).toBeGreaterThan(50);
    await expect(page.locator('#bubbleSvg polyline.bub-draft')).toHaveCount(0);
    await expect(page.locator('#bubbleSvg circle.vtx')).toHaveCount(0);
  });

  test('after zooming out, a yard larger than 10 m can be traced', async ({ page }) => {
    await openWith(page, { crocus: 1 }, { yard: [], scale: 4000, originX: 0, originY: 0, plants: [] });
    await page.click('#bubModeDraw');
    for (const [x, y] of [[200, 200], [3500, 200], [3500, 2200]]) {
      const p = await clientPt(page, x, y);
      await page.mouse.click(p.x, p.y);
    }
    await page.locator('#bubbleSvg circle.vtx.first').click();
    const yard = (await storedLayout(page)).yard;
    expect(yard).toHaveLength(3);
    expect(yard[1][0]).toBeCloseTo(3500, -2);
    await expect(page.locator('#bubbleSvg .bub-scale text')).toHaveText('5 m');
  });

  test('the PDF uses a fit-to-yard view, not the zoomed screen view', async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await openWith(page, { crocus: 1 }, { yard: RECT, scale: 150, originX: 280, originY: 230, plants: [{ id: 'crocus', plantNumber: 0, x: 300, y: 250 }] });
    await page.click('button.tab[data-tab="plan"]');
    await page.click('#pdfBtn');
    const vb = (await page.locator('#printDoc .pd-bubble-svg').getAttribute('viewBox')).split(' ').map(Number);
    const [originX, originY, w, h] = vb;
    for (const [x, y] of RECT) {
      expect(x).toBeGreaterThanOrEqual(originX); expect(x).toBeLessThanOrEqual(originX + w);
      expect(y).toBeGreaterThanOrEqual(originY); expect(y).toBeLessThanOrEqual(originY + h);
    }
  });
});

test.describe('Bubble Diagram: Space pan edge cases', () => {
  async function drawModeCornerAdds(page) {
    await page.click('#bubModeDraw');
    const p = await clientPt(page, 300, 200);
    await page.mouse.click(p.x, p.y);
    await expect(page.locator('#bubbleSvg circle.vtx')).toHaveCount(1);
  }

  test('releasing Space on another tab does not leave pan mode stuck on', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    const p = await clientPt(page, 300, 200);
    await page.mouse.move(p.x, p.y);
    await page.keyboard.down('Space');
    await page.click('button.tab[data-tab="plan"]');
    await page.keyboard.up('Space');
    await page.click('button.tab[data-tab="bubble"]');
    await drawModeCornerAdds(page);
  });

  test('switching windows while holding Space does not leave pan mode stuck on', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    const p = await clientPt(page, 300, 200);
    await page.mouse.move(p.x, p.y);
    await page.keyboard.down('Space');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await drawModeCornerAdds(page);
  });

  test('Space still presses a focused button when the pointer is off the canvas', async ({ page }) => {
    await openWith(page, { crocus: 1 }, null);
    await page.mouse.move(5, 5);
    await page.focus('#bubModeDraw');
    await page.keyboard.press('Space');
    await expect(page.locator('#bubModeDraw')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('Bubble Diagram is the 4th tab, before Field Notes', async ({ page }) => {
  await openWith(page, {}, null, null);
  const tabs = await page.locator('button.tab').evaluateAll(els => els.map(e => [e.dataset.tab, e.querySelector('.num').textContent]));
  expect(tabs).toEqual([['explore', '01'], ['calendar', '02'], ['plan', '03'], ['bubble', '04'], ['notes', '05']]);
});
