import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifySelectedPhrase,FIXED_CHOSEN_PHRASE,PRODUCTION_ORIGIN,PHRASE_VOICES,inspectPhraseWav}
  from "../scripts/verify-live-selected-phrase.mjs";

function wav(frequency=330){
  const rate=24000,frames=rate;
  const b=Buffer.alloc(44+frames*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);
  b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write("data",36);b.writeUInt32LE(frames*2,40);
  if(frequency>0)for(let i=0;i<frames;i++)
    b.writeInt16LE(Math.round(7200*Math.sin(2*Math.PI*frequency*i/rate)),44+i*2);
  return b;
}
function fake({paid=false,broken=false,quota=false,enabled=true}={}){
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(options.method==="GET")return new Response(JSON.stringify({
      enabled,publicAffirmationsEnabled:true,languages:["ru","en","es"],
      providers:{gemini:true,openrouterFree:true,openrouter:paid},
    }),{status:200,headers:{"content-type":"application/json"}});
    if(broken||quota)return new Response(JSON.stringify({error:quota?"TTS_FREE_QUOTA_EXHAUSTED":"TTS_PROVIDER_UNAVAILABLE"}),{
      status:quota?429:503,headers:{"content-type":"application/json"}});
    const body=JSON.parse(options.body);
    return new Response(wav(body.voiceId==="maya"?330:440),{
      status:200,headers:{"content-type":"audio/wav","cache-control":"private, no-store, max-age=0",
        "x-hh-voice-provider":"gemini"},
    });
  };
  return {fetchImpl,calls};
}
test("two different voices receive exactly the same explicit public phrase and produce two real WAVs",async()=>{
  const provider=fake();
  const rows=await verifySelectedPhrase({fetchImpl:provider.fetchImpl});
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.voiceId),PHRASE_VOICES);
  assert.ok(rows.every(x=>x.rms>0.002&&x.durationSeconds===1));
  assert.equal(provider.calls.length,3);
  for(let i=0;i<2;i++){
    const {url,options}=provider.calls[i+1];
    assert.equal(url,PRODUCTION_ORIGIN+"/api/holistic-support/voice");
    assert.equal(options.method,"POST");
    assert.equal(options.headers.Origin,PRODUCTION_ORIGIN);
    assert.equal(options.headers["Sec-Fetch-Site"],"same-origin");
    assert.deepEqual(JSON.parse(options.body),{
      mode:"affirmations",voiceId:PHRASE_VOICES[i],language:"ru",
      text:FIXED_CHOSEN_PHRASE,consent:true,
    });
    assert.equal("Authorization" in options.headers,false);
  }
});
test("real selected phrase gate stops before calling a paid provider",async()=>{
  const paid=fake({paid:true});
  await assert.rejects(verifySelectedPhrase({fetchImpl:paid.fetchImpl}),/NO_FREE_RUSSIAN_PROVIDER/);
  assert.equal(paid.calls.length,1,"do not issue even one billable speech request");
  const unavailable=fake({enabled:false});
  await assert.rejects(verifySelectedPhrase({fetchImpl:unavailable.fetchImpl}),/NO_FREE_RUSSIAN_PROVIDER/);
  const rate=fake({quota:true});
  await assert.rejects(verifySelectedPhrase({fetchImpl:rate.fetchImpl}),/MAYA_HTTP_429_TTS_FREE_QUOTA_EXHAUSTED/);
  const down=fake({broken:true});
  await assert.rejects(verifySelectedPhrase({fetchImpl:down.fetchImpl}),/MAYA_HTTP_503_TTS_PROVIDER_UNAVAILABLE/);
  assert.throws(()=>inspectPhraseWav(wav(0).buffer.slice(0)),/SILENCE/);
});
test("no user data, credentials, files, paid fallback or unbounded retries in the public receipt",()=>{
  const s=readFileSync(new URL("../scripts/verify-live-selected-phrase.mjs",import.meta.url),"utf8");
  assert.match(s,/HH_FREE_SELECTED_PHRASE_OWNER_OPT_IN/);
  assert.match(s,/FIXED_CHOSEN_PHRASE="Я выбираю спокойствие\."/);
  assert.match(s,/PHRASE_VOICES=Object\.freeze\(\["maya","mark"\]\)/);
  assert.doesNotMatch(s,/writeFile|createWriteStream|localStorage|sessionStorage|upload|Bearer |HH_COUNCIL_GEMINI_API_KEY/i);
  assert.equal(PHRASE_VOICES.length,2);
});
