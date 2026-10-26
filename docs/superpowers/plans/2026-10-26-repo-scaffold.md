# Repo Scaffold (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a bare Next.js app wired to a Supabase project and deployed on Vercel, with a placeholder homepage that proves the Vercel ↔ Supabase pipeline works end to end, before any real feature (admin auth, data model, map) is built.

**Architecture:** A single Next.js (App Router, TypeScript) app. A small `lib/supabase.ts` module reads two env vars and exposes a connectivity check. The homepage is a server component that calls that check and renders its result, so "it works" is visible both locally and on the deployed URL without needing any database tables yet.

**Tech Stack:** Next.js (App Router, TypeScript), `@supabase/supabase-js`, deployed on Vercel, repo already has a GitHub remote (`lxeiel/TheLickList`).

**Spec:** [docs/superpowers/specs/2026-10-26-lick-list-design.md](../specs/2026-10-26-lick-list-design.md) — this plan implements Phase 1 only ("Repo scaffold") from that spec's Phasing section. Phases 2–4 (data model/admin auth, Mapbox map, dishes/photos) are out of scope here.

## Global Constraints

- Framework: Next.js, App Router (per spec Architecture).
- Deployment target: Vercel (per spec Architecture).
- Database/storage: Supabase Postgres + Storage — only connectivity matters in this phase, no tables exist yet (per spec Architecture, Phasing #1).
- No automated test suite — the spec's Testing section specifies manual verification in the browser instead; every task below uses manual verification steps with an exact expected result rather than an automated test runner.
- Secrets (`.env.local`) must never be committed — the repo's `.gitignore` must exclude `.env*.local` (standard Next.js scaffold default; confirmed, not assumed, in Task 1).

## Review Focus

- Missing Supabase env vars (local dev before Task 3, or a fresh Vercel deploy before env vars are set) — the homepage must render a clear "not connected" message, never crash or 500. Covered in Task 2.
- Wrong or unreachable `NEXT_PUBLIC_SUPABASE_URL` (typo, project paused, network error) — the connectivity check must catch the failure and report it, not throw an unhandled exception. Covered in Task 2.
- Invalid `NEXT_PUBLIC_SUPABASE_ANON_KEY` (wrong/expired key) — must be distinguished from "unreachable" by reporting the HTTP status Supabase returns, not a generic failure. Covered in Task 2.
- `lib/supabase.ts` must not throw at module-import time when env vars are absent — a build (`npm run build`) or a deploy with env vars not yet configured must still succeed. Covered in Task 2.
- `.env.local` must actually be git-ignored before any real Supabase keys are added to it in Task 3 — verified before secrets ever exist in the working tree, not after. Covered in Task 1.

---

## File Structure

- `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore` — created by `create-next-app` (Task 1).
- `lib/supabase.ts` — reads env vars, exposes `checkSupabaseConnection()` (Task 2).
- `.env.example` — documents the two required env vars, committed (Task 2).
- `.env.local` — human-provided real credentials, git-ignored, never committed (Task 3).

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.eslintrc.json` (all via `create-next-app`)

**Interfaces:**
- Produces: a Next.js App Router project that builds with `npm run build` and serves `app/page.tsx` at `/`. Task 2 modifies `app/page.tsx` and adds `lib/supabase.ts` alongside it.

- [ ] **Step 1: Run the Next.js scaffolder**

Run in the repo root:
```bash
npx create-next-app@latest . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```
Expected: it runs without prompting (all options passed as flags) and creates `package.json`, `app/`, `tsconfig.json`, etc. alongside the existing `README.md`, `.git/`, and `docs/`.

- [ ] **Step 2: Verify `.gitignore` excludes local env files**

Open `.gitignore` and confirm it contains a line matching `.env*.local` (this is `create-next-app`'s default). If it's missing, add it.
Expected: `.env*.local` is present in `.gitignore` before any `.env.local` file is ever created (Task 3).

- [ ] **Step 3: Replace the starter homepage copy**

In `app/page.tsx`, replace the generated starter content with:
- A heading reading exactly `The Lick List`
- A line of text reading exactly `Lex's Nomz Adventure`

(The rest of Task 1's markup/layout is the scaffolder's default — Task 2 adds the Supabase status line below this.)

- [ ] **Step 4: Verify the build succeeds**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Manual verification — dev server**

Run: `npm run dev`, then open `http://localhost:3000`.
Expected: page shows "The Lick List" and "Lex's Nomz Adventure". Stop the dev server (Ctrl+C) when confirmed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app"
```

## Task 2: Supabase client + homepage connectivity check

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.example`
- Modify: `app/page.tsx`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Consumes: `app/page.tsx` from Task 1 (the heading/subtext lines added there stay; this task adds to the same file).
- Produces: `checkSupabaseConnection(): Promise<{ ok: boolean; detail: string }>`, exported from `lib/supabase.ts`. No other task in this plan consumes it, but Phase 2 (data model/admin auth, out of scope here) will add real queries to this same file.

- [ ] **Step 1: Install the Supabase client library**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Implement `checkSupabaseConnection` in `lib/supabase.ts`**

```ts
export async function checkSupabaseConnection(): Promise<{ ok: boolean; detail: string }>
```

Behavior (this is the algorithm the signature doesn't determine, so it's spelled out):
- Read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If either is missing/empty, return `{ ok: false, detail: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" }` without calling Supabase.
- Otherwise, `fetch` `` `${url}/rest/v1/` `` with header `apikey: <anonKey>`, inside a try/catch:
  - On a non-OK response, return `{ ok: false, detail: "Supabase responded with status <status>" }`.
  - On a thrown error (e.g. unreachable URL), return `{ ok: false, detail: "Request failed: <error message>" }`.
  - On an OK response, return `{ ok: true, detail: "Connected" }`.
- Do not call `createClient` or touch `@supabase/supabase-js` for this check — it's a plain `fetch`, so a missing/invalid URL can never throw at module-import time.

- [ ] **Step 4: Wire the check into the homepage**

In `app/page.tsx`, make the default export an `async` server component. Below the existing heading/subtext from Task 1, call `checkSupabaseConnection()` and render one line:
- `Supabase: connected ✓` when `ok` is true
- `` Supabase: not connected — ${detail} `` when `ok` is false

- [ ] **Step 5: Verify the build still succeeds with no env vars set**

Run: `npm run build`
Expected: build completes with no errors (confirms Review Focus item: no import-time throw when env vars are absent).

- [ ] **Step 6: Manual verification — "not connected" state**

Run: `npm run dev` (with no `.env.local` present yet), open `http://localhost:3000`.
Expected: page shows `Supabase: not connected — Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY`. Stop the dev server when confirmed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add Supabase connectivity check to homepage"
```

## Task 3: Create the Supabase project and verify locally (manual)

This task has no code changes — it's account/dashboard setup that must be done by the human partner (creating an external account isn't something the implementer does on their behalf). No commit at the end of this task.

- [ ] **Step 1 (human): Create a Supabase project**

At https://supabase.com, create a new (free-tier) project for The Lick List.

- [ ] **Step 2 (human): Copy the project credentials**

In the Supabase dashboard under Settings → API, copy the **Project URL** and the **anon public** key.

- [ ] **Step 3 (human): Create `.env.local`**

In the repo root, create `.env.local` (not committed) with:
```
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

- [ ] **Step 4: Manual verification — "connected" state**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: page shows `Supabase: connected ✓`. If it instead shows a status-code or request-failed message, re-check the copied URL/key for typos.

## Task 4: Deploy to Vercel (manual)

This task has no code changes beyond what's already committed — it's account/dashboard setup. No commit at the end of this task.

- [ ] **Step 1: Push the current branch to GitHub**

```bash
git push
```
(The repo's `origin` remote already points to `github.com/lxeiel/TheLickList`.)

- [ ] **Step 2 (human): Import the project in Vercel**

At https://vercel.com, import the `lxeiel/TheLickList` GitHub repo as a new project. The Next.js framework preset is auto-detected — no build settings need to change.

- [ ] **Step 3 (human): Add environment variables in Vercel**

In the new Vercel project's Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values as `.env.local`, then deploy (or redeploy if it already deployed once without them).

- [ ] **Step 4: Manual verification — deployed site**

Open the `*.vercel.app` URL Vercel provides.
Expected: page shows "The Lick List", "Lex's Nomz Adventure", and `Supabase: connected ✓` — confirming the full Vercel ↔ Supabase pipeline works end to end.
