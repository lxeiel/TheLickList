import { fitWithin } from "@/lib/photos";

export const UNREADABLE_PHOTO = "Couldn't read this photo. Try a JPEG.";

// Browser-only: shrinks a picked photo to at most 1600px on its long side and
// re-encodes it as JPEG, so a 4 MB phone photo uploads as a few hundred KB.
export async function shrinkPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(UNREADABLE_PHOTO);
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(UNREADABLE_PHOTO);
  // JPEG has no transparency; a transparent PNG would otherwise turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(UNREADABLE_PHOTO))), "image/jpeg", 0.82),
  );
}
