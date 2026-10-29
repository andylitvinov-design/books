// Personal photo preparation for iPhone Safari and desktop photo/file pickers.
// Decode only in the browser. Originals, GPS and EXIF are not uploaded.
export const SUPPORT_PHOTO_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";
export const SUPPORT_PHOTO_MAX_INPUT_BYTES = 25_000_000;
export const SUPPORT_PHOTO_MAX_UPLOAD_BYTES = 1_350_000;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const FILE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

// Some iOS Safari decoders can render a HEIC/JPEG through <img> even when
// HTMLImageElement.decode() rejects or is missing. The load event is a real
// decoding check, never a bypass for unsupported or corrupt images.
function waitForBrowserImageLoad(image: HTMLImageElement): Promise<void> {
  const valid = () => image.naturalWidth > 0 && image.naturalHeight > 0;
  if (image.complete) {
    return valid() ? Promise.resolve() : Promise.reject(new Error("PHOTO_FILE_INVALID"));
  }
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      if (ok) resolve();
      else reject(new Error("PHOTO_FILE_INVALID"));
    };
    const onLoad = () => finish(valid());
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 15_000);
    image.addEventListener("load", onLoad);
    image.addEventListener("error", onError);
    // Image may finish decoding between our first ready check and listeners.
    if (image.complete) finish(valid());
  });
}

export async function prepareBrowserPhoto(file: File): Promise<Blob> {
  if (!file || !file.size || file.size > SUPPORT_PHOTO_MAX_INPUT_BYTES ||
    (!MIME_TYPES.has(file.type.toLowerCase()) && !FILE_EXT.test(file.name))) {
    throw new Error("PHOTO_FILE_INVALID");
  }
  // iOS Files sometimes labels a valid HEIC as application/octet-stream.
  // The browser must still decode the actual bytes before any upload.
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    // Observe the real image load before calling decode(). On iPhone WebKit
    // a HEIC decode() promise can remain pending even after <img> has loaded.
    // The first verified load/decode wins; a rejected decode still needs
    // a genuine load, and the load path fails closed after 15 seconds.
    const loaded = waitForBrowserImageLoad(image);
    if (typeof image.decode === "function") {
      await Promise.race([loaded, image.decode().catch(() => loaded)]);
    } else {
      await loaded;
    }
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height || width * height > 64_000_000) throw new Error("PHOTO_FILE_INVALID");
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
