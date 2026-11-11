/**
 * Opt-in proof that the selected public phrase is actually spoken by the
 * selected FREE Gemini voice on the real Holistic House production endpoint.
 * Never accepts arbitrary user content, keys, cookies, paid models or output files.
 */
import {pathToFileURL} from "node:url";
import {readPcmWav} from "../lib/mandala/wav-pcm-mixer.mjs";
import {affirmationNarrationForSelection} from "../lib/mandala/affirmation-voice.mjs";
import {validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

export const LIVE_VOICE_ORIGIN="https://holistichouse.vercel.app";
export const LIVE_VOICE_TEST_PHRASES=Object.freeze(["Я могу отдыхать","Я выбираю спокойствие"]);
export const LIVE_VOICE_ID="leon";
export const LIVE_VOICE_LANGUAGE="ru";

export function fixedLivePhraseRequest(){
  const text=affirmationNarrationForSelection(LIVE_VOICE_TEST_PHRASES,1);
  const body={mode:"affirmations",voiceId:LIVE_VOICE_ID,language:LIVE_VOICE_LANGUAGE,text,consent:true};
  // Reuse the exact server-owned request contract instead of constructing
  // a mock model response or a local synthetic PCM recording.
  const validated=validateStudioRequest(body);
  const payload=buildStudioPayload(validated);
  if(payload.generation_config.speech_config[0]?.voice!=="Puck" ||
     payload.input[0].content[0]?.text!==text)throw Error("VOICE_SELECTED_PROFILE_MISMATCH");
  return body;
}

export function verifyLiveVoiceBytes(bytes) {
  const audio=readPcmWav(bytes);
  const seconds=audio.frames/audio.rate;
  if(seconds<0.4 || seconds>59)throw Error("VOICE_REAL_DURATION_INVALID");
  const step=Math.max(1,Math.floor(audio.frames/12000));
  let samples=0,energy=0;
  for(let i=0;i<audio.frames;i+=step){
    const value=audio.view.getInt16(audio.offset+2*i,true)/32768;
    energy+=value*value;samples++;
  }
  const rms=Math.sqrt(energy/Math.max(1,samples));
  if(!Number.isFinite(rms)||rms<0.002)throw Error("VOICE_REAL_WAV_SILENT");
  return {seconds:Math.round(seconds*10)/10,rate:audio.rate,rms:Math.round(rms*1e4)/1e4};
}

export async function verifyLiveSelectedPhrase({
  fetchImpl=fetch, origin=LIVE_VOICE_ORIGIN,
}={}){
  if(fetchImpl===fetch && origin!==LIVE_VOICE_ORIGIN)throw Error("VOICE_UNTRUSTED_ORIGIN");
  const status=await fetchImpl(origin+"/api/holistic-support/voice",{
    method:"GET",cache:"no-store",signal:AbortSignal.timeout(12000),
  });
  if(!status.ok)throw Error("VOICE_LIVE_GET_"+status.status);
  const settings=await status.json();
  if(settings?.enabled!==true||settings?.providers?.gemini!==true||
      settings?.providers?.openrouter===true||!settings.languages?.includes("ru"))
    throw Error("VOICE_LIVE_FREE_PROVIDER_NOT_READY");
  const body=fixedLivePhraseRequest();
  const response=await fetchImpl(origin+"/api/holistic-support/voice",{
    method:"POST",
    headers:{"Content-Type":"application/json","Origin":origin,"Sec-Fetch-Site":"same-origin"},
    body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(50000),
  });
  if(!response.ok){
    let code="HTTP_"+response.status;
    try {const error=await response.json();
      if(typeof error?.error==="string"&&/^[A-Z_]{3,70}$/.test(error.error))code+="_"+error.error;
    }catch{}
    throw Error("VOICE_REAL_SELECTED_PHRASE_"+code);
  }
  if(!/^audio\/wav(?:;|$)/i.test(response.headers.get("content-type")||""))
    throw Error("VOICE_REAL_NOT_WAV");
  if(response.headers.get("x-hh-voice-provider")!=="gemini")
    throw Error("VOICE_REAL_PAID_OR_WRONG_PROVIDER");
  if(!(response.headers.get("cache-control")||"").includes("no-store"))
    throw Error("VOICE_REAL_AUDIO_CACHEABLE");
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<1000||bytes.byteLength>8*1024*1024)
    throw Error("VOICE_REAL_WAV_SIZE_INVALID");
  const audio=verifyLiveVoiceBytes(bytes);
  const evidence={voiceId:body.voiceId,language:body.language,provider:"gemini",
    bytes:bytes.byteLength,...audio};
  console.log("PASS FREE_CHOSEN_PHRASE_TTS "+JSON.stringify(evidence));
  return evidence;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.env.HH_VOICE_SELECTED_LIVE_OWNER_OPT_IN!=="true")throw Error("VOICE_OWNER_OPT_IN_REQUIRED");
  try{await verifyLiveSelectedPhrase();}
  catch(error){console.error(error instanceof Error?error.message:"VOICE_REAL_UNKNOWN");process.exitCode=1;}
}
