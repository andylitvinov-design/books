import { NextResponse } from "next/server";
import { buildWiseServicePaymentUrl, wisePaymentsEnabled } from "@/lib/commerce/wise-payments";

export const dynamic = "force-dynamic";

// Hosted Wise checkout. A redirect (or browser return) is NOT payment evidence.
// Any fulfillment requires independent confirmation in the merchant's Wise account.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!wisePaymentsEnabled()) {
    return NextResponse.json(
      { error: "WISE_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { productId } = await params;
  const target = buildWiseServicePaymentUrl(process.env.HH_WISE_PAYMENT_OPEN_LINK, productId);
  if (!target) {
    return NextResponse.json(
      { error: "UNKNOWN_SERVICE" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.redirect(target, {
    status: 303,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
