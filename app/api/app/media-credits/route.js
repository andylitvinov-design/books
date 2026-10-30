import { NextResponse } from "next/server";
import { getAppConfig, requestOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { PRIVATE_HEADERS, safeError } from "@/lib/app/http";
import { creditWallet } from "@/lib/mandala/media-credit-wallet";
import { MEDIA_CREDIT_OFFERS, MEDIA_TOPUP_PACKS, WELCOME_BONUS_MINOR } from "@/lib/mandala/media-credit-catalog.mjs";
import { mediaCreditPaymentAvailability } from "@/lib/mandala/media-credit-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  let auth;
  try {
    const config = getAppConfig();
    requestOrigin(request, config);
    const enabled = process.env.HH_MEDIA_CREDITS_ENABLED === "true";
    const publicData = {
      enabled, currency:"USD", welcomeMinor:WELCOME_BONUS_MINOR,
      offers:MEDIA_CREDIT_OFFERS, packs:MEDIA_TOPUP_PACKS,
      payments:mediaCreditPaymentAvailability(),
    };
    if (!enabled)
      return NextResponse.json({...publicData,authenticated:false},{headers:PRIVATE_HEADERS});
    auth=createRequestAuth(request,config);
    let actor;
    try { actor=await auth.verified(); }
    catch (error) {
      if (error?.code !== "SIGN_IN_REQUIRED") throw error;
      return auth.apply(NextResponse.json({...publicData,authenticated:false},{headers:PRIVATE_HEADERS}));
    }
    const balance=await creditWallet(config,actor);
    return auth.apply(NextResponse.json({...publicData,authenticated:true,...balance},{headers:PRIVATE_HEADERS}));
  } catch(error) {
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
