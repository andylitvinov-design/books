#!/usr/bin/env node
/**
 * Publish deterministic, fully owned ORIGINAL instrumental WAVs on build.
 * Unlike a network import, these masters need no rights-clearance or API key.
 * Skip valid assets to avoid repeating costly synthesis in local builds.
 */
import {mkdirSync,existsSync,readFileSync,writeFileSync,statSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {SONGS,SAMPLE_RATE,DURATION_SECONDS,renderMelody} from "./generate-mandala-melodies.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const directory=resolve(root,"public/audio/mandala");
const size=44+SAMPLE_RATE*DURATION_SECONDS*2;
const verify=process.argv.includes("--check");
const valid=path=>{
  if(!existsSync(path)||statSync(path).size!==size)return false;
  const data=readFileSync(path);
  return data.toString("ascii",0,4)==="RIFF"&&data.toString("ascii",8,12)==="WAVE"&&
    data.readUInt32LE(24)===SAMPLE_RATE&&data.readUInt32LE(40)===size-44;
};
mkdirSync(directory,{recursive:true});
let generated=0,alreadyPresent=0;
for(const song of SONGS){
  const path=resolve(directory,song.id+".wav");
  if(valid(path)){alreadyPresent++;continue;}
  if(verify)throw Error("missing_or_invalid_original_melody_"+song.id);
  const bytes=renderMelody(song);
  if(bytes.length!==size||bytes.toString("ascii",0,4)!=="RIFF")
    throw Error("failed_to_render_original_melody_"+song.id);
  writeFileSync(path,bytes,{flag:"w"});generated++;
  if(!valid(path))throw Error("failed_to_publish_original_melody_"+song.id);
}
console.log("Holistic House original melodies: "+SONGS.length+
  " ready ("+alreadyPresent+" cached, "+generated+" generated).");
