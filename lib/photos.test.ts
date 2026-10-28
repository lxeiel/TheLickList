import { beforeAll, expect, test } from "vitest";
import { fitWithin, isOwnPhotoUrl, photoPathFromUrl, removedPhotoUrls } from "./photos";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
});

const own = "https://proj.supabase.co/storage/v1/object/public/restaurant-photos/new/a.jpg";

test("isOwnPhotoUrl accepts only this project's bucket", () => {
  expect(isOwnPhotoUrl(own)).toBe(true);
  expect(isOwnPhotoUrl("https://evil.example/restaurant-photos/new/a.jpg")).toBe(false);
  expect(isOwnPhotoUrl("https://proj.supabase.co/storage/v1/object/public/other-bucket/a.jpg")).toBe(false);
});

test("photoPathFromUrl returns the path inside the bucket", () => {
  expect(photoPathFromUrl(own)).toBe("new/a.jpg");
  expect(photoPathFromUrl("https://evil.example/x.jpg")).toBeNull();
});

test("removedPhotoUrls ignores reordering", () => {
  expect(removedPhotoUrls(["a", "b", "c"], ["c", "a", "b"])).toEqual([]);
  expect(removedPhotoUrls(["a", "b", "c"], ["c"])).toEqual(["a", "b"]);
  expect(removedPhotoUrls([], ["a"])).toEqual([]);
});

test("fitWithin scales the long edge down and never up", () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(400, 300)).toEqual({ width: 400, height: 300 });
  expect(fitWithin(4000, 300)).toEqual({ width: 1600, height: 120 });
});
