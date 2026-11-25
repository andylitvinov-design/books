import { NextResponse } from "next/server";
import { AppError } from "@/lib/assessments/contracts";
import { getAppConfig, requestOrigin, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { PRIVATE_HEADERS,readBody,safeError } from "@/lib/app/http";
import { consumeRate } from "@/lib/app/database";
import { listMonthlySupportMessages,sendMonthlySupportMessage } from "@/lib/practitioners/monthly-support-messages";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

async function handle(request,{params}){
  let auth;
  try {
    const config=getAppConfig();
    requestOrigin(request,config);
    if(request.method!=="GET")requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    const {programId}=await params;
    await consumeRate(config,{op:"personal-support-message",account:actor.id},request.method==="GET"?60:30,60);
    const result=request.method==="GET"
      ? await listMonthlySupportMessages(config,actor,programId)
      : request.method==="POST"
        ? await sendMonthlySupportMessage(config,actor,programId,await readBody(request,4096))
        : (()=>{throw new AppError("NOT_FOUND",404)})();
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
export {handle as GET,handle as POST};
