import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app/config";
import { PRIVATE_HEADERS, safeError } from "@/lib/app/http";
import { AppError } from "@/lib/assessments/contracts";
import { mediaCreditProviderConfig, verifyPaypalMediaEvent } from "@/lib/mandala/media-credit-payments";
import { applyVerifiedCreditTopup, holdVerifiedCreditTopup, reverseVerifiedCreditTopup } from "@/lib/mandala/media-credit-wallet";

export const runtime="nodejs";
export const preferredRegion="yul1";
export const dynamic="force-dynamic";
export const revalidate=0;

async function boundedBody(request) {
  if(Number(request.headers.get("content-length"))>262144)
    throw new AppError("PAYLOAD_TOO_LARGE",413);
  const reader=request.body?.getReader();
  if(!reader)throw new AppError("CREDIT_WEBHOOK_INVALID",400);
  const parts=[];let total=0;
  for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>262144){await reader.cancel();throw new AppError("PAYLOAD_TOO_LARGE",413);}
    parts.push(value);
  }
  return Buffer.concat(parts).toString("utf8");
}
export async function POST(request) {
  try{
    const merchant=mediaCreditProviderConfig("paypal");
    const raw=await boundedBody(request);
    let body;
    try{body=JSON.parse(raw);}catch{throw new AppError("CREDIT_WEBHOOK_INVALID",400);}
    const event=await verifyPaypalMediaEvent(merchant,body,request.headers);
    if(event.action==="ignore")return NextResponse.json({received:true,handled:false},{headers:PRIVATE_HEADERS});
    const config=getAppConfig();
    if(event.action==="credit") await applyVerifiedCreditTopup(config,event.proof);
    else if(event.action==="hold")await holdVerifiedCreditTopup(config,event.proof);
    else if(event.action==="reverse")await reverseVerifiedCreditTopup(config,event.proof);
    else throw new AppError("CREDIT_WEBHOOK_INVALID",400);
    return NextResponse.json({received:true,handled:true},{headers:PRIVATE_HEADERS});
  }catch(error){
    const safe=safeError(error);
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  }
}