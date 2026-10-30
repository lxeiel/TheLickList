# The Lick List — Frontend Redesign (Spec 1)

## Purpose

The public site works (map, list, status filter, search, pin/row selection)
but is unstyled: browser-default HTML, the "Create Next App" title, and the
stock Mapbox streets style. This spec gives the public site a designed,
minimal visual system and grows it from one page to three:

- **Map** (`/`): the existing homepage, redesigned, with a detail panel.
- **List** (`/list`): new. A sortable, filterable table of every restaurant,
  no map.
- **About** (`/about`): new. A short static page explaining the site.

Friends and family use the site about equally on phones ("where should we
eat?") and on desktop (browsing Lex's ratings and notes), so both layouts are
first-class.

### Out of scope

- **Stats / Highlights page.** Dropped on 2026-10-30; not planned.
- **Admin redesign.** `/admin/*` inherits the new fonts, colors and base
  styles from `globals.css` but gets no layout work. The only admin change is
  limiting rating to 1–10 (see Data).
- **Dishes and photos.** Phase 4 of the original spec. The layout leaves room
  for them (see Detail content) but renders nothing for them yet.
- **Per-restaurant pages (`/r/[id]`).** Possible later. `RestaurantDetail` is
  built so such a page can reuse it, and `?spot=` links cover sharing now.

### Success criteria

- Every public page matches the visual system below, in both day and night
  themes, at 375px phone width and at desktop width.
- A friend can open a shared link (`/?spot=…` or `/list?…filters…`) and land
  on exactly the same view.
- All text meets WCAG AA contrast; all controls are keyboard-operable with a
  visible focus ring; phone tap targets are at least 44×44px.

## Visual system

Style: minimal. Neutral surfaces, one deep emerald accent, 1px hairlines, no
decorative shadows. Personality comes from the copy ("Licked" / "Gotta Lick")
and the accent-coloured period in the wordmark, not from ornament.

### Color tokens

Defined as CSS custom properties in `app/globals.css`. Components use only
tokens, never raw hex.

| Token | Use | Day | Night |
|---|---|---|---|
| `--bg` | Page background | `#FBF7EE` cream | `#161616` charcoal |
| `--surface` | Panels, drawer, sheet, inputs | `#FFFDF8` | `#1E1E1E` |
| `--ink` | Primary text | `#141414` | `#EDEDED` |
| `--muted` | Secondary text | `#6F6A60` | `#8F8F8F` |
| `--line` | Decorative dividers only | `#E9E2D3` | `#2B2B2B` |
| `--line-strong` | Borders of controls (inputs, dropdowns, icon buttons) | `#948B79` | `#6B6B6B` |
| `--hover` | Selected row, segmented-control track, hover fill | `#F3EDDF` | `#232323` |
| `--accent` | Deep emerald: status marks, pins, primary button, focus ring | `#0B6B4F` | `#59C0A2` |
| `--on-accent` | Text on the primary button | `#FBF7EE` | `#161616` |
| `--map-land` / `--map-water` / `--map-park` / `--map-road` | Map recolor | `#F3EEE2` / `#DEE5E3` / `#E6EAD9` / `#FFFDF8` | `#1C1C1C` / `#121417` / `#1A1D1A` / `#2A2A2A` |

Measured contrast (against `--bg` unless noted):

| Pair | Day | Night | Requirement |
|---|---|---|---|
| `--ink` | 17.2:1 | 15.5:1 | 4.5:1 text |
| `--muted` | 5.0:1 (4.6:1 on `--hover`) | 5.6:1 (4.9:1 on `--hover`) | 4.5:1 text |
| `--accent` | 6.1:1 | 8.2:1 | 4.5:1 text |
| `--on-accent` on `--accent` | 6.1:1 | 8.2:1 | 4.5:1 text |
| `--line-strong` | 3.2:1 | 3.1:1 (on `--surface`) | 3:1 UI boundary |
| `--accent` on map land/water/park | ≥5.1:1 | ≥7.7:1 | 3:1 graphics |

`--line` (1.2:1) is used only where the boundary carries no meaning (row
dividers, section rules).

### Typography

- **Geist** for all text, **Geist Mono** for scores and other numbers in
  columns. Both are already loaded in `app/layout.tsx` via `next/font`.
- Scale: 12 (uppercase captions only) / 13 (meta) / 14 (UI, table) / 15 (row
  names, body) / 16 (inputs on phone, notes) / 22 (detail title) / 24 (page
  heading). Weights 400 body, 500 labels and scores, 600 headings.
- Nothing below 13px except uppercase captions. Phone inputs are 16px so iOS
  Safari does not zoom on focus.
- Notes: line-height 1.55, max line length about 70 characters.
- Text wraps rather than truncates. Long URLs in notes use
  `overflow-wrap: anywhere`.

### Spacing, radius, elevation

- Spacing scale (px): 4, 8, 12, 16, 24, 32. Rows use 12px vertical padding.
- Radius tokens: `--radius-sm` 6px (controls), `--radius-md` 10px (panels,
  map, table container), `--radius-lg` 16px (sheet, drawer).
- One shadow token, `--shadow-overlay`, used only on things that float above
  content: the map name label, the drawer, and the phone sheet.

### Status mark

One `StatusMark` component, three sizes (sm 8px, md 12px, pin 14px), fixed
2px stroke at sm/md and 2.5px at pin size.

- **Licked**: solid `--accent` dot.
- **Gotta Lick**: `--accent` ring with a **transparent, unfilled center**. On
  the map the map shows through; a 2px `--bg`-colored halo is drawn
  **outside** the ring only, so it reads on busy map areas. The center stays
  empty everywhere.
- Always paired with a text label in lists, tables and detail views (never
  color or shape alone). Map pins carry the label in their accessible name.

### Icons

Phosphor (`@phosphor-icons/react`), regular weight, one size token per
context (16px inline, 20px in buttons). Icons beside visible text are
`aria-hidden`; icon-only buttons have an `aria-label`. No emoji or Unicode
symbols as icons.

Icons used: `List` (hamburger), `X` (close), `Moon` / `Sun` (theme),
`ArrowLeft` (back), `ArrowUpRight` (external link), `CaretDown`
(dropdowns), `ArrowUp` / `ArrowDown` (sort direction), `Funnel` (filters),
`MagnifyingGlass` (search), `MapPin` (show on map).

### Theme (day / night)

- First visit follows the device (`prefers-color-scheme`).
- The ☾/☀ button (`Moon`/`Sun` icon) flips the theme and stores the choice in
  `localStorage` (`lick-theme` = `light` | `dark`). From then on the stored
  choice wins in that browser. There is deliberately no "back to automatic"
  control.
- The theme is applied as `data-theme` on `<html>`. A small inline script in
  `<head>` (`ThemeScript`) sets it before first paint so there is no flash of
  the wrong theme. All `localStorage` access is wrapped in try/catch; if it
  fails, the device setting is used.
- The button has `aria-label="Switch to dark mode"` / `"Switch to light
  mode"` (describing the action).

### Motion

- Shared durations: 150ms for hover/press, 220ms for drawer, sheet and menu
  entering (ease-out), 160ms leaving (ease-in). Map `flyTo` uses Mapbox's
  default.
- Only `transform` and `opacity` are animated.
- Under `prefers-reduced-motion: reduce`, drawer/sheet/menu transitions are
  instant and map moves use `jumpTo` instead of `flyTo`.

## Frame (every page)

### Desktop nav bar (≥ 768px)

Left: wordmark "The Lick List" with an accent-coloured period. Then nav links **Map ·
List · About** (the current page gets `--hover` background, `--ink` text, and
`aria-current="page"`). Far right: the theme button.

### Phone top bar (< 768px)

Wordmark on the left; theme button and hamburger (`List` icon) on the right,
both 44×44px tap targets.

- The hamburger opens a full-screen menu below the top bar: Map / List /
  About in 20px weight-600 text, one per row, the current page marked with a
  accent dot. The icon becomes `X`.
- The button has `aria-expanded` and `aria-controls`. Opening moves focus to
  the first link; Esc or `X` closes and returns focus to the hamburger;
  choosing a page closes the menu.

### Shared

- A visually hidden "Skip to content" link is the first focusable element. On
  the Map page it targets the list/panel column (skipping the map's pins).
- Each page sets its own title: "The Lick List" (Map), "List · The Lick
  List", "About · The Lick List". Site description: "Lex's Nomz Adventure".
- Viewport uses `dvh` units for full-height layouts; fixed bottom UI pads for
  `env(safe-area-inset-bottom)`.
- Focus ring on every interactive element: `outline: 2px solid
  var(--accent); outline-offset: 2px`, shown on `:focus-visible`.

## Filters (shared by Map and List)

### Controls

- **Status**: segmented control, All / Licked / Gotta Lick.
- **Search**: text input, case-insensitive substring match on name, cuisine
  tags and area (as now).
- **Cuisine**: multi-select of every cuisine tag present in the data.
- **Area**: multi-select of every area present in the data.
- **Price**: multi-select of $ / $$ / $$$ (only values present in the data).

All active filters combine with AND. Within one multi-select, options combine
with OR (Cuisine: Ramen + Noodles shows either).

Active cuisine/area/price values appear as removable chips under the filter
bar, followed by "Clear all". Chip remove buttons have a 44×44px hit area on
phone and an `aria-label` ("Remove filter: Central").

### URL state

Filters live in the query string so they survive switching pages and can be
shared:

| Param | Example | Notes |
|---|---|---|
| `status` | `tried` / `wishlist` | absent = All |
| `q` | `noodle` | search text |
| `cuisine` | `cuisine=Ramen&cuisine=Noodles` | repeatable |
| `area` | `area=Central` | repeatable |
| `price` | `price=$` | repeatable |
| `sort` | `rating` / `name` / `added` | List page only; absent = `added` |
| `dir` | `asc` / `desc` | List page only; absent = the sort's natural direction |
| `spot` | `<restaurant id>` | selected restaurant |

- Filter changes use `router.replace` (no history entries per keystroke;
  search input is debounced 200ms before writing to the URL).
- Selecting a restaurant uses `router.push`, so the browser back button
  deselects.
- Nav links to Map/List carry the current filter params (not `spot`, not
  `sort`/`dir` when going to Map).
- Unknown values are ignored (`?sort=banana` → default). A `cuisine` or
  `area` value that matches nothing in the data still shows as a chip so it
  can be removed.

### Result count

"N spots" above the list/table, in an `aria-live="polite"` region so screen
readers hear the new count when filters change.

## Map page (`/`)

### Desktop

- Below the nav: a slim filter bar with the status control, search, and a
  **Filters** button (`Funnel` icon) that opens a dropdown panel holding
  Cuisine, Area and Price. When any are active the button reads "Filters · 2"
  and the chips show beneath the bar.
- Below that, two columns filling the rest of the viewport height (the page
  itself does not scroll): **map** (≈55%) and the **right column** (≈45%,
  min 320px).
- The right column shows either:
  - **The list**: "N spots", then `RestaurantRow`s, scrolling inside the
    column. Rows show name and score on the first line; status mark + label,
    area, cuisine, price on the second.
  - **The detail panel** when a restaurant is selected: a back button
    ("← All spots", `ArrowLeft` + label, 14px, `--ink`, hover fill) at
    top-left, an `X` close button at top-right (both 44×44px hit areas,
    both deselect), then `RestaurantDetail`.

### Phone

- Below the top bar: status control, then search and a "Filters · n" button
  on one row (the button opens a sheet with Cuisine, Area, Price).
- The map fills the remaining screen behind a **bottom sheet**:
  - Nothing selected: the sheet sits at about 50% height and shows the list,
    scrolling inside the sheet.
  - Restaurant selected: the sheet shows the detail at about **60%** height,
    content scrolling inside it, and the map pans so the selected pin is
    centered in the visible map area above the sheet.
  - The sheet has a handle at the top that **toggles** between collapsed
    (about 20%, just the header and count) and its current height on tap.
    There is no drag gesture. The handle is a button with an `aria-label`
    ("Collapse list" / "Expand list").
  - The sheet pads for the safe-area inset.

### Selection

- Clicking a pin or a row selects that restaurant: the detail opens, the map
  flies to the pin (zoom 14), and a small name label appears above the pin
  (replacing the current Mapbox popup).
- Clicking the map background, the back button, `X`, or pressing Esc
  deselects. Focus returns to the row (or pin) that opened the detail.
- Restaurants without coordinates appear in the list with no pin; their
  detail says "No map location yet" and selecting them does not move the map.
- If a filter change hides the selected restaurant, the detail closes and
  `spot` is removed from the URL.
- A `?spot=` id that does not exist (or is filtered out on load) is removed
  from the URL silently; the list shows.

### Map

- `MapView` takes the current theme and uses Mapbox `light-v11` (day) or
  `dark-v11` (night). After each style load it recolors land, water, park
  and road layers with `setPaintProperty` to the `--map-*` tokens (read from
  computed styles so the tokens stay the single source).
- Pins are custom `<Marker>` children: a `<button>` containing a
  `StatusMark` at pin size, with `aria-label` like "Hill Street Tai Hwa,
  Licked, 9 out of 10". Selected pin: larger, with a soft accent halo
  (`color-mix` of `--accent` at 22%).
- Re-fit-to-pins on filter change, the zoom cap, and the existing
  scroll-isolation behavior from Phase 3 are kept.

## List page (`/list`)

### Desktop

- Heading "All spots" (24px) with the "N restaurants" count beside it.
- Filter bar: status control, search, then **Cuisine ▾ / Area ▾ / Price ▾**
  dropdowns inline (with a count when active, e.g. "Area · 1"). Chips and
  "Clear all" beneath.
- Table columns: **Name**, **Status**, **Area**, **Cuisine**, **Price**,
  **Score**, **Added**.
  - **Name**, **Score** and **Added** headers are buttons that sort (click
    again to flip direction); the active one shows an `ArrowUp`/`ArrowDown`
    icon and its `<th>` carries `aria-sort`. Default: Added, newest first.
  - Score: Geist Mono 14px weight 500, right-aligned, tabular figures.
    Licked + rated: `9/10`. Licked + unrated: `—`. Gotta Lick: empty.
    Sorting by score puts unscored restaurants last in either direction.
  - Status: `StatusMark` (sm) + label.
  - Added: muted, month and year ("Oct 2026"), from `created_at`.
  - The restaurant name is a `<button>` (keyboard focusable); clicking
    anywhere on the row also activates it.
- Clicking a row opens the **detail drawer** from the right (420px wide,
  `--surface`, `--shadow-overlay`, `--radius-lg` on the leading corners). It
  contains a back/close header (same as the Map panel) and
  `RestaurantDetail`, plus a **"Show on map"** link (`MapPin` icon) to
  `/?spot=<id>&…current filters` (hidden for restaurants without
  coordinates). The table stays visible behind it.
- The URL becomes `/list?spot=<id>&…`. The drawer's back button, `X`, Esc
  and the browser back button all close it; focus moves into the drawer on
  open and returns to the row's name button on close.

### Phone

- Heading and count, status control, search, then one row with "Filters · n"
  (opens a sheet with Cuisine, Area, Price) and a sort dropdown (Newest
  added / Highest rated / A–Z).
- Compact rows: name and score on line 1; status mark + label, area, cuisine
  on line 2 (wrapping as needed; price is left to the detail view).
- Tapping a row opens the detail as a bottom sheet at about 85% height (no
  map on this page, so there is nothing to keep visible), with the same
  back/close header.

## About page (`/about`)

Single column, max width 600px, same type and colors.

1. Heading "About" with the subtitle "Lex's Nomz Adventure".
2. Intro: two or three sentences on who Lex is and what the list is.
   Placeholder copy is drafted in the code for Lex to rewrite.
3. **How it works**: the Licked dot and Gotta Lick ring (unfilled) with one
   line each ("Licked — been there, eaten that", "Gotta Lick — on the
   wishlist"), "Scores are out of 10", "Price runs from $ to $$$".
4. Optional closing line (e.g. an Instagram link); omitted if Lex has none.

Content is static in `app/about/page.tsx` (no database).

## Detail content (`RestaurantDetail`)

Rendered identically inside the Map desktop panel, the Map phone sheet, the
List drawer and the List phone sheet; only the container differs.

1. Name (22px, weight 600, wraps).
2. Status mark + label · score (`9/10`, omitted for Gotta Lick) on one line.
3. Area · cuisine tags · price (each omitted when empty).
4. Notes (16px, line-height 1.55), omitted when empty.
5. Actions: **Open in Google Maps** (the one filled `--accent` button,
   `ArrowUpRight` icon; omitted when there is no `maps_url`), then each link
   from `links` as an outlined button labeled by type (Website / Instagram /
   Link). Links open in a new tab with `rel="noopener noreferrer"`.
6. "Added Oct 2026" in muted 13px.
7. On the List page only: **Show on map** (see above).
8. "No map location yet" in muted text when `lat`/`lng` are null (Map page
   only).

Phase 4 will add a Dishes section and a photo strip between Notes and
Actions; no placeholder is rendered for them now.

## Architecture

### Routes

| Route | Server component | Client component |
|---|---|---|
| `/` | `app/page.tsx` fetches restaurants | `MapPage` |
| `/list` | `app/list/page.tsx` fetches restaurants | `ListPage` |
| `/about` | `app/about/page.tsx` (static) | none |

Both data pages call the existing `listPublicRestaurants()` on the server; all
filtering, sorting and selection happen client-side, as today. Each gets an
`error.tsx` and a `loading.tsx`.

### Components

Each component has a co-located `*.module.css`. Shared tokens and base
styles live in `app/globals.css`.

| Component | Responsibility |
|---|---|
| `SiteNav` | Desktop nav bar; phone top bar with hamburger menu; active page |
| `ThemeToggle` | Theme button; writes `data-theme` and `localStorage` |
| `ThemeScript` | Inline `<head>` script applying the theme before paint |
| `FilterBar` | Status, search, cuisine/area/price, chips; `variant="map"` (Filters button) or `variant="list"` (inline dropdowns) |
| `MultiSelect` | The dropdown used for cuisine, area and price (and inside the phone filter sheet) |
| `StatusMark` | Dot or unfilled ring, sizes sm/md/pin, optional label |
| `RestaurantRow` | One compact row (Map list, phone List) |
| `RestaurantTable` | Desktop List table with sortable headers |
| `RestaurantDetail` | Detail content (above) |
| `DetailPanel` | Map desktop container (back + close + detail) |
| `DetailDrawer` | List desktop container (focus-managed overlay) |
| `BottomSheet` | Phone container with tap-toggle handle (Map list/detail, List detail, filter sheets) |
| `MapView` | Existing; gains custom pins, name label, theme styles and recolor |
| `MapPage` | Wires filters, selection, layout for `/` (replaces `HomeClient`) |
| `ListPage` | Wires filters, sort, selection, drawer for `/list` |

### Shared logic (`lib/`, no React)

- `lib/filters.ts`: parse filters from `URLSearchParams`, serialize them back,
  apply them to a restaurant array, and derive cuisine/area/price options
  from the data.
- `lib/sort.ts`: sort by added, rating (unscored last), and name.
- `lib/format.ts`: score text (`9/10` / `—` / empty), "Added Oct 2026".

### Dependencies

- Add `@phosphor-icons/react` (icons). Before use, confirm its import path for
  React Server Components under Next 16 / React 19.
- Add `vitest` (dev) for unit tests.
- No styling framework; CSS Modules are built into Next.

### Before implementation

`AGENTS.md` warns that this Next.js version differs from older ones. The
implementation plan must read the bundled docs in
`node_modules/next/dist/docs/` for: `useSearchParams` and `useRouter`
(client navigation and the Suspense boundary `useSearchParams` requires),
`error.tsx` / `loading.tsx`, metadata per route, `next/font`, and inline
scripts in the root layout.

## Data

No schema change in this spec.

- Rating is limited to whole numbers **1–10**: the admin form's rating input
  gets `min=1 max=10`, and `validateRestaurantInput` rejects values outside
  that range. Existing ratings outside 1–10, if any, still display as stored.

## Error handling and edge cases

- **Supabase fetch fails**: the route's `error.tsx` shows "Couldn't load the
  list right now" with a **Try again** button (calls `reset()`). Nav and
  theme still work.
- **Mapbox token missing or the map fails to load**: the map area shows "Map
  unavailable"; list and detail keep working. On phone, the sheet opens to
  full height so the list stays usable.
- **Unknown `?spot=` id**: removed from the URL silently.
- **Unknown filter/sort values**: ignored (see URL state).
- **No coordinates**: no pin; detail says "No map location yet"; "Show on
  map" hidden.
- **Missing fields**: each is omitted rather than shown blank.
- **No matches**: "Nothing matches — try another search" with a "Clear
  filters" button.
- **No restaurants at all**: "The list is empty, for now."
- **Loading**: `loading.tsx` renders the nav plus placeholder rows; the map
  area reserves its size so nothing shifts.

## Testing

- **Unit tests (Vitest)** for `lib/filters.ts`, `lib/sort.ts`,
  `lib/format.ts`: URL parse/serialize round-trips, AND across filters and
  OR within a multi-select, option derivation, unscored-last sorting in both
  directions, ignoring bad params, score formatting for each status/rating
  case. This replaces the original spec's "no automated tests" for this
  logic only; UI stays manually verified.
- **Manual browser checks** (built-in browser pane), each in day and night
  and at 375px and desktop widths:
  - Map: select from pin and from row; back, `X`, Esc and browser back; phone
    sheet heights and the pin staying visible; no-coordinates restaurant.
  - List: each sort header both directions; filters and chips; drawer open
    and close with focus return; "Show on map" carries filters.
  - Shared links: open a copied `?spot=…&area=…` URL in a fresh tab.
  - Keyboard-only pass over every page; reduced-motion on; theme persists
    across reloads; no theme flash on load.
  - Error states: missing Mapbox token; empty data.
- **Contrast** re-measured for every token pair after implementation.


> **Colour update (2026-10-27):** the accent changed from cobalt (`#2E4FD0` / `#7D95FF`) to deep emerald (`#0B6B4F` day, 6.1:1 on cream / `#59C0A2` night, 8.2:1 on charcoal). `lib/tokens.test.ts` re-checks every contrast pair; all pass.
