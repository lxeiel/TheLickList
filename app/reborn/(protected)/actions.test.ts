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

vi.mock("@/lib/recommendations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recommendations")>()),
  deleteRecommendation: vi.fn(),
  deleteRecommendations: vi.fn(),
}));

const { requireAdmin } = await import("@/lib/auth");
const { refresh } = await import("next/cache");
const { createPhotoUpload, deletePhotoFiles } = await import("@/lib/photoStorage");
const { createRestaurant, updateRestaurant } = await import("@/lib/restaurants");
const { deleteRecommendation, deleteRecommendations } = await import("@/lib/recommendations");
const {
  createPhotoUploadAction,
  createRestaurantAction,
  dismissRecommendationAction,
  dismissRecommendationsAction,
  updateRestaurantAction,
} =
  await import("./actions");

const REC_ID = "11111111-1111-4111-8111-111111111111";
const REC_ID_B = "22222222-2222-4222-8222-222222222222";
const BATCH_ERROR = { error: "Couldn't dismiss them" };

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
  vi.resetAllMocks();
  // Not logged in unless a test says otherwise: requireAdmin shows a 404, which
  // Next implements as a throw.
  vi.mocked(requireAdmin).mockRejectedValue(new Error("NEXT_NOT_FOUND"));
});

test("createPhotoUploadAction refuses without an admin session", async () => {
  await expect(createPhotoUploadAction(null)).rejects.toThrow("NEXT_NOT_FOUND");
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

test("dismissRecommendationAction refuses without an admin session", async () => {
  await expect(dismissRecommendationAction(REC_ID)).rejects.toThrow("NEXT_NOT_FOUND");
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("dismissRecommendationAction deletes the rec for an admin", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationAction(REC_ID)).toEqual({});
  expect(deleteRecommendation).toHaveBeenCalledWith(REC_ID);
});

test("dismissRecommendationAction rejects an id that isn't a UUID", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationAction("rec-1")).toEqual({ error: "Couldn't dismiss it" });
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("dismissRecommendationAction reports a failure", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(deleteRecommendation).mockRejectedValue(new Error("db down"));
  expect(await dismissRecommendationAction(REC_ID)).toEqual({ error: "Couldn't dismiss it" });
});

test("dismissRecommendationsAction refuses without an admin session", async () => {
  await expect(dismissRecommendationsAction([REC_ID])).rejects.toThrow("NEXT_NOT_FOUND");
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction deletes each selected rec once", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationsAction([REC_ID, REC_ID_B, REC_ID])).toEqual({});
  expect(deleteRecommendations).toHaveBeenCalledTimes(1);
  expect(deleteRecommendations).toHaveBeenCalledWith([REC_ID, REC_ID_B]);
  expect(refresh).toHaveBeenCalled();
});

test("dismissRecommendationsAction refuses an empty list", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationsAction([])).toEqual(BATCH_ERROR);
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction refuses if any id is malformed", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationsAction([REC_ID, "x' OR '1'='1"])).toEqual(BATCH_ERROR);
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction refuses more than 200 ids", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  const ids = Array.from(
    { length: 201 },
    (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  );
  expect(await dismissRecommendationsAction(ids)).toEqual(BATCH_ERROR);
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction refuses a non-array", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationsAction("x" as never)).toEqual(BATCH_ERROR);
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction refuses a non-string in the list", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await dismissRecommendationsAction([REC_ID, 42 as never])).toEqual(BATCH_ERROR);
  expect(deleteRecommendations).not.toHaveBeenCalled();
});

test("dismissRecommendationsAction accepts exactly 200 ids in one call", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  const ids = Array.from(
    { length: 200 },
    (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  );
  expect(await dismissRecommendationsAction(ids)).toEqual({});
  expect(deleteRecommendations).toHaveBeenCalledTimes(1);
  expect(deleteRecommendations).toHaveBeenCalledWith(ids);
});

test("dismissRecommendationsAction reports a failed delete", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(deleteRecommendations).mockRejectedValue(new Error("db down"));
  expect(await dismissRecommendationsAction([REC_ID])).toEqual(BATCH_ERROR);
  expect(refresh).not.toHaveBeenCalled();
});

test("adding from a rec refuses without an admin session", async () => {
  await expect(createRestaurantAction(validInput, REC_ID)).rejects.toThrow("NEXT_NOT_FOUND");
  expect(createRestaurant).not.toHaveBeenCalled();
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("adding from a rec deletes the rec after the restaurant is created", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  const order: string[] = [];
  vi.mocked(createRestaurant).mockImplementation(async () => {
    order.push("create");
    return undefined as never;
  });
  vi.mocked(deleteRecommendation).mockImplementation(async () => {
    order.push("delete");
  });
  expect(await createRestaurantAction(validInput, REC_ID)).toEqual({});
  expect(order).toEqual(["create", "delete"]);
  expect(deleteRecommendation).toHaveBeenCalledWith(REC_ID);
});

test("adding without a rec deletes no rec", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await createRestaurantAction(validInput)).toEqual({});
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("a failed create keeps the rec", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(createRestaurant).mockRejectedValue(new Error("db down"));
  expect(await createRestaurantAction(validInput, REC_ID)).toEqual({ error: "Save failed" });
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("a failed validation keeps the rec", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await createRestaurantAction({ ...validInput, name: "" }, REC_ID)).toEqual({ error: "Name is required" });
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("a rec id that isn't a UUID creates nothing", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  expect(await createRestaurantAction(validInput, "rec-1")).toEqual({ error: "Save failed" });
  expect(createRestaurant).not.toHaveBeenCalled();
  expect(deleteRecommendation).not.toHaveBeenCalled();
});

test("a failed rec delete still counts as saved", async () => {
  vi.mocked(requireAdmin).mockResolvedValue();
  vi.mocked(deleteRecommendation).mockRejectedValue(new Error("db down"));
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await createRestaurantAction(validInput, REC_ID)).toEqual({});
  expect(logged).toHaveBeenCalled();
  logged.mockRestore();
});
