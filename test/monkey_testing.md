# Playwright regression / monkey testing prompts

Prompts for driving an agent (or yourself) through Playwright against Prairie Bloom Planner.
The app is offline static HTML, so point Playwright at the `file://` URL — no server needed.

```
file:///Users/mattb/Downloads/prairie-bloom-planner/index.html
```

## Setup the harness understands

- No build, no framework. The page is `index.html` + ordered `<script src>` tags.
- State persists in `localStorage` (plan + plan name). **Clear it between independent runs**
  (`page.evaluate(() => localStorage.clear())`) or runs leak into each other.
- `Clear plan` fires a native `confirm()` — register a dialog handler before clicking.
- `Export plan (PDF)` and `Export plan (.json)` open the browser print engine / a download.
  Assert via the `download` event or print path, don't expect a new tab.
- jsdom-style globals (`SPECIES`, `EDTOX`) are not on `window`. In Playwright read them with
  `page.evaluate(() => SPECIES.length)` etc.

## Selectors (stable anchors)

| Thing | Selector |
|---|---|
| Tab buttons | `button.tab[data-tab="explore\|calendar\|plan\|notes"]` |
| Active panel | `.panel.active` |
| Search | `#search` |
| Filter selects | `#monthSel #edibSel #behavSel #heightSel #moistSel #fertSel #sortSel` |
| Colour chips | `[data-color]` |
| Attracts chips | `[data-attract]` |
| Clear filters | `#clearFilters` |
| Result count | `#countLine` |
| Card grid | `#cardGrid` |
| Add/remove from card | `[data-toggle="<id>"]` |
| Plan badge | `#planBadge` |
| Starter plan | `#starterBtn` |
| Qty input / steppers | `.qty-in[data-qty]`, `[data-inc]`, `[data-dec]` |
| Remove row | `[data-remove="<id>"]` |
| Plan name | `#planName` |
| Analysis cards | `#analysis` |
| Calendar toggles | `#calAll`, `#calPlan` |
| Toast | `#toast` |

---

## Invariants (oracles) — true after ANY action

Feed these to the agent as the checks to assert after every interaction:

1. No uncaught console errors or page errors (filter the harmless jsdom `scrollTo` note only;
   in real Chromium there should be nothing).
2. Exactly one `.tab[aria-selected="true"]` and exactly one `.panel.active`, and they match.
3. `#planBadge` text equals the number of rows in the plan list equals `localStorage` plan size.
4. `#countLine` matches the number of cards rendered in `#cardGrid`.
5. Every visible card image either loaded or hit its `imgFallback` (no broken-image icon, no
   layout shift to zero-height banner).
6. No literal `\uXXXX`, `undefined`, `NaN`, or `[object Object]` rendered anywhere in the DOM text.
7. After a reload, the plan and plan name survive (localStorage round-trip).

---

## Structured regression prompts

### 1. Tab navigation
> Load the page from the file:// URL. Click each of the four tabs (Explore, Bloom Calendar, My
> Plan, Field Notes) in order, then in a random order 10 times. After each click assert exactly one
> active panel matching the selected tab, and zero console errors. Confirm the Field Notes tab
> renders lettered articles A–O each with a Sources block of links.

### 2. Explore filters
> On the Explore tab, exercise every filter independently and in combination: type queries in
> `#search` (including a no-match string like "zzzz" and a known hit like "blazingstar"), toggle each
> colour and attracts chip, and cycle every option of the five selects (`#edibSel #behavSel
> #heightSel #moistSel #fertSel`), `#monthSel`, and `#sortSel`. After each change assert `#countLine`
> equals the rendered card count and never goes negative. Then click `#clearFilters` and assert all
> 31 species are shown and every control is reset.

### 3. Build a plan by hand
> From Explore, add 5 species via their card `[data-toggle]` buttons. Assert `#planBadge` increments
> each time and a toast appears. Switch to My Plan. Change quantities via the number input and the
> +/- steppers, including pushing one qty to 1 and clicking minus again (must not go below 1).
> Remove one row. Assert the badge, the list, and `localStorage` stay in sync throughout, and that
> the 10 analysis cards in `#analysis` re-render without errors.

### 4. Starter plan + analysis
> Click `Load a balanced starter plan`. Assert the badge reflects the STARTER species count and the
> Nitrogen-balance analysis card lands inside its 10–20% target band. Reload the page and confirm the
> plan persists.

### 5. Import / export / PDF
> With a non-empty plan: name it via `#planName`, click `Export plan (.json)` and capture the
> download — assert it is valid JSON containing the plan. Then click `Import plan`, feed that same
> file back, and assert the plan is unchanged. Trigger `Export plan (PDF)` and assert `#printDoc` is
> rebuilt with the plant-list table (Edible/Toxic pill + Tags column) before the print dialog.

### 6. Calendar
> On Bloom Calendar, toggle `#calAll` / `#calPlan`. With an empty plan, "My plan only" should render
> an empty/zero-state without errors. With a plan loaded, the plan view should only show planned
> species. Assert `aria-pressed` flips correctly.

### 7. Persistence + clear
> Build a plan, set a name, reload — assert both survive. Click `Clear plan`, accept the confirm
> dialog, assert the plan empties and the badge reads 0. Reload and confirm it stays empty.

---

## Monkey / fuzz prompt

> Act as a monkey tester. Starting from the file:// URL with `localStorage` cleared, perform 200
> random actions drawn from: click a random tab, click a random visible card toggle, click a random
> filter chip, set a random option on a random select, type random text into `#search`, click a
> random +/- stepper or set a random number (including 0, negative, huge, and non-numeric) in a qty
> input, click starter/clear/export/import buttons. Auto-accept any dialog. After **every** action
> re-check all seven invariants above. Log the action sequence so any failure is reproducible, and
> stop and report on the first invariant violation or console error with the seed/step that caused
> it.

### Edge inputs worth forcing
- Qty input: `0`, `-1`, `999999`, `1.5`, `abc`, empty, paste.
- `#planName`: max-length (80) + emoji + HTML-ish text like `<b>x</b>` (assert it is escaped, not
  rendered).
- Import: a malformed JSON file and a JSON file with unknown species ids (must fail gracefully, no
  crash, no half-applied plan).
- Rapid double-clicks on add/remove and tab buttons (no duplicate rows, no stuck toast).
