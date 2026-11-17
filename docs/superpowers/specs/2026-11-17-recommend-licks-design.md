# Recommend Licks — design

Status: approved by Lex on 2026-11-17; built on 2026-11-17 (branch `recommend-licks`). Not merged.

Lex wants to hear about new places from people who visit the site. Visitors send a restaurant recommendation from a popup; Lex reviews them in a **Recs** inbox on `/reborn` and either adds one to Gotta Lick or dismisses it.

This is the first time the public site writes anything. Today visitors only read, and every save is an admin-only server action (`app/reborn/(protected)/actions.ts`) using the Supabase service client. Recommendations follow the same pattern: a new table the public can't read or write directly, saved only through a server action.

Out of scope: emailing Lex when a rec arrives; any public display of recs or of who recommended a spot; a history of handled recs.

Ships with this work: hiding the Instagram contact link. Today that's only an uncommitted change in `lib/site.ts` (Instagram's `href` set to `""`); it's committed on this feature's branch, so the live site shows Email, then Recommend Licks (Lex's call).

## Goals, non-goals, anti-goals

- **Goal:** sending a rec takes under a minute on a phone, with only the shop name required.
- **Goal:** Lex sees waiting recs as soon as they open `/reborn` and can turn one into a Gotta Lick spot in a couple of taps.
- **Non-goal:** stopping a determined, targeted attacker. Recs are never shown publicly, so spam only costs inbox clutter; the protection keeps that clutter bounded.
- **Anti-goal:** friction for real visitors: no sign-in, no puzzle captcha, no email field.
- **Anti-goal:** keeping visitors' data longer than needed. Recs are deleted once handled, and IP addresses are never stored in readable form.

## Success criteria

- A visitor can open the popup from the homepage, the map and the list page, send a rec, and see the thanks message, on desktop and phone, day and night.
- A rec Lex adds becomes a Gotta Lick restaurant with the name, Maps link and notes filled in, and leaves the inbox.
- A rec Lex dismisses is gone after one confirm.
- Bot-like submissions, the hidden trap field, an 11th rec in an hour from one visitor, and a 201st waiting rec are all refused, with nothing saved.
- No anonymous request can read, insert or delete recs directly through Supabase.

## Approaches considered

1. **New table, saved through a public server action (chosen).** Matches how the site already writes data. All the spam checks live in one place on the server, and the table stays closed to the public key.
2. **Browser inserts straight into Supabase with an RLS insert policy.** Less code, but anyone holding the public key could insert rows directly, skipping BotID and the per-person limit. Rejected.
3. **Form emails Lex instead of saving.** No inbox and no Add to Gotta Lick button, and it needs an email service. Rejected.

## What a visitor sends

| Field | Required | Limit (after trimming) | Notes |
| --- | --- | --- | --- |
| Shop name | Yes | 100 characters | |
| Google Maps link | No | 500 characters; must start with `http://` or `https://` | Hint: "In Google Maps, tap Share, then Copy link" |
| Notes | No | 1,000 characters | Placeholder: "Dishes to try, why you love it" |
| Your name | No | 50 characters | Hint: "Only I see this". Never shown on the public site. |

No email or contact field, and no cuisine, area or price: Lex fills those in when adding.

## Where the button lives

All entry points open the same popup. The label everywhere is **Recommend Licks** (Lex's wording).

1. **Homepage, About Me contact list** (`app/_components/MenuSection.tsx`): a new line in the slot where Instagram used to show, right under "Email - thelicklist17@gmail.com". It reads **Recommend Licks** in the accent colour, like the contact labels, with no " - detail" part. It's a button, not a link. It shows even if every `CONTACT_LINKS` entry is hidden, so the Contact block now always renders. If Instagram is restored later, Recommend Licks stays directly under Email.
2. **Map page, left list panel** (the `section.pane` in `app/_components/MapPage.tsx`): a slim bar **pinned to the bottom of the panel**, below the restaurant list, with a small icon and **Recommend Licks** in the accent colour. It's always visible: the list scrolls above it, and a top border separates them. On phones it sits at the bottom of the list sheet in the same way. It shows while browsing the list, not while a spot's detail is open in the panel. Suggested icon: Phosphor `ChatCircleText`, builder's call. (Lex picked this over a button in the map's right-hand stack and over a line after the last restaurant.)
3. **List page** (`app/_components/ListPage.tsx`): a **Recommend Licks** button at the right end of the header row with "All spots" and the count.
4. **Shareable link `/#recommend`:** loading the homepage with that hash opens the popup once the page is ready, so Lex can put the link in a bio or send it to friends. Closing the popup removes the hash (replaceState), so a refresh doesn't reopen it.

Not in the top menu, not among the map's right-hand buttons, and no "Recommend" prompt on empty search results (all Lex's calls). The homepage's How it works section is unchanged.

## The popup

- A modal `<dialog>` (the browser handles focus, Esc and the backdrop), like the admin popup. On phones (the site's existing phone breakpoint) it fills the screen height as a sheet; on desktop it's a centred box over the dimmed page (`--scrim`).
- Title **Recommend Licks**, subtitle "Know somewhere I should try? Tell me." and a ✕ close button.
- The four fields above, then a **Send it** button in the accent colour. While sending it reads "Sending…" and can't be pressed twice.
- Clicking the backdrop doesn't close it, so a half-written rec isn't lost to a stray tap. Esc and ✕ do close it.
- Closing and reopening the popup after a successful send shows a fresh, empty form.
- **After a successful send**, the form is replaced by: a check icon, "Thanks!", "I'll check it out." and a **Recommend another** button that brings back an empty form.
- **Errors** show inline above Send it, in `--danger`, and keep everything typed. Copy, verbatim:

| Situation | Message |
| --- | --- |
| Shop name empty | "Add the shop's name" |
| Maps link not http(s) | "The Maps link should start with https://" |
| A field over its limit | "Shop name is too long", "Google Maps link is too long", "Notes are too long" or "Your name is too long" (the input `maxLength` normally prevents this) |
| Per-person limit reached | "That's a lot of recs! Try again in a bit." |
| Inbox full (200 waiting) | "My inbox is full right now, try again later." |
| BotID says bot, or the save fails | "Couldn't send that. Try again." |

- Styled with the site's tokens from `app/globals.css` only, day and night. Not the admin styles.

## Spam protection

Checked in the server action, in this order, before anything is saved:

1. **Vercel BotID (Basic mode, free on all plans).** Install the `botid` package, initialise it with `initBotId()` in a root `instrumentation-client.ts` for the POST paths the popup's server action is called from (`/` and `/list`), and call `checkBotId()` first in the action. A bot verdict returns the generic error. In local development BotID lets everything through; that's expected. Deep Analysis (paid) is not turned on. `next.config.ts` is wrapped with `withBotId` (the installed package's README asks for it; Vercel's docs say the rewrites are optional, so keeping them is harmless).
2. **Hidden trap field.** A text input named something plausible (e.g. `website`) that's hidden from people (off-screen, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"`). If it has any value, the action returns success **without saving**, so the sender sees the thanks message and has no reason to retry.
3. **Per-visitor limit: 10 recs per rolling hour.** The visitor is identified by a keyed hash of their IP address (from the request's `x-forwarded-for` / `x-real-ip` headers on Vercel): HMAC-SHA256 with `SESSION_SECRET` as the key, stored as hex. The raw IP is never stored. The action counts waiting recs with the same hash created in the last hour. Since handled recs are deleted, the count only covers waiting ones; that's accepted. When no IP header is present (local dev), use a fixed placeholder so the limit still works.
4. **Inbox cap: 200 waiting recs.** If 200 or more are waiting, refuse with the inbox-full message.
5. **Validation.** Trim every field, turn empty optional fields into null, then apply the limits in the field table. The same rules are enforced again by database check constraints.

## Data

New migration `supabase/migrations/0005_recommendations.sql`, run once by Lex in the Supabase SQL Editor like the earlier ones:

```sql
create table recommendation (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  maps_url    text check (maps_url is null or (char_length(maps_url) <= 500 and maps_url ~* '^https?://')),
  notes       text check (notes is null or char_length(notes) <= 1000),
  from_name   text check (from_name is null or char_length(from_name) <= 50),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index recommendation_ip_hash_created_at on recommendation (ip_hash, created_at);

alter table recommendation enable row level security;
-- No policies and no grants for anon/authenticated: the public key can't touch it.
grant select, insert, delete on table recommendation to service_role;
```

Type (new `lib/recommendations.ts`):

```ts
export type Recommendation = {
  id: string;
  name: string;
  maps_url: string | null;
  notes: string | null;
  from_name: string | null;
  created_at: string;
};
export type RecommendationInput = { name: string; maps_url: string; notes: string; from_name: string };
```

`ip_hash` is never sent to the browser, including the admin page. Recs have no status column: a rec exists only while it's waiting.

## Admin: the Recs inbox

On `/reborn` (`app/reborn/(protected)/page.tsx` loads recs alongside restaurants; `AdminBoard.tsx` renders them):

- A **Recs** section between the header ("Restaurants N", Add restaurant) and the Licked / Gotta Lick columns, with the waiting count beside the heading. It's only there when at least one rec is waiting. On a phone it stacks above the columns.
- Recs are listed newest first, all of them (at most 200). Each one shows:
  - the shop name;
  - how long ago it came in ("2 days ago") and, when given, "from {name}";
  - "Google Maps link", opening in a new tab, when given;
  - the notes, with line breaks kept, when given;
  - **Add to Gotta Lick** and **Dismiss** buttons.
- Plain bordered rows in the admin's existing style (`admin.module.css`), not the public design.

### Add to Gotta Lick

- Opens the existing add popup (`EditDialog` / `RestaurantForm`) as a new restaurant, with **name**, **Google Maps link** and **notes** filled in from the rec and status set to Gotta Lick. Everything else starts empty, as for any new restaurant. The dialog title is "Add a restaurant".
- Notes are copied as-is into the restaurant's Notes, which are public. Lex edits them before saving if needed; there's no safeguard (Lex's call).
- The form still requires a Maps link. If the rec had none, Lex finds and pastes one.
- **On Save:** the restaurant is created, then the rec is deleted, and the list refreshes. If the restaurant fails to save, nothing changes and the popup shows "Save failed" as today. If the restaurant saves but the rec delete fails, the save still counts as a success; the error is logged on the server and the rec stays in the inbox for Lex to dismiss.
- **On Cancel:** the rec stays in the inbox, untouched.
- The add action takes the rec id as an optional extra argument (e.g. `createRestaurantAction(input, { fromRecommendationId })`), or a separate admin action; builder's call. Either way it calls `requireAdmin()` first.

### Dismiss

- Two-step, the same pattern as Delete in the edit popup: **Dismiss** turns into "Dismiss {name}? **Yes, dismiss** / **Keep**". On yes, the rec is deleted for good.
- An admin-only server action (`requireAdmin()` first) deletes it and refreshes the page. On failure, an inline "Couldn't dismiss it" shows on that rec.

## Server actions

- `submitRecommendationAction(input)`: **public** (no `requireAdmin`), in a new non-admin file (e.g. `app/_actions/recommend.ts`), returning `{ ok: true } | { error: string }`. Runs the checks in the Spam protection order, then inserts with the service client. Never returns `ip_hash` or other rows. Doesn't call `refresh()`: the public pages don't show recs.
- `dismissRecommendationAction(id)`: admin-only, in `app/reborn/(protected)/actions.ts`.
- Adding from a rec: see Add to Gotta Lick.
- Every admin action calls `requireAdmin()` first; server actions are callable from any page, so the proxy isn't enough.

Pure rules (trimming, validation, limits, IP hashing) go in `lib/recommendations.ts` with Vitest tests; the action stays thin, as in the existing code.

## Error handling summary

| Situation | What happens |
| --- | --- |
| Visitor input invalid | Inline message, typed text kept, nothing saved |
| Trap field filled | Thanks message shown, nothing saved |
| BotID flags a bot | Generic error, nothing saved |
| Over 10 in an hour from one visitor | Rate-limit message, nothing saved |
| 200 already waiting | Inbox-full message, nothing saved |
| Database insert fails | Generic error, typed text kept |
| Restaurant saves, rec delete fails | Save succeeds; error logged; rec stays in inbox |
| Dismiss fails | "Couldn't dismiss it" on that rec |
| Anonymous Supabase request to `recommendation` | Refused (no grants) |

## Testing

Automated (Vitest, Node only):

- Validation and normalising: trimming, empty optional fields become null, each limit, http(s) check, name required.
- IP hashing: same IP and key give the same hash; different IPs differ; the raw IP isn't in the output; the missing-IP placeholder.
- The submit action: trap field filled saves nothing and returns success; over the hourly limit and at the inbox cap are refused; a valid rec is inserted with trimmed values (Supabase and BotID mocked, as `app/reborn/(protected)/actions.test.ts` mocks its dependencies).
- Admin actions refuse without an admin session (dismiss, and add-from-rec).
- Add-from-rec: the rec is deleted only after the restaurant is created; a failed create deletes nothing; a failed rec delete still returns success.

In the browser (desktop and phone, day and night):

- Each entry point opens the popup: About Me line, the map's list panel bar (desktop, and the phone sheet at each height), list header, `/#recommend`.
- Sending a rec, the thanks state, Recommend another, error messages keeping typed text, Esc and ✕.
- On `/reborn`: the Recs section appears and disappears correctly, Add to Gotta Lick pre-fills and removes the rec on save but not on cancel, and Dismiss with Keep and Yes.
- Uses recs named "ZZ Test Rec" and a restaurant named "ZZ Test Spot", all deleted afterwards. Lex's real restaurants are never edited.

## Rollout

1. Lex runs `0005_recommendations.sql` in the Supabase SQL Editor (the one manual step).
2. No new environment variables: BotID needs none, and the IP hash reuses `SESSION_SECRET`.
3. Built on a feature branch created before any code is written, which also carries the `lib/site.ts` change hiding Instagram. All checks above pass before Lex sees it, and nothing merges without Lex's go-ahead. BotID can only be fully checked on a Vercel preview deployment.

## Left to the builder

- Component structure for opening one popup from several places (a small client provider, a shared trigger component, or similar), and how the server-rendered `MenuSection` hosts its client button.
- Exact styling, icon, and the phone breakpoint, within the site's tokens and existing patterns.
- The relative-time format for "2 days ago".
- Exact BotID wiring, per Vercel's current docs.
- How the pinned bar works with the phone sheet's heights (collapsed, half, full), as long as it stays reachable whenever the list is showing.
