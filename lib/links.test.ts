import { expect, test } from "vitest";
import { linkLabel, normalizeLinks } from "./links";

test("linkLabel uses the custom name when there is one", () => {
  expect(linkLabel({ type: "other", url: "https://x.sg", label: "Book a table" })).toBe("Book a table");
});

test("linkLabel falls back to the type's name", () => {
  expect(linkLabel({ type: "website", url: "https://x.sg" })).toBe("Website");
  expect(linkLabel({ type: "instagram", url: "https://x.sg", label: "   " })).toBe("Instagram");
  expect(linkLabel({ type: "other", url: "https://x.sg" })).toBe("Link");
});

test("normalizeLinks trims names and drops empty ones", () => {
  expect(
    normalizeLinks([
      { type: "other", url: "https://a.sg", label: "  Menu  " },
      { type: "website", url: "https://b.sg", label: "  " },
    ]),
  ).toEqual([
    { type: "other", url: "https://a.sg", label: "Menu" },
    { type: "website", url: "https://b.sg" },
  ]);
});
