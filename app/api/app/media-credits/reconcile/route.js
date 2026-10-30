import { NextResponse } from "next/server";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getCreditTopup, creditWallet, applyVerifiedCreditTopup } from "@/lib/mandala/media-credit-wallet";
import { mediaCreditProviderConfig, verifyMediaStripeCheckout } from "@/lib/mandala/media-credit-payments";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function POST(request) {
  let auth;
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    if(request.headers.has("x-hh-account-id")&&request.headers.get("x-hh-account-id")!==actor.id)
      throw new AppError("ACCOUNT_CHANGED",409);
    await consumeRate(config,{op:"media-credit-reconcile",actor:actor.id},8,60);
    const body=onlyKeys(await readBody(request,1024),["topupId"]);
    const topup=await getCreditTopup(config,actor,body.topupId);
    if(topup.provider!=="stripe") throw new AppError("CREDIT_PROVIDER_INVALID",400);
    const merchant=mediaCreditProviderConfig("stripe");
    if(topup.environment!==merchant.environment) throw new AppError("CREDIT_PAYMENT_MISMATCH",409);
    if(topup.status==="held"||topup.status==="reversed")
      throw new AppError("CREDIT_PAYMENT_REVIEW",409);
    if(topup.status!=="paid") {
      if(topup.status!=="checkout_ready"||!topup.provider_checkout_id)
        throw new AppError("CREDIT_PAYMENT_UNCONFIRMED",409);
      const proof=await verifyMediaStripeCheckout(merchant,topup.provider_checkout_id);
      if(proof.topupId!==topup.id||proof.accountId!==actor.id||proof.amountMinor!==topup.amount_minor)
        throw new AppError("CREDIT_PAYMENT_MISMATCH",409);
      await applyVerifiedCreditTopup(config,proof);
    }
    const wallet=await creditWallet(config,actor);
    return auth.apply(NextResponse.json({verified:true,...wallet},{headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}