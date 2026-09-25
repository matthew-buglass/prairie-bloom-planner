const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test, expect } = require('@playwright/test');

// Page-less unit tests for the pure half of js/bubble.js. data.js and bubble.js
// run in one vm context, like consecutive <script> tags, so their top-level
// const/let/function globals are visible to later run() calls.
const ctx = vm.createContext({});
for (const f of ['js/data.js', 'js/bubble.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
// Evaluate an expression in the app context and return it as plain JSON.
const run = expr => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, ctx));

test.describe('radiusAt', () => {
  const s = yearsToFlower => `({maxSpreadCm:60, yearsToFlower:${yearsToFlower}})`;
  test('starts at a third of mature spread in year 1', () => {
    expect(run(`radiusAt(${s(3)}, 1)`)).toBeCloseTo(10);
  });
  test('grows linearly to full size by its first flowering year', () => {
    expect(run(`radiusAt(${s(3)}, 2)`)).toBeCloseTo(20);
    expect(run(`radiusAt(${s(3)}, 3)`)).toBeCloseTo(30);
  });
  test('stays at full size after its first flowering year', () => {
    expect(run(`radiusAt(${s(3)}, 5)`)).toBeCloseTo(30);
  });
  test('species that flower in year 1 are full size from year 1', () => {
    expect(run(`radiusAt(${s(1)}, 1)`)).toBeCloseTo(30);
  });
});

test.describe('isBlooming', () => {
  const s = '({bloom:[5,6], yearsToFlower:2})';
  test('true in a bloom month once the plant has reached flowering age', () => {
    expect(run(`isBlooming(${s}, 5, 2)`)).toBe(true);
  });
  test('false outside the bloom months', () => {
    expect(run(`isBlooming(${s}, 7, 2)`)).toBe(false);
  });
  test('false before the plant reaches flowering age', () => {
    expect(run(`isBlooming(${s}, 5, 1)`)).toBe(false);
  });
});

// U shape, 300x300 with a 100-wide notch cut up from the bottom edge.
const U = '[[0,0],[300,0],[300,300],[200,300],[200,100],[100,100],[100,300],[0,300]]';

test.describe('polygonArea', () => {
  test('rectangle', () => {
    expect(run('polygonArea([[0,0],[400,0],[400,300],[0,300]])')).toBe(120000);
  });
  test('triangle', () => {
    expect(run('polygonArea([[0,0],[100,0],[0,100]])')).toBe(5000);
  });
  test('concave shape, either winding', () => {
    expect(run(`polygonArea(${U})`)).toBe(70000);
    expect(run(`polygonArea(${U}.reverse())`)).toBe(70000);
  });
});

test.describe('pointInPolygon', () => {
  test('inside the solid part of a concave shape', () => {
    expect(run(`pointInPolygon([50,200], ${U})`)).toBe(true);
    expect(run(`pointInPolygon([150,50], ${U})`)).toBe(true);
  });
  test('inside the notch counts as outside', () => {
    expect(run(`pointInPolygon([150,200], ${U})`)).toBe(false);
  });
  test('beyond the bounds', () => {
    expect(run(`pointInPolygon([400,50], ${U})`)).toBe(false);
  });
});

test.describe('overlaps', () => {
  test('flags centres closer than half the summed radii', () => {
    expect(run('overlaps({x:0,y:0,radius:10}, {x:9.99,y:0,radius:10})')).toBe(true);
  });
  test('does not flag at exactly the threshold', () => {
    expect(run('overlaps({x:0,y:0,radius:10}, {x:10,y:0,radius:10})')).toBe(false);
  });
});

test.describe('hexCluster', () => {
  const minGap = pts => {
    let m = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        m = Math.min(m, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
    return m;
  };
  test('returns exactly count points', () => {
    expect(run('hexCluster(0,0,0,10)')).toEqual([]);
    expect(run('hexCluster(5,7,1,10)')).toEqual([[5, 7]]);
    expect(run('hexCluster(0,0,19,10)')).toHaveLength(19);
  });
  test('first ring sits at spacing from the centre', () => {
    const pts = run('hexCluster(0,0,7,10)');
    for (const [x, y] of pts.slice(1)) expect(Math.hypot(x, y)).toBeCloseTo(10);
  });
  test('no two points closer than spacing, even for a large quantity', () => {
    const pts = run('hexCluster(0,0,999,20)');
    expect(pts).toHaveLength(999);
    expect(minGap(pts)).toBeGreaterThan(20 - 1e-6);
  });
});

const EMPTY = { yard: [], scale: 1000, originX: 0, originY: 0, plants: [] };

test.describe('sanitizeLayout', () => {
  test('non-objects become an empty layout', () => {
    expect(run('sanitizeLayout(null)')).toEqual(EMPTY);
    expect(run('sanitizeLayout("junk")')).toEqual(EMPTY);
  });
  test('a yard with fewer than 3 valid corners is dropped', () => {
    expect(run('sanitizeLayout({yard:[[0,0],[10,0],["a",1]]}).yard')).toEqual([]);
  });
  test('out-of-range scale falls back to the default', () => {
    expect(run('sanitizeLayout({scale:5}).scale')).toBe(1000);
    expect(run('sanitizeLayout({scale:2400}).scale')).toBe(2400);
  });
  test('drops unknown ids, bad coordinates, bad indices and duplicates; keeps negatives', () => {
    const out = run(`sanitizeLayout({plants:[
      {id:"crocus",plantNumber:0,x:1,y:2},
      {id:"crocus",plantNumber:0,x:9,y:9},
      {id:"nope",plantNumber:0,x:1,y:1},
      {id:"flax",plantNumber:0,x:NaN,y:1},
      {id:"flax",plantNumber:1.5,x:1,y:1},
      {id:"flax",plantNumber:2,x:-40,y:-12}
    ]}).plants`);
    expect(out).toEqual([
      { id: 'crocus', plantNumber: 0, x: 1, y: 2 },
      { id: 'flax', plantNumber: 2, x: -40, y: -12 },
    ]);
  });
});

const THREE_CROCUS_ONE_FLAX = `({yard:[], scale:1000, plants:[
  {id:"crocus",plantNumber:0,x:0,y:0},{id:"crocus",plantNumber:1,x:0,y:0},{id:"crocus",plantNumber:2,x:0,y:0},
  {id:"flax",plantNumber:0,x:0,y:0}]})`;

test.describe('syncLayout + unplacedIndices', () => {
  test('quantity decrease drops the highest indices; removed species go entirely', () => {
    expect(run(`syncLayout(${THREE_CROCUS_ONE_FLAX}, new Map([["crocus",2]])).plants.map(p=>p.id+":"+p.plantNumber)`))
      .toEqual(['crocus:0', 'crocus:1']);
  });
  test('quantity increase leaves the new plants unplaced', () => {
    expect(run(`unplacedIndices(syncLayout(${THREE_CROCUS_ONE_FLAX}, new Map([["crocus",5],["flax",1]])), "crocus", 5)`))
      .toEqual([3, 4]);
  });
  test('gaps from unplaced plants are reported', () => {
    expect(run(`unplacedIndices({plants:[{id:"crocus",plantNumber:0},{id:"crocus",plantNumber:2}]}, "crocus", 3)`)).toEqual([1]);
  });
});

// Crocus: 20 cm mature spread, first flowers in year 3, so radius 10 cm at year 3.
const BED = '[[0,0],[1000,0],[1000,1000],[0,1000]]'; // 100 m²

test.describe('analyzeLayout', () => {
  test('coverage and area for a plant inside the bed', () => {
    const a = run(`(a=>({coverage:a.coverage, areaM2:a.areaM2, outside:a.outside}))(
      analyzeLayout({yard:${BED}, scale:1000, plants:[{id:"crocus",plantNumber:0,x:500,y:500}]}, 3))`);
    expect(a.areaM2).toBe(100);
    expect(a.outside).toBe(0);
    expect(a.coverage).toBeCloseTo(Math.PI * 100 / 1e6);
  });
  test('plants outside the bed are flagged and not counted in coverage', () => {
    const a = run(`(a=>({flags:[...a.flags], outside:a.outside, coverage:a.coverage}))(
      analyzeLayout({yard:${BED}, scale:1000, plants:[{id:"crocus",plantNumber:0,x:2000,y:2000}]}, 3))`);
    expect(a.flags).toEqual(['crocus:0']);
    expect(a.outside).toBe(1);
    expect(a.coverage).toBe(0);
  });
  test('heavily overlapping plants are both flagged', () => {
    const a = run(`(a=>({flags:[...a.flags].sort(), crowded:a.crowded}))(
      analyzeLayout({yard:${BED}, scale:1000, plants:[{id:"crocus",plantNumber:0,x:500,y:500},{id:"crocus",plantNumber:1,x:505,y:500}]}, 3))`);
    expect(a.flags).toEqual(['crocus:0', 'crocus:1']);
    expect(a.crowded).toBe(2);
  });
  test('without a yard there is no outside check, area or coverage', () => {
    const a = run(`(a=>({outside:a.outside, areaM2:a.areaM2, coverage:a.coverage}))(
      analyzeLayout({yard:[], scale:1000, plants:[{id:"crocus",plantNumber:0,x:5,y:5}]}, 3))`);
    expect(a).toEqual({ outside: 0, areaM2: null, coverage: null });
  });
  test('a zero-area (collinear) yard reports null area and coverage, not NaN', () => {
    const a = run(`(a=>({areaM2:a.areaM2, coverage:a.coverage}))(
      analyzeLayout({yard:[[0,0],[100,0],[200,0]], scale:1000, plants:[{id:"crocus",plantNumber:0,x:50,y:0}]}, 3))`);
    expect(a).toEqual({ areaM2: null, coverage: null });
  });
});

test.describe('fitLayout', () => {
  test('an empty layout is returned unchanged', () => {
    expect(run('fitLayout(emptyLayout())')).toEqual(EMPTY);
  });
  test('moves the view onto a far-away yard without moving the data', () => {
    const src = '{yard:[[5000,5000],[5400,5000],[5400,5300]], scale:1000, originX:0, originY:0, plants:[{id:"crocus",plantNumber:0,x:5200,y:5100}]}';
    const out = run(`fitLayout(${src})`);
    expect(out.yard).toEqual([[5000, 5000], [5400, 5000], [5400, 5300]]);
    expect(out.plants).toEqual([{ id: 'crocus', plantNumber: 0, x: 5200, y: 5100 }]);
    const H = out.scale * 0.625;
    for (const [x, y] of out.yard) {
      expect(x).toBeGreaterThanOrEqual(out.originX); expect(x).toBeLessThanOrEqual(out.originX + out.scale);
      expect(y).toBeGreaterThanOrEqual(out.originY); expect(y).toBeLessThanOrEqual(out.originY + H);
    }
  });
});

test.describe('view origin', () => {
  test('sanitize defaults a missing or non-finite origin to 0 and keeps a valid one', () => {
    expect(run('(l=>[l.originX,l.originY])(sanitizeLayout({}))')).toEqual([0, 0]);
    expect(run('(l=>[l.originX,l.originY])(sanitizeLayout({originX:NaN, originY:"5"}))')).toEqual([0, 0]);
    expect(run('(l=>[l.originX,l.originY])(sanitizeLayout({originX:-250, originY:1200}))')).toEqual([-250, 1200]);
  });
  test('the viewBox starts at the origin', () => {
    expect(run('bubbleViewBox({scale:2000, originX:-100, originY:300})')).toBe('-100 300 2000 1250');
  });
});

test.describe('zoomAt', () => {
  const at = '{yard:[], plants:[], scale:1000, originX:0, originY:0}';
  // Fraction of the view where a point sits; zooming about it must not move it.
  const frac = (l, [x, y]) => [(x - l.originX) / l.scale, (y - l.originY) / (l.scale * 0.625)];
  test('zooming out keeps the point under the cursor fixed', () => {
    const out = run(`zoomAt(${at}, [500,300], 2)`);
    expect(out.scale).toBe(2000);
    const [fx, fy] = frac(out, [500, 300]);
    expect(fx).toBeCloseTo(0.5); expect(fy).toBeCloseTo(300 / 625);
  });
  test('zoom is clamped to 1-1000 m and still keeps the point fixed', () => {
    const out = run(`zoomAt(${at}, [250,100], 1e6)`);
    expect(out.scale).toBe(100000);
    const [fx] = frac(out, [250, 100]);
    expect(fx).toBeCloseTo(0.25);
    expect(run(`zoomAt(${at}, [0,0], 1e-6).scale`)).toBe(100);
  });
});

test.describe('grid and scale bar steps', () => {
  test('grid spacing widens as the view zooms out', () => {
    expect(run('[1000, 2600, 20000, 100000].map(gridStep)')).toEqual([100, 500, 1000, 5000]);
  });
  test('scale bar length suits the view width', () => {
    expect(run('[1000, 5000, 20000, 100000].map(scaleBarLen)')).toEqual([100, 500, 5000, 10000]);
  });
});

test.describe('persistence without localStorage', () => {
  test('layout loads empty and saving is a silent no-op', () => {
    expect(run('layout')).toEqual(EMPTY);
    expect(run('(saveLayout(), true)')).toBe(true);
  });
});

test.describe('huge view origins', () => {
  test('sanitize rejects an origin beyond 100 km', () => {
    expect(run('(l=>[l.originX,l.originY])(sanitizeLayout({originX:1e20, originY:-1e20}))')).toEqual([0, 0]);
    expect(run('(l=>[l.originX,l.originY])(sanitizeLayout({originX:1e7, originY:-1e7}))')).toEqual([1e7, -1e7]);
  });
  test('the grid still renders, without hanging, at an origin where float stepping stalls', () => {
    // A stalled `x += step` loop would never finish; the vm timeout turns that into a failure.
    const len = vm.runInContext('bubbleSVG({yard:[], plants:[], scale:1000, originX:2e18, originY:2e18}, 6, 3).length', ctx, { timeout: 2000 });
    expect(len).toBeGreaterThan(0);
  });
});
