import { NextResponse } from "next/server";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { createCreditTopup, storeCreditCheckout } from "@/lib/mandala/media-credit-wallet";
import { createMediaCreditCheckout, mediaCreditProviderConfig } from "@/lib/mandala/media-credit-payments";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function POST(request) {
  let auth;
  try {
    const config=getAppConfig(),origin=requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    if(request.headers.has("x-hh-account-id")&&request.headers.get("x-hh-account-id")!==actor.id)
      throw new AppError("ACCOUNT_CHANGED",409);
    await consumeRate(config,{op:"media-credit-checkout",actor:actor.id},6,60);
    const body=onlyKeys(await readBody(request,2048),["operationId","provider","amountMinor","locale"]);
    const provider=mediaCreditProviderConfig(body.provider);
    const topup=await createCreditTopup(config,actor,{
      operationId:body.operationId,provider:body.provider,amountMinor:body.amountMinor,
      locale:body.locale,environment:provider.environment,
    });
    if(topup.status!=="pending"&&topup.status!=="checkout_ready")
      throw new AppError("CREDIT_TOPUP_ALREADY_PROCESSED",409);
    const session=await createMediaCreditCheckout(provider,topup,origin);
    await storeCreditCheckout(config,actor,topup.id,session.id);
    return auth.apply(NextResponse.json({checkoutUrl:session.url,topupId:topup.id},
      {headers:PRIVATE_HEADERS}));
  }catch(error) {
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}