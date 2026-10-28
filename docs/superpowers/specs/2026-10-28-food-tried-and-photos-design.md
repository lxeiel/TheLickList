# Food tried and food pics (Phase 4) — design

Status: built on 2026-10-28 (branch `phase4-food-photos`). Migration 0003 has been run.

Phase 4 of the original spec ([2026-10-26-lick-list-design.md](2026-10-26-lick-list-design.md)) planned a Dish table with per-dish scores, notes and photos, plus restaurant photos. Lex simplified it:

- **Food tried** replaces dishes: an optional list of food names on the restaurant, each optionally tagged **Must try**. No dish scores, no dish notes. The restaurant's notes keep the commentary.
- **Food pics** are food photos Lex uploads, shown on the restaurant. They aren't tied to individual foods.

Out of scope: the cuisine/price tag polish and the filter menu scrolling (next, as their own piece); the unused `dish` table (left as is); per-restaurant pages.

## Success criteria

- Lex can add, reorder and remove food pics and Food tried items from the `/reborn` restaurant popup, on a laptop and a phone.
- The public detail panel shows a swipeable photo strip and a Food tried list when a spot has them, and nothing extra when it doesn't.
- Searching a food name on the public site finds the spots where Lex had it.
- A failed photo upload never loses the rest of the form.

## Data and storage

### Food tried

- New column `restaurant.foods jsonb not null default '[]'`: an ordered list of `{ name: string, must_try: boolean }`.
- Type: `FoodItem = { name: string; must_try: boolean }`; `Restaurant.foods: FoodItem[]` and `RestaurantInput.foods: FoodItem[]`.
- On save: names are trimmed and blank rows dropped. Limits: at most 40 items, each name at most 80 characters (validation error otherwise).
- Stored order is the order Lex entered. Display order is Must try first, then the rest, each group keeping its stored order.

### Food pics

- Stored in the existing, unused `restaurant.photo_urls text[]`, as public URLs. Array order is strip order.
- Files live in a public Supabase Storage bucket `restaurant-photos`, at `restaurant-photos/{restaurant_id or "new"}/{uuid}.jpg`. New restaurants upload under `new/` because they have no id until saved.
- At most 12 photos per restaurant.
- On save, every URL must start with `{SUPABASE_URL}/storage/v1/object/public/restaurant-photos/` (validation error otherwise), so the column can only point at Lex's own bucket.

### Upload path

1. Lex picks photos in the popup (JPEG, PNG, WebP or HEIC; iPhones usually hand over HEIC as JPEG).
2. The browser shrinks each one to at most 1600px on the long side and re-encodes it as JPEG (quality ~0.82), aiming at 200–400 KB. A file the browser can't decode (e.g. HEIC in Chrome) fails that photo with "Couldn't read this photo. Try a JPEG."
3. A server action, after `requireAdmin()`, creates a signed upload URL for one new path in `restaurant-photos` and returns it.
4. The browser uploads the file directly to that URL. Photo bytes never pass through the Next.js server, avoiding its request size limits.
5. The resulting public URL joins the form's photo list. It's saved onto the restaurant only when Lex presses Save.

### Migration

`supabase/migrations/0003_foods_and_photos.sql`, run once by Lex in the Supabase SQL Editor (like 0001/0002):

- `alter table restaurant add column foods jsonb not null default '[]'::jsonb;`
- Create the public bucket `restaurant-photos` with a file size limit (5 MB) and allowed types `image/jpeg`, `image/png`, `image/webp`. Public buckets are readable without policies; uploads only happen through server-issued signed URLs.

## Admin (`/reborn` popup)

Both sections sit below Notes in the existing add/edit popup.

### Food tried

- Same pattern as Links: **Add food** adds a row with a name input, a **Must try** checkbox and **Remove**.
- Blank rows are ignored on save.

### Food pics

- **Add photos** opens the file picker, with multiple selection allowed.
- Each photo shows as a square thumbnail. While uploading it shows a spinner; when it fails it shows an error with **Retry**.
- Each thumbnail has **✕** (remove) and **← / →** (move earlier/later). There's no drag and drop.
- **Add photos** hides once there are 12 photos.
- **Save waits for uploads**: while any are in progress, Save reads "Uploading 2 photos…" and is unavailable. Failed photos are left out of the save; the rest of the form saves normally.
- **Nothing is final until Save**:
  - On save, photos removed from a restaurant are deleted from storage (old list minus new list).
  - On Cancel, the restaurant's saved photos are untouched. Files uploaded during a cancelled edit stay in storage unused; accepted, as they're small and this never deletes a kept photo.
  - Deleting a restaurant deletes all its photo files.
  - A storage deletion that fails is logged on the server and doesn't fail the save or delete.

### List rows

The grey details line gains a photo count (e.g. "3 photos") when a spot has any. Nothing else changes.

## Public detail panel

`RestaurantDetail` (shared by the map pane/sheet and the list drawer/sheet), top to bottom:

1. Name
2. Status · score
3. Area · cuisine · price
4. **Food pics strip** (only when there are photos)
5. Notes
6. **Food tried** (only when there are items)
7. Google Maps / Website / Instagram buttons
8. Added date

### Food pics strip (option A, chosen from mockups)

- A horizontal row of square photos (~120px), scrolling sideways with scroll-snap. It reaches the panel's right edge so the next photo peeks in.
- Swipe on touch; scroll sideways on a trackpad; the strip is focusable for arrow keys.
- Images load lazily, with explicit width and height so nothing jumps.
- Each photo is a button labelled "Photo 2 of 5, {restaurant name}".
- A photo whose URL fails to load is hidden rather than shown broken.

### Full-size viewer

- Opens on tapping or clicking a photo: a modal `<dialog>` over a dark backdrop, with the photo fitted to the screen, a "2 / 5" count, **✕**, and ‹ › buttons.
- Moves between photos by swiping (scroll-snap track), ‹ › buttons, or the ← → keys.
- Esc or ✕ closes it and returns focus to the photo that opened it.
- With a single photo, the arrows and count are hidden.

### Food tried

- Heading "FOOD TRIED" in the site's uppercase label style, then one food per line.
- Must try items come first, each with a small emerald "Must try" tag (text, not colour alone).

## Search

The public search (`applyFilters` in `lib/filters.ts`, used by the map and list pages) also matches food names, so "laksa" finds every spot with laksa in Food tried. The admin column searches get the same matching through the shared function.

## Error handling

| Situation | What happens |
| --- | --- |
| Photo upload fails | That thumbnail shows an error with Retry; the rest of the form still saves |
| Photo can't be decoded | That photo fails with "Couldn't read this photo. Try a JPEG." |
| Save fails | Popup stays open with changes and uploads intact; "Save failed" as today |
| Storage delete fails | Logged on the server; the save or delete still succeeds |
| Photo URL broken on the public site | That tile is hidden |
| Upload URL requested without an admin session | Refused; nothing is issued |

## Testing

Automated (Vitest):

- Food tried normalising: trimming, blank rows dropped, limits, Must try first with stable order.
- Search matching food names, with existing filter tests still passing.
- Photo diff on save: which storage paths to delete when photos are removed, and on restaurant delete.
- Validation: at most 12 photos; only `restaurant-photos` URLs accepted.
- The upload-URL action refuses without an admin session.

In the browser (desktop and phone, day and night):

- The strip, swipe/scroll and peek; the viewer's arrows, keys, Esc and focus return.
- The popup's Food tried rows, photo picking, reordering, removing, Retry, and Save waiting for uploads.
- Uses a clearly named test restaurant and test photos, all deleted afterwards. Lex's real restaurants are never edited.

## Rollout

1. Lex runs `0003_foods_and_photos.sql` in the Supabase SQL Editor (the one manual step).
2. Built on a branch; all checks above pass before Lex sees it, and nothing merges without Lex's go-ahead.
