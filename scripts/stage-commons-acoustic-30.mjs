/**
 * Wikimedia Commons ORIGINAL acoustic performances: private, REVIEW-FIRST
 * source staging. Never hotlink, upload or mark as public on its own.
 * `node scripts/stage-commons-acoustic-30.mjs --audit`
 * `node scripts/stage-commons-acoustic-30.mjs --stage --limit 30`
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {existsSync,readFileSync,writeFileSync,mkdirSync,unlinkSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const registry=resolve(root,"data/video-catalog/commons-acoustic-30-review-20261115.json");
const inbox=resolve(root,"output/audio-inbox");
const MAX_BYTES=40*1024*1024;
const CATEGORIES=["body","business","energy","love","stress"];
const MOODS=["calm","focus","uplift"];
const MODES=["slow","steady","active"];
const sha=(input,type)=>createHash(type).update(input).digest("hex");
const fail=reason=>{throw Error("HH_ACOUSTIC_"+reason)};
export function validateAcoustic30(data){
 if(!data||data.schema!=="hh-acoustic-commons-30-candidates-v1"||
   data.status!=="CANDIDATE_ONLY_NOT_DOWNLOADED_NOT_PUBLISHED"||
   !Array.isArray(data.candidates)||data.candidates.length!==30)fail("INVALID_QUEUE");
 const ids=new Set(),files=new Set();
 for(const row of data.candidates){
  if(!row||!/^curated-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id||"")||
    ids.has(row.id)||files.has(row.fileName)||
    typeof row.fileName!=="string"||
    !/^[^/\\]+[.](?:flac|ogg)$/u.test(row.fileName)||
    row.fileName.length>180||
    row.sourcePage!=="https://commons.wikimedia.org/wiki/File:"+
      encodeURIComponent(row.fileName).replace(/%20/g,"_")||
    row.generatorEligible!==false||row.ingestStatus!=="not_downloaded"||
    row.musicalEditorialStatus!=="pending_human_audition"||
    row.compositionRights!=="public_domain"||
    row.recordingRights!=="VERIFY_COMMONS_CC0_OR_PDM"||
    !["piano","cello"].includes(row.instrument)||
    !CATEGORIES.some(c=>row.categories?.includes(c))||
    row.categories.some(c=>!CATEGORIES.includes(c))||
    !MOODS.some(m=>row.moods?.includes(m))||
    row.moods.some(m=>!MOODS.includes(m))||
    !MODES.includes(row.pace)||typeof row.voiceSafe!=="boolean"||
    !["ru","en","es"].every(l=>typeof row.name?.[l]==="string"&&row.name[l].trim())||
    typeof row.performer!=="string"||row.performer.length<3||
    typeof row.composer!=="string"||row.composer.length<3)fail("INVALID_ENTRY_"+String(row?.id));
  ids.add(row.id);files.add(row.fileName);
 }
 for(const category of CATEGORIES)
  if(data.candidates.filter(row=>row.categories.includes(category)).length<4)
   fail("MISSING_CATEGORY_"+category);
 return data.candidates;
}
export function recordingLicense(info){
 const m=info?.extmetadata||{};
 const short=String(m.LicenseShortName?.value||"").trim();
 const url=String(m.LicenseUrl?.value||"").trim();
 if(/^CC0(?: 1\.0)?$/i.test(short)&&
   (!url||/^https?:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?/i.test(url)))
  return {id:"CC0-1.0",url:"https://creativecommons.org/publicdomain/zero/1.0/"};
 if(/^Public domain$/i.test(short)&&
   /^https?:\/\/creativecommons\.org\/publicdomain\/mark\/1\.0\/?/i.test(url))
  return {id:"PDM-1.0",url:"https://creativecommons.org/publicdomain/mark/1.0/"};
 fail("NOT_CC0_OR_VERIFIED_PDM");
}
export function safeOriginalUrl(original){
 let url;try{url=new URL(original)}catch{fail("URL_BAD")}
 if(url.protocol!=="https:"||url.hostname!=="upload.wikimedia.org"||
   url.username||url.password||url.port||url.search||url.hash||
   !url.pathname.startsWith("/wikipedia/commons/")||
   url.pathname.includes("..")||url.pathname.includes("//"))fail("UNTRUSTED_AUDIO_URL");
 return url.href;
}
export async function commonsMetadata(row,{fetchFn=fetch}={}){
 const u=new URL("https://commons.wikimedia.org/w/api.php");
 for(const [k,v] of Object.entries({action:"query",prop:"imageinfo",
  iiprop:"url|size|sha1|mime|extmetadata",format:"json",titles:"File:"+row.fileName}))
  u.searchParams.set(k,v);
 const result=await fetchFn(u.href,{redirect:"error",
  headers:{"User-Agent":"HolisticHouse-AcousticReview/1.0 (https://holistichouse.vercel.app)"},
  signal:AbortSignal.timeout(45000)});
 if(!result.ok)fail("METADATA_HTTP_"+result.status);
 const json=await result.json();
 const pages=Object.values(json?.query?.pages||{});
 if(pages.length!==1||!pages[0]?.imageinfo?.length||
  pages[0].missing!==undefined)fail("MISSING_ORIGINAL");
 const info=pages[0].imageinfo[0],bytes=Number(info.size);
 if(!Number.isSafeInteger(bytes)||bytes<100000||bytes>MAX_BYTES||
  !/^[a-f0-9]{40}$/.test(info.sha1||"")||
  !/^(audio\/|application\/ogg)/.test(info.mime||""))fail("INVALID_MEDIA_METADATA");
 return {url:safeOriginalUrl(info.url),sha1:info.sha1,size:bytes,
  mime:info.mime,license:recordingLicense(info)};
}
export function probeAcousticFile(path){
 const run=spawnSync("ffprobe",["-v","error","-show_entries",
  "format=duration:stream=codec_type,codec_name,channels,sample_rate","-of","json",path],
  {encoding:"utf8",timeout:20000,maxBuffer:1024*1024});
 if(run.error||run.status!==0)fail("FFPROBE_FAIL");
 let meta;try{meta=JSON.parse(run.stdout)}catch{fail("FFPROBE_JSON")}
 const streams=meta.streams||[],audios=streams.filter(s=>s.codec_type==="audio");
 const seconds=Number(meta.format?.duration);
 if(audios.length!==1||streams.some(s=>s.codec_type==="video")||
  !["flac","vorbis"].includes(audios[0].codec_name)||
  Number(audios[0].sample_rate)<44100||
  ![1,2].includes(Number(audios[0].channels))||
  !Number.isFinite(seconds)||seconds<60||seconds>480)fail("AUDIO_TECHNICAL_HOLD");
 return {seconds,codec:audios[0].codec_name,
  channels:audios[0].channels,sampleRate:audios[0].sample_rate};
}
async function readLimited(response,expected){
 if(!response.body)fail("EMPTY_AUDIO");
 let total=0;const chunks=[];
 for await(const chunk of response.body){
  total+=chunk.byteLength;
  if(total>expected||total>MAX_BYTES)fail("AUDIO_SIZE_MISMATCH");
  chunks.push(Buffer.from(chunk));
 }
 if(total!==expected)fail("AUDIO_SIZE_MISMATCH");
 return Buffer.concat(chunks,total);
}
export async function stageRecording(row,{fetchFn=fetch}={}){
 const info=await commonsMetadata(row,{fetchFn});
 const fileName=row.id+"."+row.fileName.split(".").at(-1);
 const file=resolve(inbox,fileName),worksheet=resolve(inbox,row.id+".json");
 mkdirSync(inbox,{recursive:true});
 if(existsSync(file)||existsSync(worksheet)){
  if(!existsSync(file)||!existsSync(worksheet))fail("PARTIAL_STAGE");
  const old=JSON.parse(readFileSync(worksheet,"utf8"));
  if(old.id!==row.id||old.originalCommonsSha1!==info.sha1||
    old.sha256!==sha(readFileSync(file),"sha256"))fail("CHANGED_ORIGINAL");
  return {id:row.id,status:"already_staged_pending_review"};
 }
 const response=await fetchFn(info.url,{redirect:"error",
  headers:{"User-Agent":"HolisticHouse-AcousticReview/1.0 (https://holistichouse.vercel.app)"},
  signal:AbortSignal.timeout(90000)});
 if(!response.ok)fail("DOWNLOAD_HTTP_"+response.status);
 const bytes=await readLimited(response,info.size);
 if(sha(bytes,"sha1")!==info.sha1)fail("DOWNLOAD_SHA1_MISMATCH");
 writeFileSync(file,bytes,{mode:0o600,flag:"wx"});
 let tech;
 try{tech=probeAcousticFile(file)}catch(e){unlinkSync(file);throw e}
 const manifest={
  id:row.id,sourceFile:fileName,sha256:sha(bytes,"sha256"),
  reviewed:false,reviewedOn:null,qualityScore:null,
  originalCommonsSha1:info.sha1,originalFileBytes:bytes.length,technical:tech,
  sourcePage:row.sourcePage,recordingLicense:info.license.id,
  recordingLicenseEvidence:row.sourcePage,
  compositionRights:"public_domain",compositionLicenseEvidence:row.sourcePage,
  creator:row.performer,performer:row.performer,title:row.title,
  categories:row.categories,moods:row.moods,pace:row.pace,
  voiceSafe:row.voiceSafe,name:row.name,
  note:"Human listening and independent composition/recording rights approval required. NEVER set reviewed true automatically."
 };
 writeFileSync(worksheet,JSON.stringify(manifest,null,2)+"\n",
  {mode:0o600,flag:"wx"});
 return {id:row.id,status:"staged_pending_review",
  durationSeconds:Math.round(tech.seconds),sha256:manifest.sha256};
}
export function auditAcoustic30(data){
 const rows=validateAcoustic30(data);
 return {sourceCandidates:30,actualFilesPublishedByThisScript:0,
  publicEligibleByThisScript:0,
  categories:Object.fromEntries(CATEGORIES.map(c=>[c,rows.filter(r=>r.categories.includes(c)).length])),
  performers:[...new Set(rows.map(r=>r.performer))],
  instruments:[...new Set(rows.map(r=>r.instrument))],
  status:"PENDING_RIGHTS_AUDIO_AND_HUMAN_AUDITION"};
}
export async function runStage({limit=30,fetchFn=fetch}={}){
 const rows=validateAcoustic30(JSON.parse(readFileSync(registry,"utf8")));
 if(!Number.isInteger(limit)||limit<1||limit>30)fail("INVALID_LIMIT");
 const result=[];
 for(const row of rows.slice(0,limit))result.push(await stageRecording(row,{fetchFn}));
 return {staged:result.length,publicEligible:0,status:"PRIVATE_INBOX_ONLY",items:result};
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const stage=process.argv.includes("--stage"),n=process.argv.indexOf("--limit");
 const limit=n<0?30:Number(process.argv[n+1]);
 const allowed=new Set([process.argv[0],process.argv[1],"--audit","--stage","--limit",String(limit)]);
 if(process.argv.some(arg=>!allowed.has(arg)))fail("INVALID_ARGUMENTS");
 (stage?runStage({limit}):
   Promise.resolve(auditAcoustic30(JSON.parse(readFileSync(registry,"utf8")))))
  .then(x=>console.log(JSON.stringify(x,null,2)))
  .catch(e=>{console.error(e.message);process.exitCode=1});
}
