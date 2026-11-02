/**
 * Build-time, reproducible first-party MP3 masters.
 * Four DIFFERENT original scores for EVERY approved scenario (currently 48×4),
 * plus four original digital performances of familiar public-domain melodies.
 * All files are derived build artifacts; no external provider, paid API,
 * unlicensed music sample or visitor information is involved.
 *
 * node scripts/generate-scenario-melodies.mjs          # generate missing masters
 * node scripts/generate-scenario-melodies.mjs --check  # audit actual masters
 * node scripts/generate-scenario-melodies.mjs --force  # regenerate all
 */
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync,statSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import ffmpegPath from "ffmpeg-static";
import {renderAuthorizedScore,SAMPLE_RATE,DURATION_SECONDS} from "./generate-mandala-melodies.mjs";
import {SCENARIO_AUDIO_REGISTRY,SCENARIO_AUDIO_VARIANTS,CLASSICAL_THEMES} from "../lib/mandala/scenario-audio-catalog.mjs";

const here=dirname(fileURLToPath(import.meta.url));
const dir=resolve(here,"../public/audio/mandala/scenarios");
const sampleRate=SAMPLE_RATE,seconds=DURATION_SECONDS;
const FORCE=process.argv.includes("--force"),CHECK=process.argv.includes("--check");
const SEQUENCES=[
  [0,4,5,3],[0,3,4,0],[0,5,3,4],[0,4,3,0],[0,3,6,4],
  [0,5,4,3],[0,4,6,3],[0,3,5,4],
];
const scoreKinds=[
  {mode:"major",lead:"piano",back:"strings"},
  {mode:"lydian",lead:"harp",back:"celesta"},
  {mode:"dorian",lead:"marimba",back:"piano"},
  {mode:"minor",lead:"flute",back:"harp"},
];
function hash(text) {
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function scenarioScore(scenario,variant){
  const h=hash(scenario.id+":"+variant.id+":"+scenario.theme+":hh-music-v1");
  const kind=scoreKinds[variant.id-1];
  const mode=scenario.theme==="health"&&variant.id===3?"dorian":kind.mode;
  const progression=SEQUENCES[(h>>>9)%SEQUENCES.length];
  // Real pitch/rhythm/voicing differences, not renamed copies of one WAV.
  const motif=Array.from({length:8},(_,i)=>i===7?0:
    ((h>>>(i%19))+i*3+(h%7))%7);
  motif[0]=(h%3)*2;
  if(variant.id===4)motif[3]=null;
  if(variant.id===1)motif[5]=null;
  return {
    id:"score-"+scenario.id+"-"+variant.id,
    key:48+((h>>>3)%10),mode,chords:[...progression],motif,
    lead:kind.lead,back:kind.back,color:(h>>>20)%4
  };
}
const CLASSIC_NOTES={
  "classic-ode-to-joy":[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60],
  "classic-fur-elise":[76,75,76,75,76,71,74,72,69,60,64,69,71,64,68,71,72,64,76,75,76,75,76,71,74,72,69],
  "classic-greensleeves":[69,72,74,76,77,76,74,71,67,69,71,72,69,69,68,69,69,72,74,76,77,76,74,71,67,69,71,72,69],
  "classic-twinkle":[60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62,67,67,65,65,64,64,62,60,60,67,67,69,69,67]
};
function renderClassical(theme) {
  const notes=CLASSIC_NOTES[theme.id];
  if(!notes||!notes.length)throw Error("unknown_public_domain_melody");
  const n=sampleRate*seconds,bytes=Buffer.allocUnsafe(44+n*2);
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  bytes.write("RIFF",0);dv.setUint32(4,36+n*2,true);bytes.write("WAVE",8);
  bytes.write("fmt ",12);dv.setUint32(16,16,true);dv.setUint16(20,1,true);
  dv.setUint16(22,1,true);dv.setUint32(24,sampleRate,true);
  dv.setUint32(28,sampleRate*2,true);dv.setUint16(32,2,true);
  dv.setUint16(34,16,true);bytes.write("data",36);dv.setUint32(40,n*2,true);
  const TAU=Math.PI*2, noteSeconds=(seconds-1.2)/notes.length;
  const hz=m=>440*2**((m-69)/12);
  const chordRoots=theme.id==="classic-ode-to-joy"?[48,53,55,48]
    :theme.id==="classic-fur-elise"?[45,52,47,45]
    :theme.id==="classic-greensleeves"?[45,53,48,52]:[48,55,53,48];
  for(let i=0;i<n;i++){
    const t=i/sampleRate,idx=Math.min(notes.length-1,Math.floor(t/noteSeconds));
    const tNote=t-idx*noteSeconds,frequency=hz(notes[idx]);
    const attack=Math.min(1,tNote/.024);
    const decay=Math.max(0,Math.min(1,(noteSeconds-tNote)/.12));
    const lead=attack*decay*(.52*Math.sin(TAU*frequency*t)
      +.13*Math.sin(TAU*frequency*2.007*t)+.036*Math.sin(TAU*frequency*3.011*t));
    const root=chordRoots[Math.min(3,Math.floor(t/8))];
    const chord=(Math.sin(TAU*hz(root)*t)+
      .45*Math.sin(TAU*hz(root+7)*t)+.32*Math.sin(TAU*hz(root+12)*t))*.087;
    const fade=Math.min(1,t/.22,(seconds-t)/.65);
    const value=Math.tanh((lead+chord)*1.03)*.85*Math.max(0,fade);
    dv.setInt16(44+2*i,Math.max(-32767,Math.min(32767,Math.round(value*32767))),true);
  }
  return bytes;
}
function plausibleMp3(path) {
  if(!existsSync(path)||statSync(path).size<25000)return false;
  const b=readFileSync(path).subarray(0,4);
  return b.subarray(0,3).toString("ascii")==="ID3" ||
    (b[0]===0xff&&(b[1]&0xe0)===0xe0);
}
function encodeMaster(file,wav) {
  // GitHub ocean-audio workflow uses npm ci --ignore-scripts; that leaves
  // ffmpeg-static's binary absent. Ubuntu runners have system ffmpeg.
  // Prefer the bundled first-party dependency whenever installed.
  const encoder=ffmpegPath&&existsSync(ffmpegPath)?ffmpegPath:"ffmpeg";
  const result=spawnSync(encoder,[
    "-hide_banner","-loglevel","error","-nostdin","-y",
    "-f","wav","-i","pipe:0",
    "-codec:a","libmp3lame","-b:a","96k",
    "-ar",String(sampleRate),"-ac","1","-map_metadata","-1",file
  ],{input:wav,maxBuffer:2*1024*1024,timeout:30000});
  if(result.error||result.status!==0||!plausibleMp3(file)){
    try{unlinkSync(file)}catch{}
    throw Error("scenario_mp3_encode_failed_"+file+": "+String(result.stderr||result.error).slice(0,350));
  }
}
export function buildScenarioMusic({check=CHECK,force=FORCE}={}){
  if(SCENARIO_AUDIO_REGISTRY.length===0||SCENARIO_AUDIO_VARIANTS.length!==4)throw Error("empty_music_tree");
  if(!check)mkdirSync(dir,{recursive:true});
  const all=[];
  const seenIds=new Set();
  for(const scene of SCENARIO_AUDIO_REGISTRY){
    for(const variant of SCENARIO_AUDIO_VARIANTS){
      const id="score-"+scene.id+"-"+variant.id;
      if(seenIds.has(id))throw Error("duplicate_scenario_music_id_"+id);
      seenIds.add(id);all.push({id,scene,variant});
    }
  }
  for(const theme of CLASSICAL_THEMES){
    if(!CLASSIC_NOTES[theme.id]||seenIds.has(theme.id))throw Error("invalid_classic_id_"+theme.id);
    seenIds.add(theme.id);all.push({id:theme.id,theme});
  }
  let generated=0;const fingerprints=new Set();
  for(const item of all){
    const path=resolve(dir,item.id+".mp3");
    if(check){
      if(!plausibleMp3(path))throw Error("missing_or_invalid_mp3_"+item.id);
    }else if(force||!plausibleMp3(path)){
      const pcm=item.theme?renderClassical(item.theme):
        renderAuthorizedScore(scenarioScore(item.scene,item.variant));
      encodeMaster(path,pcm);generated++;
    }
    const bytes=readFileSync(path);
    const sha=createHash("sha256").update(bytes).digest("hex");
    if(fingerprints.has(sha))throw Error("duplicate_audio_recording_"+item.id);
    fingerprints.add(sha);
  }
  return {scenarioCount:SCENARIO_AUDIO_REGISTRY.length,
    tracksPerScenario:SCENARIO_AUDIO_VARIANTS.length,
    distinctScenarioMasters:SCENARIO_AUDIO_REGISTRY.length*4,
    publicDomainThemes:CLASSICAL_THEMES.length,totalMasterFiles:all.length,
    generated,verified:check};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log("[hh-scenario-audio]",JSON.stringify(buildScenarioMusic()));
