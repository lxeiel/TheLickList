# Homepage hero, logo and centred navbar — design (not yet built)

Status: design agreed in conversation on 2026-10-27; final approval pending. Build later.
Mockups: `.superpowers/brainstorm/54283-1793094154/content/` (`logo-c-widths-v3.html`, `second-section-inline.html`; git-ignored).

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
2. **About section** (navbar visible):
   - "Hi, I'm Lex" + placeholder intro for Lex to rewrite.
   - "How the map works" — one paragraph + key: ● **Licked** been there, eaten that · ○ **Gotta Lick** on the wishlist · Scores are out of 10.
   - Numbers as two big lines, words as large as numbers: "**42** Licked" / "**18** Gotta Lick" — numbers `--accent`, words ink, `clamp(48px, 10vw, 88px)`, weight 900. Counts computed live from restaurants (status tried / wishlist); empty list shows 0.
   - ↓ "See the map" button.
3. **Map** — existing MapPage at full viewport height, `id="map"`.

## Behaviour
- ↓ buttons smooth-scroll; instant under reduced motion.
- A URL with `?spot=` or any filter param opens scrolled to the map (navbar showing).
- No scroll-snapping (would fight map panning). On phone, scroll back up from the filter bar or tap the nav logo.
- About page keeps its current content for now.
