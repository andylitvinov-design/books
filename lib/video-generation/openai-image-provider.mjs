/**
 * Bounded, owner-only OpenAI Image API adapter. No customer-facing entrypoint.
 * A calling worker MUST acquire a durable one-time spend reservation before
 * invoking this adapter. No automatic retries on network/timeout ambiguity.
 */
import {createHash,createHmac} from 'node:crypto';
import {IMAGE_BRIEF_VERSION,imageOutputSize,buildSafeGptImageBrief} from './safe-visual-brief.mjs';

const MODEL='gpt-image-2.5-flare';
const API='https://api.openai.com/v1/images/generations';
const MAX_BYTES=9_000_000;
const MAX_WIRE=13_000_000;
export class ImageProviderError extends Error{
  constructor(code){super(code);this.name='ImageProviderError';this.code=code;}
}
export function ownerGptImageReadiness(env=process.env){
  if(env.HH_GPT_IMAGE_ENABLED!=='true')return 'disabled';
  if(env.HH_GPT_IMAGE_OWNER_ONLY!=='true')return 'owner_only_required';
  if(env.HH_GPT_IMAGE_SPEND_APPROVED!=='true')return 'spend_not_approved';
  if(!/^sk-[A-Za-z0-9_-]{15,}$/.test(String(env.OPENAI_API_KEY||'')))return 'key_not_configured';
  if(!/^[A-Za-z0-9+/=_-]{32,}$/.test(String(env.HH_GPT_IMAGE_SAFETY_SALT||'')))return 'safety_salt_unavailable';
  return 'ready';
}
export function safeImageIdentifier(accountId,env=process.env){
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(String(accountId||'')))throw new ImageProviderError('invalid_account_identifier');
  const salt=String(env.HH_GPT_IMAGE_SAFETY_SALT||'');
  if(salt.length<32)throw new ImageProviderError('safety_salt_unavailable');
  return 'hh_'+createHmac('sha256',salt).update(String(accountId)).digest('hex').slice(0,64);
}
/** JPEG size header parse; disallow compressed bombs and false MIME labels. */
export function inspectGeneratedJpeg(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<200||buffer.length>MAX_BYTES||
     buffer[0]!==0xff||buffer[1]!==0xd8||buffer[buffer.length-2]!==0xff||buffer[buffer.length-1]!==0xd9)
    throw new ImageProviderError('invalid_image_bytes');
  let pos=2,width=0,height=0;
  while(pos<buffer.length-12){
    if(buffer[pos]!==0xff)break;
    while(buffer[pos]===0xff)pos++;
    const marker=buffer[pos++];
    if(marker===0xda||marker===0xd9)break;
    if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    if(pos+2>buffer.length)break;
    const len=buffer.readUInt16BE(pos);
    if(len<2||pos+len>buffer.length)break;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb].includes(marker)&&len>=7){
      height=buffer.readUInt16BE(pos+3);width=buffer.readUInt16BE(pos+5);break;
    }
    pos+=len;
  }
  if(width<512||height<512||width>4096||height>4096||width*height>12_000_000)
    throw new ImageProviderError('invalid_image_dimensions');
  return Object.freeze({mime:'image/jpeg',width,height,bytes:buffer.length,
    sha256:createHash('sha256').update(buffer).digest('hex')});
}
export function buildOwnerImageRequest({brief,shotNumber,accountId,env=process.env}){
  if(!brief||brief.version!==IMAGE_BRIEF_VERSION||
     !/^[a-f0-9]{64}$/.test(String(brief.planHash||''))||
     !Array.isArray(brief.shots)||brief.shots.length<1||brief.shots.length>2)
    throw new ImageProviderError('invalid_trusted_brief');
  // Reconstruct from enumerated selectors, never rely on a client-composed
  // `prompt`, `shots` array or claimed planHash, even if a caller misroutes it.
  const rebuilt=buildSafeGptImageBrief({theme:brief.theme,style:brief.style,
    aspect:brief.aspect,locale:brief.locale,durationSeconds:brief.durationSeconds,
    shotNumbers:brief.shots.map(x=>x.shotNumber),avoidMotifs:brief.avoidMotifs});
  if(rebuilt.planHash!==brief.planHash)
    throw new ImageProviderError('untrusted_image_brief');
  const shot=rebuilt.shots.find(x=>x.shotNumber===shotNumber);
  if(!shot||typeof shot.prompt!=='string'||shot.prompt.length>1500)
    throw new ImageProviderError('invalid_trusted_shot');
  return Object.freeze({model:MODEL,n:1,quality:'low',size:imageOutputSize(rebuilt.aspect),
    output_format:'jpeg',output_compression:82,moderation:'auto',
    safety_identifier:safeImageIdentifier(accountId,env),prompt:shot.prompt});
}
/**
 * Pass only a server-rebuilt brief and a server-issued proof from a persisted
 * authorisation transaction. Never accept an authorisation proof from an HTTP body.
 */
export async function generateOwnerImage({brief,shotNumber,accountId,authorization,env=process.env,fetchImpl=fetch}){
  const state=ownerGptImageReadiness(env);
  if(state!=='ready')throw new ImageProviderError(state);
  if(!authorization||authorization.verifiedByServer!==true||
     authorization.ownerAuthenticated!==true||authorization.durableReservation!==true||
     authorization.maxImages!==1||authorization.oneTimeLeaseAcquired!==true)
    throw new ImageProviderError('durable_owner_approval_required');
  const payload=buildOwnerImageRequest({brief,shotNumber,accountId,env});
  let response;
  try{
    response=await fetchImpl(API,{method:'POST',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(115000),headers:{'Content-Type':'application/json',
        Authorization:'Bearer '+env.OPENAI_API_KEY},body:JSON.stringify(payload)});
  }catch{throw new ImageProviderError('provider_result_uncertain_no_auto_retry');}
  if(!response?.ok)throw new ImageProviderError(response?.status===429?'provider_rate_limited':'provider_failed_no_auto_retry');
  let wire;
  try{wire=await response.text();}catch{throw new ImageProviderError('provider_result_uncertain_no_auto_retry');}
  if(wire.length>MAX_WIRE)throw new ImageProviderError('provider_response_too_large');
  let parsed;
  try{parsed=JSON.parse(wire);}catch{throw new ImageProviderError('provider_invalid_json');}
  const base64=parsed?.data?.[0]?.b64_json;
  if(typeof base64!=='string'||base64.length>MAX_WIRE||base64.length<300||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new ImageProviderError('provider_invalid_image');
  const bytes=Buffer.from(base64,'base64');
  const metadata=inspectGeneratedJpeg(bytes);
  return Object.freeze({bytes,metadata,model:MODEL,requestId:response.headers?.get?.('x-request-id')||null,
    usage:parsed?.usage||null,providerStatus:'image_bytes_verified_not_delivered'});
}