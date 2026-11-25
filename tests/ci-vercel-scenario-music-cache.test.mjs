import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync} from "node:fs";
import {join,dirname} from "node:path";
import {tmpdir} from "node:os";
import {withScenarioBuildCache,scenarioSourceFingerprint,expectedScenarioAudioFiles} from "../scripts/vercel-scenario-music-cache.mjs";
import {SCENARIO_AUDIO_REGISTRY,SCENARIO_AUDIO_VARIANTS,CLASSICAL_THEMES} from "../lib/mandala/scenario-audio-catalog.mjs";

const sources=[
  "scripts/generate-scenario-melodies.mjs","scripts/generate-mandala-melodies.mjs",
  "lib/mandala/scenario-audio-catalog.mjs","package-lock.json",
];
const names=["score-test-1.mp3","classic-test.mp3"];
function fixture(){
  const root=mkdtempSync(join(tmpdir(),"hh-vercel-music-cache-"));
  for(const file of sources){
    const path=join(root,file);
    mkdirSync(dirname(path),{recursive:true});
    writeFileSync(path,"approved-"+file);
  }
  let generated=0,verified=0;
  const dest=join(root,"public/audio/mandala/scenarios");
  const generate=async()=>{
    generated++;
    mkdirSync(dest,{recursive:true});
    names.forEach((file,i)=>{
      const bytes=Buffer.alloc(27_000+i*29,32+i);
      bytes.write("ID3",0,"ascii");
      writeFileSync(join(dest,file),bytes);
    });
    return {totalMasterFiles:names.length,generated:names.length,verified:false};
  };
  const verify=async()=>{
    verified++;
    const seen=new Set();
    for(const file of names){
      const bytes=readFileSync(join(dest,file));
      assert.ok(bytes.length>25_000&&bytes.subarray(0,3).toString()==="ID3");
      assert.ok(!seen.has(bytes.toString("hex",0,16)));
      seen.add(bytes.toString("hex",0,16));
    }
    return {totalMasterFiles:names.length,generated:0,verified:true};
  };
  const run=()=>withScenarioBuildCache({root,names,enabled:true,generate,verify});
  const clearOutput=()=>rmSync(dest,{recursive:true,force:true});
  const cleanup=()=>rmSync(root,{recursive:true,force:true});
  return {root,run,generate,verify,clearOutput,cleanup,
    get generated(){return generated;},get verified(){return verified;},dest};
}

test("all actual catalog masters have distinct safe names; new scenarios invalidate cache source",()=>{
  const files=expectedScenarioAudioFiles();
  assert.equal(files.length,SCENARIO_AUDIO_REGISTRY.length*SCENARIO_AUDIO_VARIANTS.length+
    CLASSICAL_THEMES.length);
  assert.equal(new Set(files).size,files.length);
  assert.ok(files.every(name=>/^[a-z0-9-]+\.mp3$/.test(name)));
});

test("cold Vercel build generates full music, next production build restores verified physical MP3s",async()=>{
  const f=fixture();
  try{
    const first=await f.run();
    assert.equal(first.generated,2);
    assert.equal(first.cacheRestored,false);
    assert.equal(f.generated,1);
    assert.equal(f.verified,1);
    const key=scenarioSourceFingerprint(f.root);
    const cache=join(f.root,".next/cache/hh-scenario-audio-"+key.slice(0,24));
    const manifest=JSON.parse(readFileSync(join(cache,"manifest.json"),"utf8"));
    assert.equal(manifest.items.length,2);
    assert.ok(manifest.items.every(row=>/^[a-f0-9]{64}$/.test(row.sha256)));
    f.clearOutput();
    const second=await f.run();
    assert.equal(second.generated,0,"warm cache never runs CPU synthesizer");
    assert.equal(second.cacheRestored,true);
    assert.equal(second.verified,true,"original full audio auditor still executes");
    assert.equal(f.generated,1);
    assert.equal(f.verified,2);
    assert.ok(existsSync(join(f.dest,names[0])));
  }finally{f.cleanup();}
});

test("changed approved source or lockfile misses cache and regenerates every master",async()=>{
  const f=fixture();
  try{
    await f.run();
    const before=scenarioSourceFingerprint(f.root);
    f.clearOutput();
    writeFileSync(join(f.root,"package-lock.json"),"reviewed-new-dependency-revision");
    assert.notEqual(scenarioSourceFingerprint(f.root),before);
    const result=await f.run();
    assert.equal(result.cacheRestored,false);
    assert.equal(f.generated,2);
    assert.equal(f.verified,2);
  }finally{f.cleanup();}
});

test("corrupt cached MP3, duplicated fingerprint or manipulated manifest cannot bypass original renderer",async()=>{
  const f=fixture();
  try{
    await f.run();
    const key=scenarioSourceFingerprint(f.root);
    const cache=join(f.root,".next/cache/hh-scenario-audio-"+key.slice(0,24));
    const path=join(cache,names[0]);
    const bytes=readFileSync(path);
    bytes[200]^=0xff;
    writeFileSync(path,bytes);
    f.clearOutput();
    const regenerated=await f.run();
    assert.equal(regenerated.cacheRestored,false);
    assert.equal(f.generated,2,"digest mismatch must regenerate, not accept cache");
    const manifest=JSON.parse(readFileSync(join(cache,"manifest.json"),"utf8"));
    manifest.items[0].sha256="f".repeat(64);
    writeFileSync(join(cache,"manifest.json"),JSON.stringify(manifest));
    f.clearOutput();
    const result=await f.run();
    assert.equal(result.cacheRestored,false);
    assert.equal(f.generated,3);
  }finally{f.cleanup();}
});

test("non-Vercel work remains unchanged; failed real generator never writes a false warm cache",async()=>{
  const f=fixture();
  try{
    const cold=await withScenarioBuildCache({root:f.root,names,enabled:false,
      generate:f.generate,verify:f.verify});
    assert.equal(cold.generated,2);
    assert.ok(!existsSync(join(f.root,".next/cache")));
  }finally{f.cleanup();}
  const g=fixture();
  try{
    await assert.rejects(()=>withScenarioBuildCache({root:g.root,names,enabled:true,
      generate:async()=>{throw Error("REAL_MP3_GENERATION_FAILED");},verify:g.verify}),
      /REAL_MP3_GENERATION_FAILED/);
    assert.equal(existsSync(join(g.root,".next/cache")),false);
  }finally{g.cleanup();}
});
