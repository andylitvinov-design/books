/**
 * Import queue for real original recordings licensed CC BY 4.0 by Tanner Helland.
 * 20 pinned source MIDI files are committed as archival score assets, NOT audio.
 * Recorded MP3s are downloaded only by explicit --stage on an operator machine.
 * They are NEVER automatically published before genuine listening/rights review.
 *
 * node scripts/acquire-curated-music-wave-v2.mjs --audit
 * node scripts/acquire-curated-music-wave-v2.mjs --stage
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {existsSync,readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const sourceFile=resolve(root,"data/video-catalog/curated-music-source-wave-v2.json");
const catalogFile=resolve(root,"data/video-catalog/curated-audio-imports.json");
const inbox=resolve(root,"output/audio-inbox");
const SOURCE="tannerhelland/free-music";
const COMMIT="f6bfe16f49feab2181075ab86b13b24740592aa6";
const EVIDENCE="https://github.com/"+SOURCE+"/blob/"+COMMIT;
const SHA40=/^[a-f0-9]{40}$/;
const ID=/^curated-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MP3=/^[a-zA-Z0-9][a-zA-Z0-9 '()-]*\.mp3$/;
const MIDI=/^[a-zA-Z0-9][a-zA-Z0-9 '()-]*\.mid$/;
const CATEGORIES=new Set(["body","business","energy","love","stress"]);
const MOODS=new Set(["calm","focus","uplift"]);
function gitObjectSha(buffer) {
 return createHash("sha1").update(Buffer.from("blob "+buffer.length+"\0")).update(buffer).digest("hex");
}
export function validateWave2(manifest){
 if(!manifest||manifest.version!=="hh-curated-source-wave-v2"||
  manifest.sourceRepository!==SOURCE||manifest.sourceCommit!==COMMIT||
  manifest.rightsEvidence!==EVIDENCE+"/README.md"||
  manifest.licenseEvidence!==EVIDENCE+"/LICENSE.md"||
  manifest.recordingLicense!=="CC-BY-4.0"||
  manifest.compositionLicense!=="CC-BY-4.0"||
  manifest.editorialStatus!=="recordings_not_published_pending_listening_review"||
  !Array.isArray(manifest.entries)||manifest.entries.length!==20)
  throw Error("curated_wave2_provenance_invalid");
 const ids=new Set(),mp3Hashes=new Set(),midiHashes=new Set();
 for(const e of manifest.entries){
  if(!e||!ID.test(e.id)||ids.has(e.id)||e.sourceStatus!=="candidate_pending_listening"||
   typeof e.title!=="string"||!e.title.trim()||
   e.creator!=="Tanner Helland"||e.performer!=="Tanner Helland"||
   !MP3.test(e.sourceMp3)||!MIDI.test(e.sourceMidi)||
   !SHA40.test(e.sourceMp3GitSha)||!SHA40.test(e.sourceMidiGitSha)||
   mp3Hashes.has(e.sourceMp3GitSha)||midiHashes.has(e.sourceMidiGitSha)||
   !Number.isInteger(e.sourceMp3Bytes)||e.sourceMp3Bytes<1000000||e.sourceMp3Bytes>12000000||
   !Number.isInteger(e.sourceMidiBytes)||e.sourceMidiBytes<1000||e.sourceMidiBytes>200000||
   e.localMidiPath!=="assets/audio/curated-midi-v2/"+e.id.slice(8)+".mid"||
   e.voiceSafe!==false||
   !Array.isArray(e.categories)||!e.categories.length||
   e.categories.some(c=>!CATEGORIES.has(c))||
   !Array.isArray(e.moods)||!e.moods.length||
   e.moods.some(m=>!MOODS.has(m))||
   !["slow","steady","active"].includes(e.pace)||
   ["ru","en","es"].some(l=>typeof e.name?.[l]!=="string"||!e.name[l].trim()))
   throw Error("curated_wave2_invalid_candidate_"+String(e?.id));
  ids.add(e.id);mp3Hashes.add(e.sourceMp3GitSha);midiHashes.add(e.sourceMidiGitSha);
 }
 return manifest.entries;
}
export function auditWave2(){
 const manifest=JSON.parse(readFileSync(sourceFile,"utf8"));
 const rows=validateWave2(manifest);
 const existing=JSON.parse(readFileSync(catalogFile,"utf8"));
 if(existing.version!=="hh-curated-audio-imports-v1"||!Array.isArray(existing.entries))
  throw Error("published_audio_registry_invalid");
 const existingIds=new Set(existing.entries.map(x=>x.id));
 for(const e of rows){
  if(existingIds.has(e.id) && !existing.entries.some(x=>x.id===e.id &&
   x.sourceType==="reviewed_external_recording"&&
   x.recordingLicense==="CC-BY-4.0"))throw Error("published_candidate_invalid_"+e.id);
  const file=resolve(root,e.localMidiPath);
  if(!existsSync(file))throw Error("source_midi_missing_"+e.id);
  const bytes=readFileSync(file);
  if(bytes.length!==e.sourceMidiBytes||
   gitObjectSha(bytes)!==e.sourceMidiGitSha||
   bytes.toString("ascii",0,4)!=="MThd")
   throw Error("source_midi_integrity_mismatch_"+e.id);
 }
 const liveMp3sFromWave2=rows.filter(e=>existingIds.has(e.id)).length;
 return {newScoreAssets:rows.length,newRecordedCandidates:rows.length-liveMp3sFromWave2,
  liveMp3sFromWave2,existingCuratedMp3s:existing.entries.length,
  sourceMp3Bytes:rows.reduce((s,e)=>s+e.sourceMp3Bytes,0),
  sourceMidiBytes:rows.reduce((s,e)=>s+e.sourceMidiBytes,0)};
}
function originalMp3Url(e){
 return "https://raw.githubusercontent.com/"+SOURCE+"/"+COMMIT+"/mp3/"+encodeURIComponent(e.sourceMp3);
}
function mp3Info(file){
 const run=spawnSync("ffprobe",["-v","error","-show_entries",
  "format=duration:stream=codec_type,codec_name,channels,sample_rate",
  "-of","json",file],{timeout:25000,encoding:"utf8",maxBuffer:256*1024});
 if(run.error||run.status!==0)throw Error("invalid_mp3_ffprobe_"+file);
 const data=JSON.parse(run.stdout);
 const tracks=(data.streams||[]).filter(x=>x.codec_type==="audio");
 const duration=Number(data.format?.duration);
 if(tracks.length!==1||tracks[0].codec_name!=="mp3"||
  ![1,2].includes(tracks[0].channels)||
  Number(tracks[0].sample_rate)<22050||
  !Number.isFinite(duration)||duration<20||duration>1800)
  throw Error("invalid_mp3_audio_or_duration_"+file);
 return duration;
}
export async function stageWave2({fetchFn=fetch}={}){
 const audit=auditWave2();
 const rows=validateWave2(JSON.parse(readFileSync(sourceFile,"utf8")));
 mkdirSync(inbox,{recursive:true});
 const files=[];
 for(const e of rows){
  if(audit.liveMp3sFromWave2 && JSON.parse(readFileSync(catalogFile,"utf8")).entries.some(x=>x.id===e.id))continue;
  const source=resolve(inbox,e.id+".mp3");
  const worksheet=resolve(inbox,e.id+".json");
  if(existsSync(source)||existsSync(worksheet))
   throw Error("manual_staging_conflict_"+e.id);
  const response=await fetchFn(originalMp3Url(e),{
   redirect:"follow",signal:AbortSignal.timeout(90000),
   headers:{"User-Agent":"HolisticHouse-Source-Music-Import/2.0"}});
  if(!response.ok)throw Error("download_failure_"+e.id+"_"+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==e.sourceMp3Bytes||gitObjectSha(bytes)!==e.sourceMp3GitSha)
   throw Error("pinned_mp3_integrity_mismatch_"+e.id);
  const sha256=createHash("sha256").update(bytes).digest("hex");
  writeFileSync(source,bytes,{mode:0o600,flag:"wx"});
  const seconds=mp3Info(source);
  const record={
   id:e.id,sourceFile:e.id+".mp3",sha256,reviewed:false,reviewedOn:null,
   recordingLicense:"CC-BY-4.0",compositionRights:"licensed_for_commercial_sync",
   sourcePage:EVIDENCE+"/mp3/"+encodeURIComponent(e.sourceMp3),
   recordingLicenseEvidence:EVIDENCE+"/README.md",
   compositionLicenseEvidence:EVIDENCE+"/LICENSE.md",
   creator:e.creator,performer:e.performer,title:e.title,
   categories:e.categories,moods:e.moods,pace:e.pace,
   voiceSafe:false,name:e.name
  };
  writeFileSync(worksheet,JSON.stringify(record,null,2)+"\n",{mode:0o600,flag:"wx"});
  files.push({id:e.id,durationSeconds:Math.round(seconds),sha256,
   reviewWorksheet:e.id+".json"});
 }
 return {audit,staged:files.length,liveImported:0,files};
}
const isMain=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 (process.argv.includes("--stage")?stageWave2():Promise.resolve(auditWave2()))
 .then(r=>console.log(JSON.stringify(r,null,2)))
 .catch(e=>{console.error(e.message);process.exitCode=1});
}
