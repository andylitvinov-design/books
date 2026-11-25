// Opaque signed continuation from the verified Ali Free Diagnostic V3 CRM
// conversation to the existing coaching questionnaire. No chat ID, answers,
// token, personal photo or private client data is readable from this URL.
import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';
const AAD=Buffer.from('hh:telegram-free-diagnostic-handoff:v2');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX=/^[0-9a-f]{64}$/;
const MAX_AGE=60*60*1000;
const LANG=new Set(['ru','en','es']);
function key(config){
  if(!Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
    throw new Error('FREE_HANDOFF_CONFIGURATION_UNAVAILABLE');
  return createHmac('sha256',config.encryptionKey).update(AAD).digest();
}
function valid(value){
  return value&&UUID.test(value.ownerId)&&UUID.test(value.contextId)&&
    HEX.test(value.businessHash)&&HEX.test(value.userHash)&&
    LANG.has(value.locale)&&value.scope==='free_diagnostic_form'&&
    /^[a-f0-9]{32}$/.test(value.nonce)&&Number.isSafeInteger(value.expires);
}
export function issueTelegramFreeDiagnosticHandoff(
  {ownerId,contextId,businessHash,userHash,locale},config,now=Date.now()){
  const payload={ownerId,contextId,businessHash,userHash,locale,
    scope:'free_diagnostic_form',nonce:randomBytes(16).toString('hex'),
    expires:now+MAX_AGE};
  if(!valid(payload))throw new Error('INVALID_FREE_HANDOFF');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(config),iv);
  cipher.setAAD(AAD);
  const body=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);
  return 'h2.'+Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
export function verifyTelegramFreeDiagnosticHandoff(raw,config,now=Date.now()){
  if(typeof raw!=='string'||!/^h2\.[A-Za-z0-9_-]{120,1200}$/.test(raw))return null;
  try{
    const bytes=Buffer.from(raw.slice(3),'base64url');
    if(bytes.length<30||bytes.length>950)return null;
    const decipher=createDecipheriv('aes-256-gcm',key(config),bytes.subarray(0,12));
    decipher.setAAD(AAD);decipher.setAuthTag(bytes.subarray(12,28));
    const payload=JSON.parse(Buffer.concat([
      decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
    if(!valid(payload)||payload.expires<now||payload.expires>now+MAX_AGE||
      Object.keys(payload).sort().join(',')!==
      'businessHash,contextId,expires,locale,nonce,ownerId,scope,userHash')
      return null;
    return payload;
  }catch{return null;}
}
export function freeDiagnosticFormUrl(locale,token){
  if(!LANG.has(locale)||typeof token!=='string'||
    !/^h2\.[A-Za-z0-9_-]{120,1200}$/.test(token))return null;
  return 'https://holistichouse.vercel.app/'+locale+
    '/coaching/intake?topic=other#handoff='+encodeURIComponent(token);
}
