import { expect, test } from "vitest";
import { distanceMeters, formatDistance, sortByDistance } from "./geo";
import type { Restaurant } from "./restaurants";

function restaurant(id: string, name: string, lat: number | null, lng: number | null): Restaurant {
  return {
    id,
    name,
    maps_url: null,
    lat,
    lng,
    links: [],
    cuisine_tags: [],
    price_range: null,
    status: "tried",
    rating: null,
    notes: null,
    photo_urls: [],
    foods: [],
    area: null,
    multiple_locations: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
}

const RAFFLES_PLACE = { lat: 1.2841, lng: 103.8515 };

test("distanceMeters measures a known distance", () => {
  // Raffles Place to Changi Airport is about 17 km as the crow flies.
  const d = distanceMeters(RAFFLES_PLACE, { lat: 1.3644, lng: 103.9915 });
  expect(d).toBeGreaterThan(17_500);
  expect(d).toBeLessThan(18_500);
  expect(distanceMeters(RAFFLES_PLACE, RAFFLES_PLACE)).toBe(0);
});

test("formatDistance uses metres, then tenths of a km, then whole km", () => {
  expect(formatDistance(0)).toBe("10 m");
  expect(formatDistance(347)).toBe("350 m");
  expect(formatDistance(1234)).toBe("1.2 km");
  expect(formatDistance(9_960)).toBe("10.0 km");
  expect(formatDistance(12_600)).toBe("13 km");
});

test("sortByDistance puts the nearest first and unpinned spots last, A–Z", () => {
  const list = [
    restaurant("far", "Far", 1.3644, 103.9915),
    restaurant("nopin-b", "Bee", null, null),
    restaurant("near", "Near", 1.285, 103.852),
    restaurant("nopin-a", "Ant", null, null),
  ];
  expect(sortByDistance(list, RAFFLES_PLACE).map((r) => r.id)).toEqual(["near", "far", "nopin-a", "nopin-b"]);
});
