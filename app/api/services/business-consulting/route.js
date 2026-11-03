import { NextResponse } from "next/server";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { consumeRate } from "@/lib/app/database";
import { readBody, safeError } from "@/lib/app/http";
import { AppError } from "@/lib/assessments/contracts";
import { validateBusinessEnquiry } from "@/lib/business-consulting/intake-policy";
import { submitBusinessEnquiry } from "@/lib/business-consulting/enquiry-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request) {
  try {
    const config = getAppConfig();
    requireSameOrigin(request, config);
    if (!/application\/json(?:;|$)/i.test(request.headers.get("content-type")||""))
      throw new AppError("INVALID_CONTENT_TYPE",415);
    const raw = await readBody(request, 2400);
    let input;
    try { input = validateBusinessEnquiry(raw); }
    catch (error) {
      throw new AppError(["CONSENT_REQUIRED","CONTACT_REQUIRED"].includes(error.message) ? error.message : "INVALID_BUSINESS_REQUEST",400);
    }
    if (input.honeypot) return NextResponse.json({received:true},{status:202,headers:{"Cache-Control":"no-store"}});
    const ip=(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"unknown").split(",")[0].trim().slice(0,70);
    await consumeRate(config,{op:"business-enquiry-hour",ip},5,3600);
    await consumeRate(config,{op:"business-enquiry-global"},120,3600);
    const result=await submitBusinessEnquiry(config,input);
    return NextResponse.json(result,{status:202,headers:{"Cache-Control":"no-store"}});
  }catch(error) {
    const safe=safeError(error);
    return NextResponse.json({error:safe.code},{status:safe.status,headers:{"Cache-Control":"no-store"}});
  }
}
