/**
 * One bounded genuine FREE public-phrase receipt, no personal content.
 * This is a test of mode:affirmations, not the generic mode:sample.
 * Exactly two registered voices read the same consented fixed phrase.
 * Never save sound, upload it, pass a secret or authorize paid fallback.
 */
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {readPcmWav} from "../lib/mandala/wav-pcm-mixer.mjs";
import {VOICE_STUDIO_VOICES,validateStudioRequest,buildStudioPayload} from "../lib/mandala/voice-studio.mjs";

export const PRODUCTION_ORIGIN="https://holistichouse.vercel.app";
export const FIXED_CHOSEN_PHRASE="Я выбираю спокойствие.";
export const PHRASE_VOICES=Object.freeze(["maya","mark"]);

function fail(code){throw Error("FREE_SELECTED_PHRASE_"+code);}
export function inspectPhraseWav(bytes){
  const wav=readPcmWav(bytes);
  const duration=wav.frames/wav.rate;
  if(duration<.4||duration>35)fail("INVALID_DURATION");
  const sampleStride=Math.max(1,Math.floor(wav.frames/12000));
  let total=0,count=0;
  for(let frame=0;frame<wav.frames;frame+=sampleStride){
    const sample=wav.view.getInt16(wav.offset+frame*2,true)/32768;
    total+=sample*sample;count++;
  }
  const rms=Math.sqrt(total/Math.max(1,count));
  if(rms<.002)fail("SILENCE");
  return {durationSeconds:Math.round(duration*10)/10,rate:wav.rate,rms:Math.round(rms*10000)/10000};
}

export async function verifySelectedPhrase({fetchImpl=fetch,origin=PRODUCTION_ORIGIN}={}){
  if(fetchImpl===fetch&&origin!==PRODUCTION_ORIGIN)fail("WRONG_ORIGIN");
  const metadata=await fetchImpl(origin+"/api/holistic-support/voice",{
    method:"GET",cache:"no-store",signal:AbortSignal.timeout(12000),
  });
  if(!metadata.ok)fail("CONFIG_HTTP_"+metadata.status);
  const state=await metadata.json();
  if(state?.enabled!==true||state?.publicAffirmationsEnabled!==true||
     state?.providers?.gemini!==true||state?.providers?.openrouter!==false||
     !state?.languages?.includes("ru"))fail("NO_FREE_RUSSIAN_PROVIDER");
  const clips=[];
  for(const voiceId of PHRASE_VOICES){
    const validated=validateStudioRequest({mode:"affirmations",voiceId,language:"ru",
      text:FIXED_CHOSEN_PHRASE,consent:true});
    const payload=buildStudioPayload(validated);
    const expectedProvider=VOICE_STUDIO_VOICES.find(v=>v.id===voiceId)?.provider;
    if(!expectedProvider||payload.generation_config.speech_config[0].voice!==expectedProvider||
       payload.input[0].content[0].text!==FIXED_CHOSEN_PHRASE)fail("VOICE_OR_TEXT_MISMATCH");
    const response=await fetchImpl(origin+"/api/holistic-support/voice",{
      method:"POST",cache:"no-store",
      headers:{"Content-Type":"application/json","Origin":origin,
        "Sec-Fetch-Site":"same-origin"},
      body:JSON.stringify({mode:"affirmations",voiceId,language:"ru",
        text:FIXED_CHOSEN_PHRASE,consent:true}),
      signal:AbortSignal.timeout(35000),
    });
    if(!response.ok) {
      let reason="HTTP_"+response.status;
      try {
        const body=await response.json();
        if(typeof body?.error==="string"&&/^[A-Z_]{2,80}$/.test(body.error))
          reason+="_"+body.error;
      }catch{}
      fail(voiceId.toUpperCase()+"_"+reason);
    }
    if(!/^audio\/wav(?:;|$)/i.test(response.headers.get("content-type")||""))
      fail("NOT_WAV_"+voiceId);
    if(!/(?:^|,)\s*no-store(?:\s*,|$)/i.test(response.headers.get("cache-control")||""))
      fail("CACHEABLE_USER_PHRASE");
    if(response.headers.get("x-hh-voice-provider")!=="gemini")
      fail("PAID_OR_UNTRUSTED_PROVIDER");
    const audio=await response.arrayBuffer();
    if(audio.byteLength<500||audio.byteLength>8*1024*1024)fail("INVALID_BYTES");
    const verified=inspectPhraseWav(audio);
    // Compute a local comparison only; do not store or print any WAV bytes.
    const sha=createHash("sha256").update(Buffer.from(audio)).digest("hex");
    clips.push({voiceId,provider:"gemini",bytes:audio.byteLength,...verified,sha});
    console.log("PASS REAL_FREE_SELECTED_PHRASE "+
      JSON.stringify({voiceId,provider:"gemini",bytes:audio.byteLength,...verified}));
  }
  if(clips.length!==2||clips[0].sha===clips[1].sha)fail("VOICES_IDENTICAL_AUDIO");
  console.log("PASS REAL_FREE_SELECTED_PHRASE_COMPLETE 2 voices, one approved synthetic phrase, zero paid calls");
  return clips.map(({sha,...report})=>report);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.env.HH_FREE_SELECTED_PHRASE_OWNER_OPT_IN!=="true")
    fail("OWNER_OPT_IN_MISSING");
  try{await verifySelectedPhrase();}
  catch(error){
    console.error(error instanceof Error?error.message:"FREE_SELECTED_PHRASE_UNKNOWN");
    process.exitCode=1;
  }
}
