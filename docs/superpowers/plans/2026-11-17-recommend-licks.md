# Recommend Licks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors send restaurant recommendations from a Recommend Licks popup; Lex reviews them in a Recs inbox on `/reborn` and adds one to Gotta Lick or dismisses it.

**Architecture:** A new `recommendation` table with no public grants, written only by a public server action that runs BotID, a hidden trap field, a per-visitor hourly limit (keyed IP hash) and an inbox cap before inserting with the service client. One client popup, provided from the root layout, is opened from the About Me contact list, the map's list panel, the list page header and `/#recommend`. The admin page lists waiting recs; adding one reuses the existing add popup, pre-filled, and deletes the rec once the restaurant saves.

**Tech Stack:** Next.js 16.4 App Router (`cacheComponents`), React 19, Supabase JS 2 (Postgres), Vercel BotID (`botid`), CSS Modules, Vitest 4 (Node environment, no DOM), Phosphor icons.

**Spec:** [docs/superpowers/specs/2026-11-17-recommend-licks-design.md](../specs/2026-11-17-recommend-licks-design.md)

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API (AGENTS.md). Admin actions refresh with `refresh()` from `next/cache`; the public submit action doesn't refresh anything.
- Branch `recommend-licks`, created before any code (Task 1). Nothing merges without Lex's go-ahead.
- Field limits after trimming: shop name 1–100, Maps link ≤ 500 and must match `^https?://` (case-insensitive), notes ≤ 1000, your name ≤ 50. Empty optional fields are stored as null.
- Per-visitor limit: 10 recs per rolling hour. Inbox cap: 200 waiting recs.
- IP hash: HMAC-SHA256 of the client IP, keyed with `SESSION_SECRET`, hex. Raw IPs are never stored; `ip_hash` is never sent to any browser.
- Label everywhere: "Recommend Licks". Not in the top menu, not among the map's right-hand buttons, no prompt on empty search results, How it works unchanged.
- Popup copy, verbatim: title "Recommend Licks"; subtitle "Know somewhere I should try? Tell me."; labels "Shop name", "Google Maps link", "Notes", "Your name"; Maps hint "In Google Maps, tap Share, then Copy link"; notes placeholder "Dishes to try, why you love it"; name hint "Only I see this"; button "Send it" / "Sending…"; thanks "Thanks!", "I'll check it out.", button "Recommend another".
- Error copy, verbatim: "Add the shop's name", "The Maps link should start with https://", "Shop name is too long", "Google Maps link is too long", "Notes are too long", "Your name is too long", "That's a lot of recs! Try again in a bit.", "My inbox is full right now, try again later.", "Couldn't send that. Try again.", "Couldn't dismiss it".
- Admin copy: section heading "Recs" with the count; "from {name}"; "Google Maps link"; buttons "Add to Gotta Lick", "Dismiss"; confirm "Dismiss {name}?" with "Yes, dismiss" / "Keep".
- Public UI uses only tokens from `app/globals.css`, day and night. Admin UI uses `app/reborn/admin.module.css`. Phone breakpoint is `PHONE_QUERY` / `(max-width: 767px)`.
- Every admin action calls `requireAdmin()` first. The public action never does, and never returns rows.
- Tests are Node-only: browser-only code (`<dialog>`, layout) is verified in the browser, never with Vitest.
- Browser checks use recs named "ZZ Test Rec" and a restaurant named "ZZ Test Spot", all deleted at the end. Lex's real restaurants are never edited.

## Review Focus

1. **A visitor pastes a Maps link or name with spaces around it, or types only spaces in an optional field.** They expect it to send; the rec is stored trimmed, with blank optional fields as null (Task 2 `normalizeRecommendation` tests).
2. **A visitor behind a proxy, where `x-forwarded-for` lists several addresses.** They expect to be counted as themselves, not lumped with everyone behind the same last hop: the first address is used (Task 2 `clientIp` test).
3. **Someone posts to the action directly, skipping the form's `maxLength`.** They expect a refusal, not a database error: server validation catches a 101-character name (Task 2 and Task 3 tests).
4. **Lex adds a rec, but the save fails (e.g. the rec had no Maps link and Lex didn't add one).** Lex expects the rec still in the inbox: nothing is deleted unless the restaurant was created (Task 6 action tests).
5. **Notes with line breaks or one very long word.** Lex expects them readable in the inbox, line breaks kept, nothing spilling past the row (Task 6 browser check with a long unbroken URL in notes).

---

### Task 1: Feature branch

**Files:**
- Modify: `lib/site.ts` (already changed on `main`, uncommitted: Instagram `href: ""`)
- Add: `docs/superpowers/specs/2026-11-17-recommend-licks-design.md`, `docs/superpowers/plans/2026-11-17-recommend-licks.md`

- [ ] **Step 1: Create the branch** `git switch -c recommend-licks` from `main`. The uncommitted `lib/site.ts` change and both docs come along. If working in a separate worktree instead (superpowers:using-git-worktrees), copy both docs in and re-apply the `lib/site.ts` change there: Instagram's `href` is `""`, with the existing comment.
- [ ] **Step 2: Check** `git diff lib/site.ts` shows only Instagram's `href` emptied.
- [ ] **Step 3: Commit** the two separately:
  `git add lib/site.ts && git commit -m "Hide the Instagram contact link"`
  `git add docs/superpowers && git commit -m "Add Recommend Licks spec and plan"`

---

### Task 2: Data model and recommendation rules

**Files:**
- Create: `supabase/migrations/0005_recommendations.sql`
- Create: `lib/recommendations.ts`, `lib/recommendations.test.ts`

**Interfaces:**
- Produces (`lib/recommendations.ts`):
  - `type Recommendation = { id: string; name: string; maps_url: string | null; notes: string | null; from_name: string | null; created_at: string }`
  - `type RecommendationInput = { name: string; maps_url: string; notes: string; from_name: string }`
  - `type NormalizedRecommendation = { name: string; maps_url: string | null; notes: string | null; from_name: string | null }`
  - Constants: `MAX_REC_NAME = 100`, `MAX_REC_MAPS_URL = 500`, `MAX_REC_NOTES = 1000`, `MAX_REC_FROM = 50`, `REC_HOURLY_LIMIT = 10`, `REC_INBOX_CAP = 200`, `NO_IP = "unknown"`
  - `normalizeRecommendation(input: RecommendationInput): NormalizedRecommendation`: trims every field; empty optional fields become null. Non-string fields (a direct post) count as empty.
  - `validateRecommendation(rec: NormalizedRecommendation): string | null`: the Global Constraints messages, checked in field order (name empty, name too long, Maps link not http(s), Maps link too long, notes, your name).
  - `clientIp(headers: { get(name: string): string | null }): string`: first comma-separated entry of `x-forwarded-for`, trimmed; else `x-real-ip`; else `NO_IP`.
  - `hashIp(ip: string, key: string): string`: HMAC-SHA256 hex (`node:crypto` `createHmac`).
  - Data (service client, `getServiceClient()` from `lib/supabase.ts`; each throws on a Supabase error, like `lib/restaurants.ts`):
    - `listRecommendations(): Promise<Recommendation[]>`: selects exactly `id, name, maps_url, notes, from_name, created_at` (never `ip_hash`), newest first.
    - `countRecentFromIp(ipHash: string, since: Date): Promise<number>`: count with `head: true`, `ip_hash = ipHash` and `created_at >= since`.
    - `countWaiting(): Promise<number>`
    - `insertRecommendation(rec: NormalizedRecommendation, ipHash: string): Promise<void>`
    - `deleteRecommendation(id: string): Promise<void>`

- [ ] **Step 1: Write the migration** `0005_recommendations.sql` exactly as in the spec's Data section (table with check constraints, the `(ip_hash, created_at)` index, RLS enabled with no policies, and `grant select, insert, delete ... to service_role` only), headed with the same "Run once in the Supabase SQL Editor" comment as 0003.

- [ ] **Step 2: Write failing tests** in `lib/recommendations.test.ts`:

```ts
const blank = { name: "", maps_url: "", notes: "", from_name: "" };

test("normalizeRecommendation trims and turns blank optional fields into null", () => {
  expect(normalizeRecommendation({ name: "  Kopi Tiam 88 ", maps_url: " https://maps.app.goo.gl/abc ", notes: "   ", from_name: " Sam " }))
    .toEqual({ name: "Kopi Tiam 88", maps_url: "https://maps.app.goo.gl/abc", notes: null, from_name: "Sam" });
});
test("normalizeRecommendation treats non-string fields as empty", () => {
  expect(normalizeRecommendation({ name: 42, maps_url: null, notes: undefined, from_name: {} } as never))
    .toEqual({ name: "", maps_url: null, notes: null, from_name: null });
});
test("validateRecommendation requires a name", () => {
  expect(validateRecommendation(normalizeRecommendation({ ...blank, name: "   " }))).toBe("Add the shop's name");
});
test("validateRecommendation enforces each limit", () => {
  const ok = { name: "A", maps_url: null, notes: null, from_name: null };
  expect(validateRecommendation({ ...ok, name: "x".repeat(100) })).toBeNull();
  expect(validateRecommendation({ ...ok, name: "x".repeat(101) })).toBe("Shop name is too long");
  expect(validateRecommendation({ ...ok, maps_url: "https://" + "x".repeat(493) })).toBe("Google Maps link is too long");
  expect(validateRecommendation({ ...ok, notes: "x".repeat(1001) })).toBe("Notes are too long");
  expect(validateRecommendation({ ...ok, from_name: "x".repeat(51) })).toBe("Your name is too long");
});
test("validateRecommendation accepts only http(s) Maps links", () => {
  const ok = { name: "A", maps_url: null, notes: null, from_name: null };
  expect(validateRecommendation({ ...ok, maps_url: "HTTPS://maps.app.goo.gl/x" })).toBeNull();
  expect(validateRecommendation({ ...ok, maps_url: "javascript:alert(1)" })).toBe("The Maps link should start with https://");
  expect(validateRecommendation({ ...ok, maps_url: "maps.app.goo.gl/x" })).toBe("The Maps link should start with https://");
});
test("clientIp takes the first forwarded address, then x-real-ip, then a placeholder", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  expect(clientIp(h({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe("1.2.3.4");
  expect(clientIp(h({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  expect(clientIp(h({}))).toBe(NO_IP);
});
test("hashIp is stable per key and hides the IP", () => {
  const a = hashIp("1.2.3.4", "k");
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(hashIp("1.2.3.4", "k")).toBe(a);
  expect(hashIp("1.2.3.5", "k")).not.toBe(a);
  expect(hashIp("1.2.3.4", "other")).not.toBe(a);
  expect(a).not.toContain("1.2.3.4");
});
```

- [ ] **Step 3: Run** `npx vitest run lib/recommendations.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `lib/recommendations.ts` per the Interfaces block.
- [ ] **Step 5: Run** `npx vitest run lib/recommendations.test.ts && npx tsc --noEmit`. Expected: PASS, clean.
- [ ] **Step 6: Ask Lex to run `0005_recommendations.sql`** in the Supabase SQL Editor. Then confirm with a one-off script (scratchpad, not committed): `countWaiting()` returns 0 through the service client, and the anon client's `select("*")` on `recommendation` returns an error (permission denied).
- [ ] **Step 7: Commit** `git commit -m "Add the recommendation table and rules"`.

---

### Task 3: Public submit action and BotID

**Files:**
- Create: `app/_actions/recommend.ts`, `app/_actions/recommend.test.ts`
- Create: `instrumentation-client.ts` (repo root)
- Modify: `package.json`, `package-lock.json` (`npm i botid`)

**Interfaces:**
- Consumes: everything in Task 2's `lib/recommendations.ts`.
- Produces: `submitRecommendationAction(input: RecommendationInput & { website?: string }): Promise<{ ok: true } | { error: string }>` in a `"use server"` file. `website` is the trap field.

- [ ] **Step 1: Install** `npm i botid`. Write `instrumentation-client.ts`: `initBotId({ protect: [{ path: "/", method: "POST" }, { path: "/list", method: "POST" }] })` from `botid/client/core`, with a comment that these are the pages the Recommend Licks popup's server action posts from. No `next.config.ts` change (Vercel's current docs: the `withBotId` wrapper is no longer needed).

- [ ] **Step 2: Write failing tests** in `app/_actions/recommend.test.ts`. Mock `botid/server` (`checkBotId`), `next/headers` (`headers()` returning an object whose `get` serves `x-forwarded-for: 1.2.3.4`), and `@/lib/recommendations` with `importOriginal`, replacing only `countRecentFromIp`, `countWaiting`, `insertRecommendation`. Set `process.env.SESSION_SECRET = "test-secret"`. Default per test: not a bot, 0 recent, 0 waiting.

```ts
const valid = { name: " ZZ Test Rec ", maps_url: "", notes: "Kaya toast", from_name: "" };

test("a bot is refused and nothing is saved", ...)            // checkBotId → { isBot: true }; result { error: "Couldn't send that. Try again." }; insert not called
test("a filled trap field looks like success but saves nothing", ...) // { ...valid, website: "x" } → { ok: true }; insert and both counts not called
test("the 11th rec in an hour is refused", ...)               // countRecentFromIp → 10; { error: "That's a lot of recs! Try again in a bit." }
test("the hourly window is the last hour, by IP hash", ...)   // countRecentFromIp called with hashIp("1.2.3.4", "test-secret") and a Date within 1s of now − 3,600,000 ms
test("a full inbox refuses new recs", ...)                    // countWaiting → 200; { error: "My inbox is full right now, try again later." }
test("an invalid rec is refused with its message", ...)       // { ...valid, name: "x".repeat(101) } → { error: "Shop name is too long" }; insert not called
test("a valid rec is saved trimmed with the hashed IP", ...)  // { ok: true }; insert called with ({ name: "ZZ Test Rec", maps_url: null, notes: "Kaya toast", from_name: null }, hashIp("1.2.3.4", "test-secret"))
test("a failed save reports the generic error", ...)          // insert rejects → { error: "Couldn't send that. Try again." }
```

- [ ] **Step 3: Run** `npx vitest run app/_actions/recommend.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `submitRecommendationAction` in the spec's order: `checkBotId()` → trap → `countRecentFromIp(hashIp(clientIp(await headers()), SESSION_SECRET), oneHourAgo) >= REC_HOURLY_LIMIT` → `countWaiting() >= REC_INBOX_CAP` → normalise and validate → insert. Any thrown error (BotID, Supabase) returns the generic error.
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit`. Expected: all PASS, clean.
- [ ] **Step 6: Commit** `git commit -m "Accept recommendations through a protected server action"`.

---

### Task 4: The Recommend Licks popup

**Files:**
- Create: `app/_components/Recommend.tsx` (provider, hook, trigger, dialog), `app/_components/Recommend.module.css`
- Modify: `app/layout.tsx` (wrap the body's content in `RecommendProvider`)

**Interfaces:**
- Consumes: `submitRecommendationAction` (Task 3); limits from `lib/recommendations.ts` for `maxLength`.
- Produces (`"use client"`):
  - `RecommendProvider({ children }: { children: ReactNode })`: holds open/closed state and renders the dialog while open. On mount and on `hashchange`, opens when `location.pathname === "/"` and `location.hash === "#recommend"`. On close, if the hash is `#recommend`, removes it with `history.replaceState`.
  - `useRecommend(): { open: () => void }`
  - `RecommendButton({ className, children }: { className?: string; children: ReactNode })`: a `type="button"` that calls `open()`.

- [ ] **Step 1: Implement the provider, hook and trigger**, and mount `RecommendProvider` in `app/layout.tsx` around the existing body content (keep `Analytics` and the nav as they are).
- [ ] **Step 2: Implement the dialog** in the same file:
  - A modal `<dialog>` opened with `showModal()` on mount, closed by Esc and ✕ (aria-label "Close"); the backdrop does not close it (same reasoning as `EditDialog` in `app/reborn/AdminBoard.tsx`).
  - Copy and field order from Global Constraints; shop name `required`; each input has `maxLength` from the constants; the hints are linked with `aria-describedby`.
  - The trap field: `<input name="website">` off-screen, `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`, with its own state passed as `website`.
  - Send: "Sending…" and disabled while pending; on `{ error }` show it with `role="alert"` above the button in `--danger`, keeping the typed values; on `{ ok }` swap the form for the thanks view. "Recommend another" brings back an empty form. Each open starts with an empty form.
  - Styles: tokens only; desktop is a centred box (max-width about 440px) over `--scrim`; under `(max-width: 767px)` it fills the screen height. Day and night.
- [ ] **Step 3: Verify in the browser** (`npm run dev`, desktop and phone width, day and night) by opening `http://localhost:3000/#recommend`:
  - The popup opens; Esc and ✕ close it and clear the hash; a refresh after closing doesn't reopen it.
  - Send with an empty name (the browser's required check), then with `maps.app.goo.gl/x` ("The Maps link should start with https://"; typed text kept).
  - Send "ZZ Test Rec" with notes; the thanks view shows; "Recommend another" gives an empty form. (BotID lets everything through locally; that's expected.)
  - Check `read_console_messages` shows no errors.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib`. Expected: clean.
- [ ] **Step 5: Commit** `git commit -m "Add the Recommend Licks popup"`.

---

### Task 5: Entry points

**Files:**
- Modify: `app/_components/MenuSection.tsx`, `app/_components/MenuSection.module.css`
- Modify: `app/_components/MapPage.tsx`, `app/_components/MapPage.module.css`
- Modify: `app/_components/ListPage.tsx`, `app/_components/ListPage.module.css`

**Interfaces:**
- Consumes: `RecommendButton` (Task 4).

- [ ] **Step 1: About Me contact list.** The Contact block always renders. Recommend Licks is a `<li>` placed right after the first visible contact link (Email), or alone if none are visible. It's a `RecommendButton` styled like a contact link: "Recommend Licks" in the `contactLabel` accent, no " - detail". `MenuSection` stays a server component; only the button is client.
- [ ] **Step 2: Map list panel.** In `MapPage.tsx`, inside `section.pane`, render a `RecommendButton` bar after `RestaurantList` only when no spot is selected. It's a direct child of the pane (a flex column), so the list scrolls above it and the bar stays pinned: `flex: none`, a top border in `--line`, a Phosphor `ChatCircleText` icon (bold, 18px, `aria-hidden`) and "Recommend Licks" in `--accent`, full-width tap target at least 44px tall.
- [ ] **Step 3: List page header.** A `RecommendButton` "Recommend Licks" at the right end of the `header` row (`margin-left: auto`), same icon, styled as a quiet outlined button with tokens.
- [ ] **Step 4: Verify in the browser** (desktop and phone width, day and night):
  - Each entry point opens the popup: the About Me line, the map panel bar, the list header.
  - Map panel: the bar stays visible while scrolling the list on desktop; it's gone while a spot's detail is open and back after closing it; on the phone sheet it's reachable at each sheet height where the list shows (collapsed, half, full). Adjust the pane's phone styles if it isn't.
  - About Me shows Email, then Recommend Licks, and no Instagram.
  - Send one "ZZ Test Rec" from `/list` to confirm that page's post path works.
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib`. Expected: clean.
- [ ] **Step 6: Commit** `git commit -m "Add Recommend Licks to About Me, the map panel and the list"`.

---

### Task 6: Admin Recs inbox

**Files:**
- Create: `app/reborn/RecsSection.tsx`
- Modify: `app/reborn/(protected)/page.tsx`, `app/reborn/AdminBoard.tsx`, `app/reborn/RestaurantForm.tsx`, `app/reborn/admin.module.css`
- Modify: `app/reborn/(protected)/actions.ts`, `app/reborn/(protected)/actions.test.ts`
- Modify: `lib/format.ts`, `lib/format.test.ts`

**Interfaces:**
- Consumes: `Recommendation`, `listRecommendations`, `deleteRecommendation` (Task 2).
- Produces:
  - `timeAgo(createdAt: string, now?: Date): string` in `lib/format.ts`: "just now" under a minute, then "{n} minute(s) ago", "{n} hour(s) ago", "{n} day(s) ago" (singular for 1).
  - `createRestaurantAction(input: RestaurantInput, fromRecommendationId?: string): Promise<{ error?: string }>`: after a successful create, deletes that rec; a failed delete is logged with `console.error` and still returns `{}`.
  - `dismissRecommendationAction(id: string): Promise<{ error?: string }>`: `requireAdmin()`, delete, `refresh()`; on failure `{ error: "Couldn't dismiss it" }`.
  - `RestaurantForm` gains `prefill?: { name: string; maps_url: string | null; notes: string | null }`, used for the initial name, Maps link and notes when there's no `initial`.
  - `AdminBoard({ restaurants, recommendations }: { restaurants: Restaurant[]; recommendations: Recommendation[] })`; `Editing` becomes `{ mode: "new"; fromRec?: Recommendation } | { mode: "edit"; restaurant: Restaurant }`.

- [ ] **Step 1: Write failing tests.**
  `lib/format.test.ts`:
  ```ts
  test("timeAgo", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(timeAgo("2026-11-17T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-11-17T11:59:00Z", now)).toBe("1 minute ago");
    expect(timeAgo("2026-11-17T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-11-15T12:00:00Z", now)).toBe("2 days ago");
  });
  ```
  `app/reborn/(protected)/actions.test.ts` (mock `@/lib/recommendations` with `importOriginal`, replacing `deleteRecommendation`):
  ```ts
  test("dismissRecommendationAction refuses without an admin session", ...)     // rejects NEXT_REDIRECT; deleteRecommendation not called
  test("adding from a rec deletes the rec after the restaurant is created", ...) // createRestaurant then deleteRecommendation("rec-1"), in that order; result {}
  test("a failed create keeps the rec", ...)                                     // createRestaurant rejects → { error: "Save failed" }; deleteRecommendation not called
  test("a failed validation keeps the rec", ...)                                 // name "" → { error: "Name is required" }; deleteRecommendation not called
  test("a failed rec delete still counts as saved", ...)                         // deleteRecommendation rejects → {}; console.error called
  test("dismissRecommendationAction reports a failure", ...)                     // admin; delete rejects → { error: "Couldn't dismiss it" }
  ```
- [ ] **Step 2: Run** `npx vitest run lib/format.test.ts "app/reborn/(protected)/actions.test.ts"`. Expected: FAIL.
- [ ] **Step 3: Implement** `timeAgo`, the two actions, and `RestaurantForm`'s `prefill`.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Build the inbox.** `page.tsx` loads `listRecommendations()` alongside `listRestaurants()` (in parallel) and passes both to `AdminBoard`. `RecsSection` renders between the header and the columns, only when there's at least one rec: heading "Recs" with the count; one bordered row per rec with the name, `timeAgo` and "from {name}" when given, "Google Maps link" (new tab, `rel="noopener noreferrer"`) when given, notes with `white-space: pre-wrap` and `overflow-wrap: anywhere` when given, and the two buttons. Dismiss uses the two-step confirm pattern from `EditDialog`'s Delete. "Add to Gotta Lick" opens `EditDialog` with `{ mode: "new", fromRec }`: title "Add a restaurant", `RestaurantForm` gets `prefill` from the rec, and `save` calls `createRestaurantAction(input, fromRec.id)`.
- [ ] **Step 6: Verify in the browser** (temporary local login bypass as before, removed afterwards; desktop and phone width):
  - With no recs, no Recs section. Send two "ZZ Test Rec" recs (one with your name, Maps link and two-line notes containing a 200-character unbroken URL; one with only a name). Both show newest first; the long notes stay inside the row.
  - Add to Gotta Lick on the full one: name, Maps link and notes are filled in and status is Gotta Lick. Cancel: the rec is still there. Add again and save as "ZZ Test Spot": it appears in Gotta Lick and the rec is gone.
  - On the name-only rec, press Save without a Maps link: the form's required check stops it and the rec stays. Then Dismiss → Keep (still there) → Dismiss → Yes, dismiss (gone; section disappears).
- [ ] **Step 7: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib`. Expected: clean.
- [ ] **Step 8: Commit** `git commit -m "Add the Recs inbox to the admin page"`.

---

### Task 7: Clean up and close out

**Files:**
- Modify: `docs/superpowers/specs/2026-11-17-recommend-licks-design.md` (status line)

- [ ] **Step 1: Delete the test data.** Delete "ZZ Test Spot" through the admin's Delete, and dismiss any "ZZ Test Rec" left. Confirm `countWaiting()` is back to its pre-test value and Lex's restaurants are unchanged.
- [ ] **Step 2: Confirm no temporary code remains:** `grep -rn "TEMP" app lib proxy.ts` prints nothing, and `git diff main --stat` shows only planned files.
- [ ] **Step 3: Run** `npx vitest run && npx tsc --noEmit && npx eslint app lib proxy.ts instrumentation-client.ts && npx next build`. Expected: all clean.
- [ ] **Step 4: Update the spec's Status** to "built on {date} (branch `recommend-licks`)" and commit `git commit -m "Close out Recommend Licks"`.
- [ ] **Step 5: Hand over for the preview check.** Push the branch only with Lex's go-ahead. On the Vercel preview, send a "ZZ Test Rec" from `/` and from `/list` (BotID must let a real browser through), then dismiss them. A direct `curl -X POST` to `/` with a server-action header should not create a rec. Nothing merges without Lex's go-ahead.
