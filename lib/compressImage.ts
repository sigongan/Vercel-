"use client";

const MAX_DIMENSION = 1568; // matches Claude's default vision resize target — no benefit sending more
const SKIP_BELOW_BYTES = 900_000; // already small enough, don't bother re-encoding
const JPEG_QUALITY = 0.82;

/**
 * Resizes/re-encodes large photos client-side before upload. Mainly guards
 * against phone camera photos (often 3-5MB) blowing past Vercel's ~4.5MB
 * request body limit once base64-encoded, and speeds up mobile uploads.
 * Falls back to the original file on any failure or if compression doesn't
 * actually shrink it.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    if (scale === 1) {
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

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch (err) {
    console.error("image compression failed, using original file", err);
    return file;
  }
}
