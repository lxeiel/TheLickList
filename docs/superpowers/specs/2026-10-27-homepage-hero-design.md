# Homepage hero, logo and centred navbar — design (not yet built)

Status: design agreed in conversation on 2026-10-27; final approval pending. Build later.
Mockups (git-ignored): logo + navbar in `.superpowers/brainstorm/54283-1793094154/content/logo-c-widths-v3.html`; menu section in `.superpowers/brainstorm/90741-1793109124/content/menu-section-v3.html`. Accent is now deep emerald (`#0B6B4F` / `#59C0A2`).

## Logo (direction C)
- Hero: "The" small (0.3em, weight 600) above "Lick" / "List" stacked in Geist 900, letter-spacing −0.055em, line-height 0.84, so the two "Li" line up.
- The full stop is a round `--accent` dot (0.17em), the site's own "Licked" mark — not a text period.
- "by lex" handwritten in Homemade Apple (next/font), `--accent`, rotated −7°, under the dot's bottom-right, clear of the dot.
- Nav size: "The Lick List●" on one line (20px, 900) with a small "by lex" inside the logo's own box (not absolutely positioned outside it).
- One accessible name: "The Lick List by Lex".

## Navbar
- 3-column grid (`1fr auto 1fr`): empty left, logo exactly centred, Map · List · About + theme toggle on the right.
- Below 900px: links fold into ☰; right side is ☾ + ☰.
- Homepage: hidden over the logo hero; slides down once the hero has scrolled past and stays fixed; slides away when scrolling back into the hero. List/About: always shown.
- Map link → `/#map` (keeps filters) — lands on the map, never the hero. Logo link → top of `/`.

## Homepage `/`, top to bottom
1. **Logo hero** — full viewport, no navbar, big logo centred, round ↓ "See the map" button at the bottom.
2. **Menu section** (navbar visible) — an index/"menu" grid modelled on Lex's reference (a portfolio index page): plain uppercase column headings, plain lists, one typeface, no cards or boxes. Mockup: `menu-section-v3.html`.
   - Desktop: 5-column grid (`repeat(5, 1fr)`, column gap 28px).
     - **About** — columns 1–3. Heading "ABOUT", then one intro paragraph (placeholder for Lex to rewrite) at ~22px / 1.35 so lines stay under ~80 characters.
     - **By the numbers** — columns 1–3, directly under About. "**42** Licked" / "**18** Gotta Lick" as two big lines, words as large as numbers: numbers `--accent`, words ink, `clamp(44px, 6vw, 80px)`, weight 900. Counts live from restaurants (status tried / wishlist); empty list shows 0.
     - **The list** — columns 4–5, spanning both rows. Names uppercase, laid out in two text columns: Gotta Lick spots (newest first) then the most recent Licked spots crossed off (`line-through`, 2px, muted), **12 lines total**. Each name links to that spot on the map (`/?spot=<id>#map`). "SEE THE FULL LIST" link to `/list` underneath.
       - Crossed-off = most recently added/updated Licked spots; the database doesn't record whether a spot was ever on the wishlist (no schema change).
     - **How it works** and **Contact** — side by side under The list (columns 4 and 5). How it works: ● **Licked**, been there, eaten that · ○ **Gotta Lick**, on the wishlist · Scores are out of 10. Contact: Instagram, Email (Lex to supply the links).
   - No photo column (dropped).
   - Phone: one column, in order About, The list, How it works, Contact, By the numbers.
   - ↓ "See the map" button at the bottom of the section.
3. **Map** — existing MapPage at full viewport height, `id="map"`.

## Behaviour
- ↓ buttons smooth-scroll; instant under reduced motion.
- A URL with `?spot=` or any filter param opens scrolled to the map (navbar showing).
- No scroll-snapping (would fight map panning). On phone, scroll back up from the filter bar or tap the nav logo.
- About page keeps its current content for now.
