import {NextResponse} from "next/server";
import {getAppConfig,requestOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function GET(request){
  let auth;
  try{
    const config=getAppConfig();
    requestOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    return auth.apply(NextResponse.json({accountId:actor.id},
      {headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
