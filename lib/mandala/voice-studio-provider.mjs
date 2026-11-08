/** Server-side Gemini TTS transport. Call only after origin, consent, auth and quota gates. */
import { extractStudioAudio, VOICE_STUDIO_MODEL } from './voice-studio.mjs';
import { readPcmWav } from './wav-pcm-mixer.mjs';

const endpoint='https://generativelanguage.googleapis.com/v1beta/interactions';
const fail=(code,status)=>Object.assign(new Error(code),{code,status});
export async function requestStudioAudio({key,payload,signal,fetchImpl=fetch,maxBytes=8*1024*1024}) {
  if(typeof key!=='string' || !key.trim())throw fail('VOICE_STUDIO_NOT_CONFIGURED',503);
  if(payload?.model!==VOICE_STUDIO_MODEL)throw fail('TTS_PROVIDER_INVALID_MODEL',503);
  let response;
  try {
    response=await fetchImpl(endpoint,{method:'POST',signal,headers:{
      'Content-Type':'application/json','x-goog-api-key':key,
    },body:JSON.stringify(payload),cache:'no-store'});
  } catch { throw fail('TTS_PROVIDER_UNAVAILABLE',503); }
  if(response.status===429)throw fail('TTS_FREE_QUOTA_EXHAUSTED',429);
  if(!response.ok)throw fail('TTS_PROVIDER_UNAVAILABLE',503);
  const reader=response.body?.getReader();
  if(!reader)throw fail('TTS_PROVIDER_INVALID_RESPONSE',502);
  const chunks=[]; let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>maxBytes) { await reader.cancel(); throw fail('TTS_RESPONSE_TOO_LARGE',502); }
      chunks.push(Buffer.from(value));
    }
  } catch(error) {
    if(error?.code==='TTS_RESPONSE_TOO_LARGE')throw error;
    throw fail('TTS_PROVIDER_UNAVAILABLE',503);
  }
  let data;
  try { data=JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail('TTS_PROVIDER_INVALID_RESPONSE',502); }
  const encoded=extractStudioAudio(data);
  if(typeof encoded!=='string' || encoded.length>maxBytes*1.4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw fail('TTS_PROVIDER_INVALID_RESPONSE',502);
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.byteLength<48 || bytes.byteLength>maxBytes)throw fail('TTS_PROVIDER_INVALID_RESPONSE',502);
  try { readPcmWav(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)); }
  catch { throw fail('TTS_PROVIDER_INVALID_RESPONSE',502); }
  return bytes;
}
