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
- **Admin auth**: single shared password (env var), checked against a signed
  session cookie (e.g. `iron-session`). No per-user accounts — there is only
  one admin (Lex).
- **Public access**: no auth. The homepage and its data are readable by
  anyone with the URL.
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
- Clicking a pin highlights/scrolls to its list entry (nice-to-have, not
  required for the first working version).

### `/admin/login` (public)

- Single password field. On success, sets a signed session cookie and
  redirects to `/admin`. On failure, shows a generic "invalid credentials"
  message.

### `/admin` (password-protected)

- Form to add a restaurant: name, Google Maps link, other links (website,
  Instagram, etc. — each with a type and URL, any number of them), cuisine
  tags, price range, status (wishlist/tried), rating, notes, photos.
- List of existing restaurants with edit links.
- Under each restaurant, a form to add/edit dishes: name, rating, notes,
  photos.

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

## Data flow

1. Lex submits the "add restaurant" form in `/admin`.
2. A server action parses the pasted Google Maps link into `lat`/`lng`:
   - A full link (containing `@lat,lng`) is parsed directly, no network call.
   - A short link (`maps.app.goo.gl/...`) is resolved via one redirect-follow
     request, then the resulting full URL is parsed the same way.
   - If parsing fails, the restaurant still saves, with `lat`/`lng` left
     null (no pin shown, visible in the admin list as "no location set").
3. Any attached photos upload to Supabase Storage; their resulting URLs are
   stored on the record.
4. The row is written to Postgres via the server action.
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
   (env vars, client), deployed to Vercel, placeholder homepage. *(This is
   the current implementation target.)*
2. Data model (Restaurant, Dish tables) + admin auth + add/edit restaurants
   (no map, no dishes yet).
3. Mapbox map + status filter on the homepage, wired to live data.
4. Dishes, photo uploads, cuisine/price tag polish.

Phase 1 is deliberately minimal: it proves the deployment pipeline (Vercel
+ Supabase) works end to end before any real feature is built on top of it.
