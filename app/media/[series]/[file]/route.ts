import { getMediaAsset, mediaSourceUrlFor, VERIFIED_FALLBACK_MEDIA_COMMIT } from "@/data/media";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ series: string; file: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { series, file } = await params;

  if (process.env.VERCEL === "1") {
    // Raw GitHub keeps the existing /media/* URLs intact without embedding
    // the entire original media corpus in every serverless function bundle.
    // Pin to this deployment's commit so Preview media matches Preview code.
    const revision = process.env.VERCEL_GIT_COMMIT_SHA || VERIFIED_FALLBACK_MEDIA_COMMIT;
    const sourceUrl = mediaSourceUrlFor(series, file, revision);
    if (!sourceUrl) return new Response("Not found", { status: 404 });
    return new Response(null, {
      status: 307,
      headers: {
        Location: sourceUrl,
        "Cache-Control": "public, max-age=3600",
      },
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
