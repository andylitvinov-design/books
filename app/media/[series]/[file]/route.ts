import { getMediaAsset, getRemoteMediaResponse, mediaSourceUrlFor, VERIFIED_FALLBACK_MEDIA_COMMIT } from "@/data/media";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ series: string; file: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { series, file } = await params;

  if (process.env.VERCEL === "1") {
    // Deliver pinned public originals under the same origin: browser redirects
    // to raw GitHub violate reader CSP. Keep the original corpus out of bundles.
    const revision = process.env.VERCEL_GIT_COMMIT_SHA || VERIFIED_FALLBACK_MEDIA_COMMIT;
    if (series === "maya") return getRemoteMediaResponse(series, file, revision);
    // Preserve other series until large-original delivery is verified separately.
    const sourceUrl = mediaSourceUrlFor(series, file, revision);
    if (!sourceUrl) return new Response("Not found", { status: 404 });
    return new Response(null, {
      status: 307,
      headers: { Location: sourceUrl, "Cache-Control": "public, max-age=3600" },
    });
  }

  // Local builds still read the original source images for offline development.
  const asset = await getMediaAsset(series, file);

  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  if (!asset.contentType.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(asset.body), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": asset.contentType,
    },
  });
}
