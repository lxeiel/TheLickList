import { describe, expect, test } from "vitest";
import { matchesRecSearch } from "./recommendationSearch";

const rec = { name: "Kopi Tiam 88", notes: "Get the kaya toast", from_name: "Sam" };

describe("matchesRecSearch", () => {
  test("a blank or spaces-only query matches everything", () => {
    expect(matchesRecSearch(rec, "")).toBe(true);
    expect(matchesRecSearch(rec, "   ")).toBe(true);
  });
  test("matches name, notes and from-name, ignoring case and outer spaces", () => {
    expect(matchesRecSearch(rec, " kopi ")).toBe(true);
    expect(matchesRecSearch(rec, "KAYA")).toBe(true);
    expect(matchesRecSearch(rec, "sam")).toBe(true);
  });
  test("does not match other text, and copes with null fields", () => {
    expect(matchesRecSearch(rec, "ramen")).toBe(false);
    expect(matchesRecSearch({ name: "A", notes: null, from_name: null }, "sam")).toBe(false);
  });
});
