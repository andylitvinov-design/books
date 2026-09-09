import { getMediaAsset } from "@/data/media";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ series: string; file: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { series, file } = await params;
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
