/** Stateless, no-profile-storage Gemini Voice Replication transport. */
import {approveLovedVoiceText, inspectLovedVoiceWav, LOVED_VOICE_MODEL} from "./loved-voices.mjs";
const CREATE_URL = "https://generativelanguage.googleapis.com/v1beta/voices";
const SPEAK_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
async function boundedJson(response,maxBytes=7_000_000) {
  const length=Number(response.headers?.get?.("content-length") || 0);
  if(length>maxBytes)throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
  const reader=response.body?.getReader();
  if(!reader)throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
  let size=0; const chunks=[];
  for(;;) {
    let part;
    try{part=await reader.read();}
    catch{throw fail("LOVED_VOICE_PROVIDER_UNAVAILABLE",503);}
    if(part.done)break;
    size+=part.value.byteLength;
    if(size>maxBytes) {
      await reader.cancel().catch(()=>{});
      throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
    }
    chunks.push(Buffer.from(part.value));
  }
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
  catch{throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);}
}
async function postGoogle(url, key, payload, fetchImpl, signal) {
  let response;
  try {
    response=await fetchImpl(url,{method:"POST",headers:{
      "Content-Type":"application/json","x-goog-api-key":key,
    },body:JSON.stringify(payload),cache:"no-store",signal});
  }catch{throw fail("LOVED_VOICE_PROVIDER_UNAVAILABLE",503);}
  if(response.status===429)throw fail("LOVED_VOICE_FREE_QUOTA_EXHAUSTED",429);
  if(response.status===400)throw fail("LOVED_VOICE_CONSENT_OR_AUDIO_REJECTED",422);
  if(!response.ok)throw fail("LOVED_VOICE_PROVIDER_UNAVAILABLE",503);
  return boundedJson(response);
}
function audioFromInteraction(result) {
  const pieces=(Array.isArray(result?.steps)?result.steps:[])
    .filter(step=>step?.type==="model_output")
    .flatMap(step=>Array.isArray(step.content)?step.content:[])
    .filter(part=>part?.type==="audio" && typeof part.data==="string");
  return pieces.length?pieces[pieces.length-1].data:null;
}
/**
 * Call only after server-origin, rate, consent and enabled/free-tier gates.
 * Neither user source nor voicekey is returned or persisted.
 */
export async function generateLovedVoice({key,source,consent,text,language,
  fetchImpl=fetch,signal}) {
  if(typeof key!=="string" || key.length<13)throw fail("LOVED_VOICE_NOT_CONFIGURED");
  const approved=approveLovedVoiceText(text,language);
  inspectLovedVoiceWav(source,"source");
  inspectLovedVoiceWav(consent,"consent");
  const created=await postGoogle(CREATE_URL,key,{
    store:false,
    voice:{model:LOVED_VOICE_MODEL,type:"replicated",replicated:{
      source_audio:{mime_type:"audio/wav",data:Buffer.from(source).toString("base64")},
      consent_audio:{mime_type:"audio/wav",data:Buffer.from(consent).toString("base64")},
    }},
  },fetchImpl,signal);
  const voiceKey=created?.key || created?.voice?.key;
  if(typeof voiceKey!=="string" || !/^voicekey_[A-Za-z0-9_-]{8,}$/.test(voiceKey))
    throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
  const style={ru:"Читай только точный русский текст, естественно, мягко и спокойно.",
    en:"Read only the exact English text, naturally and gently.",
    es:"Lee solamente el texto exacto en español, con calma y naturalidad."}[language];
  const result=await postGoogle(SPEAK_URL,key,{
    model:LOVED_VOICE_MODEL,
    input:[{type:"user_input",content:[{type:"text",text:approved,
      annotations:[{type:"speech_metadata",style}]}]}],
    response_format:{type:"audio"},
    generation_config:{speech_config:[{voice:voiceKey}]},
  },fetchImpl,signal);
  const encoded=audioFromInteraction(result);
  if(!encoded || encoded.length>6_800_000 ||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
  const bytes=Buffer.from(encoded,"base64");
  try{inspectLovedVoiceWav(bytes,"output");}
  catch{throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);}
  if(bytes.length>5_000_000)throw fail("LOVED_VOICE_BAD_PROVIDER_RESPONSE",502);
  return bytes;
}
