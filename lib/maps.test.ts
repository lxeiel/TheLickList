import { afterEach, expect, test, vi } from "vitest";
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

// Redirects are answered by a fake fetch; each entry is where that hop's
// Location header points (null: a plain page with no redirect).
function fakeRedirects(chain: Record<string, string | null>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    expect(init?.redirect).toBe("manual");
    const location = chain[url];
    return location == null
      ? new Response("page", { status: 200 })
      : new Response(null, { status: 302, headers: { location } });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a short link is followed through Google's redirects to the place", async () => {
  const fetch = fakeRedirects({
    "https://maps.app.goo.gl/abc": "https://www.google.com/maps?q=x",
    "https://www.google.com/maps?q=x": "/maps/place/X/@1.3,103.8,17z/data=!3d1.3521!4d103.8198",
  });
  vi.stubGlobal("fetch", fetch);
  expect(await parseMapsUrl("https://maps.app.goo.gl/abc")).toEqual({ lat: 1.3521, lng: 103.8198 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("a redirect off Google's domains is never fetched", async () => {
  const fetch = fakeRedirects({
    "https://www.google.com/url?q=internal": "http://169.254.169.254/latest/meta-data/",
  });
  vi.stubGlobal("fetch", fetch);
  expect(await parseMapsUrl("https://www.google.com/url?q=internal")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("a redirect loop gives up instead of fetching forever", async () => {
  const fetch = fakeRedirects({
    "https://goo.gl/a": "https://goo.gl/b",
    "https://goo.gl/b": "https://goo.gl/a",
  });
  vi.stubGlobal("fetch", fetch);
  expect(await parseMapsUrl("https://goo.gl/a")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(6);
});

test("a Google page with no redirect and no coordinates gives no location", async () => {
  vi.stubGlobal("fetch", fakeRedirects({ "https://www.google.com/maps/search/x": null }));
  expect(await parseMapsUrl("https://www.google.com/maps/search/x")).toBeNull();
});
