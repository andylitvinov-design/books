import photoAssets from "@/data/academy/reiki-photo-assets.json";

/** Preserve original course photographs without runtime image transformations.
 * Static same-origin files retain Safari compatibility and original pixels.
 * Historical archive hyperlinks are intentionally unchanged by this helper.
 */
export type ReikiPhotoWidth = 384 | 640 | 750 | 828 | 1080 | 1200 | 1920;

const sourcePaths = new Map(photoAssets.assets.map((asset) => [asset.source, asset.path]));

export function reikiPhotoUrl(src: string, width: ReikiPhotoWidth = 1080): string {
  // Preserve the existing consumer signature. CSS controls display size;
  // byte-identical originals are no longer resized at runtime.
  void width;
  if (!/^https:\/\/(?:www\.)?psitrends\.com\/images\//i.test(src)) return src;
  const source = new URL(src);
  const canonical = `https://psitrends.com${decodeURIComponent(source.pathname)}`;
  const local = sourcePaths.get(canonical);
  if (!local || source.search || source.hash) {
    throw new Error(`Missing verified static course photo: ${canonical}`);
  }
  return local;
}
