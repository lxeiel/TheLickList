import { getServiceClient, getAnonClient } from "./supabase";
import { parseMapsUrl } from "./maps";
import { MAX_FOOD_NAME, MAX_FOODS, normalizeFoods, type FoodItem } from "./foods";
import { MAX_LINK_LABEL, normalizeLinks } from "./links";
import { isOwnPhotoUrl, MAX_PHOTOS, removedPhotoUrls } from "./photos";
import { deletePhotoFiles } from "./photoStorage";

// label: Lex's own button text for the link (e.g. "Book a table"); without
// one, the button shows the type's name.
export type RestaurantLink = { type: "website" | "instagram" | "other"; url: string; label?: string };
export type RestaurantStatus = "wishlist" | "tried";

export type Restaurant = {
  id: string;
  name: string;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  links: RestaurantLink[];
  cuisine_tags: string[];
  price_range: string | null;
  status: RestaurantStatus;
  rating: number | null;
  notes: string | null;
  photo_urls: string[];
  foods: FoodItem[];
  area: string | null;
  /** More than one outlet; shown as a tag. */
  multiple_locations: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantInput = {
  name: string;
  maps_url: string;
  links: RestaurantLink[];
  cuisine_tags: string[];
  price_range: string | null;
  status: RestaurantStatus;
  rating: number | null;
  notes: string | null;
  area: string | null;
  multiple_locations: boolean;
  foods: FoodItem[];
  photo_urls: string[];
};

export function validateRestaurantInput(input: RestaurantInput): string | null {
  if (typeof input.name !== "string" || !input.name.trim()) {
    return "Name is required";
  }
  if (input.status !== "wishlist" && input.status !== "tried") {
    return "Invalid status";
  }
  if (
    input.rating != null &&
    (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10)
  ) {
    return "Rating must be a whole number from 1 to 10";
  }
  for (const link of input.links ?? []) {
    if (link.url && !/^https?:\/\//i.test(link.url)) {
      return "Links must be http or https URLs";
    }
    if ((link.label?.trim().length ?? 0) > MAX_LINK_LABEL) {
      return `Button names must be ${MAX_LINK_LABEL} characters or fewer`;
    }
  }
  // Counted after blank rows and surrounding spaces are dropped, as saved.
  const foods = normalizeFoods(input.foods ?? []);
  if (foods.length > MAX_FOODS) {
    return `Too many foods (max ${MAX_FOODS})`;
  }
  if (foods.some((food) => food.name.length > MAX_FOOD_NAME)) {
    return `Food names must be ${MAX_FOOD_NAME} characters or fewer`;
  }
  const photos = input.photo_urls ?? [];
  if (photos.length > MAX_PHOTOS) {
    return `Too many photos (max ${MAX_PHOTOS})`;
  }
  if (!photos.every(isOwnPhotoUrl)) {
    return "Photos must be uploaded here";
  }
  return null;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await getServiceClient()
    .from("restaurant")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Restaurant[];
}

export async function listPublicRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await getAnonClient()
    .from("restaurant")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Restaurant[];
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const { data, error } = await getServiceClient()
    .from("restaurant")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Restaurant | null;
}

export async function createRestaurant(input: RestaurantInput): Promise<Restaurant> {
  const coords = await parseMapsUrl(input.maps_url);

  const { data, error } = await getServiceClient()
    .from("restaurant")
    .insert({
      name: input.name,
      maps_url: input.maps_url,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      links: normalizeLinks(input.links),
      cuisine_tags: input.cuisine_tags,
      price_range: input.price_range,
      status: input.status,
      rating: input.rating,
      notes: input.notes,
      area: input.area,
      multiple_locations: input.multiple_locations === true,
      foods: normalizeFoods(input.foods),
      photo_urls: input.photo_urls,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Restaurant;
}

export async function updateRestaurant(
  id: string,
  input: RestaurantInput,
): Promise<Restaurant> {
  const existing = await getRestaurant(id);
  // Only re-parse the Maps link when it actually changed. Re-parsing on
  // every edit means a transient failure (rate limit, network blip) would
  // silently null out coordinates that were already successfully resolved.
  const coords =
    existing && existing.maps_url === input.maps_url
      ? { lat: existing.lat, lng: existing.lng }
      : await parseMapsUrl(input.maps_url);

  const { data, error } = await getServiceClient()
    .from("restaurant")
    .update({
      name: input.name,
      maps_url: input.maps_url,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      links: normalizeLinks(input.links),
      cuisine_tags: input.cuisine_tags,
      price_range: input.price_range,
      status: input.status,
      rating: input.rating,
      notes: input.notes,
      area: input.area,
      multiple_locations: input.multiple_locations === true,
      foods: normalizeFoods(input.foods),
      photo_urls: input.photo_urls,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  // Only once the new photo list is saved: photos dropped from it go too.
  await deletePhotoFiles(removedPhotoUrls(existing?.photo_urls ?? [], input.photo_urls));

  return data as Restaurant;
}

// The admin's "Licked it" button: moves a wishlist spot to Licked without
// touching anything else (the score is added later, from the edit form).
export async function markLicked(id: string): Promise<void> {
  const { error } = await getServiceClient().from("restaurant").update({ status: "tried" }).eq("id", id);

  if (error) {
    throw error;
  }
}

// Deletes the restaurant, then its photo files.
export async function deleteRestaurant(id: string): Promise<void> {
  const existing = await getRestaurant(id);
  const { error } = await getServiceClient().from("restaurant").delete().eq("id", id);

  if (error) {
    throw error;
  }

  await deletePhotoFiles(existing?.photo_urls ?? []);
}
