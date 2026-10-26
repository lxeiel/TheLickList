# Phase 2: Data Model + Admin Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Restaurant/Dish database schema, the public/admin two-key security model, password-gated admin auth, and a full restaurant add/edit admin UI — so Lex can add and edit restaurants (all fields except photos) through a real form instead of nothing existing yet.

**Architecture:** A SQL migration creates two Postgres tables with RLS (public `SELECT`, no public writes). A thin data-access layer (`lib/restaurants.ts`) does all reads/writes through a server-only Supabase client built from the service-role key, bypassing RLS for admin operations. `iron-session` backs a password check with an encrypted cookie; a route-group layout (`app/admin/(protected)/`) gates every admin page except the login page itself. Google Maps links are parsed into lat/lng by a small pure function, reused by both create and update.

**Tech Stack:** Next.js (App Router, TypeScript, Server Actions), `@supabase/supabase-js` (already installed), `iron-session` (new), Supabase Postgres + RLS.

**Spec:** [docs/superpowers/specs/2026-10-26-lick-list-design.md](../specs/2026-10-26-lick-list-design.md) — this plan implements Phase 2 from that spec's Phasing section. Phase 1 (scaffold) is already built and committed (commits `cc551a0..255e7e4` on `main`); Vercel deployment (Phase 1's Task 4) remains deferred and is untouched by this plan. Dishes UI and photo uploads are Phase 4, out of scope here.

## Global Constraints

- Public reads use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already in `.env.local`/Vercel), gated by an RLS policy allowing `SELECT` to anyone (spec, Architecture → Database access model).
- Admin writes use `SUPABASE_SERVICE_ROLE_KEY` — read only in server-side code, never exposed to the browser, bypasses RLS (spec, same section).
- Admin auth is one shared password (`ADMIN_PASSWORD` env var) backed by an `iron-session` encrypted cookie (`SESSION_SECRET` env var, 32+ random characters) (spec, Architecture → Admin auth).
- No automated test suite — the spec's Testing section specifies manual verification; every task below verifies with a real command against a real (or temporarily live) instance rather than a test runner.
- Restaurant fields in this phase: name, Google Maps link (parsed to lat/lng), links (website/instagram/other), cuisine tags, price range, status (wishlist/tried), rating, notes. No photos, no dish UI (spec, Phasing #2).
- Login failure shows a generic "invalid credentials" message, no lockout (spec, Error handling).
- Unparseable Maps link does not block saving; the restaurant saves with `lat`/`lng` left null (spec, Error handling and Data flow).

## Review Focus

- A Maps link with no `@lat,lng` segment (e.g. a plain search URL, or garbage text) must not throw — the restaurant still saves, with `lat`/`lng` null, per spec's Error handling. Covered in Task 2.
- A `maps.app.goo.gl` short link whose redirect fails (network error, dead link) must be caught the same way as an unparseable link, not crash the submission. Covered in Task 2.
- Submitting the admin form with an empty `name` must be rejected server-side (not just client-side, since a direct POST to the server action could skip client validation) per spec's Error handling "required fields" line. Covered in Task 5.
- A wrong `ADMIN_PASSWORD` must show the generic failure message without revealing whether the password was close or what the real one is. Covered in Task 4.
- Visiting `/admin` or `/admin/restaurants/[id]` directly without a valid session must redirect to `/admin/login`, not render admin content or throw. Covered in Task 4 (layout guard), exercised again implicitly by Task 5's pages.

---

## File Structure

- `supabase/migrations/0001_init.sql` — schema + RLS (Task 1)
- `lib/supabase.ts` — **modify**: add `getServiceClient()` (service-role key) and `getAnonClient()` (anon key) alongside the existing `checkSupabaseConnection` (Task 1)
- `lib/maps.ts` — `parseMapsUrl()` (Task 2)
- `lib/restaurants.ts` — `Restaurant`, `RestaurantInput` types + `listRestaurants`, `getRestaurant`, `createRestaurant`, `updateRestaurant` (Task 3)
- `lib/auth.ts` — `getSession()`, `login()`, `logout()`, `requireAdmin()` (Task 4)
- `app/admin/login/page.tsx`, `app/admin/login/actions.ts` — login page + server action (Task 4)
- `app/admin/(protected)/layout.tsx` — auth guard for every other `/admin/*` route (Task 4)
- `app/admin/(protected)/page.tsx`, `app/admin/(protected)/actions.ts` — `/admin`: list + add form (Task 5)
- `app/admin/(protected)/restaurants/[id]/page.tsx`, `app/admin/(protected)/restaurants/[id]/actions.ts` — `/admin/restaurants/[id]`: edit form (Task 5)
- `app/admin/RestaurantForm.tsx` — shared client-component form used by both add and edit pages (Task 5)
- `.env.example` — **modify**: add `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET` (Tasks 1 and 4)

## Task 1: Database schema + Supabase service/anon clients

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Modify: `lib/supabase.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getServiceClient(): SupabaseClient` and `getAnonClient(): SupabaseClient`, both exported from `lib/supabase.ts`. Task 3 consumes `getServiceClient()`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0001_init.sql`:

```sql
create type restaurant_status as enum ('wishlist', 'tried');

create table restaurant (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  maps_url      text,
  lat           double precision,
  lng           double precision,
  links         jsonb not null default '[]'::jsonb,
  cuisine_tags  text[] not null default '{}',
  price_range   text,
  status        restaurant_status not null default 'wishlist',
  rating        integer,
  notes         text,
  photo_urls    text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table dish (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurant(id) on delete cascade,
  name          text not null,
  rating        integer,
  notes         text,
  photo_urls    text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table restaurant enable row level security;
alter table dish enable row level security;

create policy "public can read restaurants" on restaurant for select using (true);
create policy "public can read dishes" on dish for select using (true);
```

(Table names are lowercase singular — `restaurant`/`dish` — per standard Postgres convention; the spec's `Restaurant`/`Dish` headings are documentation labels, not literal identifiers.)

- [ ] **Step 2 (human): Run the migration**

In the Supabase dashboard's SQL Editor, paste and run the contents of `supabase/migrations/0001_init.sql`.
Expected: both tables appear under Table Editor, each with RLS enabled (shown in the UI).

- [ ] **Step 3 (human): Add the service-role key**

In the Supabase dashboard under Settings → API, copy the **service_role** **secret** key. Add to `.env.local` (not committed):
```
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
```

- [ ] **Step 4: Document the new env var**

Add to `.env.example`:
```
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Implement `getServiceClient` and `getAnonClient` in `lib/supabase.ts`**

```ts
export function getServiceClient(): SupabaseClient
export function getAnonClient(): SupabaseClient
```

Both read `process.env.NEXT_PUBLIC_SUPABASE_URL` and call `createClient` from `@supabase/supabase-js` — `getServiceClient` with `process.env.SUPABASE_SERVICE_ROLE_KEY!`, `getAnonClient` with `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`. Throw a clear `Error` (e.g. `"SUPABASE_SERVICE_ROLE_KEY is not set"`) if the relevant key is missing — unlike `checkSupabaseConnection`, these are only ever called from code paths that require a working connection, so failing loudly here is correct (no silent `{ok:false}` return like the connectivity check has).

- [ ] **Step 6: Manual verification — schema reachable with the service key**

Run (Node's built-in `--env-file` loads `.env.local` directly, no extra dependency):
```bash
node --env-file=.env.local --experimental-strip-types -e "
import('./lib/supabase.ts').then(async ({ getServiceClient }) => {
  const { data, error } = await getServiceClient().from('restaurant').select('*');
  console.log(error ? 'ERROR: ' + error.message : 'OK, rows: ' + data.length);
});
"
```
Expected: `OK, rows: 0` (table exists and is empty).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0001_init.sql lib/supabase.ts .env.example
git commit -m "Add Restaurant/Dish schema and service/anon Supabase clients"
```

## Task 2: Google Maps link parsing

**Files:**
- Create: `lib/maps.ts`

**Interfaces:**
- Produces: `parseMapsUrl(url: string): Promise<{ lat: number; lng: number } | null>`, exported from `lib/maps.ts`. Task 3's `createRestaurant`/`updateRestaurant` consume this.

- [ ] **Step 1: Implement `parseMapsUrl` in `lib/maps.ts`**

```ts
export async function parseMapsUrl(url: string): Promise<{ lat: number; lng: number } | null>
```

Behavior (the algorithm the signature doesn't determine):
- Try matching `url` against `/@(-?\d+\.\d+),(-?\d+\.\d+)/`. If it matches, return `{ lat: Number(match[1]), lng: Number(match[2]) }`.
- Otherwise, if `url`'s host is `maps.app.goo.gl` (or any host — don't special-case, just try it for any non-matching URL), `fetch(url)` to follow the redirect (wrapped in try/catch), then match the same regex against `response.url` (the resolved final URL). Return the parsed coordinates if found.
- If nothing matches, or the fetch throws, return `null`. Never throw out of this function.

- [ ] **Step 2: Manual verification — full link parses directly**

Run:
```bash
node --experimental-strip-types -e "
import('./lib/maps.ts').then(async ({ parseMapsUrl }) => {
  console.log(await parseMapsUrl('https://www.google.com/maps/place/Example/@40.7128,-74.006,15z/data=xyz'));
});
"
```
Expected: `{ lat: 40.7128, lng: -74.006 }`.

- [ ] **Step 3: Manual verification — unparseable link returns null, doesn't throw**

Run:
```bash
node --experimental-strip-types -e "
import('./lib/maps.ts').then(async ({ parseMapsUrl }) => {
  console.log(await parseMapsUrl('not a url at all'));
});
"
```
Expected: `null` (no thrown error) — this is the Review Focus case for an unparseable link.

- [ ] **Step 4: Manual verification — unreachable host returns null, doesn't throw**

Run:
```bash
node --experimental-strip-types -e "
import('./lib/maps.ts').then(async ({ parseMapsUrl }) => {
  console.log(await parseMapsUrl('https://this-host-does-not-exist.invalid/foo'));
});
"
```
Expected: `null` (the `fetch` throws internally, caught, no coordinates) — this is the Review Focus case for a redirect/network failure.

- [ ] **Step 5: Commit**

```bash
git add lib/maps.ts
git commit -m "Add Google Maps link parsing"
```

## Task 3: Restaurant data access layer

**Files:**
- Create: `lib/restaurants.ts`

**Interfaces:**
- Consumes: `getServiceClient()` from `lib/supabase.ts` (Task 1); `parseMapsUrl()` from `lib/maps.ts` (Task 2).
- Produces: `Restaurant`, `RestaurantLink`, `RestaurantStatus`, `RestaurantInput` types, and `listRestaurants(): Promise<Restaurant[]>`, `getRestaurant(id: string): Promise<Restaurant | null>`, `createRestaurant(input: RestaurantInput): Promise<Restaurant>`, `updateRestaurant(id: string, input: RestaurantInput): Promise<Restaurant>`, all exported from `lib/restaurants.ts`. Task 5's server actions consume all four functions and the types.

- [ ] **Step 1: Define the types**

```ts
export type RestaurantLink = { type: "website" | "instagram" | "other"; url: string };
export type RestaurantStatus = "wishlist" | "tried";

export type Restaurant = {
  id: string;
  name: string;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  links: RestaurantLink[];
  cuisine_tags: string[];
  price_range: string | null;
  status: RestaurantStatus;
  rating: number | null;
  notes: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
};

export type RestaurantInput = {
  name: string;
  maps_url: string;
  links: RestaurantLink[];
  cuisine_tags: string[];
  price_range: string | null;
  status: RestaurantStatus;
  rating: number | null;
  notes: string | null;
};
```

- [ ] **Step 2: Implement `listRestaurants` and `getRestaurant`**

```ts
export async function listRestaurants(): Promise<Restaurant[]>
export async function getRestaurant(id: string): Promise<Restaurant | null>
```

Both query the `restaurant` table via `getServiceClient()`. `listRestaurants` orders by `created_at` descending and throws if `error` is set (let the caller's error boundary handle it — there's no recoverable action here). `getRestaurant` returns `null` on a "no rows" result, throws on any other error.

- [ ] **Step 3: Implement `createRestaurant` and `updateRestaurant`**

```ts
export async function createRestaurant(input: RestaurantInput): Promise<Restaurant>
export async function updateRestaurant(id: string, input: RestaurantInput): Promise<Restaurant>
```

Both call `await parseMapsUrl(input.maps_url)` first, then insert/update a row with `maps_url: input.maps_url`, `lat`/`lng` from the parse result (or `null`/`null` if parsing returned `null` — never block the write), and the rest of `input`'s fields passed through directly. Both throw on a Supabase error, otherwise return the written row.

- [ ] **Step 4: Manual verification — create, then read back**

Run:
```bash
node --env-file=.env.local --experimental-strip-types -e "
import('./lib/restaurants.ts').then(async ({ createRestaurant, listRestaurants }) => {
  const created = await createRestaurant({
    name: 'Test Diner',
    maps_url: 'https://www.google.com/maps/place/Test/@1.23,4.56,15z',
    links: [], cuisine_tags: [], price_range: null, status: 'wishlist',
    rating: null, notes: null,
  });
  console.log('created lat/lng:', created.lat, created.lng);
  const all = await listRestaurants();
  console.log('list length:', all.length);
});
"
```
Expected: `created lat/lng: 1.23 4.56` and `list length: 1`.

- [ ] **Step 5: Clean up the test row**

In the Supabase Table Editor (or via a one-off `getServiceClient().from('restaurant').delete().eq('name', 'Test Diner')` call), delete the "Test Diner" row created in Step 4 so Task 5's manual verification starts from an empty table.

- [ ] **Step 6: Commit**

```bash
git add lib/restaurants.ts
git commit -m "Add Restaurant data access layer"
```

## Task 4: Admin auth

**Files:**
- Create: `lib/auth.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/actions.ts`
- Create: `app/admin/(protected)/layout.tsx`
- Modify: `.env.example`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Produces: `getSession()`, `login(password: string): Promise<boolean>`, `logout(): Promise<void>`, `requireAdmin(): Promise<void>` (redirects to `/admin/login` via Next.js `redirect()` if the session isn't authenticated; resolves normally otherwise), all exported from `lib/auth.ts`. Task 5's protected pages and their layout consume `requireAdmin()`; `app/admin/login/actions.ts` consumes `login()`.

- [ ] **Step 1: Install `iron-session`**

Run: `npm install iron-session`

- [ ] **Step 2 (human): Set ADMIN_PASSWORD and SESSION_SECRET**

Choose an admin password and add to `.env.local`:
```
ADMIN_PASSWORD=<your chosen password>
SESSION_SECRET=<32+ random characters>
```
(A random `SESSION_SECRET` can be generated with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` if you don't want to pick one by hand.)

- [ ] **Step 3: Document the new env vars**

Add to `.env.example`:
```
ADMIN_PASSWORD=
SESSION_SECRET=
```

- [ ] **Step 4: Implement `lib/auth.ts`**

```ts
export type SessionData = { isAdmin?: boolean };
export async function getSession(): Promise<IronSession<SessionData>>
export async function login(password: string): Promise<boolean>
export async function logout(): Promise<void>
export async function requireAdmin(): Promise<void>
```

- `getSession()` calls `getIronSession<SessionData>(await cookies(), sessionOptions)` (from `iron-session`, `cookies` from `next/headers`), with `sessionOptions = { password: process.env.SESSION_SECRET!, cookieName: "lick-list-session" }`.
- `login(password)` returns `false` immediately if `password !== process.env.ADMIN_PASSWORD`. Otherwise sets `session.isAdmin = true`, calls `session.save()`, returns `true`.
- `logout()` calls `session.destroy()`.
- `requireAdmin()` reads the session; if `session.isAdmin` isn't `true`, calls Next.js's `redirect("/admin/login")` (from `next/navigation`) — which throws internally, so nothing after the call in a caller runs.

- [ ] **Step 5: Implement the login page and action**

`app/admin/login/actions.ts`:
```ts
export async function loginAction(formData: FormData): Promise<{ error?: string }>
```
Calls `login(String(formData.get("password")))`; on success calls `redirect("/admin")`; on failure returns `{ error: "Invalid credentials" }` (the spec's generic message — same text regardless of why the password didn't match).

`app/admin/login/page.tsx`: a client component with a `<form>` (password field, submit button) that calls `loginAction` via `useActionState` (or an equivalent client-side call to the server action) and renders `error` if present.

- [ ] **Step 6: Implement the protected layout**

`app/admin/(protected)/layout.tsx`: a server component whose body is `await requireAdmin(); return children;` (plus whatever minimal wrapping markup — none required functionally). Every page placed under `app/admin/(protected)/` inherits this guard; `app/admin/login/` is a sibling, not nested under it, so it stays reachable without a session.

- [ ] **Step 7: Manual verification — wrong password rejected, right password admitted**

Run `npm run dev`, open `/admin/login`.
- Submit an incorrect password. Expected: page shows "Invalid credentials", stays on `/admin/login` (Review Focus: generic message, no hint).
- Submit the correct `ADMIN_PASSWORD`. Expected: redirected to `/admin` (which doesn't exist as a page yet until Task 5 — a 404 at this point is fine and still proves the redirect happened; confirm via the browser's address bar showing `/admin`).

- [ ] **Step 8: Manual verification — guard blocks a direct unauthenticated visit**

In a private/incognito window (no session cookie), visit `/admin` directly.
Expected: redirected to `/admin/login` — this is the Review Focus case for the layout guard. (This will currently redirect successfully even though `/admin` itself isn't built yet, since the layout runs before the missing page would 404.)

- [ ] **Step 9: Commit**

```bash
git add lib/auth.ts app/admin/login app/admin/\(protected\) .env.example package.json package-lock.json
git commit -m "Add password-gated admin auth with iron-session"
```

## Task 5: Admin restaurant UI (add + edit)

**Files:**
- Create: `app/admin/RestaurantForm.tsx`
- Create: `app/admin/(protected)/page.tsx`
- Create: `app/admin/(protected)/actions.ts`
- Create: `app/admin/(protected)/restaurants/[id]/page.tsx`
- Create: `app/admin/(protected)/restaurants/[id]/actions.ts`

**Interfaces:**
- Consumes: `listRestaurants`, `getRestaurant`, `createRestaurant`, `updateRestaurant`, and the `Restaurant`/`RestaurantInput` types from `lib/restaurants.ts` (Task 3); `requireAdmin()` already applied by the inherited `(protected)` layout (Task 4) — these pages don't call it directly.
- Produces: nothing further tasks in this plan consume (Phase 4 will add a dish sub-section to the edit page later).

- [ ] **Step 1: Implement the shared form component**

`app/admin/RestaurantForm.tsx`: a client component, `RestaurantForm({ initial, onSubmit }: { initial?: Restaurant; onSubmit: (input: RestaurantInput) => Promise<{ error?: string }> })`. Fields, matching `RestaurantInput`: name (text, required), Google Maps link (text, required — maps to `maps_url`), links (a repeatable list of type-select + URL-text pairs, add/remove rows, starts empty or from `initial.links`), cuisine tags (a single text input, comma-separated, split/joined on submit), price range (text or select — `$`/`$$`/`$$$`/`$$$$`), status (select: wishlist/tried), rating (number input, optional), notes (textarea, optional). Calls `onSubmit` with the assembled `RestaurantInput` on submit; renders the returned `error` if present. Pre-fills every field from `initial` when provided (the edit case), leaves them empty otherwise (the add case).

- [ ] **Step 2: Implement `/admin` (list + add)**

`app/admin/(protected)/actions.ts`:
```ts
export async function createRestaurantAction(input: RestaurantInput): Promise<{ error?: string }>
```
Validates `input.name.trim()` is non-empty (Review Focus: server-side required-field check — a direct POST bypassing the client could otherwise skip it), returning `{ error: "Name is required" }` if not. Otherwise calls `createRestaurant(input)` and, on success, Next.js `redirect("/admin")`.

`app/admin/(protected)/page.tsx`: a server component. Calls `listRestaurants()`, renders each as a row (name, status, a link to `/admin/restaurants/[id]`), and renders `<RestaurantForm onSubmit={createRestaurantAction} />` above or below the list.

- [ ] **Step 3: Implement `/admin/restaurants/[id]` (edit)**

`app/admin/(protected)/restaurants/[id]/actions.ts`:
```ts
export async function updateRestaurantAction(id: string, input: RestaurantInput): Promise<{ error?: string }>
```
Same `name` validation as `createRestaurantAction`. Otherwise calls `updateRestaurant(id, input)` and, on success, `redirect("/admin")`.

`app/admin/(protected)/restaurants/[id]/page.tsx`: a server component. Reads `params.id`, calls `getRestaurant(id)`; if `null`, calls Next.js `notFound()`. Otherwise renders `<RestaurantForm initial={restaurant} onSubmit={updateRestaurantAction.bind(null, id)} />`.

- [ ] **Step 4: Manual verification — add a restaurant end to end**

`npm run dev`, log in at `/admin/login`, on `/admin` fill the form (name "Verification Cafe", the same Maps link used in Task 3 Step 4, one link of type website, two cuisine tags, price range `$$`, status `tried`, rating `4`, notes "test"), submit.
Expected: redirected to `/admin`, "Verification Cafe" appears in the list.

- [ ] **Step 5: Manual verification — empty name rejected server-side**

On `/admin`, submit the form with the name field cleared (if the client-side `required` attribute blocks this, temporarily remove it in the browser devtools to force the empty submission through, or submit via a direct `fetch` POST to the action).
Expected: form re-renders with "Name is required", no new row created — this is the Review Focus case for server-side required-field validation.

- [ ] **Step 6: Manual verification — edit round-trips correctly**

Click into "Verification Cafe" from the `/admin` list, confirm every field shows the Step 4 values, change the rating to `5`, submit.
Expected: redirected to `/admin`; re-opening the same restaurant shows rating `5` and every other field unchanged.

- [ ] **Step 7: Clean up the verification row**

Delete "Verification Cafe" via the Supabase Table Editor (no delete UI exists yet — deletion isn't in this phase's scope).

- [ ] **Step 8: Commit**

```bash
git add app/admin
git commit -m "Add admin restaurant list, add, and edit pages"
```
