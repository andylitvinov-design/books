/**
 * Signed, short-lived, owner/session-bound Judgment choices.
 * No new credentials or storage. A token authorizes only a side-effect-free
 * conversational choice; it never authorizes a user action or data disclosure.
 */
import {createHmac,createHash,hkdfSync,timingSafeEqual,randomUUID} from "node:crypto";
import {PILOT_SITUATION_CODES} from "./judgment-mind.mjs";
const TTL_MS=5*60*1000;
const CONTEXT="hh-judgment-mind-choice-v1";
const hash=text=>createHash("sha256").update(String(text)).digest("base64url");
function keyOf(config){
  if(!Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
    throw new Error("JUDGMENT_TOKEN_CONFIGURATION_MISSING");
  return Buffer.from(hkdfSync("sha256",config.encryptionKey,
    Buffer.from(CONTEXT),Buffer.from("signed-choice"),32));
}
const mac=(key,text)=>createHmac("sha256",key).update(text).digest("base64url");
const validPending=p=>p&&typeof p==="object"&&PILOT_SITUATION_CODES.includes(p.situationCode)
  &&["awaiting_choice","feedback"].includes(p.stage)
  &&(p.stage!=="feedback"||["a","b"].includes(p.choiceId));
const validActor=actor=>typeof actor?.id==="string"&&typeof actor?.claims?.session_id==="string";
export function signJudgmentChoice({config,actor,pending,reply,revision=1,now=Date.now()}={}){
  if(!validActor(actor)||!validPending(pending)||typeof reply!=="string"||reply.length>1000)
    throw new Error("JUDGMENT_TOKEN_INVALID_INPUT");
  const key=keyOf(config);
  const payload={v:1,tid:randomUUID(),a:mac(key,"account:"+actor.id),
    s:mac(key,"session:"+actor.claims.session_id),exp:now+TTL_MS,
    rh:hash(reply),r:Number.isSafeInteger(revision)?Math.max(1,Math.min(revision,100)):1,
    p:{stage:pending.stage,situationCode:pending.situationCode,
      ...(pending.choiceId?{choiceId:pending.choiceId}:{})}};
  const segment=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token=segment+"."+mac(key,CONTEXT+":"+segment);
  if(token.length>1600)throw new Error("JUDGMENT_TOKEN_TOO_LONG");
  return {token,turnId:payload.tid,conversationRevision:payload.r,
    expiresInSeconds:Math.ceil(TTL_MS/1000)};
}
/**
 * Caller must already have verified auth, same-origin, session, rate limit
 * and safety. History must end with the assistant reply that issued the token.
 */
export function verifyJudgmentChoice({config,actor,token,history,now=Date.now()}={}){
  if(!validActor(actor)||typeof token!=="string"||token.length>1600||
    !/^[A-Za-z0-9_-]{30,1500}\.[A-Za-z0-9_-]{43}$/.test(token))
    return null;
  const [segment,signature]=token.split(".");
  const key=keyOf(config),expected=mac(key,CONTEXT+":"+segment);
  if(signature.length!==expected.length||
    !timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  let decoded;
  try{
    decoded=JSON.parse(Buffer.from(segment,"base64url").toString("utf8"));
  }catch{return null;}
  if(decoded?.v!==1||typeof decoded.tid!=="string"||
    decoded.a!==mac(key,"account:"+actor.id)||
    decoded.s!==mac(key,"session:"+actor.claims.session_id)||
    !Number.isSafeInteger(decoded.exp)||now>=decoded.exp||now<decoded.exp-TTL_MS||
    !Number.isSafeInteger(decoded.r)||decoded.r<1||decoded.r>100||
    !validPending(decoded.p))return null;
  const last=Array.isArray(history)?history.at(-1):null;
  if(last?.role!=="assistant"||typeof last.text!=="string"||
    decoded.rh!==hash(last.text))return null;
  return {pending:decoded.p,turnId:decoded.tid,conversationRevision:decoded.r};
}
