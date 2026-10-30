import {privateVideoArchiveEnabled} from "@/lib/mandala/video-ai-archive";
import {NextResponse} from "next/server";
import {videoAiEnabled,VIDEO_AI_CATALOG} from "@/lib/mandala/video-ai-heygen.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function GET(){
  return NextResponse.json({
    enabled:videoAiEnabled(),archiveEnabled:videoAiEnabled()&&privateVideoArchiveEnabled(),provider:"heygen-direct-v3",
    plans:{smart:{priceUsd:VIDEO_AI_CATALOG.smart.priceUsd,aiSeconds:VIDEO_AI_CATALOG.smart.duration},
      pro:{priceUsd:VIDEO_AI_CATALOG.pro.priceUsd,aiSeconds:VIDEO_AI_CATALOG.pro.duration}},
    note:"AI clips only; full 30s montage requires assembly in the local editor",
  },{headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
