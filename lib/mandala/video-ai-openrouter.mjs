/**
 * One purpose-scoped asynchronous Video API client for OpenRouter.
 * Only call from a server route AFTER a durable paid-code claim has committed.
 * No direct browser key, no auto-retries (timeouts can still incur a charge).
 * https://openrouter.ai/docs/api/api-reference/video-generation/create-videos
 */
const API="https://openrouter.ai/api/v1";
const JOB_ID=/^[A-Za-z0-9_-]{8,128}$/;
const VISUAL_EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const VISUAL_PHONE=/(?:\+?\d[\s().-]*){9,}/;
const PRIVATE_HINTS=/(диагноз|болезнь|депресс|травм|пациент|лекарств|медицин|diagnos|therapy patient|medical record|private client|salud mental|historial m[eé]dico)/i;

export const VIDEO_AI_CATALOG=Object.freeze({
  smart:Object.freeze({model:"heygen/heygen-video-1",duration:8,resolution:"768p",priceUsd:2,
    // Always budget against the STANDARD, not expiring promotional price.
    rateCentsPerSecond:3,externalBudgetCents:75}),
  pro:Object.freeze({model:"heygen/heygen-video-1",duration:15,resolution:"768p",priceUsd:9.9,
    rateCentsPerSecond:3,externalBudgetCents:550}),
});
export function videoAiEnabled(env=process.env){
  return env.HH_VIDEO_PAID_ENABLED==="true" &&
    /^[A-Za-z0-9_-]{12,}$/.test(String(env.HH_VIDEO_OPENROUTER_API_KEY||"")) &&
    /^[A-Za-z0-9_-]{32,}$/.test(String(env.HH_VIDEO_CODE_HMAC_KEY||""));
}
export function buildVideoAiRequest(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("invalid_video_request");
  const tier=String(input.tier||"");
  const offer=VIDEO_AI_CATALOG[tier];
  if(!offer)throw Error("invalid_video_tier");
  const prompt=typeof input.visualPrompt==="string"?input.visualPrompt.trim().replace(/[\u0000-\u001f\u007f]/g," "):"";
  if(prompt.length<18||prompt.length>800||VISUAL_EMAIL.test(prompt)||
    VISUAL_PHONE.test(prompt)||PRIVATE_HINTS.test(prompt))
    throw Error("invalid_visual_prompt");
  if(input.consentExternal!==true)throw Error("external_consent_required");
  const aspectRatio=["9:16","16:9","1:1"].includes(input.aspectRatio)?input.aspectRatio:"9:16";
  // The client cannot change the model, duration, cost or audio setting.
  const content={
    model:offer.model,prompt:prompt+", cinematic natural movement, coherent lighting, no visible text, no logos, no intimate personal data",
    duration:offer.duration,resolution:offer.resolution,aspect_ratio:aspectRatio,
    generate_audio:false,
  };
  const estimatedCents=offer.duration*offer.rateCentsPerSecond;
  if(estimatedCents>offer.externalBudgetCents)throw Error("ai_budget_exceeded");
  return Object.freeze({tier,costCeilingCents:offer.externalBudgetCents,
    estimateCents:estimatedCents,body:Object.freeze(content)});
}
function apiKey(key){
  if(typeof key!=="string"||!/^[-A-Za-z0-9_]{12,}$/.test(key))throw Error("video_api_not_configured");
  return key;
}
function acceptedId(value){
  if(typeof value!=="string"||!JOB_ID.test(value))throw Error("invalid_video_job_id");
  return value;
}
function safeStatus(data,id){
  if(!data||typeof data!=="object"||data.id!==id||
     !["pending","in_progress","completed","failed","cancelled","expired"].includes(data.status))
    throw Error("video_provider_response_invalid");
  return Object.freeze({
    id,status:data.status,
    ready:data.status==="completed",
    terminal:["completed","failed","cancelled","expired"].includes(data.status),
  });
}
async function apiFetch(url,{key,method="GET",body,fetchImpl=fetch}){
  const response=await fetchImpl(url,{
    method,redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(method==="POST"?25000:15000),
    headers:{Authorization:"Bearer "+apiKey(key),
      ...(method==="POST"?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  if(!response?.ok)throw Error("video_provider_unavailable");
  try{return await response.json()}catch{throw Error("video_provider_response_invalid")}
}
export async function submitVideoAiJob(request,{key,fetchImpl=fetch}={}){
  const validated=buildVideoAiRequest(request);
  const response=await apiFetch(API+"/videos",{
    key,method:"POST",body:validated.body,fetchImpl,
  });
  const id=acceptedId(response?.id);
  if(!["pending","in_progress"].includes(response.status))throw Error("video_provider_response_invalid");
  return {id,status:response.status,estimateCents:validated.estimateCents};
}
export async function readVideoAiJob(id,{key,fetchImpl=fetch}={}){
  acceptedId(id);
  const response=await apiFetch(API+"/videos/"+encodeURIComponent(id),{key,fetchImpl});
  return safeStatus(response,id);
}
export async function fetchVideoAiContent(id,{key,fetchImpl=fetch}={}){
  acceptedId(id);
  const response=await fetchImpl(API+"/videos/"+encodeURIComponent(id)+"/content?index=0",{
    method:"GET",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(25000),
    headers:{Authorization:"Bearer "+apiKey(key)},
  });
  const type=response.headers?.get("content-type")||"";
  if(!response.ok||!/^video\/(?:mp4|webm)/i.test(type)||!response.body)
    throw Error("video_content_unavailable");
  return response;
}
