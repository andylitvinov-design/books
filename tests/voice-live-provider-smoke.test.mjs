import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyRealVoiceSamples,inspectVoiceWav,VOICE_SMOKE_CASES,VOICE_SMOKE_ORIGIN} from "../scripts/verify-live-voice-provider.mjs";

function wav({silent=false}={}){
  const rate=24000,frames=rate;
  const b=Buffer.alloc(44+2*frames);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);
  b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write("data",36);b.writeUInt32LE(frames*2,40);
  if(!silent)for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(8500*Math.sin(i*440*2*Math.PI/rate)),44+2*i);
  return b;
}
function fakeTransport({provider="gemini",broken=false,silent=false,enabled=true}={}){
  const requests=[];
  async function fetchImpl(url,options){
    requests.push({url,options});
    if(options.method==="GET")
      return new Response(JSON.stringify({
        enabled,publicAffirmationsEnabled:true,languages:["ru","en","es"],
        providers:{gemini:true,openrouterFree:true,openrouter:false},
      }),{status:200,headers:{"content-type":"application/json"}});
    if(broken)return new Response(JSON.stringify({error:"TTS_PROVIDER_UNAVAILABLE"}),{
      status:503,headers:{"content-type":"application/json"}});
    return new Response(wav({silent}),{status:200,headers:{
      "Content-Type":"audio/wav","Cache-Control":"private, no-store, max-age=0",
      "X-HH-Voice-Provider":provider,
    }});
  }
  return {fetchImpl,requests};
}

test("public receipt uses only three fixed server-owned phrases for RU/EN/ES",async()=>{
  const {fetchImpl,requests}=fakeTransport();
  const rows=await verifyRealVoiceSamples({fetchImpl});
  assert.deepEqual(rows.map(x=>x.language),["ru","en","es"]);
  assert.deepEqual(rows.map(x=>x.voiceId),["maya","mark","alisa"]);
  assert.ok(rows.every(x=>x.bytes>1000&&x.sampleRate===24000&&x.rms>0.002));
  assert.equal(requests.length,4);
  assert.equal(requests[0].options.method,"GET");
  for(const {url,options} of requests.slice(1)){
    assert.equal(url,VOICE_SMOKE_ORIGIN+"/api/holistic-support/voice");
    assert.equal(options.method,"POST");
    assert.equal(options.headers.Origin,VOICE_SMOKE_ORIGIN);
    const body=JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(),["language","mode","voiceId"]);
    assert.equal(body.mode,"sample");
    assert.equal("text" in body,false);
    assert.equal("consent" in body,false);
    assert.equal("Authorization" in options.headers,false);
  }
});

test("invalid, silent or paid provider WAV fails rather than passing fake preview",async()=>{
  assert.throws(()=>inspectVoiceWav(wav({silent:true}).buffer.slice(0)),/SILENT_WAV/);
  const paid=fakeTransport({provider:"openrouter"});
  await assert.rejects(verifyRealVoiceSamples({fetchImpl:paid.fetchImpl}),/UNAPPROVED_PROVIDER/);
  const unavailable=fakeTransport({broken:true});
  await assert.rejects(verifyRealVoiceSamples({fetchImpl:unavailable.fetchImpl}),/RU_HTTP_503_TTS_PROVIDER_UNAVAILABLE/);
  const disabled=fakeTransport({enabled:false});
  await assert.rejects(verifyRealVoiceSamples({fetchImpl:disabled.fetchImpl}),/PROVIDER_NOT_FREE_READY/);
});

test("the real network path requires explicit opt-in and never persists WAV bytes",()=>{
  const source=readFileSync(new URL("../scripts/verify-live-voice-provider.mjs",import.meta.url),"utf8");
  assert.match(source,/HH_VOICE_LIVE_SMOKE_OWNER_APPROVED/);
  assert.match(source,/VOICE_SMOKE_ORIGIN = "https:\/\/holistichouse\.vercel\.app"/);
  assert.doesNotMatch(source,/writeFile|createWriteStream|\.env|secret|apiKey|Bearer /i);
  assert.equal(VOICE_SMOKE_CASES.length,3);
});
