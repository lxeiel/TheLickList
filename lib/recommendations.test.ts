import { describe, expect, test } from "vitest";
import {
  clientIp,
  hashIp,
  isRecommendationId,
  NO_IP,
  normalizeRecommendation,
  validateRecommendation,
} from "./recommendations";

const blank = { name: "", maps_url: "", notes: "", from_name: "" };

describe("recommendations", () => {
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
});

test("isRecommendationId accepts UUIDs in either case and nothing else", () => {
  expect(isRecommendationId("11111111-1111-4111-8111-111111111111")).toBe(true);
  expect(isRecommendationId("ABCDEF12-1111-4111-8111-111111111111")).toBe(true);
  expect(isRecommendationId("rec-1")).toBe(false);
  expect(isRecommendationId("11111111-1111-4111-8111-111111111111 ")).toBe(false);
  expect(isRecommendationId("11111111-1111-4111-8111-111111111111,x")).toBe(false);
  expect(isRecommendationId("1' or '1'='1")).toBe(false);
  expect(isRecommendationId("")).toBe(false);
  expect(isRecommendationId(42)).toBe(false);
  expect(isRecommendationId(undefined)).toBe(false);
});
