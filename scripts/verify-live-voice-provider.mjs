/**
 * Owner-directed, fixed-text production TTS receipt.
 * Invoke ONLY through the opt-in CI job. No tokens, user text, cookies,
 * paid fallback, account identity, audio artifacts, or uploads.
 */
import {pathToFileURL} from "node:url";
import {readPcmWav} from "../lib/mandala/wav-pcm-mixer.mjs";

export const VOICE_SMOKE_ORIGIN = "https://holistichouse.vercel.app";
export const VOICE_SMOKE_CASES = Object.freeze([
  {voiceId:"maya",language:"ru"},
  {voiceId:"mark",language:"en"},
  {voiceId:"alisa",language:"es"},
]);

const permittedProviders = new Set(["gemini","openrouter-free"]);
function fail(code){throw new Error("VOICE_LIVE_SMOKE_"+code);}
function cacheDisabled(headers){
  return /(?:^|[,\s])no-store(?:[,\s]|$)/i.test(headers.get("cache-control")||"");
}
export function inspectVoiceWav(buffer) {
  const audio=readPcmWav(buffer);
  const duration=audio.frames/audio.rate;
  if(duration<0.4||duration>59)fail("BAD_DURATION");
  const stride=Math.max(1,Math.floor(audio.frames/12000));
  let sum=0,count=0;
  for(let i=0;i<audio.frames;i+=stride) {
    const s=audio.view.getInt16(audio.offset+i*2,true)/32768;
    sum+=s*s;count++;
  }
  const rms=Math.sqrt(sum/Math.max(1,count));
  if(!Number.isFinite(rms)||rms<0.002)fail("SILENT_WAV");
  return {durationSeconds:Math.round(duration*10)/10,sampleRate:audio.rate,rms:Math.round(rms*10000)/10000};
}

export async function verifyRealVoiceSamples({
  fetchImpl=fetch,
  origin=VOICE_SMOKE_ORIGIN,
  samples=VOICE_SMOKE_CASES,
}={}) {
  // The origin and test fixtures are constants. An injected test origin is
  // permitted only with the fake fetch passed by the unit tests.
  if(fetchImpl===fetch && origin!==VOICE_SMOKE_ORIGIN)fail("UNTRUSTED_ORIGIN");
  if(!Array.isArray(samples)||samples.length<1||samples.length>3)fail("INVALID_COUNT");
  const info=await fetchImpl(origin+"/api/holistic-support/voice",{
    method:"GET",cache:"no-store",signal:AbortSignal.timeout(15000),
  });
  if(!info.ok)fail("GET_HTTP_"+info.status);
  const state=await info.json();
  if(state?.enabled!==true||state?.publicAffirmationsEnabled!==true||
    state?.providers?.gemini!==true||state?.providers?.openrouter===true||
    !["ru","en","es"].every(l=>state.languages?.includes(l)))
    fail("PROVIDER_NOT_FREE_READY");
  const results=[];
  for(const item of samples) {
    if(!VOICE_SMOKE_CASES.some(s=>s.voiceId===item.voiceId&&s.language===item.language))
      fail("INVALID_SAMPLE_ID");
    const response=await fetchImpl(origin+"/api/holistic-support/voice",{
      method:"POST",cache:"no-store",
      headers:{
        "Content-Type":"application/json",
        "Origin":origin,
        "Sec-Fetch-Site":"same-origin",
      },
      // The TTS route injects its own public text: NEVER attach text or consent.
      body:JSON.stringify({mode:"sample",voiceId:item.voiceId,language:item.language}),
      signal:AbortSignal.timeout(55000),
    });
    if(!response.ok) {
      let reason="HTTP_"+response.status;
      try{
        const body=await response.json();
        if(typeof body?.error==="string"&&/^[A-Z_]{2,80}$/.test(body.error))
          reason+="_"+body.error;
      }catch{}
      fail(item.language.toUpperCase()+"_"+reason);
    }
    if(!/^audio\/wav(?:;|$)/i.test(response.headers.get("content-type")||""))
      fail("NOT_WAV_"+item.language);
    if(!cacheDisabled(response.headers))fail("CACHEABLE_SAMPLE");
    const provider=response.headers.get("x-hh-voice-provider");
    if(!permittedProviders.has(provider)||provider==="openrouter-free"&&item.language!=="en")
      fail("UNAPPROVED_PROVIDER");
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength<500||bytes.byteLength>8*1024*1024)fail("WAV_SIZE");
    const audio=inspectVoiceWav(bytes);
    const itemResult={language:item.language,voiceId:item.voiceId,provider,
      bytes:bytes.byteLength,...audio};
    results.push(itemResult);
    console.log("PASS REAL_TTS_SAMPLE "+JSON.stringify(itemResult));
  }
  return results;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.env.HH_VOICE_LIVE_SMOKE_OWNER_APPROVED!=="true")
    fail("OWNER_OPT_IN_MISSING");
  try{
    const verified=await verifyRealVoiceSamples();
    console.log("PASS REAL_TTS_COMPLETE "+verified.length+" fixed samples; no personal text or paid fallback");
  }catch(error){
    console.error(error instanceof Error?error.message:"VOICE_LIVE_SMOKE_UNKNOWN");
    process.exitCode=1;
  }
}
