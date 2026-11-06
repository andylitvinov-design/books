// Reuse only deterministic first-party MP3 masters in Vercel's existing
// Next.js build cache (.next/cache/**). No external storage or paid service.
// Source/catalog/lockfile/Node-major drift always forces normal generation.
import {createHash} from "node:crypto";
import {existsSync,readFileSync,statSync,lstatSync,mkdirSync,writeFileSync,copyFileSync,renameSync,rmSync} from "node:fs";
import {join,dirname,resolve} from "node:path";
import {SCENARIO_AUDIO_REGISTRY,SCENARIO_AUDIO_VARIANTS,CLASSICAL_THEMES} from "../lib/mandala/scenario-audio-catalog.mjs";

const CACHE_SCHEMA="hh-scenario-music-build-v1";
const SOURCE_FILES=[
  "scripts/generate-scenario-melodies.mjs",
  "scripts/generate-mandala-melodies.mjs",
  "lib/mandala/scenario-audio-catalog.mjs",
  "package-lock.json",
];
const MAX_MASTER_BYTES=800_000;
const MAX_TOTAL_BYTES=160*1024*1024;
const validId=id=>typeof id==="string" && /^[a-z0-9-]+$/.test(id);

export function expectedScenarioAudioFiles(){
  if(!SCENARIO_AUDIO_REGISTRY.length || SCENARIO_AUDIO_VARIANTS.length!==4 ||
      CLASSICAL_THEMES.length!==4)throw Error("SCENARIO_CACHE_REGISTRY_INVALID");
  const names=[
    ...SCENARIO_AUDIO_REGISTRY.flatMap(scene=>
      SCENARIO_AUDIO_VARIANTS.map(variant=>"score-"+scene.id+"-"+variant.id+".mp3")),
    ...CLASSICAL_THEMES.map(theme=>theme.id+".mp3"),
  ];
  if(names.length>1000 || new Set(names).size!==names.length ||
      names.some(name=>!validId(name.slice(0,-4))||!name.endsWith(".mp3")))
    throw Error("SCENARIO_CACHE_NAMES_INVALID");
  return names;
}

export function scenarioSourceFingerprint(root=process.cwd()){
  const sha=createHash("sha256");
  sha.update(CACHE_SCHEMA+"\0"+process.platform+"/"+process.arch+
    "/node-"+process.versions.node.split(".")[0]+"\0");
  for(const name of SOURCE_FILES){
    sha.update(name+"\0");
    sha.update(readFileSync(join(root,name)));
    sha.update("\0");
  }
  return sha.digest("hex");
}

function physicalMp3(file){
  const stat=lstatSync(file);
  if(!stat.isFile()||stat.size<25_000||stat.size>MAX_MASTER_BYTES)
    throw Error("SCENARIO_CACHE_MP3_INVALID");
  const bytes=readFileSync(file);
  const mp3=bytes.subarray(0,3).toString("ascii")==="ID3" ||
    (bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
  if(!mp3)throw Error("SCENARIO_CACHE_MP3_HEADER");
  return {size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
}
function normalizedNames(names){
  if(!Array.isArray(names)||!names.length||names.length>1000||
      new Set(names).size!==names.length||
      names.some(name=>typeof name!=="string"||!name.endsWith(".mp3")||
        !validId(name.slice(0,-4))))
    throw Error("SCENARIO_CACHE_NAMES_INVALID");
  return [...names].sort();
}
function inspectMasters(dir,names){
  const items=[],hashes=new Set();
  let total=0;
  for(const name of names){
    const info=physicalMp3(join(dir,name));
    total+=info.size;
    if(total>MAX_TOTAL_BYTES||hashes.has(info.sha256))
      throw Error("SCENARIO_CACHE_DUPLICATE_OR_TOO_LARGE");
    hashes.add(info.sha256);
    items.push({name,...info});
  }
  return items;
}
function validatedCache(dir,key,names){
  const parsed=JSON.parse(readFileSync(join(dir,"manifest.json"),"utf8"));
  if(parsed.schema!==CACHE_SCHEMA||parsed.key!==key||
      !Array.isArray(parsed.items)||parsed.items.length!==names.length)
    throw Error("SCENARIO_CACHE_MANIFEST_MISMATCH");
  const expected=inspectMasters(dir,names);
  if(JSON.stringify(expected)!==JSON.stringify(parsed.items))
    throw Error("SCENARIO_CACHE_HASH_MISMATCH");
  return expected;
}
function persistCache(root,dir,key,names){
  const source=join(root,"public/audio/mandala/scenarios");
  const items=inspectMasters(source,names);
  const staging=dir+".stage-"+process.pid;
  rmSync(staging,{recursive:true,force:true});
  mkdirSync(staging,{recursive:true});
  try{
    for(const item of items)copyFileSync(join(source,item.name),join(staging,item.name));
    writeFileSync(join(staging,"manifest.json"),
      JSON.stringify({schema:CACHE_SCHEMA,key,items})+"\n");
    // Manifests are written only after all complete, distinct masters exist.
    rmSync(dir,{recursive:true,force:true});
    renameSync(staging,dir);
  }finally{rmSync(staging,{recursive:true,force:true});}
}

/** Fail closed on cache corruption: discard restored files and synthesize again.
 * Cache write errors are nonfatal AFTER a real source generation+verification.
 */
export async function withScenarioBuildCache({
  root=process.cwd(),names=expectedScenarioAudioFiles(),
  enabled=process.env.VERCEL_ENV==="production",generate,verify,
}={}){
  if(typeof generate!=="function"||typeof verify!=="function")
    throw Error("SCENARIO_CACHE_GENERATOR_REQUIRED");
  if(!enabled)return generate();
  const files=normalizedNames(names);
  let key,cacheDir;
  try{
    key=scenarioSourceFingerprint(root);
    cacheDir=join(root,".next/cache/hh-scenario-audio-"+key.slice(0,24));
  }catch{
    // Cannot pin the exact generator/dependency revision: normal safe build.
    console.warn("[hh-scenario-cache] source fingerprint unavailable; regenerate");
    return generate();
  }
  const destination=join(root,"public/audio/mandala/scenarios");
  if(existsSync(join(cacheDir,"manifest.json"))){
    const copied=[];
    try{
      validatedCache(cacheDir,key,files);
      mkdirSync(destination,{recursive:true});
      for(const name of files){
        copyFileSync(join(cacheDir,name),join(destination,name));
        copied.push(name);
      }
      // The original full generator audit remains mandatory on cache hits.
      const audited=await verify();
      console.log("[hh-scenario-cache] HIT; verified "+files.length+" source-pinned MP3s");
      return {...audited,generated:0,cacheRestored:true};
    }catch(error){
      for(const name of copied)rmSync(join(destination,name),{force:true});
      console.warn("[hh-scenario-cache] corrupted/unavailable; regenerate: "+
        String(error?.message||error).slice(0,100));
    }
  }
  const report=await generate();
  await verify(); // A partially encoded or duplicate file blocks the build.
  try{
    persistCache(root,cacheDir,key,files);
    console.log("[hh-scenario-cache] MISS; stored "+files.length+" verified MP3s");
  }catch(error){
    console.warn("[hh-scenario-cache] cache write skipped; real output preserved: "+
      String(error?.message||error).slice(0,100));
  }
  return {...report,cacheRestored:false};
}
