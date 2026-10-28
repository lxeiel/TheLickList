// Food pics live in a public Supabase Storage bucket; restaurants store their
// public URLs in photo_urls, in strip order.
export const PHOTO_BUCKET = "restaurant-photos";
export const MAX_PHOTOS = 12;
export const PHOTO_MAX_EDGE = 1600;

export function photoUrlPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/`;
}

// Only photos uploaded through the admin (into this project's bucket) may be
// saved on a restaurant.
export function isOwnPhotoUrl(url: string): boolean {
  return photoPathFromUrl(url) !== null;
}

// The object's path inside the bucket (e.g. "new/abc.jpg"), which is what
// Storage's remove() takes.
export function photoPathFromUrl(url: string): string | null {
  const prefix = photoUrlPrefix();
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return path === "" ? null : path;
}

// Photos dropped between the saved version and the new one; reordering
// alone removes nothing.
export function removedPhotoUrls(before: string[], after: string[]): string[] {
  const kept = new Set(after);
  return before.filter((url) => !kept.has(url));
}

// Size a photo to fit max on its long edge, keeping its shape; small photos
// are never enlarged.
export function fitWithin(width: number, height: number, max = PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
