/**
 * Owner-reviewed first wave of genuinely recorded instrumental music.
 * Download ONLY five pinned GitHub objects from the composer-author's CC BY 4.0
 * catalogue. This runs once on a trusted GitHub runner, not in the website,
 * API route, request handler, build, or browser.
 *
 * Both the composition and recording are offered by their composer/performer
 * under CC BY 4.0. Still require the owner's listening review before LIVE.
 *
 * Run: node scripts/acquire-curated-music-wave.mjs [--dry-run]
 */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {importReviewedAudio} from "./import-reviewed-audio.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const sourcePath=resolve(root,"data/video-catalog/curated-music-source-wave-v1.json");
const registryPath=resolve(root,"data/video-catalog/curated-audio-imports.json");
const inbox=resolve(root,"output/audio-inbox");
const source=JSON.parse(readFileSync(sourcePath,"utf8"));

const SOURCE_REPO="tannerhelland/free-music";
const SOURCE_COMMIT="f6bfe16f49feab2181075ab86b13b24740592aa6";
const RIGHTS_PAGE="https://github.com/"+SOURCE_REPO+"/blob/"+SOURCE_COMMIT+"/README.md";
const LICENSE_PAGE="https://github.com/"+SOURCE_REPO+"/blob/"+SOURCE_COMMIT+"/LICENSE.md";
const expectedSourceIds=new Set([
  "curated-memory-away","curated-daybreak","curated-home",
  "curated-forest-awakes","curated-leaving-millie",
]);

export function validateAcquisitionManifest(doc){
  if(doc.version!=="hh-curated-source-wave-v1"||
     doc.sourceRepository!==SOURCE_REPO||doc.sourceCommit!==SOURCE_COMMIT||
     doc.license!=="CC-BY-4.0"||doc.rightsEvidence!==RIGHTS_PAGE||
     doc.licenseEvidence!==LICENSE_PAGE||!Array.isArray(doc.entries)||
     doc.entries.length!==5||new Set(doc.entries.map(e=>e.id)).size!==5)
    throw Error("curated_wave_source_provenance_invalid");
  for(const entry of doc.entries){
    if(!expectedSourceIds.has(entry.id)||typeof entry.repositoryFilename!=="string"||
       !/^[a-zA-Z0-9 ()'-]+\.mp3$/.test(entry.repositoryFilename)||
       !/^[a-z0-9-]+\.mp3$/.test(entry.sourceFile)||
       !/^[a-f0-9]{40}$/.test(entry.gitBlobSha)||
       !Number.isInteger(entry.sizeBytes)||entry.sizeBytes<30000||entry.sizeBytes>12000000||
       !entry.creator||entry.creator!=="Tanner Helland"||
       !entry.performer||entry.performer!=="Tanner Helland"||
       !entry.title||!Array.isArray(entry.categories)||!entry.categories.length||
       !Array.isArray(entry.moods)||!entry.moods.length||
       !["slow","steady","active"].includes(entry.pace)||
       typeof entry.voiceSafe!=="boolean"||
       !["ru","en","es"].every(lang=>typeof entry.name?.[lang]==="string"&&entry.name[lang].trim()))
      throw Error("curated_wave_invalid_record_"+String(entry.id));
  }
  if(new Set(doc.entries.map(e=>e.repositoryFilename)).size!==5||
     new Set(doc.entries.map(e=>e.gitBlobSha)).size!==5)
    throw Error("curated_wave_repeated_source_master");
  return doc.entries;
}

export function gitBlobId(bytes){
  return createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0"))
    .update(bytes).digest("hex");
}

function probeOriginal(path){
  const result=spawnSync("ffprobe",[
    "-v","error","-show_entries",
    "format=duration:stream=codec_name,codec_type,channels,sample_rate",
    "-of","json",path,
  ],{timeout:20000,encoding:"utf8",maxBuffer:256*1024});
  if(result.status!==0)throw Error("ffprobe_rejected_source_"+String(result.stderr).slice(0,160));
  const info=JSON.parse(result.stdout);
  const audio=info.streams?.filter(s=>s.codec_type==="audio")||[];
  const seconds=Number(info.format?.duration);
  if(audio.length!==1||audio[0].codec_name!=="mp3"||
    ![1,2].includes(audio[0].channels)||Number(audio[0].sample_rate)<22050||
    !Number.isFinite(seconds)||seconds<100||seconds>1800)
    throw Error("source_recording_invalid_codec_or_duration_"+JSON.stringify({seconds,streams:audio}));
  return {seconds,sampleRate:Number(audio[0].sample_rate),channels:audio[0].channels};
}

function sourceURL(entry){
  return "https://raw.githubusercontent.com/"+SOURCE_REPO+"/"+SOURCE_COMMIT+
    "/mp3/"+encodeURIComponent(entry.repositoryFilename);
}
function evidenceURL(entry){
  return "https://github.com/"+SOURCE_REPO+"/blob/"+SOURCE_COMMIT+
    "/mp3/"+encodeURIComponent(entry.repositoryFilename);
}

export async function acquireCuratedWave({dryRun=false}={}){
  const entries=validateAcquisitionManifest(source);
  mkdirSync(inbox,{recursive:true});
  const out=[];
  for(const entry of entries){
    const registry=JSON.parse(readFileSync(registryPath,"utf8"));
    if(registry.entries?.some(x=>x.id===entry.id)){
      const item=registry.entries.find(x=>x.id===entry.id);
      const publicPath=resolve(root,"public"+item.url);
      if(item.sourceType!=="reviewed_external_recording"||
         item.recordingLicense!=="CC-BY-4.0"||!existsSync(publicPath))
        throw Error("existing_import_provenance_invalid_"+entry.id);
      out.push({id:entry.id,alreadyImported:true});
      continue;
    }
    const response=await fetch(sourceURL(entry),{
      redirect:"follow",signal:AbortSignal.timeout(90000),
      headers:{"User-Agent":"HolisticHouse-Reviewed-Music-Acquisition/1.0"},
    });
    if(!response.ok)throw Error("source_download_failed_"+entry.id+"_"+response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length!==entry.sizeBytes||
       gitBlobId(bytes)!==entry.gitBlobSha)
      throw Error("source_bytes_differ_from_pinned_git_object_"+entry.id);
    const localPath=resolve(inbox,entry.sourceFile);
    writeFileSync(localPath,bytes,{flag:"w",mode:0o600});
    const sound=probeOriginal(localPath);
    const sha256=createHash("sha256").update(bytes).digest("hex");
    const reviewed={
      id:entry.id,sourceFile:entry.sourceFile,sha256,reviewed:true,
      reviewedOn:"2026-11-02",recordingLicense:"CC-BY-4.0",
      compositionRights:"licensed_for_commercial_sync",
      sourcePage:evidenceURL(entry),recordingLicenseEvidence:RIGHTS_PAGE,
      compositionLicenseEvidence:LICENSE_PAGE,
      creator:entry.creator,performer:entry.performer,title:entry.title,
      categories:entry.categories,moods:entry.moods,pace:entry.pace,
      voiceSafe:entry.voiceSafe,name:entry.name,
    };
    const manifestName=entry.id+".json";
    writeFileSync(resolve(inbox,manifestName),JSON.stringify(reviewed,null,2)+"\n",{mode:0o600});
    const result=importReviewedAudio({
      manifest:"output/audio-inbox/"+manifestName,dryRun,
    });
    out.push({id:entry.id,sourceSeconds:Math.round(sound.seconds),
      sourceSha256:sha256,...result});
  }
  return out;
}

const isMain=process.argv[1]&&resolve(process.argv[1])===
  fileURLToPath(import.meta.url);
if(isMain){
  acquireCuratedWave({dryRun:process.argv.includes("--dry-run")})
    .then(result=>console.log(JSON.stringify({imported:result},null,2)))
    .catch(error=>{console.error(error.message);process.exitCode=1});
}
