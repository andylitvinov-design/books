import { NextResponse } from "next/server";
import { buildPersonalPayPalServiceUrl, personalPayPalEnabled } from "@/lib/commerce/paypal-personal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

// PayPal.Me is an external manual Goods & Services payment.
// Redirecting does not capture funds, mark an invoice paid or book a session.
export async function GET(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  if (!personalPayPalEnabled()) {
    return NextResponse.json({ error: "PERSONAL_PAYPAL_DISABLED" }, { status: 503, headers: privateHeaders });
  }
  const { productId } = await params;
  const url = buildPersonalPayPalServiceUrl(productId);
  if (!url) {
    return NextResponse.json({ error: "UNKNOWN_SERVICE" }, { status: 404, headers: privateHeaders });
  }
  return NextResponse.redirect(url, { status: 303, headers: privateHeaders });
}
