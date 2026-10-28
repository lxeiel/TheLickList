import { expect, test } from "vitest";
import { initialPhotos, photoReducer, savedUrls, uploadingCount } from "./photoUploads";

test("savedUrls keeps only finished uploads, in order", () => {
  let items = initialPhotos(["a", "b"]);
  items = photoReducer(items, { type: "add", key: "k1" });
  items = photoReducer(items, { type: "add", key: "k2" });
  items = photoReducer(items, { type: "failed", key: "k2", error: "x" });
  expect(savedUrls(items)).toEqual(["a", "b"]);
  expect(uploadingCount(items)).toBe(1);
  items = photoReducer(items, { type: "uploaded", key: "k1", url: "c" });
  expect(savedUrls(items)).toEqual(["a", "b", "c"]);
  expect(uploadingCount(items)).toBe(0);
});

test("move swaps neighbours and stops at the ends", () => {
  const items = initialPhotos(["a", "b", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "b", by: -1 }))).toEqual(["b", "a", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "a", by: -1 }))).toEqual(["a", "b", "c"]);
  expect(savedUrls(photoReducer(items, { type: "move", key: "c", by: 1 }))).toEqual(["a", "b", "c"]);
});

test("retry puts a failed item back to uploading; remove drops it", () => {
  let items = photoReducer([], { type: "add", key: "k" });
  items = photoReducer(items, { type: "failed", key: "k", error: "x" });
  expect(photoReducer(items, { type: "retry", key: "k" })[0].status).toBe("uploading");
  expect(photoReducer(items, { type: "remove", key: "k" })).toEqual([]);
});
