# The Lick List — Design

## Purpose

A personal restaurant tracker for Lex. Combines a wishlist ("want to try") and
a diary ("tried") into one list of restaurants, each optionally containing
rated dishes. Lex is the only person who can add or edit entries; friends and
family can view the list read-only via a public link, with no login.

## Success criteria

- Lex can add a restaurant (via a pasted Google Maps link, tags, price,
  status, rating, notes, photos) from a simple admin page behind a password.
- Anyone with the site URL can view the list and map read-only, filtered by
  Tried / Want to Try / Both, with no account needed.
- Deployed on Vercel, data stored in Supabase (Postgres + Storage), all on
  free tiers.

## Architecture

- **Framework**: Next.js (App Router), deployed on Vercel.
- **Database**: Supabase Postgres.
- **File storage**: Supabase Storage (restaurant/dish photos).
- **Admin auth**: single shared password (`ADMIN_PASSWORD` env var), checked
  server-side and backed by an encrypted session cookie via `iron-session`
  (`SESSION_SECRET` env var, a random 32+ character string). No per-user
  accounts — there is only one admin (Lex).
- **Public access**: no auth. The homepage and its data are readable by
  anyone with the URL.
- **Database access model**: two Supabase keys with different privileges.
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe) is used for public reads,
  gated by an RLS policy that allows `SELECT` to anyone. All admin writes
  (`INSERT`/`UPDATE`) go through `SUPABASE_SERVICE_ROLE_KEY` — read only in
  server actions, never sent to the browser, bypasses RLS entirely. This
  means even someone who obtained the public anon key could not write data
  through it.
- **Map**: Mapbox GL JS via `react-map-gl`, chosen over Google Maps (requires
  a billing-enabled account) and Leaflet/OSM (dated default styling) for its
  free tier without a mandatory card on file and its themeable vector
  rendering.

## Pages

### `/` (public)

- Mapbox map with a pin per restaurant that has coordinates.
- A scrollable list of restaurants alongside/below the map.
- One filter control — Tried / Want to Try / Both — drives both the map pins
  and the list from the same filtered data set.
- Pin-click interaction (what clicking a pin shows/does) is designed when
  Phase 3 starts — see Phasing.

### `/admin/login` (public)

- Single password field. On success, sets a signed session cookie and
  redirects to `/admin`. On failure, shows a generic "invalid credentials"
  message.

### `/admin` (password-protected)

- Form to add a restaurant: name, Google Maps link, other links (website,
  Instagram, etc. — each with a type and URL, any number of them), cuisine
  tags, price range, status (wishlist/tried), rating, notes. (Photos are
  Phase 4 — see Phasing.)
- List of existing restaurants with edit links.

### `/admin/restaurants/[id]` (password-protected)

- Edit form for one restaurant, same fields as the add form on `/admin`.
- Dish management (add/edit dishes under this restaurant) is Phase 4 — the
  `Dish` table exists from Phase 2's migration, but no UI touches it yet.

## Data model

```
Restaurant
  id            uuid, primary key
  name          text, required
  maps_url      text              -- original pasted link, kept for reference/re-parsing
  lat           float, nullable   -- null if the link couldn't be parsed
  lng           float, nullable
  links         jsonb             -- [{ type: 'website' | 'instagram' | 'other', url: text }, ...]
  cuisine_tags  text[]
  price_range   text              -- e.g. "$", "$$", "$$$"
  status        enum('wishlist', 'tried')
  rating        integer, nullable
  notes         text, nullable
  photo_urls    text[]
  created_at    timestamp
  updated_at    timestamp

Dish
  id            uuid, primary key
  restaurant_id uuid, foreign key -> Restaurant
  name          text, required
  rating        integer, nullable
  notes         text, nullable
  photo_urls    text[]
  created_at    timestamp
  updated_at    timestamp
```

Both tables (full schema, including the as-yet-unused `photo_urls` columns)
are created by one SQL migration file committed to the repo
(`supabase/migrations/0001_init.sql`), run once by Lex in the Supabase SQL
Editor — no Supabase CLI or project-linking needed. RLS is enabled on both
(Supabase's auto-RLS setting covers tables created this way too); the only
policy needed in Phase 2 is public `SELECT`, since all writes go through the
service-role key, which bypasses RLS.

## Data flow

1. Lex submits the "add restaurant" form in `/admin`.
2. A server action parses the pasted Google Maps link into `lat`/`lng`:
   - A full link (containing `@lat,lng`) is parsed directly, no network call.
   - A short link (`maps.app.goo.gl/...`) is resolved via one redirect-follow
     request, then the resulting full URL is parsed the same way.
   - If parsing fails, the restaurant still saves, with `lat`/`lng` left
     null (no pin shown, visible in the admin list as "no location set").
3. (Phase 4) Any attached photos upload to a public Supabase Storage bucket
   (`restaurant-photos`) under `restaurant-photos/{restaurant_id}/{uuid}-
   {filename}`; their resulting public URLs are stored on the record.
4. The row is written to Postgres via the server action, using the
   service-role key (see Architecture).
5. The public page (`/`) fetches restaurants server-side on every request —
   no client-side database calls, no exposed credentials — and renders the
   map and list from that same data, filtered by the selected status.

## Error handling

- **Admin login failure**: generic "invalid credentials" message. No
  lockout/rate-limiting — single low-stakes user, not worth the complexity.
- **Unparseable Maps link**: inline warning on the form; the restaurant
  still saves without coordinates rather than blocking the submission.
- **Required fields** (name, status): validated both client- and
  server-side; inline error messages.
- **Photo upload failure**: fails only that photo; the rest of the
  submission (and other photos) still succeeds.

## Testing

Given the scale of this project (personal, single admin, low traffic), there
is no automated test suite planned upfront. Each feature is verified
manually in the browser as it's built. Automated tests can be added later if
the app grows in scope or contributors.

## Phasing

1. **Repo scaffold** — Next.js app created, Supabase project wired up
   (env vars, client), placeholder homepage. *(Complete; Vercel deploy step
   deferred — code is built and verified locally, not yet pushed live.)*
2. Data model (Restaurant, Dish tables) + admin auth + add/edit restaurants:
   the full restaurant form (name, maps link, links, cuisine tags, price,
   status, rating, notes) — no map on the public page yet, no photos, no
   dish UI. *(Current implementation target.)*
3. Mapbox map + status filter on the homepage, wired to live data. Pin-click
   interaction (what a clicked pin shows) is designed when this phase
   starts, not before.
4. Dishes (UI for the table created in Phase 2), photo uploads (restaurant
   and dish), any cuisine/price tag UI polish (e.g. filtering by tag).

Phase 1 is deliberately minimal: it proves the deployment pipeline (Vercel
+ Supabase) works end to end before any real feature is built on top of it.
