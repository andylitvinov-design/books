// Personal photo preparation for iPhone Safari and desktop photo/file pickers.
// Decode only in the browser. Originals, GPS and EXIF are not uploaded.
export const SUPPORT_PHOTO_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";
export const SUPPORT_PHOTO_MAX_INPUT_BYTES = 25_000_000;
export const SUPPORT_PHOTO_MAX_UPLOAD_BYTES = 1_350_000;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const FILE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

export async function prepareBrowserPhoto(file: File): Promise<Blob> {
  if (!file || !file.size || file.size > SUPPORT_PHOTO_MAX_INPUT_BYTES ||
    (!MIME_TYPES.has(file.type.toLowerCase()) &&
      !(file.type === "" && FILE_EXT.test(file.name)))) {
    throw new Error("PHOTO_FILE_INVALID");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height || width * height > 36_000_000) throw new Error("PHOTO_FILE_INVALID");
    const scale = Math.min(1, 1536 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("PHOTO_FILE_INVALID");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.68, 0.54]) {
      const output = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (output && output.size >= 128 && output.size <= SUPPORT_PHOTO_MAX_UPLOAD_BYTES) return output;
    }
    throw new Error("PHOTO_FILE_INVALID");
  } catch {
    // HEIC support depends on the installed iOS browser decoder. Never
    // claim a photo was saved when the browser cannot actually read it.
    throw new Error("PHOTO_FILE_INVALID");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
