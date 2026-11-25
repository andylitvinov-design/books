import { NextResponse } from "next/server";
import { buildPersonalPayPalVideoUrl, personalPayPalEnabled } from "@/lib/commerce/paypal-personal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = { "Cache-Control":"private, no-store, max-age=0", "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex" };

// Opens the pre-existing PayPal.Me profile with a server-owned fixed price.
// A redirect/return cannot prove payment. No PII, video brief, photo, client ID,
// order status or provider API credential is ever carried to PayPal.
export async function GET(_request:Request, {params}:{params:Promise<{productId:string}>}) {
  if(!personalPayPalEnabled())return NextResponse.json(
    {error:"PERSONAL_PAYPAL_DISABLED"},{status:503,headers});
  const {productId}=await params;
  const destination=buildPersonalPayPalVideoUrl(productId);
  if(!destination)return NextResponse.json(
    {error:"VIDEO_PRODUCT_NOT_AVAILABLE"},{status:404,headers});
  return NextResponse.redirect(destination,{status:303,headers});
}
