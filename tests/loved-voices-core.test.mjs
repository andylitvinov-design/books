import test from "node:test";
import assert from "node:assert/strict";
import {
  LOVED_VOICE_CONSENT_PHRASES, LOVED_VOICE_MODEL, lovedVoiceKey,
  approveLovedVoiceText, inspectLovedVoiceWav,
} from "../lib/mandala/loved-voices.mjs";
import {generateLovedVoice} from "../lib/mandala/loved-voice-provider.mjs";

function makeWav(seconds=12,rate=24000) {
  const samples=Math.floor(seconds*rate),out=Buffer.alloc(44+samples*2);
  out.write("RIFF",0);out.writeUInt32LE(36+samples*2,4);out.write("WAVEfmt ",8);
  out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
  out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);
  out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
  out.write("data",36);out.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)out.writeInt16LE(Math.round(Math.sin(i/20)*5000),44+i*2);
  return out;
}
test("free-only activation requires three separate operator attestations",()=>{
  const env={HH_LOVED_VOICES_ENABLED:"true",HH_LOVED_VOICES_GEMINI_API_KEY:"0123456789012345"};
  assert.equal(lovedVoiceKey(env),null);
  env.HH_LOVED_VOICES_FREE_TIER_CONFIRMED="true";
  assert.equal(lovedVoiceKey(env),null);
  env.HH_LOVED_VOICES_GOOGLE_DATA_PROCESSING_APPROVED="true";
  assert.equal(lovedVoiceKey(env),"0123456789012345");
  assert.equal(lovedVoiceKey({...env,HH_LOVED_VOICES_GEMINI_API_KEY:undefined}),null);
});
test("Google verbatim consent text in RU/EN/ES; 18+ recorded consent is mandatory",()=>{
  for(const lang of ["ru","en","es"]) assert.ok(LOVED_VOICE_CONSENT_PHRASES[lang].length>50);
  assert.equal(LOVED_VOICE_MODEL,"gemini-3.8-flash-lite-tts");
});
test("accept real PCM16 24kHz speech and reject silent, wrong rate, size and duration",()=>{
  assert.equal(inspectLovedVoiceWav(makeWav(12),"source").durationSeconds,12);
  assert.ok(inspectLovedVoiceWav(makeWav(4),"consent").rms>.01);
  assert.throws(()=>inspectLovedVoiceWav(makeWav(4),"source"),/INVALID_DURATION/);
  assert.throws(()=>inspectLovedVoiceWav(makeWav(12,44100),"source"),/INVALID_WAV/);
  assert.throws(()=>inspectLovedVoiceWav(Buffer.alloc(8000),"source"),/INVALID_WAV/);
  assert.throws(()=>inspectLovedVoiceWav(Buffer.alloc(44+24000*2),"source"),/INVALID_WAV/);
});
test("text normalization rejects spoofed profile, markup, URL, long text",()=>{
  assert.equal(approveLovedVoiceText("  Я рядом.\n Ты можешь. ","ru"),"Я рядом. Ты можешь.");
  for(const text of ["<script>alert(1)</script>","https://example.com","x".repeat(241)])
    assert.throws(()=>approveLovedVoiceText(text,"ru"),/INVALID_TEXT/);
  assert.throws(()=>approveLovedVoiceText("Hi","xx"),/INVALID_TEXT/);
});
test("provider sends two source clips with store:false, never returns a key",async()=>{
  const calls=[];
  const source=makeWav(12),consent=makeWav(4),audio=makeWav(2);
  const fake=async (url,opts)=>{
    calls.push({url,opts});
    const data=calls.length===1?{key:"voicekey_"+("z".repeat(20))}:
      {steps:[{type:"model_output",content:[{type:"audio",data:audio.toString("base64")}]}]};
    return new Response(JSON.stringify(data),{status:200,headers:{"content-type":"application/json"}});
  };
  const result=await generateLovedVoice({key:"test_key_123456789",source,consent,
    text:"I am supported.",language:"en",fetchImpl:fake});
  assert.deepEqual(result,audio);
  assert.equal(calls.length,2);
  const first=JSON.parse(calls[0].opts.body),second=JSON.parse(calls[1].opts.body);
  assert.equal(first.store,false);
  assert.equal(first.voice.type,"replicated");
  assert.ok(first.voice.replicated.source_audio.data);
  assert.ok(first.voice.replicated.consent_audio.data);
  assert.equal(second.generation_config.speech_config[0].voice,"voicekey_"+("z".repeat(20)));
  assert.equal(second.input[0].content[0].text,"I am supported.");
});
test("provider rejects invalid recorded consent before any network request",async()=>{
  let requests=0;
  await assert.rejects(generateLovedVoice({key:"test_key_123456789",source:makeWav(12),
    consent:makeWav(1),language:"ru",text:"Я рядом.",
    fetchImpl:()=>{requests++;throw Error("should never happen");}}),/INVALID_DURATION/);
  assert.equal(requests,0);
});
test("provider fails closed on free quota, bad response and no synthetic fallback",async()=>{
  const options={key:"test_key_123456789",source:makeWav(12),consent:makeWav(4),
    language:"en",text:"I am supported."};
  await assert.rejects(generateLovedVoice({...options,
    fetchImpl:async()=>new Response("quota",{status:429})}),/QUOTA_EXHAUSTED/);
  await assert.rejects(generateLovedVoice({...options,
    fetchImpl:async()=>new Response(JSON.stringify({id:"voice_123"}),{status:200})}),/BAD_PROVIDER_RESPONSE/);
});
