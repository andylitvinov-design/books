import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app/config";
import { PRIVATE_HEADERS, safeError } from "@/lib/app/http";
import { AppError } from "@/lib/assessments/contracts";
import { mediaCreditProviderConfig, verifyStripeMediaEvent } from "@/lib/mandala/media-credit-payments";
import { applyVerifiedCreditTopup, holdVerifiedCreditTopup, reverseVerifiedCreditTopup } from "@/lib/mandala/media-credit-wallet";

export const runtime="nodejs";
export const preferredRegion="yul1";
export const dynamic="force-dynamic";
export const revalidate=0;

async function boundedBody(request) {
  const length=Number(request.headers.get("content-length"));
  if(length>262144)throw new AppError("PAYLOAD_TOO_LARGE",413);
  const reader=request.body?.getReader();
  if(!reader)throw new AppError("CREDIT_WEBHOOK_INVALID",400);
  let total=0;const parts=[];
  for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>262144){await reader.cancel();throw new AppError("PAYLOAD_TOO_LARGE",413);}
    parts.push(value);
  }
  return Buffer.concat(parts);
}
export async function POST(request) {
  try{
    const merchant=mediaCreditProviderConfig("stripe");
    const raw=await boundedBody(request);
    const event=await verifyStripeMediaEvent(merchant,raw,request.headers.get("stripe-signature"));
    if(event.action==="ignore"||event.action==="manual_review")
      return NextResponse.json({received:true,handled:false},{headers:PRIVATE_HEADERS});
    const config=getAppConfig();
    if(event.action==="credit") await applyVerifiedCreditTopup(config,event.proof);
    else if(event.action==="hold") await holdVerifiedCreditTopup(config,event.proof);
    else if(event.action==="reverse") await reverseVerifiedCreditTopup(config,event.proof);
    else throw new AppError("CREDIT_WEBHOOK_INVALID",400);
    return NextResponse.json({received:true,handled:true},{headers:PRIVATE_HEADERS});
  }catch(error){
    const safe=safeError(error);
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  }
}