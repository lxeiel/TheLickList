import { expect, test } from "vitest";
import { parseMapsUrl } from "./maps";

// A real place link (Kiap Kiap, as it resolves from its maps.app.goo.gl short
// link). "@…" is where Google's map camera was centred — shifted west so the
// place sits right of Google's side panel — and "!3d…!4d…" is the place.
const PLACE_URL =
  "https://www.google.com/maps/place/Kiap+Kiap+Chicken+Club+&+Bar/@1.2982283,103.8535948,17z/data=!3m2!4b1!5s0x31da19baf984ca19:0x23ecfea8eeaaff90!4m6!3m5!1s0x31da1996a06748f5:0xfadf91f23e42623b!8m2!3d1.2982283!4d103.8561697!16s/g/11nqp_nvkk";

test("a place link uses the place's own coordinates, not the map camera's", async () => {
  expect(await parseMapsUrl(PLACE_URL)).toEqual({ lat: 1.2982283, lng: 103.8561697 });
});

test("a link without place coordinates falls back to the map position", async () => {
  expect(await parseMapsUrl("https://www.google.com/maps/@1.3521,103.8198,12z")).toEqual({
    lat: 1.3521,
    lng: 103.8198,
  });
});

test("negative coordinates parse", async () => {
  expect(await parseMapsUrl("https://www.google.com/maps/place/X/@-33.86,151.2,17z/data=!3d-33.8568!4d151.2153")).toEqual({
    lat: -33.8568,
    lng: 151.2153,
  });
});

test("a non-Google link isn't fetched and gives no location", async () => {
  expect(await parseMapsUrl("https://example.com/somewhere")).toBeNull();
});
