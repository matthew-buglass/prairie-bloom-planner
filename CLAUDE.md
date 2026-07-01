# Prairie Bloom Planner — project brief

A self-contained, **offline static HTML** wildflower pollinator-garden planner for 31 prairie
species native to the Saskatoon, SK region (USDA Zone 3b). Runs from `file://` AND from static
hosting. No build step, no framework, no bundler.

## Hard constraints (do not break these)

- **No ES modules, no `fetch`, no JSON loading.** All of those break over `file://` (CORS / opaque
  origin). Everything is plain browser globals loaded via ordered classic `<script src>` tags.
- **No browser storage assumptions beyond `localStorage`**, and all `localStorage` access must stay
  wrapped in try/catch (it throws under `file://` in some engines).
- Keep the project **split** into HTML + `css/` + `js/` files. It used to be a single file; that is
  deprecated. Do not re-inline.
- **Do not modify the `photos/` folder** (images + `photos/credits.js`) unless explicitly asked.
  `photos/credits.js` is maintained by hand.

## File layout & load order

`index.html` is a thin shell: static markup + `<link rel="stylesheet">` +
ordered scripts. Body includes `#printDoc` (before scripts) and `#toast`.

Scripts load in dependency order — **this order matters**:
1. `photos/credits.js`  — photo credits (hand-maintained)
2. `js/data.js`   — pure data, no DOM: `COLORS, MONTHS, ICON, POLL_LABEL, SPECIES` (31 species),
   `byId, BUY, ABOUT, SRC` (citations), `EDTOX` (edible/toxic dataset)
3. `js/core.js`   — helpers + state: `cssVar/colHex`, `esc`, `creditHTML`, `firstBloom`,
   `loadPlan/savePlan/setQty` (`KEY`, `let plan`), `loadName/saveName` (`NAME_KEY`, `let planName`),
   `$/$$`, `toast`
4. `js/explore.js`— Explore tab: `state`, `buildFilterChips`, `matches`, `sortList`, `traitTagList`
   (shared {label,cls} list) + `traitTags` (renders pills), `srcHTML`, `edtoxHTML`, `describe`,
   `renderCards` (grid `#cardGrid`), `renderCalendar`
5. `js/plan.js`   — `renderPlan`, `renderAnalysis` (10 cards), `buildPrintDoc`
6. `js/app.js`    — `STARTER` (id→qty map), `refreshAll`, all event listeners, init. **Loads last.**

## Key feature notes

- **PDF export** = browser print engine (no libs). `buildPrintDoc()` rebuilds a hidden `#printDoc`
  on every plan change; `@media print` hides everything except `#printDoc`. User must enable
  "Background graphics" in the print dialog for colour fills. The plant-list table includes an
  Edible/Toxic pill beside the name AND a plain-text "Tags" column.
- **Edible/Toxic** lives in `EDTOX` (`id:{t,note,src:[label,url]}`); 7 toxic, 14 edible, 10 neither.
  Every tag is individually cited. `traitTagList` is the single source of truth so web pills and PDF
  text never drift.
- **Explore filters** are five independent (AND-combined) `<select>` fields: Edibility, Behaviour,
  Height, Soil moisture, Soil fertility — plus Search, Bloom colour, Attracts, Bloom month, Sort.
  Filter logic is in `matches()` in `explore.js`.
- **Field Notes** tab has lettered articles A–O, each `<article class="note">` with a `.sources`
  div of cited links.
- **Typography:** plain hyphens, not em-dashes (normalized project-wide). En-dashes are fine in
  numeric ranges. Punctuation in HTML text must be real UTF-8 or HTML entities — never literal
  JS-style `\uXXXX` escapes (they don't decode in HTML body text).

## Editing & verification workflow (please follow)

- Make surgical edits with exact-string matches (assert the anchor is present before replacing).
- After any JS change, syntax-check each file AND the concatenation (catches duplicate top-level
  `const`/`let`):
  ```bash
  for f in js/*.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'))" && echo OK $f; done
  node -e "new (require('vm').Script)(['js/data.js','js/core.js','js/explore.js','js/plan.js','js/app.js'].map(f=>require('fs').readFileSync(f,'utf8')).join('\n'))"
  ```
- For behaviour, load the page in jsdom and exercise the real DOM (click tabs/buttons, set selects,
  read rendered cards). Gotchas: top-level `const`/`let` globals (e.g. `SPECIES`, `EDTOX`) are NOT
  exposed as `window` properties — read them via `window.eval("JSON.stringify(EDTOX)")`. jsdom prints
  a harmless "scrollTo not implemented" on tab switch — filter it out. Stub/ignore `localStorage`
  errors (the app already try/catches them).
- After verifying, the deliverable is the edited file(s) in place. Leave `photos/` untouched.

## Conventions Matthew uses

- Saskatoon, SK; USDA Zone 3b. Region-specific framing throughout.
- The "Load starter plan" button uses `STARTER` (an id→quantity map). Quantities are tuned so the
  plan's own Nitrogen-balance check lands inside its 10–20% target band.