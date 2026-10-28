import { getServiceClient } from "./supabase";
import { PHOTO_BUCKET, photoPathFromUrl } from "./photos";

// Server-only: talks to Supabase Storage with the service-role key. Callers
// check the admin session first.

// A one-time link the browser uploads one photo to directly, so photo bytes
// never pass through the Next.js server. New restaurants have no id yet, so
// their photos go under "new/".
export async function createPhotoUpload(restaurantId: string | null): Promise<{ uploadUrl: string; publicUrl: string }> {
  const path = `${restaurantId ?? "new"}/${crypto.randomUUID()}.jpg`;
  const bucket = getServiceClient().storage.from(PHOTO_BUCKET);

  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error) {
    throw error;
  }

  return { uploadUrl: data.signedUrl, publicUrl: bucket.getPublicUrl(path).data.publicUrl };
}

// Removes photo files that a restaurant no longer uses. A failure here never
// fails the save or delete that triggered it: an orphaned file is harmless.
export async function deletePhotoFiles(urls: string[]): Promise<void> {
  const paths = urls.map(photoPathFromUrl).filter((path): path is string => path !== null);
  if (paths.length === 0) return;

  try {
    const { error } = await getServiceClient().storage.from(PHOTO_BUCKET).remove(paths);
    if (error) throw error;
  } catch (error) {
    console.error("Couldn't delete photo files", paths, error);
  }
}
