import { getServiceClient } from "./supabase";
import { parseMapsUrl } from "./maps";

export type RestaurantLink = { type: "website" | "instagram" | "other"; url: string };
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
};

export function validateRestaurantInput(input: RestaurantInput): string | null {
  if (typeof input.name !== "string" || !input.name.trim()) {
    return "Name is required";
  }
  if (input.status !== "wishlist" && input.status !== "tried") {
    return "Invalid status";
  }
  if (input.rating != null && !Number.isInteger(input.rating)) {
    return "Rating must be a whole number";
  }
  for (const link of input.links ?? []) {
    if (link.url && !/^https?:\/\//i.test(link.url)) {
      return "Links must be http or https URLs";
    }
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
      links: input.links,
      cuisine_tags: input.cuisine_tags,
      price_range: input.price_range,
      status: input.status,
      rating: input.rating,
      notes: input.notes,
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
      links: input.links,
      cuisine_tags: input.cuisine_tags,
      price_range: input.price_range,
      status: input.status,
      rating: input.rating,
      notes: input.notes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Restaurant;
}
