# Frontend Redesign (Spec 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public site the minimal cream/cobalt design with a charcoal night theme, a nav bar, URL-backed filters shared by a redesigned Map page and a new List page, and a static About page.

**Architecture:** Pure, unit-tested logic in `lib/` (filters, sort, formatting, theme) feeds client components in `app/_components/`. Each data route (`/`, `/list`) is a server component that fetches every restaurant once with the existing `listPublicRestaurants()` and hands the array to a client page component. That component reads filters, sort and the selected restaurant from the URL and writes them back with `window.history.replaceState` / `pushState`, which Next.js syncs into `useSearchParams` without a server round trip. Styling is CSS custom properties in `app/globals.css` plus one CSS Module per component.

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents: true`), React 19.3, `react-map-gl` 8 + `mapbox-gl` 3, `@phosphor-icons/react` 2 (new), Vitest 5 (new, dev only), CSS Modules.

**Spec:** [docs/superpowers/specs/2026-10-27-frontend-redesign-design.md](../specs/2026-10-27-frontend-redesign-design.md). Read it alongside this plan; every visual value (colors, sizes, copy) comes from it.

## Global Constraints

- Colors only through the spec's tokens (`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--line-strong`, `--hover`, `--accent`, `--on-accent`, `--map-*`); no raw hex in any `*.module.css` or component.
- Day: `--bg #FBF7EE`, `--surface #FFFDF8`, `--ink #141414`, `--muted #6F6A60`, `--line #E9E2D3`, `--line-strong #948B79`, `--hover #F3EDDF`, `--accent #2E4FD0`, `--on-accent #FBF7EE`. Night: `#161616`, `#1E1E1E`, `#EDEDED`, `#8F8F8F`, `#2B2B2B`, `#6B6B6B`, `#232323`, `#7D95FF`, `#161616`. Map day land/water/park/road `#F3EEE2`/`#DEE5E3`/`#E6EAD9`/`#FFFDF8`; night `#1C1C1C`/`#121417`/`#1A1D1A`/`#2A2A2A`.
- Copy is exact: "Licked", "Gotta Lick", "All", "N spots", "← All spots" (`ArrowLeft` icon + "All spots"), "Open in Google Maps", "Show on map", "No map location yet", "Nothing matches — try another search", "Clear filters", "The list is empty, for now.", "Couldn't load the list right now", "Try again", "Map unavailable", "Added Oct 2026" format.
- "Gotta Lick" ring has a transparent, unfilled center everywhere; on map pins the halo is drawn outside the ring only.
- Icons are Phosphor only, no emoji or Unicode symbols as icons. In Client Components import from `@phosphor-icons/react`; in Server Components import from `@phosphor-icons/react/ssr`.
- Type: nothing below 13px except 12px uppercase captions; phone inputs 16px. Scores in Geist Mono with tabular figures.
- Spacing only from 4 / 8 / 12 / 16 / 24 / 32px; rows have 12px vertical padding. Radii only `--radius-sm` 6px, `--radius-md` 10px, `--radius-lg` 16px.
- Every interactive element shows `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`; phone tap targets ≥ 44×44px.
- Breakpoint: phone is `max-width: 767px`, desktop is `min-width: 768px`. Full-height layouts use `dvh`; fixed bottom UI pads `env(safe-area-inset-bottom)`.
- Only `transform`/`opacity` animate; durations 150ms (hover/press), 220ms ease-out (enter), 160ms ease-in (leave); none under `prefers-reduced-motion: reduce`, where map moves use `jumpTo`.
- URL writes use `window.history.replaceState` (filters, sort, deselect, re-select) or `pushState` (first selection) per the [Native History API docs](../../../node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md), not `router.replace`/`router.push`. This keeps the spec's behavior (back button deselects, no history entry per keystroke) without refetching Supabase on every change.
- Every server route that reads live data keeps `export const instant = false;` (established in Phase 1–3 under `cacheComponents`). Any Client Component calling `useSearchParams` sits inside a `<Suspense>` boundary.
- Error boundaries in this Next version receive `{ error: unknown; retry: () => void }` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`). The spec's "reset()" means this `retry()`.
- `/admin/*` gets no layout work. It only picks up `globals.css` and the rating 1–10 limit.
- Public reads stay on `listPublicRestaurants()` (anon client). No schema change.

## Review Focus

- **Restaurants with missing fields.** A restaurant with empty `cuisine_tags`, null `area`, null `price_range`, null `rating` or null `notes` must filter, sort, format and render without blanks or crashes, and must not add empty options to the filter menus. Pinned by `applyFilters ignores missing fields` and `deriveOptions skips empty values` (Task 2), `formatScore handles every status/rating combination` (Task 1), and `sortRestaurants puts unscored last in both directions` (Task 3).
- **Messy search and tag casing.** Search text with surrounding spaces or different case ("  RAMEN ") must still match, and tags that differ only by case ("ramen" and "Ramen") must appear once in the Cuisine menu and both match when selected. Pinned by `applyFilters trims and lowercases search` and `deriveOptions dedupes case-insensitively` (Task 2).
- **A shared link the current data no longer matches.** A `?spot=` id that doesn't exist or is filtered out, or `?sort=banana&status=maybe`, must land on a working default view with the bad params ignored. Pinned by `parseFilters ignores unknown values`, `findSpot returns null when absent or filtered out` (Task 2) and `parseSort falls back to defaults` (Task 3).
- **Browser storage blocked** (private mode, Safari ITP). The theme must still follow the device and the toggle must still flip the page without throwing. Pinned by `themeScript falls back to the device when localStorage throws` (Task 4).
- **Existing ratings outside 1–10.** Old data saved before the new limit must still display as stored ("12/10"), while new admin saves outside 1–10 are rejected. Pinned by `formatScore shows out-of-range ratings as stored` (Task 1) and the `validateRestaurantInput` rating tests (Task 1).

---

## File Structure

**New, pure logic (`lib/`, unit-tested with Vitest):**
- `lib/format.ts` (`.test.ts`): score text, accessible score label, "Added" month.
- `lib/filters.ts` (`.test.ts`): `Filters` type, URL parse/write, apply, option derivation, spot lookup, cross-page hrefs.
- `lib/sort.ts` (`.test.ts`): `Sort` type, URL parse/write, sorting.
- `lib/theme.ts` (`.test.ts`): theme constants and the inline pre-paint script source.
- `lib/tokens.test.ts`: reads `app/globals.css` and asserts the spec's contrast ratios.
- `vitest.config.ts`.

**New, components (`app/_components/`, the underscore keeps the folder out of routing):**
- `useUrlState.ts`: reads and writes filters, sort and spot in the URL.
- `useTheme.ts`, `useMediaQuery.ts`: small client hooks.
- `ThemeToggle.tsx`, `SiteNav.tsx`, `StatusMark.tsx`, `Sheet.tsx`, `CheckboxGroup.tsx`, `MultiSelect.tsx`, `FilterBar.tsx`, `RestaurantRow.tsx`, `RestaurantList.tsx`, `RestaurantDetail.tsx`, `DetailHeader.tsx`, `EmptyState.tsx`, `ListSkeleton.tsx`, `MapView.tsx` (moved from `app/MapView.tsx`), `mapTheme.ts`, `MapPage.tsx`, `RestaurantTable.tsx`, `ListPage.tsx`, `RouteError.tsx`, each with a co-located `*.module.css` where it has styles.

How the spec's container names map here: the Map page's **DetailPanel** is the right-hand pane in `MapPage`, which a CSS media query turns into the phone bottom sheet. **DetailDrawer** and the List page's phone sheet are one `Sheet` with `placement="responsive"`. **BottomSheet** for the filter menus is `Sheet` with `placement="sheet"`. The back and close controls shared by all of them are `DetailHeader`.

**New, routes:** `app/list/page.tsx`, `app/list/loading.tsx`, `app/list/error.tsx`, `app/about/page.tsx` (+ `.module.css`), `app/loading.tsx`, `app/error.tsx`.

**Modified:** `app/globals.css` (rewritten), `app/layout.tsx`, `app/page.tsx`, `lib/restaurants.ts` (rating validation), `app/admin/RestaurantForm.tsx` (rating input), `package.json`.

**Deleted:** `app/HomeClient.tsx` (replaced by `MapPage`), `app/RestaurantList.tsx` (replaced by `_components/RestaurantList`), `app/MapView.tsx` (moved).

---

### Task 1: Vitest, formatting helpers, rating 1–10

**Files:**
- Create: `vitest.config.ts`, `lib/format.ts`, `lib/format.test.ts`, `lib/restaurants.test.ts`
- Modify: `package.json` (add `"test": "vitest run"`, dev dep `vitest`), `lib/restaurants.ts` (`validateRestaurantInput`), `app/admin/RestaurantForm.tsx:176` (rating input)

**Interfaces:**
- Produces:
  - `formatScore(r: Pick<Restaurant, "status" | "rating">): string`
  - `scoreLabel(r: Pick<Restaurant, "status" | "rating">): string`
  - `formatAdded(createdAt: string): string`
  - `npm test` runs Vitest once.

- [ ] **Step 1: Install and configure Vitest.** Run `npm i -D vitest`. Create `vitest.config.ts` with `test.environment = "node"`, `test.include = ["lib/**/*.test.ts"]`, and `resolve.alias = { "@": <repo root> }` so `@/lib/...` imports resolve. Add the `test` script.

- [ ] **Step 2: Write the failing tests** in `lib/format.test.ts`:

```ts
test("formatScore handles every status/rating combination", () => {
  expect(formatScore({ status: "tried", rating: 9 })).toBe("9/10");
  expect(formatScore({ status: "tried", rating: null })).toBe("—");
  expect(formatScore({ status: "wishlist", rating: null })).toBe("");
  expect(formatScore({ status: "wishlist", rating: 7 })).toBe(""); // wishlist never shows a score
});
test("formatScore shows out-of-range ratings as stored", () => {
  expect(formatScore({ status: "tried", rating: 12 })).toBe("12/10");
});
test("scoreLabel is screen-reader friendly", () => {
  expect(scoreLabel({ status: "tried", rating: 9 })).toBe("9 out of 10");
  expect(scoreLabel({ status: "tried", rating: null })).toBe("not rated");
  expect(scoreLabel({ status: "wishlist", rating: null })).toBe("");
});
test("formatAdded is month and year in UTC", () => {
  expect(formatAdded("2026-10-27T10:00:00Z")).toBe("Oct 2026");
  expect(formatAdded("2026-11-01T00:30:00+08:00")).toBe("Oct 2026"); // still Oct in UTC
});
```

And in `lib/restaurants.test.ts`, built on a valid `RestaurantInput` fixture:

```ts
test.each([[0], [11], [-3]])("rejects rating %i", (rating) =>
  expect(validateRestaurantInput({ ...valid, rating })).toBe("Rating must be a whole number from 1 to 10"));
test.each([[1], [10], [null]])("accepts rating %s", (rating) =>
  expect(validateRestaurantInput({ ...valid, rating })).toBeNull());
test("rejects non-integer rating", () =>
  expect(validateRestaurantInput({ ...valid, rating: 7.5 })).toBe("Rating must be a whole number from 1 to 10"));
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL (`formatScore` not defined; rating 0/11 currently accepted).

- [ ] **Step 4: Implement.**
  - `lib/format.ts`: the three functions. `formatAdded` uses `Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })`, so server and client render the same text.
  - `validateRestaurantInput`: replace the integer check with one message covering non-integer and out-of-range.
  - `RestaurantForm`: rating input gets `min={1} max={10} step={1}`.

- [ ] **Step 5: Run `npm test`.** Expected: all PASS.

- [ ] **Step 6: Commit.**

```bash
git add vitest.config.ts package.json package-lock.json lib/format.ts lib/format.test.ts lib/restaurants.ts lib/restaurants.test.ts app/admin/RestaurantForm.tsx
git commit -m "Add Vitest, score/date formatting, and 1–10 rating validation"
```

### Task 2: Filter logic

**Files:**
- Create: `lib/filters.ts`, `lib/filters.test.ts`

**Interfaces:**
- Consumes: `Restaurant`, `RestaurantStatus` from `lib/restaurants.ts`
- Produces:
  - `type StatusFilter = "all" | RestaurantStatus`
  - `type Filters = { status: StatusFilter; q: string; cuisine: string[]; area: string[]; price: string[] }`
  - `const EMPTY_FILTERS: Filters`
  - `const FILTER_KEYS = ["status", "q", "cuisine", "area", "price"] as const`
  - `parseFilters(params: URLSearchParams): Filters`
  - `writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams`: returns a new object; replaces only `FILTER_KEYS` and leaves `spot`, `sort`, `dir` untouched; omits defaults (`status=all`, empty `q`, empty arrays).
  - `applyFilters(restaurants: Restaurant[], filters: Filters): Restaurant[]`
  - `type FilterOptions = { cuisine: string[]; area: string[]; price: string[] }`
  - `deriveOptions(restaurants: Restaurant[]): FilterOptions`
  - `activeFilterCount(filters: Filters): number`: cuisine + area + price selections only.
  - `findSpot(restaurants: Restaurant[], id: string | null): Restaurant | null`
  - `mapHref(params: URLSearchParams, spotId?: string): string`: `"/"` plus the filter keys only, plus `spot` when given.
  - `listHref(params: URLSearchParams): string`: `"/list"` plus the filter keys and `sort`/`dir`, never `spot`.

- [ ] **Step 1: Write the failing tests** in `lib/filters.test.ts`, using a small fixture of four restaurants that includes one with `cuisine_tags: []`, `area: null`, `price_range: null`, and tags `"Ramen"` and `"ramen"` on different restaurants:

```ts
test("parseFilters reads repeatable params", () => {
  expect(parseFilters(new URLSearchParams("status=tried&q=noodle&cuisine=Ramen&cuisine=Noodles&area=Central&price=$")))
    .toEqual({ status: "tried", q: "noodle", cuisine: ["Ramen", "Noodles"], area: ["Central"], price: ["$"] });
});
test("parseFilters ignores unknown values", () => {
  expect(parseFilters(new URLSearchParams("status=maybe&foo=bar")).status).toBe("all");
});
test("writeFilters round-trips and preserves other params", () => {
  const out = writeFilters(new URLSearchParams("spot=abc&sort=rating"), { ...EMPTY_FILTERS, status: "wishlist", area: ["East"] });
  expect(out.toString()).toBe("spot=abc&sort=rating&status=wishlist&area=East");
  expect(parseFilters(out)).toEqual({ ...EMPTY_FILTERS, status: "wishlist", area: ["East"] });
  expect(writeFilters(new URLSearchParams("status=tried"), EMPTY_FILTERS).toString()).toBe("");
});
test("applyFilters ANDs across filters and ORs within one", () => { /* status=tried + cuisine [Ramen, Noodles] returns exactly the tried restaurants tagged either */ });
test("applyFilters trims and lowercases search", () => { /* q "  RAMEN " matches name "Ramen House", tag "ramen", and area "Ramen Street" */ });
test("applyFilters ignores missing fields", () => { /* area filter ["Central"] excludes the null-area restaurant without throwing; q "x" doesn't throw on null area */ });
test("cuisine/area filter values match case-insensitively", () => { /* cuisine ["RAMEN"] matches both "Ramen" and "ramen" tags */ });
test("deriveOptions dedupes case-insensitively", () => { expect(deriveOptions(fixture).cuisine.filter((c) => c.toLowerCase() === "ramen")).toHaveLength(1); });
test("deriveOptions skips empty values and orders them", () => {
  const o = deriveOptions(fixture);
  expect(o.area).not.toContain(null); expect(o.price).toEqual(["$", "$$", "$$$"]); // shortest first
  expect(o.cuisine).toEqual([...o.cuisine].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
});
test("findSpot returns null when absent or filtered out", () => {
  expect(findSpot(fixture, "nope")).toBeNull(); expect(findSpot([], fixture[0].id)).toBeNull();
  expect(findSpot(fixture, null)).toBeNull(); expect(findSpot(fixture, fixture[0].id)).toBe(fixture[0]);
});
test("mapHref and listHref carry the right params", () => {
  const p = new URLSearchParams("status=tried&area=Central&sort=rating&dir=asc&spot=abc");
  expect(mapHref(p)).toBe("/?status=tried&area=Central");
  expect(mapHref(p, "xyz")).toBe("/?status=tried&area=Central&spot=xyz");
  expect(listHref(p)).toBe("/list?status=tried&area=Central&sort=rating&dir=asc");
  expect(mapHref(new URLSearchParams())).toBe("/");
});
```

Fill each commented test body with concrete `expect(...).toEqual([...ids])` assertions against the fixture.

- [ ] **Step 2: Run `npm test -- lib/filters.test.ts`.** Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/filters.ts`** with the signatures above.
  - **Dedupe in `deriveOptions`:** keep the first-seen spelling.
  - **Area matching:** case-insensitive equality.
  - **Cuisine matching:** a restaurant passes when any of its tags equals any selected value, case-insensitively.
  - **Search:** trim and lowercase the query, then match it as a substring of the name, any tag, or the area.
  - **Price order:** sort by string length, then alphabetically.

- [ ] **Step 4: Run `npm test -- lib/filters.test.ts`.** Expected: PASS.

- [ ] **Step 5: Commit** `lib/filters.ts lib/filters.test.ts` with the message "Add URL-backed filter logic".

### Task 3: Sort logic

**Files:**
- Create: `lib/sort.ts`, `lib/sort.test.ts`

**Interfaces:**
- Produces:
  - `type SortKey = "added" | "rating" | "name"`; `type SortDir = "asc" | "desc"`; `type Sort = { key: SortKey; dir: SortDir }`
  - `const NATURAL_DIR: Record<SortKey, SortDir> = { added: "desc", rating: "desc", name: "asc" }`
  - `parseSort(params: URLSearchParams): Sort`
  - `writeSort(params: URLSearchParams, sort: Sort): URLSearchParams`: returns a new object; omits `sort` when it is `added` and omits `dir` when it equals `NATURAL_DIR[key]`.
  - `toggleSort(current: Sort, key: SortKey): Sort`: same key flips the direction; a new key starts at `NATURAL_DIR[key]`.
  - `sortRestaurants(list: Restaurant[], sort: Sort): Restaurant[]`: returns a new array.

- [ ] **Step 1: Write the failing tests:**

```ts
test("parseSort falls back to defaults", () => {
  expect(parseSort(new URLSearchParams(""))).toEqual({ key: "added", dir: "desc" });
  expect(parseSort(new URLSearchParams("sort=banana&dir=up"))).toEqual({ key: "added", dir: "desc" });
  expect(parseSort(new URLSearchParams("sort=name"))).toEqual({ key: "name", dir: "asc" });
  expect(parseSort(new URLSearchParams("sort=rating&dir=asc"))).toEqual({ key: "rating", dir: "asc" });
});
test("writeSort omits defaults", () => {
  expect(writeSort(new URLSearchParams("q=x"), { key: "added", dir: "desc" }).toString()).toBe("q=x");
  expect(writeSort(new URLSearchParams(), { key: "rating", dir: "asc" }).toString()).toBe("sort=rating&dir=asc");
});
test("toggleSort flips same key, resets on new key", () => {
  expect(toggleSort({ key: "rating", dir: "desc" }, "rating")).toEqual({ key: "rating", dir: "asc" });
  expect(toggleSort({ key: "rating", dir: "asc" }, "name")).toEqual({ key: "name", dir: "asc" });
});
test("sortRestaurants puts unscored last in both directions", () => {
  // fixture: tried 9, tried 7, tried null, wishlist (rating null), tried 7 named "Aaa"
  // desc → [9, "Aaa" 7, 7, then unscored in name order]; asc → [7 "Aaa", 7, 9, then unscored]
});
test("sorts by added and by name", () => { /* added desc uses created_at; name asc is case-insensitive "en" localeCompare */ });
test("does not mutate its input", () => { /* original array order unchanged */ });
```

Ties break by name ascending in every key. "Unscored" means `status === "wishlist"` or `rating === null`.

- [ ] **Step 2: Run `npm test -- lib/sort.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `lib/sort.ts`.**
- [ ] **Step 4: Run `npm test -- lib/sort.test.ts`.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add list sort logic".

### Task 4: Design tokens, base styles, theme

**Files:**
- Create: `lib/theme.ts`, `lib/theme.test.ts`, `lib/tokens.test.ts`, `app/_components/useTheme.ts`, `app/_components/useMediaQuery.ts`, `app/_components/ThemeToggle.tsx` (+ `.module.css`)
- Modify: `app/globals.css` (rewrite), `app/layout.tsx`, `package.json` (dep `@phosphor-icons/react`)

**Interfaces:**
- Produces:
  - `type Theme = "light" | "dark"`; `const THEME_STORAGE_KEY = "lick-theme"`
  - `const themeScript: string`: plain-JS source. It reads `window.localStorage.getItem("lick-theme")`, wrapped in try/catch. If the value is not `light` or `dark`, it uses `window.matchMedia("(prefers-color-scheme: dark)").matches`. It then sets `document.documentElement.dataset.theme`.
  - `useTheme(): { theme: Theme; setTheme(t: Theme): void }` (client). `setTheme` writes the `data-theme` attribute and `localStorage` (try/catch). The theme is read with `useSyncExternalStore` plus a `MutationObserver` on `<html data-theme>`; the server snapshot is `"light"`.
  - `useMediaQuery(query: string): boolean` (client; `false` on the server).
  - `<ThemeToggle />`: a 44×44 button with `Moon` and `Sun` icons. CSS shows the right icon from `html[data-theme]`, so there's no icon flash. `aria-label` is "Switch to dark mode" or "Switch to light mode".
  - CSS tokens: every spec token, plus `--radius-sm/md/lg` (6/10/16px), `--shadow-overlay`, `--nav-h: 56px`, and `--ease-out`/`--ease-in`.

- [ ] **Step 1: Write the failing tests.**

  `lib/theme.test.ts` runs `new Function("window", "document", themeScript)` against fakes:

```ts
test("stored choice wins", () => { /* localStorage "dark", matchMedia false → dataset.theme === "dark" */ });
test("follows the device when nothing is stored", () => { /* null, matchMedia true → "dark"; null, false → "light" */ });
test("ignores garbage in storage", () => { /* "purple", matchMedia false → "light" */ });
test("themeScript falls back to the device when localStorage throws", () => { /* getItem throws, matchMedia true → "dark", no exception */ });
```

  `lib/tokens.test.ts` reads `app/globals.css`, extracts the `:root { … }` and `:root[data-theme="dark"] { … }` custom properties, and asserts WCAG contrast:
  - `--ink`, `--muted` and `--accent` on `--bg` ≥ 4.5.
  - `--muted` on `--hover` ≥ 4.5.
  - `--on-accent` on `--accent` ≥ 4.5.
  - `--line-strong` on both `--bg` and `--surface` ≥ 3.0.
  - `--accent` on each `--map-land/water/park` ≥ 3.0.
  - Both themes.

- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.

- [ ] **Step 3: Implement.**
  - Run `npm i @phosphor-icons/react`.
  - Rewrite `globals.css`:
    - `:root` holds the day tokens and `:root[data-theme="dark"]` the night tokens. Set `color-scheme: light` / `dark` to match.
    - `body`: `background: var(--bg)`, `color: var(--ink)`, `font-family: var(--font-geist-sans)`, 15px base, `min-height: 100dvh`. Keep the existing `box-sizing` reset.
    - The global `:focus-visible` outline rule.
    - `.visually-hidden`.
    - A `@media (prefers-reduced-motion: reduce)` rule that zeroes transition and animation durations.
    - Remove the old `display: flex` body, the `max-width: 100vw` rules and the dark media queries.
  - `lib/theme.ts`: the constants and `themeScript`.
  - `layout.tsx`:
    - `<html … suppressHydrationWarning>`.
    - In `<head>`, `<script dangerouslySetInnerHTML={{ __html: themeScript }} />`, following `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.
    - `metadata = { title: { default: "The Lick List", template: "%s · The Lick List" }, description: "Lex's Nomz Adventure" }`.
  - The two hooks and `ThemeToggle`.

- [ ] **Step 4: Run `npm test`.** Expected: PASS.

- [ ] **Step 5: Verify in the browser.**
  - Run `npm run dev` and open `/`.
  - Render `<ThemeToggle />` temporarily at the top of `app/page.tsx` for this check, then remove it.
  - Check: the page is cream; clicking the toggle turns it charcoal; reloading keeps charcoal with no cream flash; after clearing `localStorage` it follows the OS setting. `npm run lint` is clean.

- [ ] **Step 6: Commit** with the message "Add design tokens, base styles, and day/night theme".

### Task 5: Status mark, nav bar, About page

**Files:**
- Create: `app/_components/StatusMark.tsx` (+ css), `app/_components/SiteNav.tsx` (+ css), `app/about/page.tsx` (+ `page.module.css`)
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`, `useMediaQuery` (Task 4); `mapHref`, `listHref` (Task 2)
- Produces:
  - `<StatusMark status={RestaurantStatus} size?: "sm" | "md" | "pin" showLabel?: boolean />`:
    - Licked is a filled dot; Gotta Lick is an unfilled ring.
    - Sizes are sm 8px, md 12px and pin 14px. The stroke is 2px, or 2.5px at pin size.
    - At pin size it has a 2px `--bg` halo outside the ring only, via `box-shadow`.
    - The label text is "Licked" or "Gotta Lick". The mark itself is `aria-hidden`.
  - `<SiteNav />` (client): uses `usePathname` and `useSearchParams`, so it must be wrapped in Suspense. Its links are built with `mapHref` / `listHref` and a plain `/about`.
  - `<SiteNavFallback />`: a static bar the same height (wordmark only), used as the Suspense fallback.
  - The layout renders `<a href="#content" class="skip-link">Skip to content</a>`, then `<Suspense fallback={<SiteNavFallback/>}><SiteNav/></Suspense>`, then `{children}`. Each page puts `id="content"` on its main region.

- [ ] **Step 1: Build `StatusMark`.**

- [ ] **Step 2: Build `SiteNav`** to the spec's Frame section:
  - **Desktop:** links get `aria-current="page"` and the `--hover` background when current.
  - **Phone:** the hamburger is `List` / `X` with `aria-expanded` and `aria-controls`. The full-screen menu shows 20px weight-600 links, with a cobalt dot on the current page.
  - **Menu focus:** opening focuses the first link. Esc or `X` closes and refocuses the hamburger. Choosing a link closes the menu.
  - **Stats:** no Stats link.

- [ ] **Step 3: Build `/about`.**
  - Set `metadata.title` to "About".
  - Content as in the spec's About section: the "How it works" key uses `<StatusMark size="md" showLabel>` for both statuses, plus "Scores are out of 10" and "Price runs from $ to $$$".
  - The intro is placeholder copy for Lex to rewrite, wrapped in a JSX comment `{/* Lex: rewrite this intro in your own words */}`.
  - Single column, 600px max width. The `<main>` has `id="content"`.

- [ ] **Step 4: Verify in the browser.**
  - **Desktop:** at 1280px the nav shows Map · List · About. About is highlighted on `/about`, and the Gotta Lick ring is visibly hollow.
  - **Phone:** at 375px, ☰ opens the menu, Esc closes it, and focus returns to ☰.
  - **Keyboard:** Tab from page load lands on "Skip to content" first.
  - **Night mode:** repeat the checks in night mode.
  - **Lint:** `npm run lint` is clean.

- [ ] **Step 5: Commit** with the message "Add nav bar, status mark, and About page".

### Task 6: URL state hook and Sheet

**Files:**
- Create: `app/_components/useUrlState.ts`, `app/_components/Sheet.tsx` (+ css), `app/_components/DetailHeader.tsx` (+ css)

**Interfaces:**
- Consumes: `parseFilters`, `writeFilters`, `Filters` (Task 2); `parseSort`, `writeSort`, `Sort` (Task 3)
- Produces:
  - `useUrlState(): { params: URLSearchParams; filters: Filters; sort: Sort; spot: string | null; setFilters(f: Filters): void; setSort(s: Sort): void; selectSpot(id: string): void; clearSpot(): void }`
    - It uses `useSearchParams` for reading and `window.history` for writing, always keeping the current pathname.
    - `selectSpot` calls `pushState` when no spot is set and `replaceState` when one already is.
    - `clearSpot`, `setFilters` and `setSort` use `replaceState`.
  - `<Sheet open onClose label placement={"drawer" | "sheet" | "responsive"} height?: "85%" | "auto">{children}</Sheet>`: a modal overlay.
    - Placement and size: the drawer slides from the right at 420px wide. The sheet slides up from the bottom, padded for the safe-area inset. `responsive` means drawer at 768px and up, sheet below.
    - It has a scrim, `role="dialog"`, `aria-modal="true"` and `aria-label={label}`.
    - Focus: on open, focus moves to the first focusable element. Tab is trapped inside. Esc calls `onClose`. On close, focus returns to the element that was focused before opening.
    - Clicking the scrim closes it. Enter and leave use transform/opacity at 220/160ms.
  - `<DetailHeader onBack onClose />`: the "← All spots" back button (`ArrowLeft` + "All spots", 14px, `--ink`, hover fill) and an `X` button with `aria-label="Close"`, both 44×44 hit areas.

- [ ] **Step 1: Implement `useUrlState`.**
- [ ] **Step 2: Implement `Sheet` and `DetailHeader`.**
- [ ] **Step 3: Verify in the browser** with a throwaway demo route `app/_demo/page.tsx` (delete it before committing). Check:
  - `selectSpot("a")` adds `?spot=a`, and browser Back removes it.
  - `setFilters` changes the URL without adding history entries, and no request to `/` shows in the Network panel.
  - The Sheet traps focus, Esc closes it, focus returns, and it's a drawer at 1280px and a sheet at 375px.
- [ ] **Step 4: Commit** with the message "Add URL state hook, Sheet, and detail header".

### Task 7: Filter bar

**Files:**
- Create: `app/_components/CheckboxGroup.tsx`, `app/_components/MultiSelect.tsx`, `app/_components/FilterBar.tsx` (each + css), `app/_components/EmptyState.tsx` (+ css)

**Interfaces:**
- Consumes: `Filters`, `FilterOptions`, `activeFilterCount`, `EMPTY_FILTERS` (Task 2); `Sheet` (Task 6); `useMediaQuery` (Task 4)
- Produces:
  - `<CheckboxGroup legend options selected onChange(next: string[]) />`: a fieldset of native checkboxes.
  - `<MultiSelect label options selected onChange />`: a dropdown button (`CaretDown`, shows "Area · 1" when active) that opens a popover containing a `CheckboxGroup`. It closes on Esc or an outside click and returns focus to its button.
  - `<FilterBar variant={"map" | "list"} filters options onChange(next: Filters) sort?: Sort onSortChange? />`:
    - **Always:** the status segmented control (All / Licked / Gotta Lick, `role="radiogroup"`), then the search input (`MagnifyingGlass`, 16px font on phone, debounced 200ms before calling `onChange`, local text state so typing stays instant), then the chips row (`Remove filter: <value>` buttons, 44px hit area on phone, then "Clear all").
    - **`variant="map"` (any width) and `variant="list"` on phone:** a "Filters" button (`Funnel`, "Filters · n" when active). It opens a popover with three `CheckboxGroup`s on desktop, or a `Sheet placement="sheet"` with them on phone.
    - **`variant="list"` on desktop:** three inline `MultiSelect`s instead.
    - **`variant="list"` on phone:** also shows a native `<select>` for sort (Newest added / Highest rated / A–Z).
  - `<EmptyState kind={"no-matches" | "no-data"} onClear? />`: the spec copy; "no-matches" shows a "Clear filters" button.

- [ ] **Step 1: Build `CheckboxGroup`, `MultiSelect` and `EmptyState`.**
- [ ] **Step 2: Build `FilterBar`.**
- [ ] **Step 3: Verify in the browser.** Temporarily render the bar on the `_demo` route with `deriveOptions` of real data and `useUrlState`. Check:
  - Each control updates the URL as the spec's URL state table says.
  - Chips remove single values, and "Clear all" resets.
  - Keyboard: Tab reaches every control, the segmented control uses arrow keys, and Esc closes popovers.
  - At 375px the Filters sheet opens and the search input doesn't zoom on iOS (16px).
  - Delete `_demo`.
- [ ] **Step 4: Commit** with the message "Add filter bar, multi-select, and empty states".

### Task 8: Restaurant row, list, detail

**Files:**
- Create: `app/_components/RestaurantRow.tsx`, `app/_components/RestaurantList.tsx`, `app/_components/RestaurantDetail.tsx` (each + css)

**Interfaces:**
- Consumes: `formatScore`, `scoreLabel`, `formatAdded` (Task 1); `StatusMark` (Task 5); `EmptyState` (Task 7)
- Produces:
  - `<RestaurantRow restaurant selected onSelect(id) showCuisine?: boolean showPrice?: boolean />`
    - The whole row is a `<button id={"row-" + id}>`.
    - Line 1: name (15px/600) and score (Geist Mono 14px/500, tabular).
    - Line 2: `StatusMark sm` with its label, then area · cuisine · price, each omitted when empty and wrapping rather than truncating.
    - When selected, the background is `--hover`.
  - `<RestaurantList restaurants selectedId onSelect total onClearFilters />`
    - **Header:** "N spots" in an `aria-live="polite"` element.
    - **Rows** scroll inside their own box. Keep the Phase 3 behavior of scrolling only the list container to reveal the selected row.
    - **Empty:** `EmptyState` "no-data" when `total === 0`, otherwise "no-matches".
  - `<RestaurantDetail restaurant showOnMapHref?: string />`: the spec's "Detail content" items 1–8, in order.
    - **Links:** labelled Website / Instagram / Link by `type`, opening with `target="_blank" rel="noopener noreferrer"`.
    - **Google Maps button:** omitted without `maps_url`.
    - **"No map location yet":** shown when `lat` is null and `showOnMapHref` is undefined.
    - **"Show on map":** shown only when `showOnMapHref` is given.

- [ ] **Step 1: Build the three components.** Notes text uses `overflow-wrap: anywhere` and a 70ch max width.
- [ ] **Step 2: Verify in the browser** in Task 9 alongside the Map page. These components have no standalone route.
- [ ] **Step 3: Commit** with the message "Add restaurant row, list, and detail components".

### Task 9: Map view and Map page

**Files:**
- Create: `app/_components/mapTheme.ts`, `app/_components/MapPage.tsx` (+ css), `app/_components/ListSkeleton.tsx` (+ css), `app/_components/RouteError.tsx` (+ css), `app/loading.tsx`, `app/error.tsx`
- Move and modify: `app/MapView.tsx` → `app/_components/MapView.tsx` (+ css)
- Modify: `app/page.tsx`
- Delete: `app/HomeClient.tsx`, `app/RestaurantList.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `recolorMap(map: mapboxgl.Map, colors: { land: string; water: string; park: string; road: string }): void`
    - Sets the `background` layer's `background-color` to land.
    - Sets `fill-color` on the `water` layer to water and on `national-park` to park.
    - Sets `line-color` to road on every `line` layer whose id starts with `road-` and doesn't contain `label`.
    - Guards each layer with `map.getLayer(id)`. Colors are read from `getComputedStyle(document.documentElement)` (`--map-*`) by the caller.
  - `<MapView restaurants selectedId onSelect onDeselect theme bottomPadding reducedMotion onUnavailable />`
    - **Style:** `mapbox://styles/mapbox/light-v11` or `dark-v11` by `theme`, with `recolorMap` called on `style.load`.
    - **Pins:** `<Marker>` children are `<button aria-label="{name}, {Licked|Gotta Lick}[, {scoreLabel}]">` containing `StatusMark size="pin"`. The selected pin is larger, with a `color-mix(in srgb, var(--accent) 22%, transparent)` halo.
    - **Name label:** the selected restaurant's name label is a second `Marker` with `anchor="bottom"` and offset `[0, -14]`. It replaces the old `Popup`.
    - **Map interaction:** clicking the map background calls `onDeselect`. Selecting uses `flyTo({ zoom: 14, padding: { bottom: bottomPadding } })`, or `jumpTo` when `reducedMotion`.
    - **Kept from Phase 3:** fit-to-pins on filter change and `maxZoom: 14`.
    - **Failure:** a missing token or map `error` event renders "Map unavailable" and calls `onUnavailable()`.
  - `<MapPage restaurants />` (client):
    - **Data:** `useUrlState`, `applyFilters`, `deriveOptions`, `findSpot`.
    - **Layout:** the desktop two-column grid (map ≈55%, pane ≈45% with a 320px minimum) fills `calc(100dvh - var(--nav-h))`. On phone, the pane is a bottom sheet over the map.
    - **Pane `data-sheet`:** `"list"` (50%), `"detail"` (60%), `"collapsed"` (max(20%, 120px)) or `"full"` (map unavailable). A media query makes it a sheet below 768px.
    - **Handle:** visible on phone only, with `aria-label` "Collapse list" or "Expand list"; it toggles between collapsed and the previous state.
    - **Detail:** the pane shows `<DetailHeader/>` plus `<RestaurantDetail/>` when a spot is selected, otherwise `<RestaurantList/>`. `id="content"` is on the pane.
    - **`bottomPadding`:** the sheet's pixel height on phone, 0 on desktop.
    - **Deselecting** (back, `X`, Esc while selected, or a map background click) calls `clearSpot()`, then focuses `#row-{id}`, or the pin button if the row isn't rendered.
    - **Hidden selection:** if `findSpot(filtered, spot)` is null while `spot` is set, call `clearSpot()` in an effect.
  - `app/page.tsx`: keeps `instant = false` and fetches. It renders `<Suspense fallback={<ListSkeleton/>}><MapPage restaurants={…}/></Suspense>`.
  - `app/loading.tsx`: renders `<ListSkeleton/>` (nav comes from the layout; placeholder rows; a map-sized block reserved on desktop).
  - `app/error.tsx`: `'use client'`, renders `<RouteError retry={retry}/>` with "Couldn't load the list right now" and "Try again".

- [ ] **Step 1: Implement `recolorMap`, move and rework `MapView`.**
- [ ] **Step 2: Implement `MapPage`, `ListSkeleton`, `RouteError` and the route files. Delete `HomeClient.tsx` and `RestaurantList.tsx`.**
- [ ] **Step 3: Run `npm run lint && npm test && npm run build`.** Expected: all succeed. In particular, the build reports no missing Suspense boundary for `useSearchParams`.
- [ ] **Step 4: Verify in the browser at 1280px and 375px, day and night:**
  - **Selecting:** clicking a pin opens the detail and shows the name label. Clicking a row flies to the pin.
  - **Deselecting:** back, `X`, Esc and browser Back each deselect, and focus returns to the row.
  - **Phone:** with a restaurant selected, the pin sits in the visible map above the 60% sheet. The handle collapses and expands the sheet.
  - **No coordinates:** temporarily null one row's coordinates in Supabase. It's listed with no pin, and its detail says "No map location yet".
  - **Shared link:** `/?spot=<id>&area=Central` opened in a new tab lands selected. `/?spot=nope` lands on the list with `spot` removed from the URL.
  - **No Mapbox token:** with `NEXT_PUBLIC_MAPBOX_TOKEN` unset, "Map unavailable" shows and the list still works (full-height sheet on phone).
  - **Reduced motion:** with reduce-motion emulated, selection jumps instead of flying.
  - **Gotta Lick pins:** their centers are hollow and the map shows through.
- [ ] **Step 5: Commit** with the message "Redesign Map page with detail pane and custom pins".

### Task 10: List page

**Files:**
- Create: `app/_components/RestaurantTable.tsx` (+ css), `app/_components/ListPage.tsx` (+ css), `app/list/page.tsx`, `app/list/loading.tsx`, `app/list/error.tsx`

**Interfaces:**
- Consumes: `toggleSort`, `sortRestaurants` (Task 3); `mapHref` (Task 2); `Sheet`, `DetailHeader`, `useUrlState` (Task 6); `FilterBar` (Task 7); `RestaurantRow`, `RestaurantDetail` (Task 8); `ListSkeleton`, `RouteError` (Task 9)
- Produces:
  - `<RestaurantTable restaurants sort onSortChange(next: Sort) selectedId onSelect />`
    - **Columns:** Name, Status, Area, Cuisine, Price, Score, Added.
    - **Sortable headers:** Name, Score and Added headers are `<button>`s calling `onSortChange(toggleSort(sort, key))`. The active one shows `ArrowUp`/`ArrowDown` and its `<th>` has `aria-sort` ("ascending"/"descending"); the others have none.
    - **Rows:** each name cell is a `<button id={"row-" + id}>`, and a row click also selects.
    - **Score:** right-aligned Geist Mono 14px/500.
    - **Added:** muted `formatAdded`.
  - `<ListPage restaurants />` (client):
    - **Header:** the heading "All spots" plus an "N restaurants" count (`aria-live="polite"`).
    - **Body:** `FilterBar variant="list"`. At 768px and up, `RestaurantTable`; below, `RestaurantRow`s with `showCuisine` and `showPrice={false}`.
    - **Detail:** `Sheet placement="responsive" height="85%" label={name}` containing `DetailHeader` and `RestaurantDetail`, with `showOnMapHref={mapHref(params, id)}` (undefined when `lat` is null).
    - **Hidden selection:** same `clearSpot` effect as `MapPage`.
  - `app/list/page.tsx`: `metadata.title = "List"`, `instant = false`, fetch, then `<Suspense fallback={<ListSkeleton/>}><ListPage …/></Suspense>`. `loading.tsx` and `error.tsx` as in Task 9.

- [ ] **Step 1: Build `RestaurantTable` and `ListPage`, plus the route files.**
- [ ] **Step 2: Run `npm run lint && npm test && npm run build`.** Expected: all succeed.
- [ ] **Step 3: Verify in the browser at 1280px and 375px, day and night:**
  - **Sorting:** each sortable header sorts both ways and updates the URL, and unscored rows stay last.
  - **Filters:** filters and chips work, and switching Map ↔ List via the nav keeps them.
  - **Drawer:** it opens from the right, the table stays visible, Esc closes it, and focus returns to the row's name button.
  - **Show on map:** it lands on `/?…filters&spot=id` with that restaurant selected.
  - **Phone:** the sort `<select>` works. Row tap opens an 85% sheet. Rows show cuisine and no price.
  - **Empty:** filters that match nothing show "Nothing matches — try another search", and "Clear filters" resets.
- [ ] **Step 4: Commit** with the message "Add List page with sortable table and detail drawer".

### Task 11: Whole-site verification pass

**Files:**
- Modify: only what the checks below turn up.

- [ ] **Step 1: Run `npm run lint && npm test && npm run build`.** Expected: clean; `lib/tokens.test.ts` passes, so contrast still meets the spec.
- [ ] **Step 2: Do a keyboard-only pass on `/`, `/list` and `/about`.** Every control is reachable in visual order with a visible cobalt focus ring. Nothing is hidden behind the sheet or drawer while focused.
- [ ] **Step 3: Check phone tap targets.** At 375px, measure with DevTools that the ☾/☀, ☰, chip remove, sheet handle, back and `X` controls are all ≥ 44×44.
- [ ] **Step 4: Check the theme.** It persists across reloads with no flash, both when starting from day and from night.
- [ ] **Step 5: Check admin.** `/admin` still works: log in, edit a restaurant, and confirm a rating of 11 is rejected with "Rating must be a whole number from 1 to 10".
- [ ] **Step 6: Commit** any fixes with the message "Polish from verification pass" (skip if there are none).
