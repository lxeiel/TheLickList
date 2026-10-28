# Food Tried and Food Pics (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Food tried list (with Must try tags) and uploaded food photos to each restaurant, edited in the `/reborn` popup and shown in the public detail panel, with food names searchable.

**Architecture:** Food tried is a `foods jsonb` column on `restaurant`; photos reuse `photo_urls text[]` and live in a public Supabase Storage bucket. The browser shrinks each photo and uploads it straight to a signed URL issued by an admin-only server action. All rules (normalising, sorting, URL checks, diffs) are pure functions in `lib/` with Vitest tests; components stay thin.

**Tech Stack:** Next.js 16.4 App Router (`cacheComponents`), React 19, Supabase JS 2 (Postgres + Storage), CSS Modules, Vitest 4 (Node environment, no DOM), Phosphor icons.

**Spec:** [docs/superpowers/specs/2026-10-28-food-tried-and-photos-design.md](../specs/2026-10-28-food-tried-and-photos-design.md)

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API (AGENTS.md). Server actions refresh the list with `refresh()` from `next/cache`.
- Bucket `restaurant-photos`, public, file size limit 5 MB (5242880), allowed types `image/jpeg`, `image/png`, `image/webp`.
- Object path `{restaurant_id or "new"}/{uuid}.jpg`; photos re-encoded as JPEG, quality 0.82, at most 1600px on the long side, never upscaled.
- Limits: 12 photos per restaurant; 40 Food tried items; food names at most 80 characters after trimming.
- Copy, verbatim: "Add food", "Must try", "Remove", "Add photos", "Uploading {n} photo(s)…", "Retry", "Couldn't read this photo. Try a JPEG.", "FOOD TRIED", "Photo {i} of {n}, {restaurant name}", "{n} photo(s)" in admin rows.
- Every admin server action calls `requireAdmin()` first. Server actions are callable from any page, so the proxy is not enough.
- Colours only from tokens in `app/globals.css` (`--accent`, `--muted`, `--line`, `--danger`, …); day and night must both work.
- Tests are Node-only: browser-only code (canvas, `<dialog>`) is verified in the browser, never with Vitest.
- Browser checks use a restaurant named "ZZ Test Spot" plus test photos, all deleted at the end. Lex's real restaurants are never edited.

## Review Focus

1. **Saving while a photo is still uploading.** Lex expects the photo to be kept, not silently dropped. Save is blocked while any upload is in flight, and only finished uploads are saved (Task 4 reducer tests).
2. **Editing a spot without touching its photos.** Lex expects nothing deleted from storage, including after only reordering (Task 1 `removedPhotoUrls` tests).
3. **Removing a photo, then pressing Cancel.** Lex expects the photo still there. Files are only deleted inside a successful update (Task 3 action test: a failed validation deletes nothing).
4. **Small or odd-shaped photos** (a 400px screenshot, a 4000×300 panorama). Lex expects no upscaling and no distortion (Task 1 `fitWithin` tests).
5. **Someone calling the upload action from the public site.** Lex expects it refused with no upload link issued (Task 3 action test).

---

### Task 1: Data model, food and photo rules

**Files:**
- Create: `supabase/migrations/0003_foods_and_photos.sql`
- Create: `lib/foods.ts`, `lib/foods.test.ts`
- Create: `lib/photos.ts`, `lib/photos.test.ts`
- Modify: `lib/restaurants.ts` (types, validation, create/update payloads)
- Modify: `lib/restaurants.test.ts`
- Modify: test fixtures with `photo_urls: []` in `lib/filters.test.ts`, `lib/menu.test.ts`, `lib/sort.test.ts` (add `foods: []`)

**Interfaces:**
- Produces (`lib/foods.ts`):
  - `type FoodItem = { name: string; must_try: boolean }`
  - `MAX_FOODS = 40`, `MAX_FOOD_NAME = 80`
  - `normalizeFoods(foods: FoodItem[]): FoodItem[]`: trims names and drops blank ones, keeping order.
  - `sortFoodsForDisplay(foods: FoodItem[]): FoodItem[]`: Must try first; stable within each group; returns a new array.
- Produces (`lib/photos.ts`):
  - `PHOTO_BUCKET = "restaurant-photos"`, `MAX_PHOTOS = 12`, `PHOTO_MAX_EDGE = 1600`
  - `photoUrlPrefix(): string`, which is `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/restaurant-photos/`
  - `isOwnPhotoUrl(url: string): boolean`
  - `photoPathFromUrl(url: string): string | null`: the object path inside the bucket (e.g. `new/abc.jpg`), or null for foreign URLs.
  - `removedPhotoUrls(before: string[], after: string[]): string[]`: URLs in `before` missing from `after`.
  - `fitWithin(width: number, height: number, max?: number): { width: number; height: number }`: scales down to `max` on the long edge (rounded), never up.
- Produces (`lib/restaurants.ts`): `Restaurant.foods: FoodItem[]`; `RestaurantInput` gains `foods: FoodItem[]` and `photo_urls: string[]`. `validateRestaurantInput` applies the food limits to `normalizeFoods(input.foods)`, so blank rows and surrounding spaces never count, and additionally returns:
  - `"Too many foods (max 40)"`
  - `"Food names must be 80 characters or fewer"`
  - `"Too many photos (max 12)"`
  - `"Photos must be uploaded here"` (any URL failing `isOwnPhotoUrl`)

- [ ] **Step 1: Write the migration** `0003_foods_and_photos.sql`: `alter table restaurant add column foods jsonb not null default '[]'::jsonb;`, then insert the bucket into `storage.buckets (id, name, public, file_size_limit, allowed_mime_types)` with the Global Constraints values, `on conflict (id) do nothing`.

- [ ] **Step 2: Write failing tests**

`lib/foods.test.ts`:
```ts
test("normalizeFoods trims and drops blanks, keeping order", () => {
  expect(normalizeFoods([{ name: "  Laksa ", must_try: false }, { name: "   ", must_try: true }, { name: "Udon", must_try: true }]))
    .toEqual([{ name: "Laksa", must_try: false }, { name: "Udon", must_try: true }]);
});
test("sortFoodsForDisplay puts Must try first and keeps entry order within groups", () => {
  const foods = [{ name: "A", must_try: false }, { name: "B", must_try: true }, { name: "C", must_try: false }, { name: "D", must_try: true }];
  expect(sortFoodsForDisplay(foods).map((f) => f.name)).toEqual(["B", "D", "A", "C"]);
  expect(foods.map((f) => f.name)).toEqual(["A", "B", "C", "D"]); // input untouched
});
```

`lib/photos.test.ts`, with `process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co"` set in `beforeAll`:
```ts
const own = "https://proj.supabase.co/storage/v1/object/public/restaurant-photos/new/a.jpg";
test("isOwnPhotoUrl accepts only this project's bucket", () => {
  expect(isOwnPhotoUrl(own)).toBe(true);
  expect(isOwnPhotoUrl("https://evil.example/restaurant-photos/new/a.jpg")).toBe(false);
  expect(isOwnPhotoUrl("https://proj.supabase.co/storage/v1/object/public/other-bucket/a.jpg")).toBe(false);
});
test("photoPathFromUrl returns the path inside the bucket", () => {
  expect(photoPathFromUrl(own)).toBe("new/a.jpg");
  expect(photoPathFromUrl("https://evil.example/x.jpg")).toBeNull();
});
test("removedPhotoUrls ignores reordering", () => {
  expect(removedPhotoUrls(["a", "b", "c"], ["c", "a", "b"])).toEqual([]);
  expect(removedPhotoUrls(["a", "b", "c"], ["c"])).toEqual(["a", "b"]);
  expect(removedPhotoUrls([], ["a"])).toEqual([]);
});
test("fitWithin scales the long edge down and never up", () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(400, 300)).toEqual({ width: 400, height: 300 });
  expect(fitWithin(4000, 300)).toEqual({ width: 1600, height: 120 });
});
```

`lib/restaurants.test.ts`: add `foods: []` and `photo_urls: []` to `valid`, set `process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co"` in `beforeAll`, then:
```ts
test("rejects more than 40 foods", () => {
  const foods = Array.from({ length: 41 }, (_, i) => ({ name: `F${i}`, must_try: false }));
  expect(validateRestaurantInput({ ...valid, foods })).toBe("Too many foods (max 40)");
});
test("rejects an 81-character food name", () => {
  expect(validateRestaurantInput({ ...valid, foods: [{ name: "x".repeat(81), must_try: false }] }))
    .toBe("Food names must be 80 characters or fewer");
});
test("food limits ignore blank rows and surrounding spaces", () => {
  const foods = [...Array.from({ length: 40 }, (_, i) => ({ name: `F${i}`, must_try: false })), { name: "  ", must_try: false }];
  expect(validateRestaurantInput({ ...valid, foods })).toBeNull();
  expect(validateRestaurantInput({ ...valid, foods: [{ name: ` ${"x".repeat(80)} `, must_try: false }] })).toBeNull();
});
test("rejects 13 photos and foreign photo URLs", () => {
  const url = "https://proj.supabase.co/storage/v1/object/public/restaurant-photos/new/a.jpg";
  expect(validateRestaurantInput({ ...valid, photo_urls: Array(13).fill(url) })).toBe("Too many photos (max 12)");
  expect(validateRestaurantInput({ ...valid, photo_urls: ["https://evil.example/a.jpg"] })).toBe("Photos must be uploaded here");
});
```

- [ ] **Step 3: Run** `npx vitest run lib/foods.test.ts lib/photos.test.ts lib/restaurants.test.ts`. Expected: FAIL (modules and exports don't exist).

- [ ] **Step 4: Implement** `lib/foods.ts` and `lib/photos.ts` per the Interfaces, then extend the types and `validateRestaurantInput`. `createRestaurant` and `updateRestaurant` write `foods: normalizeFoods(input.foods)` and `photo_urls: input.photo_urls`. Add `foods: []` to the three fixture factories.

- [ ] **Step 5: Run** `npx vitest run` then `npx tsc --noEmit`. Expected: all pass, no type errors. (`RestaurantForm` will fail to compile until it sends `foods`/`photo_urls`. Add both to its submitted input now, from `initial?.foods ?? []` and `initial?.photo_urls ?? []`, so the build stays green.)

- [ ] **Step 6: Ask Lex to run `0003_foods_and_photos.sql`** in the Supabase SQL Editor. Then confirm with a one-off script against `getServiceClient()` that `select foods from restaurant limit 1` succeeds and `storage.getBucket("restaurant-photos")` returns `public: true`.

- [ ] **Step 7: Commit** `git commit -m "Add foods column, photo bucket, and the food/photo rules"`.

---

### Task 2: Food names in search

**Files:**
- Modify: `lib/filters.ts` (`applyFilters`)
- Test: `lib/filters.test.ts`

**Interfaces:**
- Consumes: `Restaurant.foods` (Task 1).
- Produces: `applyFilters`'s `q` also matches food names, case-insensitively, as a substring. The signature is unchanged; the admin columns get this for free.

- [ ] **Step 1: Write the failing test.** Give fixture `d` (Mystery Spot) `foods: [{ name: "Curry Laksa", must_try: true }]`, then:
```ts
test("q matches food names", () => {
  expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, q: "laksa" }))).toEqual(["d"]);
  expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, status: "wishlist", q: "laksa" }))).toEqual([]);
});
```
- [ ] **Step 2: Run** `npx vitest run lib/filters.test.ts`. Expected: FAIL (`[]` instead of `["d"]`).
- [ ] **Step 3: Implement.** Add `r.foods.some((f) => lower(f.name).includes(q))` to the `q` match in `applyFilters`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass, including the existing filter tests.
- [ ] **Step 5: Commit** `git commit -m "Match food names in search"`.

---

### Task 3: Photo storage and admin actions

**Files:**
- Create: `lib/photoStorage.ts` (server-only storage calls)
- Modify: `lib/restaurants.ts` (`updateRestaurant`, `deleteRestaurant` clean up files)
- Modify: `app/reborn/(protected)/actions.ts` (add `createPhotoUploadAction`)
- Create: `app/reborn/(protected)/actions.test.ts`
- Modify: `vitest.config.mts` (include `"app/**/*.test.ts"`)

**Interfaces:**
- Consumes: `PHOTO_BUCKET`, `photoPathFromUrl`, `removedPhotoUrls` (Task 1); `getServiceClient` (`lib/supabase.ts`); `requireAdmin` (`lib/auth.ts`).
- Produces (`lib/photoStorage.ts`):
  - `createPhotoUpload(restaurantId: string | null): Promise<{ uploadUrl: string; publicUrl: string }>`: path `${restaurantId ?? "new"}/${crypto.randomUUID()}.jpg`, using `storage.from(PHOTO_BUCKET).createSignedUploadUrl(path)` and `getPublicUrl(path)`. Throws on error.
  - `deletePhotoFiles(urls: string[]): Promise<void>`: maps URLs through `photoPathFromUrl`, drops nulls, and calls `remove(paths)` when there are any. Never throws: logs with `console.error`.
- Produces (actions): `createPhotoUploadAction(restaurantId: string | null): Promise<{ uploadUrl: string; publicUrl: string } | { error: string }>`, where the error is `"Couldn't start the upload"`.
- Behaviour:
  - `updateRestaurant`, after a successful update, calls `deletePhotoFiles(removedPhotoUrls(existing?.photo_urls ?? [], input.photo_urls))`.
  - `deleteRestaurant` reads the row's `photo_urls` first, deletes the row, then calls `deletePhotoFiles` on them.

- [ ] **Step 1: Write failing tests** in `actions.test.ts`:
  - Mock `@/lib/auth` so `requireAdmin` throws `new Error("NEXT_REDIRECT")` by default.
  - Mock `next/cache` (`refresh: vi.fn()`), `@/lib/photoStorage` (`createPhotoUpload`, `deletePhotoFiles` as `vi.fn()`) and `@/lib/restaurants` (keeping the real `validateRestaurantInput` via `vi.importActual`).
```ts
test("createPhotoUploadAction refuses without an admin session", async () => {
  await expect(createPhotoUploadAction(null)).rejects.toThrow("NEXT_REDIRECT");
  expect(createPhotoUpload).not.toHaveBeenCalled();
});
test("a failed validation deletes no photo files", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  const result = await updateRestaurantAction("id-1", { ...validInput, name: "" });
  expect(result).toEqual({ error: "Name is required" });
  expect(updateRestaurant).not.toHaveBeenCalled();
  expect(deletePhotoFiles).not.toHaveBeenCalled();
});
test("createPhotoUploadAction returns the upload and public URLs for an admin", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(createPhotoUpload).mockResolvedValue({ uploadUrl: "u", publicUrl: "p" });
  expect(await createPhotoUploadAction("id-1")).toEqual({ uploadUrl: "u", publicUrl: "p" });
  expect(createPhotoUpload).toHaveBeenCalledWith("id-1");
});
```
- [ ] **Step 2: Run** `npx vitest run app`. Expected: FAIL (`createPhotoUploadAction` not exported).
- [ ] **Step 3: Implement** `lib/photoStorage.ts`, the two cleanup calls in `lib/restaurants.ts`, and `createPhotoUploadAction` (calls `requireAdmin()`, then wraps `createPhotoUpload` in try/catch).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Smoke-test storage once** with a one-off script: create an upload for `"new"`, `fetch(uploadUrl, { method: "PUT", body: <tiny JPEG Blob>, headers: { "content-type": "image/jpeg" } })`, confirm `publicUrl` returns 200, then `deletePhotoFiles([publicUrl])` and confirm it returns 400/404. Expected: upload OK, public read OK, delete OK.
- [ ] **Step 6: Commit** `git commit -m "Issue photo upload links and clean up removed photos"`.

---

### Task 4: Admin popup: Food tried and food pics

**Files:**
- Create: `lib/photoUploads.ts`, `lib/photoUploads.test.ts` (pure reducer)
- Create: `app/reborn/shrinkPhoto.ts` (browser-only)
- Create: `app/reborn/PhotoPicker.tsx`
- Create: `app/reborn/FoodRows.tsx`
- Modify: `app/reborn/RestaurantForm.tsx`, `app/reborn/AdminBoard.tsx`, `app/reborn/admin.module.css`

**Interfaces:**
- Consumes: `FoodItem`, `MAX_PHOTOS`, `fitWithin`, `PHOTO_MAX_EDGE` (Task 1); `createPhotoUploadAction` (Task 3).
- Produces (`lib/photoUploads.ts`):
  - `type PhotoItem = { key: string; status: "uploading" | "done" | "error"; url?: string; error?: string }`
  - `type PhotoAction = { type: "add"; key: string } | { type: "uploaded"; key: string; url: string } | { type: "failed"; key: string; error: string } | { type: "retry"; key: string } | { type: "remove"; key: string } | { type: "move"; key: string; by: -1 | 1 }`
  - `photoReducer(items: PhotoItem[], action: PhotoAction): PhotoItem[]`
  - `initialPhotos(urls: string[]): PhotoItem[]`: done items keyed by URL.
  - `savedUrls(items: PhotoItem[]): string[]`: done items' URLs, in order.
  - `uploadingCount(items: PhotoItem[]): number`
- Produces (`app/reborn/shrinkPhoto.ts`): `shrinkPhoto(file: File): Promise<Blob>`. It uses `createImageBitmap(file)`, a canvas sized by `fitWithin` and `toBlob("image/jpeg", 0.82)`, and rejects with `"Couldn't read this photo. Try a JPEG."` when decoding fails.
- Produces (components):
  - `PhotoPicker({ restaurantId, items, dispatch })`
  - `FoodRows({ foods, onChange })`
  - `RestaurantForm` keeps `foods` state and `useReducer(photoReducer, initialPhotos(initial?.photo_urls ?? []))`, and submits `foods` and `photo_urls: savedUrls(items)`.

- [ ] **Step 1: Write failing tests** in `lib/photoUploads.test.ts`:
```ts
test("savedUrls keeps only finished uploads, in order", () => {
  let items = initialPhotos(["a", "b"]);
  items = photoReducer(items, { type: "add", key: "k1" });
  items = photoReducer(items, { type: "add", key: "k2" });
  items = photoReducer(items, { type: "failed", key: "k2", error: "x" });
  expect(savedUrls(items)).toEqual(["a", "b"]);
  expect(uploadingCount(items)).toBe(1);
  items = photoReducer(items, { type: "uploaded", key: "k1", url: "c" });
  expect(savedUrls(items)).toEqual(["a", "b", "c"]);
  expect(uploadingCount(items)).toBe(0);
});
test("move swaps neighbours and stops at the ends", () => {
  const items = initialPhotos(["a", "b", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "b", by: -1 }))).toEqual(["b", "a", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "a", by: -1 }))).toEqual(["a", "b", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "c", by: 1 }))).toEqual(["a", "b", "c"]);
});
test("retry puts a failed item back to uploading; remove drops it", () => {
  let items = photoReducer([], { type: "add", key: "k" });
  items = photoReducer(items, { type: "failed", key: "k", error: "x" });
  expect(photoReducer(items, { type: "retry", key: "k" })[0].status).toBe("uploading");
  expect(photoReducer(items, { type: "remove", key: "k" })).toEqual([]);
});
```
- [ ] **Step 2: Run** `npx vitest run lib/photoUploads.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/photoUploads.ts`. Retry needs the original `File`: `PhotoPicker` keeps a `Map<key, File>` in a ref, and on Retry re-runs shrink and upload for that key.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Build the UI.**
  - `FoodRows` follows the Links pattern ("Add food", name input with `maxLength={80}`, a "Must try" checkbox, "Remove").
  - `PhotoPicker`:
    - A hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple>` behind an "Add photos" button. The button is hidden at 12 items, and extra picked files beyond 12 are ignored.
    - Square thumbnails (plain `<img>`; add an `eslint-disable-next-line @next/next/no-img-element` explaining the photos are already resized).
    - Per thumbnail: a spinner while uploading; the error text plus "Retry" on failure; "✕" and "← / →" buttons with aria-labels "Remove photo {i}" / "Move photo {i} earlier/later".
    - Each upload: `shrinkPhoto`, then `createPhotoUploadAction(restaurantId)`, then a PUT to `uploadUrl` with `content-type: image/jpeg` (a non-2xx response counts as failed), then dispatch `uploaded` with `publicUrl`.
  - In `RestaurantForm`, while `uploadingCount > 0` the submit button is disabled with the label "Uploading {n} photo(s)…".
  - In `AdminBoard`, `EditDialog` passes `restaurant?.id ?? null`. The row details gain "{n} photo(s)" when `photo_urls.length > 0`.
- [ ] **Step 6: Verify in the browser** (temporary local login bypass as before, removed afterwards).
  - Create "ZZ Test Spot" with two foods (one Must try) and three photos: a phone JPEG, a small PNG, and a wide panorama.
  - Check that Save waits during upload; reorder with ← →; remove one and press Cancel (the photo is still there on reopening); remove one and press Save (its file URL now returns 400/404).
  - Simulate a failed upload (offline mode in the browser tools) and check Retry.
  - On phone width, check that the thumbnails wrap and the popup still scrolls.
- [ ] **Step 7: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib`. Expected: all clean.
- [ ] **Step 8: Commit** `git commit -m "Edit Food tried and food pics in the admin popup"`.

---

### Task 5: Public detail panel: photo strip, viewer, Food tried

**Files:**
- Create: `app/_components/PhotoStrip.tsx`, `app/_components/PhotoStrip.module.css`
- Create: `app/_components/PhotoViewer.tsx` (in the same CSS module or its own)
- Modify: `app/_components/RestaurantDetail.tsx`, `app/_components/RestaurantDetail.module.css`

**Interfaces:**
- Consumes: `sortFoodsForDisplay` (Task 1); `Restaurant.foods` and `photo_urls`.
- Produces:
  - `PhotoStrip({ urls, name }: { urls: string[]; name: string })`, which renders nothing for an empty list.
  - `PhotoViewer({ urls, name, startIndex, onClose })`, a modal `<dialog>`.

- [ ] **Step 1: Build `PhotoStrip`.**
  - A horizontal `overflow-x: auto` track with `scroll-snap-type: x mandatory` and `tabIndex={0}`, plus `aria-label="Food pics, {name}"`. It bleeds to the panel's right edge (negative right margin equal to the panel padding).
  - Each tile is a 120×120 `<button aria-label="Photo {i} of {n}, {name}">` with an `<img loading="lazy" width={120} height={120}>` (`object-fit: cover`).
  - `onError` hides that tile through a `failed` set in state.
  - Clicking opens `PhotoViewer` at that index.
- [ ] **Step 2: Build `PhotoViewer`.**
  - `showModal()` on mount, with an `onClose` prop on the `<dialog>`. Reset the site's `margin: 0` with `margin: auto` (see `app/reborn/admin.module.css` `.dialog`).
  - Inside, a full-width scroll-snap track of the photos (`object-fit: contain`, max 100% of the viewport), scrolled to `startIndex` on open.
  - "{i} / {n}" plus ‹ › buttons that scroll the track by one photo. The ← → keys do the same.
  - The ✕ button and Esc close it, and focus returns to the opening tile (keep its index; focus `button[aria-label^="Photo {i} "]` after close).
  - With a single photo, hide the arrows and the count.
- [ ] **Step 3: Update `RestaurantDetail`.**
  - Order: name, status, meta, `<PhotoStrip>`, notes, Food tried, actions, links, added date.
  - Food tried shows only when `r.foods.length > 0`: an `<h3>` "FOOD TRIED" in the existing uppercase label style, then a `<ul>` of `sortFoodsForDisplay(r.foods)`. Must try items get a `<span>` "Must try" tag in `--accent` (text plus a 1px border, no fill).
- [ ] **Step 4: Verify in the browser** with "ZZ Test Spot", via both the map pane and the List page drawer, on desktop and phone width, day and night:
  - The strip peeks and snaps, with keyboard scroll when focused.
  - In the viewer: arrows, keys, swipe (horizontal scroll), the count, and Esc returning focus.
  - A spot with one photo has no arrows; a spot with no photos and no foods looks exactly as before.
  - Search "laksa"-style matching finds the spot by a food name.
  - A deliberately broken URL tile is hidden (temporarily edit one URL via script, then restore it).
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib && npx next build`. Expected: all clean.
- [ ] **Step 6: Commit** `git commit -m "Show food pics and Food tried in the detail panel"`.

---

### Task 6: Clean up and close out

**Files:**
- Modify: `docs/superpowers/specs/2026-10-28-food-tried-and-photos-design.md` (status line)

- [ ] **Step 1: Delete the test data.** Remove "ZZ Test Spot" through the admin's Delete, which also removes its photos. Then list the bucket with a one-off script and remove any leftover `new/` test files from this session. Expected: the bucket holds no test files, and Lex's restaurants are unchanged.
- [ ] **Step 2: Confirm no temporary code remains:** `grep -rn "TEMP" app lib proxy.ts` prints nothing, and `git diff main --stat` shows only planned files.
- [ ] **Step 3: Update the spec's Status** to "built on 2026-10-28 (branch `phase4-food-photos`)".
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib proxy.ts && npx next build`. Expected: all clean.
- [ ] **Step 5: Commit** `git commit -m "Close out Phase 4: Food tried and food pics"`.
