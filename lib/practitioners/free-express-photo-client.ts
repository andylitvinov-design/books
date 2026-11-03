// Browser-only, local processing. Raw images are never sent to an external
// image processor or analytics service; backend still validates/re-encodes.
export const EXPRESS_MAX_UPLOAD_BYTES = 2_750_000;
export const EXPRESS_MAX_SOURCE_BYTES = 12_000_000;

function photoPixels(file: File): Promise<ImageBitmap | HTMLImageElement> {
  const fallback = () => new Promise<HTMLImageElement>((resolve, reject) => {
    // A CSP-approved data: URL fallback supports older iOS Safari and HEIC.
    // Never create public blob URLs or send original bytes outside this tab.
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("PHOTO_READ_FAILED"));
    reader.onload = () => {
      if (typeof reader.result !== "string") { reject(new Error("PHOTO_READ_FAILED")); return; }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("PHOTO_DECODE_FAILED"));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  return typeof createImageBitmap === "function" ? createImageBitmap(file).catch(fallback) : fallback();
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(result => result?.size ? resolve(result) : reject(new Error("PHOTO_ENCODE_FAILED")),
      "image/jpeg", quality);
  });
}

export async function prepareFreeExpressPhoto(file: File): Promise<File> {
  if (!file || file.size < 128 || file.size > EXPRESS_MAX_SOURCE_BYTES)
    throw new Error("PHOTO_SIZE_NOT_ALLOWED");
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic && file.size <= EXPRESS_MAX_UPLOAD_BYTES)
    return file;

  const image = await photoPixels(file);
  try {
    const width = image.width;
    const height = image.height;
    if (!Number.isFinite(width) || !Number.isFinite(height)
      || width < 1 || height < 1 || width * height > 60_000_000)
      throw new Error("PHOTO_DIMENSIONS_NOT_ALLOWED");
    const ratio = Math.min(1, 1400 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("PHOTO_CANVAS_UNAVAILABLE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await jpegBlob(canvas, 0.8);
    if (blob.size > EXPRESS_MAX_UPLOAD_BYTES) blob = await jpegBlob(canvas, 0.64);
    if (blob.size > EXPRESS_MAX_UPLOAD_BYTES) throw new Error("PHOTO_COMPRESSION_FAILED");
    // JPEG re-encoding strips location EXIF/metadata even before server
    // processing. Filename is constant and never sent to the CRM contact.
    return new File([blob], "free-review.jpg", { type: "image/jpeg" });
  } finally {
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
  }
}
