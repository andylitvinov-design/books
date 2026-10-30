/**
 * HeyGen Video 1 API adapter, strictly server-side.
 * Official workflow:
 *   POST https://api.heygen.com/v3/models/videos
 *   GET  https://api.heygen.com/v3/models/videos/{video_id}
 *   GET  returned verified video_url (a short-lived CDN MP4)
 *
 * Important: This is TEXT_TO_VIDEO, not avatars nor HeyGen Video Agent.
 * Calls are blocked by default in production through independent release gates.
 * No paid provider calls occur from this module's import, validation or read APIs.
 * See https://www.heygen.com/ai-video-api
 */
const API="https://api.heygen.com/v3/models/videos";
const SAFE_ID=/^[A-Za-z0-9_-]{8,128}$/;
const EMAIL=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE=/(?:\+?\d[\s().-]*){9,}/;
const PRIVATE_HINTS=/(диагноз|болезнь|депресс|травм|пациент|лекарств|медицин|diagnos|therapy patient|medical record|private client|salud mental|historial m[eé]dico)/i;
const PROMPT_LIMIT=800;
const BUDGETS=Object.freeze({
  smart:Object.freeze({model:"heygen-video-1",duration:8,resolution:"768p",
    priceUsd:2,normalCentsPerSecond:3,externalBudgetCents:75}),
  pro:Object.freeze({model:"heygen-video-1",duration:15,resolution:"768p",
    priceUsd:9.9,normalCentsPerSecond:3,externalBudgetCents:550}),
});
export const VIDEO_AI_CATALOG=BUDGETS;
const TERMINAL=new Set(["completed","failed","cancelled","expired"]);
const STATUSES=new Set(["pending","in_progress","completed","failed","cancelled","expired"]);
export function videoAiEnabled(env=process.env){
  // Two independent release switches: one general & one HeyGen-specific.
  // Keeping BOTH false/absent ensures that saving API secrets alone does not
  // start any cost. The user explicitly requests the service PAUSED.
  return env.HH_VIDEO_PAID_ENABLED==="true" &&
    env.HH_VIDEO_HEYGEN_RELEASE_APPROVED==="true" &&
    typeof env.HH_VIDEO_HEYGEN_API_KEY==="string" &&
    env.HH_VIDEO_HEYGEN_API_KEY.trim().length>=20 &&
    typeof env.HH_VIDEO_CODE_HMAC_KEY==="string" &&
    env.HH_VIDEO_CODE_HMAC_KEY.length>=32;
}
export function normalizeHeyGenVideoRequest(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("invalid_video_request");
  const tier=String(input.tier||""),offer=BUDGETS[tier];
  if(!offer)throw Error("invalid_video_tier");
  const text=typeof input.visualPrompt==="string"?input.visualPrompt.trim().replace(/[\u0000-\u001f\u007f]/g," "):"";
  if(text.length<18||text.length>PROMPT_LIMIT||EMAIL.test(text)||
    PHONE.test(text)||PRIVATE_HINTS.test(text))throw Error("invalid_visual_prompt");
  if(input.consentExternal!==true)throw Error("external_consent_required");
  const aspect_ratio=["9:16","16:9","1:1"].includes(input.aspectRatio)?input.aspectRatio:"9:16";
  const estimateCents=offer.duration*offer.normalCentsPerSecond;
  if(estimateCents>offer.externalBudgetCents)throw Error("ai_budget_exceeded");
  return Object.freeze({
    tier,
    estimateCents,
    costCeilingCents:offer.externalBudgetCents,
    // Only the visual scene prompt travels to the provider, not any personal
    // health/profile/session/test data or direct identity.
    body:Object.freeze({
      model:offer.model,
      mode:"text_to_video",
      prompt:text+
        ". Cinematic natural motion, stable visual composition, harmonious color grade."+
        " No captions, no readable text, no logos, no real client faces. Ambient sound only; no speech or music.",
      duration:offer.duration,
      resolution:offer.resolution,
      aspect_ratio,
    }),
  });
}
export const buildVideoAiRequest=normalizeHeyGenVideoRequest;
function keyOf(key){
  if(typeof key!=="string"||key.trim().length<20)throw Error("heygen_key_not_configured");
  return key.trim();
}
function videoId(value){
  if(typeof value!=="string"||!SAFE_ID.test(value))throw Error("invalid_video_id");
  return value;
}
function idempotency(value){
  if(typeof value!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(value))
    throw Error("invalid_idempotency_key");
  return value;
}
function unwrap(raw){
  if(!raw||typeof raw!=="object")throw Error("heygen_response_invalid");
  return raw.data&&typeof raw.data==="object"?raw.data:raw;
}
function statusOf(status){
  if(status==="queued"||status==="waiting"||status==="thinking")return "pending";
  if(status==="processing"||status==="generating")return "in_progress";
  return STATUSES.has(status)?status:null;
}
function safeAssetUrl(value){
  if(typeof value!=="string"||value.length>2800)return null;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port||
      url.hash||/[\r\n]/.test(value))return null;
    // Provider-hosted CDN ONLY. Never follow arbitrary URLs returned in a
    // provider payload (SSRF protection). If their CDN changes, inspect and
    // explicitly permit the new hostname after review.
    const host=url.hostname.toLowerCase();
    if(!(/(^|\.)heygen\.ai$/.test(host)||/(^|\.)heygen\.com$/.test(host)))
      return null;
    return url.href;
  }catch{return null}
}
async function jsonRequest(url,{key,method="GET",body,fetchImpl=fetch,jobKey}){
  const headers={"x-api-key":keyOf(key)};
  if(method==="POST"){
    headers["Content-Type"]="application/json";
    headers["Idempotency-Key"]=idempotency(jobKey);
  }
  const response=await fetchImpl(url,{
    method,redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(method==="POST"?25000:15000),
    headers,...(body?{body:JSON.stringify(body)}:{}),
  });
  if(!response?.ok)throw Error("heygen_provider_unavailable");
  let data;
  try{data=await response.json()}catch{throw Error("heygen_response_invalid")}
  return unwrap(data);
}
export async function submitVideoAiJob(input,{key,fetchImpl=fetch,jobKey}={}){
  const request=buildVideoAiRequest(input);
  const result=await jsonRequest(API,{key,method:"POST",body:request.body,fetchImpl,jobKey});
  const id=videoId(result.video_id||result.id);
  const status=statusOf(result.status||"pending");
  if(!status||TERMINAL.has(status))throw Error("heygen_response_invalid");
  return Object.freeze({id,status,estimateCents:request.estimateCents});
}
export async function readVideoAiJob(id,{key,fetchImpl=fetch}={}){
  videoId(id);
  const result=await jsonRequest(API+"/"+encodeURIComponent(id),{key,fetchImpl});
  const foundId=videoId(result.video_id||result.id||id);
  if(foundId!==id)throw Error("heygen_response_invalid");
  const status=statusOf(result.status);
  if(!status)throw Error("heygen_response_invalid");
  return Object.freeze({
    id,status,ready:status==="completed",terminal:TERMINAL.has(status),
    // Never return raw signed CDN URL to the client.
    videoReady:status==="completed"&&!!safeAssetUrl(result.video_url||result.url),
  });
}
export async function fetchVideoAiContent(id,{key,fetchImpl=fetch}={}){
  const job=videoId(id);
  // Separate authenticated status check before resolving CDN URL; expired
  // URLs are never cached in the browser or DB.
  const result=await jsonRequest(API+"/"+encodeURIComponent(job),{key,fetchImpl});
  if(statusOf(result.status)!=="completed")throw Error("heygen_video_not_ready");
  const url=safeAssetUrl(result.video_url||result.url);
  if(!url)throw Error("heygen_asset_url_unavailable");
  const response=await fetchImpl(url,{
    method:"GET",redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(30000),headers:{"Accept":"video/mp4"},
  });
  const mime=response?.headers?.get("content-type")||"";
  if(!response?.ok||!/^video\/mp4(?:;|$)/i.test(mime)||!response.body)
    throw Error("heygen_video_download_failed");
  return response;
}
export function getVideoAiProviderInfo(){
  return Object.freeze({
    id:"heygen-video-1",api:"heygen-direct-v3",
    creationEndpoint:API,readEndpoint:API+"/{id}",
    requiresVerifiedCode:true,pausedByDefault:true,
  });
}
