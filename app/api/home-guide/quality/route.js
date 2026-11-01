import { NextResponse } from "next/server";
import { getAppConfig, requestOrigin, requireSameOrigin } from "@/lib/app/config";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { insertHomeGuideQuality } from "@/lib/app/home-guide-quality";
import { validateGuideQualityFeedback } from "@/lib/home-guide-quality.mjs";

export const runtime = "nodejs";
export const preferredRegion = "yul1";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Explicit opt-in only. Never accept raw chat, medical fields, IDs or IP in JSON.
export async function POST(request) {
  try {
    const config = getAppConfig();
    requestOrigin(request, config);
    requireSameOrigin(request, config);
    const data = validateGuideQualityFeedback(await readBody(request, 512));
    if (!data) return NextResponse.json({ error: "INVALID_FEEDBACK" }, {
      status: 400, headers: PRIVATE_HEADERS,
    });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await consumeRate(config, { op: "home-guide-quality-optin", ip }, 6, 86400);
    const result = await insertHomeGuideQuality(config, data);
    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    const safe = safeError(error);
    return NextResponse.json({ error: safe.code }, {
      status: safe.status, headers: PRIVATE_HEADERS,
    });
  }
}
