import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

// Re-measures the spec's contrast requirements against the real tokens in
// globals.css, so a later color tweak can't silently break them.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`${selector} block not found`);
  const body = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[match[1]] = match[2];
  return tokens;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  day: block(":root"),
  night: block(':root[data-theme="dark"]'),
};

describe.each(Object.entries(themes))("%s theme", (_, t) => {
  test.each([
    ["--ink", "--bg", 4.5],
    ["--muted", "--bg", 4.5],
    ["--muted", "--hover", 4.5],
    ["--accent", "--bg", 4.5],
    ["--on-accent", "--accent", 4.5],
    ["--line-strong", "--bg", 3],
    ["--line-strong", "--surface", 3],
    ["--accent", "--map-land", 3],
    ["--accent", "--map-water", 3],
    ["--accent", "--map-park", 3],
  ] as const)("%s on %s ≥ %d:1", (fg, bg, min) => {
    expect(t[fg], `${fg} missing`).toBeDefined();
    expect(t[bg], `${bg} missing`).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});
