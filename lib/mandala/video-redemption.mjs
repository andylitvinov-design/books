import {createHmac,randomBytes,randomUUID,createHash,timingSafeEqual} from "node:crypto";
import {VIDEO_AI_CATALOG,buildVideoAiRequest} from "./video-ai-heygen.mjs";
// Code is only displayed ONCE to the owner after verified receipt; never stored.
const CODE_FORMAT=/^HHV[0-9A-F]{36}$/;
const VALID_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function mintVideoCode(){
  return "HHV-"+randomBytes(18).toString("hex").toUpperCase();
}
export function normalizeVideoCode(input){
  if(typeof input!=="string")throw Error("invalid_video_code");
  const code=input.trim().replace(/[-\s]/g,"").toUpperCase();
  if(!CODE_FORMAT.test(code))throw Error("invalid_video_code");
  return code;
}
export function hashVideoCode(value,secret){
  const code=normalizeVideoCode(value);
  if(typeof secret!=="string"||secret.length<32)throw Error("video_code_secret_missing");
  return createHmac("sha256",secret).update("holistic-video-v1:"+code).digest("hex");
}
export function sameVideoCodeHash(left,right){
  if(typeof left!=="string"||typeof right!=="string"||
     !/^[0-9a-f]{64}$/.test(left)||!/^[0-9a-f]{64}$/.test(right))return false;
  return timingSafeEqual(Buffer.from(left,"hex"),Buffer.from(right,"hex"));
}
export function validateVideoCodeIssue(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("invalid_video_code_issue");
  const tier=String(input.tier||"");
  if(!Object.hasOwn(VIDEO_AI_CATALOG,tier))throw Error("invalid_video_tier");
  const gift=input.kind==="gift";
  if(gift&&tier!=="smart")throw Error("gift_smart_only");
  if(!gift&&input.kind!=="paid")throw Error("invalid_video_code_kind");
  if(input.ownerVerified!==true)throw Error("owner_verification_required");
  const recipientId=typeof input.recipientId==="string"?input.recipientId:"";
  if(gift&&!VALID_ID.test(recipientId))throw Error("gift_recipient_required");
  const paymentRef=typeof input.paymentReference==="string"?input.paymentReference.trim():"";
  const channel=gift?"gift":String(input.paymentChannel||"");
  if(!gift&&(!["square","paypal","wise"].includes(channel)||
     !/^[A-Za-z0-9._:/-]{6,120}$/.test(paymentRef)))
    throw Error("verified_payment_reference_required");
  if(gift&&paymentRef)throw Error("gift_must_not_have_payment_reference");
  return Object.freeze({
    id:randomUUID(),tier,kind:input.kind,recipientId:gift?recipientId:null,
    channel,paymentReference:gift?null:paymentRef,
    priceCents:gift?0:Math.round(VIDEO_AI_CATALOG[tier].priceUsd*100),
    expiresDays:Math.min(30,Math.max(1,Number.isInteger(input.expiresDays)?input.expiresDays:14)),
  });
}
export function safeVideoRequestHash(input){
  const normalized=buildVideoAiRequest(input);
  return createHash("sha256").update(JSON.stringify(normalized.body)).digest("hex");
}
