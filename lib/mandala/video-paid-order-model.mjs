import {planThirtySecondVideoBudget} from './paid-video-budget.mjs';
import {CINEMATIC_THEMES} from './cinematic-director.mjs';
export const PAID_VIDEO_ORDER_VERSION='hh-paid-video-hybrid-v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const RECEIPT=/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,119}$/;
const invalid=()=>{throw Error('INVALID_PAID_VIDEO_ORDER')};
export const validPaidVideoUuid=value=>typeof value==='string'&&UUID.test(value);
export function normalizePaidVideoOrder(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).some(k=>!['operationId','tier','theme','aspectRatio','locale','fictionalSceneConsent'].includes(k)))invalid();
 if(!validPaidVideoUuid(input.operationId)||!['extra','pro'].includes(input.tier)||
   !CINEMATIC_THEMES.includes(input.theme)||!['16:9','9:16'].includes(input.aspectRatio)||
   !['ru','en','es'].includes(input.locale)||input.fictionalSceneConsent!==true)invalid();
 const q=planThirtySecondVideoBudget({tier:input.tier,strategy:'hybrid',aspectRatio:input.aspectRatio});
 if(q.canSubmit!==false||q.providerEstimate.generatedAudio!==false||q.customerOffer.currency!=='EUR')invalid();
 return Object.freeze({operationId:input.operationId,tier:input.tier,theme:input.theme,
  locale:input.locale,aspectRatio:input.aspectRatio,priceMinor:q.customerOffer.amountMinor,
  aiSeconds:q.aiSeconds,librarySeconds:q.librarySeconds,costUsdCents:q.providerEstimate.estimatedUsdCents});
}
export function normalizePaidVideoReceipt(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).some(k=>!['action','orderId','expectedRevision','amountMinor','receiptSource','receiptReference','confirmed'].includes(k)))invalid();
 if(input.action!=='verify'||!validPaidVideoUuid(input.orderId)||!Number.isSafeInteger(input.expectedRevision)||
  input.expectedRevision<0||!Number.isSafeInteger(input.amountMinor)||input.receiptSource!=='paypal_transaction'||
  input.confirmed!==true||!RECEIPT.test(input.receiptReference||''))invalid();
 return Object.freeze({orderId:input.orderId,expectedRevision:input.expectedRevision,
  amountMinor:input.amountMinor,reference:input.receiptReference.trim()});
}
export function paidVideoFlags(env=process.env,now=Date.now()){
 const schemaReady=env.HH_VIDEO_PAID_ORDERS_SCHEMA_APPROVED==='true';
 const ordersReady=schemaReady&&env.HH_VIDEO_PAID_ORDERS_ENABLED==='true';
 const expires=Date.parse(env.HH_VIDEO_VEO_RATE_VERIFIED_UNTIL||'');
 const priceFresh=Number.isFinite(expires)&&expires>now&&expires<now+7*86400000&&
  env.HH_VIDEO_VEO_USD_CENTS_PER_SECOND==='5';
 const providerReady=ordersReady&&env.HH_VIDEO_PAID_PROVIDER_ENABLED==='true'&&
  env.HH_VEO_PAID_ENABLED==='true'&&priceFresh&&Boolean(
   env.HH_VEO_GCP_PROJECT_ID&&env.HH_VEO_GCS_OUTPUT_URI&&env.HH_VEO_SERVICE_ACCOUNT_JSON);
 return Object.freeze({schemaReady,ordersReady,providerReady,priceFresh});
}
export function publicPaidVideoOrder(r){
 return {id:r.id,tier:r.tier,theme:r.theme,locale:r.locale,
  aspectRatio:r.aspect_ratio,status:r.status,revision:r.revision,
  amountMinor:r.price_eur_minor,currency:'EUR',
  aiSeconds:r.ai_seconds,librarySeconds:r.library_seconds,
  videoId:r.status==='delivered'?r.final_video_id:null,
  createdAt:r.created_at,updatedAt:r.updated_at};
}
