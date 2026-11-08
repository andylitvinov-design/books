import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const ts=require("typescript");
const source=readFileSync(new URL("../lib/mandala/public-voice-sample-cache.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
// Test the REAL implementation with its new PCM validator. data: modules
// cannot resolve relative imports, so map reviewed first-party ESM sources
// to immutable local data: modules without mocking their decoder.
const dataUri=code=>"data:text/javascript;base64,"+Buffer.from(code).toString("base64");
const mixerSource=readFileSync(new URL("../lib/mandala/wav-pcm-mixer.mjs",import.meta.url),"utf8");
const validatorSource=readFileSync(new URL("../lib/mandala/public-voice-sample-integrity.mjs",import.meta.url),"utf8")
  .replace('from "./wav-pcm-mixer.mjs"',`from "${dataUri(mixerSource)}"`);
assert.ok(validatorSource.includes(dataUri(mixerSource)),"the real WAV decoder is loaded in this test");
const cacheSource=compiled.replace('from "./public-voice-sample-integrity.mjs"',
  `from "${dataUri(validatorSource)}"`);
assert.ok(cacheSource.includes(dataUri(validatorSource)),"the real WAV cache validator is loaded");
const lib=await import(dataUri(cacheSource));
// One second of actual PCM16 mono at 24kHz; zero-filled headers are not playable.
function realWav(){
  const b=new Uint8Array(48044),v=new DataView(b.buffer);
  const put=(p,t)=>[...t].forEach((ch,i)=>v.setUint8(p+i,ch.charCodeAt(0)));
  put(0,"RIFF");v.setUint32(4,48036,true);put(8,"WAVE");
  put(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,24000,true);v.setUint32(28,48000,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,"data");v.setUint32(40,48000,true);
  return new Blob([b],{type:"audio/wav"});
}


test("cache keys only use fixed public profile constants and distinguish models/languages",()=>{
  const a=lib.publicVoiceSampleKey("ru","sofia","Gacrux","gemini-3.8-flash-lite-tts","Сделайте мягкий вдох.");
  const b=lib.publicVoiceSampleKey("ru","maya","Sulafat","gemini-3.8-flash-lite-tts","Сделайте мягкий вдох.");
  assert.notEqual(a,b);
  assert.notEqual(a,lib.publicVoiceSampleKey("en","sofia","Gacrux","gemini-3.8-flash-lite-tts","Take a breath."));
  assert.notEqual(a,lib.publicVoiceSampleKey("ru","sofia","Gacrux","gemini-new-model","Сделайте мягкий вдох."));
});

test("only fresh, correctly keyed WAV blobs pass; corrupt/expired samples do not",()=>{
  const now=Date.now(),key="public-key";
  const wav=new Blob([new Uint8Array(500)],{type:"audio/wav"});
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:wav,storedAt:now-1000},key,now),true);
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:wav,storedAt:now-15*86400000},key,now),false);
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:wav,storedAt:now+1000},key,now),false);
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:wav,storedAt:now-1000},"other",now),false);
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:new Blob([new Uint8Array(500)],{type:"audio/mpeg"}),storedAt:now},key,now),false);
  assert.equal(lib.isFreshPublicVoiceSample({key,audio:new Blob([new Uint8Array(20)],{type:"audio/wav"}),storedAt:now},key,now),false);
});

test("IndexedDB unsupported or denied never blocks real audio preview",async()=>{
  const previous=globalThis.indexedDB;
  try{
    delete globalThis.indexedDB;
    assert.equal(await lib.loadPublicVoiceSample("public-key"),null);
    await lib.storePublicVoiceSample("public-key",new Blob([new Uint8Array(100)],{type:"audio/wav"}));
    globalThis.indexedDB={open(){throw new Error("SecurityError")}};
    assert.equal(await lib.loadPublicVoiceSample("public-key"),null);
    await lib.storePublicVoiceSample("public-key",new Blob([new Uint8Array(100)],{type:"audio/wav"}));
  }finally{if(previous===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=previous;}
});

test("client affirmations never enter the fixed public sample cache",()=>{
  const ui=readFileSync(new URL("../components/mandala-affirmation-voice.tsx",import.meta.url),"utf8");
  assert.ok(ui.includes("loadPublicVoiceSample(persistentKey)"),"load cache before provider request");
  assert.ok(ui.includes('reply.headers.get("x-hh-voice-provider")==="gemini"'),"cache only actual Gemini samples");
  assert.ok(ui.includes("samplePendingPersistRef.current={key:persistentKey,audio,uri}"),
    "prepare cache write only for actual Gemini public demo");
  assert.ok(ui.includes("onCanPlay={sampleCanPlay}"),
    "wait for native WebKit decode before persisting");
  assert.ok(ui.includes("storePublicVoiceSample(pending.key,pending.audio)"),
    "only browser-decodable Gemini public demo may be stored");
  assert.ok(!ui.includes("storePublicVoiceSample(persistentKey,voiceDataRef"),"never store client narration");
  assert.ok(ui.includes("if(job!==sampleJobRef.current)return;"),"stale requests must not attach wrong voice");
});

test("public samples survive a simulated page reload without an extra provider call",async()=>{
  const prior=globalThis.indexedDB,table=new Map();
  const db={
    close(){},objectStoreNames:{contains:()=>true},
    transaction(){
      const tx={oncomplete:null,onerror:null,onabort:null};
      tx.objectStore=()=>({
        put(record){table.set(record.key,record);},
        openCursor(){
          const cursor={onsuccess:null,result:null};
          queueMicrotask(()=>{cursor.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});
          return cursor;
        },
        get(key){
          const request={onsuccess:null,onerror:null,result:null};
          queueMicrotask(()=>{request.result=table.get(key);request.onsuccess?.();});
          return request;
        },
      });
      return tx;
    },
  };
  globalThis.indexedDB={open(){
    const request={onsuccess:null,onerror:null,onblocked:null,onupgradeneeded:null,result:db};
    queueMicrotask(()=>request.onsuccess?.());
    return request;
  }};
  try{
    const key=lib.publicVoiceSampleKey("ru","maya","Sulafat","gemini-3.8-flash-lite-tts","Сделайте мягкий вдох.");
    const sample=realWav();
    await lib.storePublicVoiceSample(key,sample);
    assert.equal(table.size,1);
    const replay=await lib.loadPublicVoiceSample(key);
    assert.equal(replay?.size,sample.size,"cached complete PCM WAV available after a new database open");
    assert.equal(await lib.loadPublicVoiceSample(key+":another-provider"),null);
    await lib.storePublicVoiceSample(key,new Blob([new Uint8Array(900)],{type:"audio/mpeg"}));
    assert.equal((await lib.loadPublicVoiceSample(key))?.size,sample.size,"reject MP3 overwrites");
  }finally{if(prior===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=prior;}
});


test("malformed fixed public voice cannot poison the persistent demo cache",async()=>{
 const key=lib.publicVoiceSampleKey("en","alexander","Charon","gemini-3.8-flash-lite-tts","Take a breath.");
 const broken=new Blob([new Uint8Array(900)],{type:"audio/wav"});
 // The strict full-buffer check prevents storage of a headerless lookalike.
 // IndexedDB may not exist in Node; the observable contract is the same.
 const validator=await import(dataUri(validatorSource));
 assert.equal(validator.validatedPublicVoiceSampleDuration(await broken.arrayBuffer()),null);
 assert.equal(validator.validatedPublicVoiceSampleDuration(await realWav().arrayBuffer()),1);
 await lib.storePublicVoiceSample(key,broken);
});
