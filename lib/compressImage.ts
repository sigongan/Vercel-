"use client";

const MAX_DIMENSION = 1568; // matches Claude's default vision resize target — no benefit sending more
const SKIP_BELOW_BYTES = 900_000; // already small enough, don't bother re-encoding
const JPEG_QUALITY = 0.82;

// The server only accepts jpeg/png/webp/gif (what Claude's vision API takes).
// iPhones default to shooting in this format — both the Camera capture and,
// on many devices, a Photo Library pick — so without this the single most
// common real-world photo (a snap of the fridge) gets rejected outright.
const HEIC_TYPES = ["image/heic", "image/heif"];

function isHeic(file: File): boolean {
  return HEIC_TYPES.includes(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Resizes/re-encodes large photos client-side before upload, and always
 * converts HEIC/HEIF to JPEG regardless of size since the server can't read
 * that format at all. Mainly guards against phone camera photos (often
 * 3-5MB) blowing past Vercel's ~4.5MB request body limit once base64-encoded,
 * and speeds up mobile uploads. Falls back to the original file if
 * compression fails or doesn't actually shrink it — except for HEIC, where
 * the original would just fail server-side, so a failed conversion here
 * surfaces as the extraction error instead of silently passing through.
 */
export async function compressImageFile(file: File): Promise<File> {
  const heic = isHeic(file);
  if (!heic && (!file.type.startsWith("image/") || file.size < SKIP_BELOW_BYTES)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && !heic) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob) {
      return file;
    }
    // A HEIC source must use the converted blob no matter the size — the
    // original would just be rejected server-side, and HEIC's compression
    // is good enough that the JPEG re-encode can end up larger.
    if (!heic && blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch (err) {
    console.error("image compression failed, using original file", err);
    return file;
  }
}
