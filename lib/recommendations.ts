import { createHmac } from "node:crypto";
import { getServiceClient } from "./supabase";
import {
  MAX_REC_FROM,
  MAX_REC_MAPS_URL,
  MAX_REC_NAME,
  MAX_REC_NOTES,
} from "./recommendationLimits";

export { MAX_REC_FROM, MAX_REC_MAPS_URL, MAX_REC_NAME, MAX_REC_NOTES };

export type Recommendation = {
  id: string;
  name: string;
  maps_url: string | null;
  notes: string | null;
  from_name: string | null;
  created_at: string;
};

export type RecommendationInput = {
  name: string;
  maps_url: string;
  notes: string;
  from_name: string;
};

export type NormalizedRecommendation = {
  name: string;
  maps_url: string | null;
  notes: string | null;
  from_name: string | null;
};

export const REC_HOURLY_LIMIT = 10;
export const REC_INBOX_CAP = 200;
export const NO_IP = "unknown";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRecommendation(
  input: RecommendationInput,
): NormalizedRecommendation {
  return {
    name: clean(input.name),
    maps_url: clean(input.maps_url) || null,
    notes: clean(input.notes) || null,
    from_name: clean(input.from_name) || null,
  };
}

export function validateRecommendation(
  rec: NormalizedRecommendation,
): string | null {
  if (!rec.name) return "Add the spot's name";
  if (rec.name.length > MAX_REC_NAME) return "Spot name is too long";
  if (rec.maps_url !== null && !/^https?:\/\//i.test(rec.maps_url)) {
    return "The Maps link should start with https://";
  }
  if (rec.maps_url !== null && rec.maps_url.length > MAX_REC_MAPS_URL) {
    return "Google Maps link is too long";
  }
  if (rec.notes !== null && rec.notes.length > MAX_REC_NOTES) {
    return "Notes are too long";
  }
  if (rec.from_name !== null && rec.from_name.length > MAX_REC_FROM) {
    return "Your name is too long";
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids come back from the browser; check the shape before using one in a query.
export function isRecommendationId(id: unknown): boolean {
  return typeof id === "string" && UUID.test(id);
}

export function clientIp(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || NO_IP;
}

export function hashIp(ip: string, key: string): string {
  return createHmac("sha256", key).update(ip).digest("hex");
}

export async function listRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await getServiceClient()
    .from("recommendation")
    .select("id, name, maps_url, notes, from_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Recommendation[];
}

export async function countRecentFromIp(
  ipHash: string,
  since: Date,
): Promise<number> {
  const { count, error } = await getServiceClient()
    .from("recommendation")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since.toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function countWaiting(): Promise<number> {
  const { count, error } = await getServiceClient()
    .from("recommendation")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function insertRecommendation(
  rec: NormalizedRecommendation,
  ipHash: string,
): Promise<void> {
  const { error } = await getServiceClient()
    .from("recommendation")
    .insert({ ...rec, ip_hash: ipHash });

  if (error) {
    throw error;
  }
}

export async function deleteRecommendation(id: string): Promise<void> {
  const { error } = await getServiceClient()
    .from("recommendation")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// Deleted in chunks so a 200-id batch keeps each request URL short.
const DELETE_CHUNK = 100;

export async function deleteRecommendations(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const { error } = await getServiceClient()
      .from("recommendation")
      .delete()
      .in("id", ids.slice(i, i + DELETE_CHUNK));

    if (error) {
      throw error;
    }
  }
}
