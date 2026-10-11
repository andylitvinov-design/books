/**
 * Preserve the exact PsiTrends course photographs while serving them through
 * Holistic House's own Next.js image optimizer. This avoids third-party image
 * requests from Safari/mobile visitors (and the cross-site hotlink failures
 * that otherwise leave an empty beige block).
 *
 * No stock images or AI-generated replacements. Historical archive source
 * links keep their original URLs; only the displayed image is proxied.
 */
export type ReikiPhotoWidth = 384 | 640 | 750 | 828 | 1080 | 1200 | 1920;

export function reikiPhotoUrl(src: string, width: ReikiPhotoWidth = 1080): string {
  // Local original art and non-PsiTrends assets remain untouched.
  if (!/^https:\/\/(?:www\.)?psitrends\.com\/images\//i.test(src)) return src;

  // Use the canonical origin, without a www redirect, and properly encode
  // historical filenames containing spaces or parentheses.
  const source = new URL(src);
  const canonical = new URL(source.pathname + source.search, "https://psitrends.com").href;
  return `/_next/image?url=${encodeURIComponent(canonical)}&w=${width}&q=75`;
}
