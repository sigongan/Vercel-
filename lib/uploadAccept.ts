// A plain <input accept> spanning image+video+pdf is what makes iOS show its
// 3-way "Photo Library / Take Photo / Choose File" chooser — UploadSourceSheet
// gives each of its own buttons one of these narrower lists instead, so
// tapping one goes straight to a single native picker.
export const PHOTO_ACCEPT_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
export const DOCUMENT_ACCEPT_TYPES = "application/pdf";
