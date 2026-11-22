import "server-only";
/**
 * Paid 5-second HeyGen Video 1 adapter for the existing Video Studio.
 * Deliberately NOT wired to a public POST until payment receipt verification,
 * private photo upload, atomic monthly budget and worker ownership are live.
 * No unsigned customer URLs, voice impersonation or implicit retries.
 */
const HOST="https://api.heygen.com";
const ID=/^[a-zA-Z0-9_-]{8,255}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const PROMPTS=Object.freeze({
  smile:"A calm, natural, subtle smile forms on the person's face. Preserve the exact original identity and face, skin texture, hairstyle and clothing. Fixed camera. Do not create speech, lip sync, music, text, logos or additional people.",
  blink:"One gentle natural blink; otherwise keep the person's expression and pose unchanged. Preserve identity, face and clothing. Fixed camera. No speech, lip sync, music, text or extra people.",
  turn:"A very small, comfortable head turn and return with natural eye contact. Preserve face, age, identity and clothing. Fixed camera. No speech, lip sync, music, text or extra people.",
  wave:"A small natural hand greeting if the hand is visible in the source photo. Preserve exact person, age, face and clothing. No dialogue, lip sync, music, text or extra people."
});
function reject(code){const error=new Error(code);error.code=code;throw error;}
function positiveSafeInteger(value){return Number.isSafeInteger(value)&&value>0;}
export function heyGenVideoGiftSettings(env=process.env){
  const price=Number(env.HH_VIDEO_GIFT_PROVIDER_5S_USD_CENTS);
  const perJob=Number(env.HH_VIDEO_GIFT_PER_JOB_LIMIT_USD_CENTS);
  const monthly=Number(env.HH_VIDEO_GIFT_MONTHLY_BUDGET_USD_CENTS);
  const priceChecked=positiveSafeInteger(price)&&price<=500&&
    positiveSafeInteger(perJob)&&perJob<=500&&price<=perJob;
  const monthlyChecked=positiveSafeInteger(monthly)&&monthly<=100000&&
    monthly>=perJob;
  // HH_VIDEO_GIFT_PAID_ENABLED must remain FALSE until a real payment
  // receipt verification worker and private photo consent flow exist.
  return Object.freeze({
    enabled:env.HH_VIDEO_GIFT_PAID_ENABLED==="true"&&
      env.HH_VIDEO_GIFT_PAYMENT_GATE_VERIFIED==="true"&&
      typeof env.HEYGEN_API_KEY==="string"&&env.HEYGEN_API_KEY.length>=12&&
      priceChecked&&monthlyChecked,
    aiSeconds:5,resolution:"480p",model:"heygen-video-1",
    quoteUsdCents:priceChecked?price:null,
    maxPerJobUsdCents:priceChecked?perJob:null,
    monthlyUsdCents:monthlyChecked?monthly:null
  });
}
function paidProof(input,settings){
  const {job,assetId,remainingMonthlyUsdCents}=input||{};
  if(!settings.enabled)reject("GIFT_PAID_DISABLED");
  if(!job||!UUID.test(job.idempotency_key||"")||
    job.mode!=="heygen"||job.provider!=="heygen"||
    job.provider_model!=="heygen-video-1"||job.ai_seconds!==5||
    job.status!=="processing"||!job.provider_claimed_at||
    job.payment_verified_at===null||!job.payment_verified_at||
    !/^[a-f0-9]{64}$/.test(job.payment_receipt_digest||"")||
    !job.rights_confirmed||
    (job.source_owner!=="self"&&!job.subject_consent)||
    (job.source_owner==="minor"&&!job.guardian_consent)||
    !job.consent_recorded_at||!ID.test(assetId||""))
    reject("GIFT_PAID_PROOF_INVALID");
  if(!positiveSafeInteger(job.max_job_usd_cents)||
    job.estimate_usd_cents!==settings.quoteUsdCents||
    job.estimate_usd_cents>job.max_job_usd_cents||
    job.max_job_usd_cents>settings.maxPerJobUsdCents||
    !Number.isSafeInteger(remainingMonthlyUsdCents)||
    remainingMonthlyUsdCents<job.estimate_usd_cents)
    reject("GIFT_PAID_BUDGET_EXCEEDED");
  if(!Object.hasOwn(PROMPTS,job.motion))reject("GIFT_PAID_MOTION_INVALID");
}
async function jsonResponse(response){
  try{return await response.json();}catch{return {};}
}
function extractedId(payload){
  const id=payload?.video_id??payload?.data?.video_id??payload?.id;
  return typeof id==="string"&&ID.test(id)?id:null;
}
/** Must be invoked only by the trusted, single-writer job dispatcher after an
 * atomic DB claim. The HTTP Idempotency-Key covers duplicate provider submits
 * for 24h; the database claim covers longer unknown-outcome windows.
 */
export async function submitHeyGenVideoGiftFragment(input,{
  env=process.env,fetchImpl=fetch
}={}){
  const config=heyGenVideoGiftSettings(env);
  paidProof(input,config);
  const {job,assetId}=input;
  const body={
    model:"heygen-video-1",mode:"image_to_video",
    image:{type:"asset_id",asset_id:assetId},
    prompt:PROMPTS[job.motion],duration:5,resolution:"480p",
    prompt_enhancement:"quality"
  };
  let response;
  try{
    response=await fetchImpl(HOST+"/v3/models/videos",{
      method:"POST",
      headers:{"x-api-key":env.HEYGEN_API_KEY,
        "Idempotency-Key":job.idempotency_key,
        "Content-Type":"application/json"},
      body:JSON.stringify(body),
      redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20000),
    });
  }catch{
    // Unknown outcome: keep claim, query by provider correlation; NEVER issue
    // a second billable POST in a different idempotency window.
    reject("GIFT_PROVIDER_RESULT_UNKNOWN");
  }
  const payload=await jsonResponse(response);
  if(response.status===409)reject("GIFT_PROVIDER_IDEMPOTENCY_IN_PROGRESS");
  if(!response.ok){
    if(response.status===400)reject("GIFT_PROVIDER_REJECTED_OR_NO_CREDITS");
    reject("GIFT_PROVIDER_UNAVAILABLE");
  }
  const id=extractedId(payload);
  if(!id)reject("GIFT_PROVIDER_RESULT_UNKNOWN");
  return {providerJobId:id,status:"submitted",model:"heygen-video-1",durationSeconds:5};
}
/** Read-only status; signed output links must never be disclosed without
 * verifying owner+job in the application service.
 */
export async function getHeyGenVideoGiftFragment(providerJobId,{
 env=process.env,fetchImpl=fetch
}={}){
  const settings=heyGenVideoGiftSettings(env);
  if(!settings.enabled)reject("GIFT_PAID_DISABLED");
  if(!ID.test(providerJobId||""))reject("GIFT_PROVIDER_ID_INVALID");
  let response;
  try{response=await fetchImpl(HOST+"/v3/models/videos/"+encodeURIComponent(providerJobId),{
    method:"GET",headers:{"x-api-key":env.HEYGEN_API_KEY},
    redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000),
  });}catch{reject("GIFT_PROVIDER_UNAVAILABLE");}
  if(!response.ok)reject("GIFT_PROVIDER_UNAVAILABLE");
  const payload=await jsonResponse(response);
  const data=payload?.data??payload;
  const status=data?.status;
  if(!["pending","processing","completed","failed","cancelled"].includes(status))
    reject("GIFT_PROVIDER_STATUS_INVALID");
  return {status,providerJobId,
    videoUrl:status==="completed"&&typeof data.video_url==="string"&&
      data.video_url.startsWith("https://")?data.video_url:null,
    failureCode:status==="failed"||status==="cancelled"?
      String(data.failure_code||"provider_failed").slice(0,60):null};
}
