import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const ts=require("typescript");
const source=readFileSync(new URL("../lib/mandala/public-voice-sample-cache.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const lib=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));

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
  assert.ok(ui.includes("storePublicVoiceSample(persistentKey,audio)"),"persist fixed validated sample WAV");
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
    const sample=new Blob([new Uint8Array(900)],{type:"audio/wav"});
    await lib.storePublicVoiceSample(key,sample);
    assert.equal(table.size,1);
    const replay=await lib.loadPublicVoiceSample(key);
    assert.equal(replay?.size,900,"cached WAV available after a new database open");
    assert.equal(await lib.loadPublicVoiceSample(key+":another-provider"),null);
    await lib.storePublicVoiceSample(key,new Blob([new Uint8Array(900)],{type:"audio/mpeg"}));
    assert.equal((await lib.loadPublicVoiceSample(key))?.size,900,"reject MP3 overwrites");
  }finally{if(prior===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=prior;}
});
