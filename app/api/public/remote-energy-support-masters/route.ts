import { NextResponse, type NextRequest } from "next/server";
import { isPublicLocale } from "@/data/academy/catalog";
import { listPublishedConsultationOffers, listReikiSupportMasters, listRemoteEnergySupportMasters } from "@/lib/practitioners/public-remote-support-masters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  if (!locale || !isPublicLocale(locale)) {
    return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind && !["consultation", "reiki"].includes(kind)) {
    return NextResponse.json({ error: "INVALID_KIND" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    if (kind === "consultation") {
      const consultations = await listPublishedConsultationOffers(locale);
      return NextResponse.json({ consultations }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }
    const masters = kind === "reiki" ? await listReikiSupportMasters(locale) :
      await listRemoteEnergySupportMasters(locale);
    return NextResponse.json({ masters }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    // An unavailable directory is not proof that no practitioners exist.
    return NextResponse.json({ error: "PRACTITIONERS_UNAVAILABLE" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
