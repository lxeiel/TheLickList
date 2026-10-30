import { beforeEach, expect, test, vi } from "vitest";
import type { RestaurantInput } from "@/lib/restaurants";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/photoStorage", () => ({
  createPhotoUpload: vi.fn(),
  deletePhotoFiles: vi.fn(),
}));
vi.mock("@/lib/restaurants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/restaurants")>()),
  createRestaurant: vi.fn(),
  updateRestaurant: vi.fn(),
  deleteRestaurant: vi.fn(),
  markLicked: vi.fn(),
}));

const { requireAdmin } = await import("@/lib/auth");
const { createPhotoUpload, deletePhotoFiles } = await import("@/lib/photoStorage");
const { updateRestaurant } = await import("@/lib/restaurants");
const { createPhotoUploadAction, updateRestaurantAction } = await import("./actions");

const validInput: RestaurantInput = {
  name: "ZZ Test Spot",
  maps_url: "",
  links: [],
  cuisine_tags: [],
  price_range: null,
  status: "tried",
  rating: null,
  notes: null,
  area: null,
  multiple_locations: false,
  foods: [],
  photo_urls: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Not logged in unless a test says otherwise: requireAdmin redirects, which
  // Next implements as a throw.
  vi.mocked(requireAdmin).mockRejectedValue(new Error("NEXT_REDIRECT"));
});

test("createPhotoUploadAction refuses without an admin session", async () => {
  await expect(createPhotoUploadAction(null)).rejects.toThrow("NEXT_REDIRECT");
  expect(createPhotoUpload).not.toHaveBeenCalled();
});

test("a failed validation deletes no photo files", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  const result = await updateRestaurantAction("id-1", { ...validInput, name: "" });
  expect(result).toEqual({ error: "Name is required" });
  expect(updateRestaurant).not.toHaveBeenCalled();
  expect(deletePhotoFiles).not.toHaveBeenCalled();
});

test("createPhotoUploadAction returns the upload and public URLs for an admin", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(createPhotoUpload).mockResolvedValue({ uploadUrl: "u", publicUrl: "p" });
  expect(await createPhotoUploadAction("id-1")).toEqual({ uploadUrl: "u", publicUrl: "p" });
  expect(createPhotoUpload).toHaveBeenCalledWith("id-1");
});

test("createPhotoUploadAction reports a storage failure without throwing", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(createPhotoUpload).mockRejectedValue(new Error("storage down"));
  expect(await createPhotoUploadAction(null)).toEqual({ error: "Couldn't start the upload" });
});
