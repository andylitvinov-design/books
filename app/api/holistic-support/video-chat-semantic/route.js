/** Opt-in semantic ranking of the current canonical Video Director options. */
import {NextResponse} from "next/server";
import {AppError} from "@/lib/assessments/contracts";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,readBody,safeError} from "@/lib/app/http";
import {parseVideoChatSemanticInput,suggestVideoChatSemanticChoice} from "@/lib/mandala/video-chat-semantic.mjs";
import {freeFirstVideoProviders} from "@/lib/mandala/first-video-free-providers.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=8;
export async function POST(request){
 try{
  const config=getAppConfig();
  requireSameOrigin(request,config);
  const data=parseVideoChatSemanticInput(await readBody(request,1500));
  if(!data)throw new AppError("VIDEO_CHAT_SEMANTIC_INVALID",400);
  // Both gates default to disabled: never enable a paid/free-tier account blindly.
  if(process.env.HH_VIDEO_CHAT_SEMANTIC_ENABLED!=="true"||
     process.env.HH_FIRST_VIDEO_AI_ENABLED!=="true"||
     freeFirstVideoProviders(process.env).length===0)
    throw new AppError("VIDEO_CHAT_SEMANTIC_DISABLED",503);
  // Shared existing quota plus a stricter semantic-specific limit.
  await consumeRate(config,{op:"video-chat-free-global-day"},60,86400);
  await consumeRate(config,{op:"video-chat-free-global-minute"},10,60);
  await consumeRate(config,{op:"video-chat-semantic-global-day"},20,86400);
  await consumeRate(config,{op:"video-chat-semantic-global-minute"},3,60);
  const result=await suggestVideoChatSemanticChoice(data,process.env);
  if(!result.optionId)throw new AppError(result.error||"VIDEO_CHAT_SEMANTIC_UNCERTAIN",503);
  return NextResponse.json({optionId:result.optionId,confidence:result.confidence,
    changesApplied:false,videoRendered:false},{headers:PRIVATE_HEADERS});
 }catch(error){
  const e=safeError(error);
  return NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
 }
}
