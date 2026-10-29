import { NextResponse } from "next/server";
import { getAppConfig,requestOrigin,requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS,readBody,safeError } from "@/lib/app/http";
import { AppError } from "@/lib/assessments/contracts";
import {
  readMyAgentMemory,consentToAgentMemory,saveOwnAgentMemory,
  deleteOwnAgentMemory,eraseAllOwnAgentMemory,configureOwnAgentMemoryUse,
} from "@/lib/holistic-support/agent-memory-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
const enabled=()=>process.env.HH_AGENT_MEMORY_ENABLED==="true";
async function endpoint(request) {
  let auth;
  try {
    if(!enabled())throw new AppError("AGENT_MEMORY_UNAVAILABLE",503);
    const config=getAppConfig();
    if(request.method==="GET")requestOrigin(request,config);
    else requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    // Throttle encrypted writes and revocations for the verified owner.
    if(request.method!=="GET")
      await consumeRate(config,{op:"agent-memory-mutation",actorId:actor.id},30,60);
    // Optional owner header prevents stale cross-account tabs from editing
    // a different newly signed-in account. Never trust its value for auth.
    const expected=request.headers.get("x-hh-account-id");
    if(expected && expected!==actor.id)throw new AppError("ACCOUNT_CHANGED",409);
    let data;
    if(request.method==="GET"){
      data=await readMyAgentMemory(config,actor);
    } else if(request.method==="DELETE"){
      data=await eraseAllOwnAgentMemory(config,actor);
    } else if(request.method==="POST") {
      const body=await readBody(request,2048);
      if(!body || Object.keys(body).some(x=>!["action","accepted","enabled","kind","value"].includes(x)))
        throw new AppError("INVALID_MEMORY_REQUEST",400);
      if(body.action==="consent" && Object.keys(body).every(x=>["action","accepted"].includes(x)))
        data=await consentToAgentMemory(config,actor,body.accepted);
      else if(body.action==="use" && Object.keys(body).every(x=>["action","enabled"].includes(x)))
        data=await configureOwnAgentMemoryUse(config,actor,body.enabled);
      else if(body.action==="set" && Object.keys(body).every(x=>["action","kind","value"].includes(x)))
        data=await saveOwnAgentMemory(config,actor,body.kind,body.value);
      else if(body.action==="remove" && Object.keys(body).every(x=>["action","kind"].includes(x)))
        data=await deleteOwnAgentMemory(config,actor,body.kind);
      else throw new AppError("INVALID_MEMORY_REQUEST",400);
    } else throw new AppError("METHOD_NOT_ALLOWED",405);
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}));
  } catch(error) {
    const safe=safeError(error);
    const reply=NextResponse.json({error:safe.code},{
      status:safe.status,headers:PRIVATE_HEADERS,
    });
    return auth?auth.apply(reply):reply;
  }
}
export const GET=endpoint;
export const POST=endpoint;
export const DELETE=endpoint;
