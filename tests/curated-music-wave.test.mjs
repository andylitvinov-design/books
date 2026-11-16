import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {validateAcquisitionManifest,gitBlobId} from "../scripts/acquire-curated-music-wave.mjs";

const root=new URL("../",import.meta.url);
const sources=JSON.parse(readFileSync(new URL("data/video-catalog/curated-music-source-wave-v1.json",root),"utf8"));
const published=JSON.parse(readFileSync(new URL("data/video-catalog/curated-audio-imports.json",root),"utf8"));

test("five exact original composer-owned CC BY 4.0 sources, fixed git commit, never game remixes",()=>{
  const tracks=validateAcquisitionManifest(sources);
  assert.equal(tracks.length,5);
  assert.deepEqual(new Set(tracks.map(t=>t.id)).size,5);
  assert.match(sources.sourceCommit,/^[a-f0-9]{40}$/);
  assert.equal(sources.sourceRepository,"tannerhelland/free-music");
  assert.equal(sources.license,"CC-BY-4.0");
  assert.match(sources.rightsEvidence,/\/blob\/[a-f0-9]{40}\/README\.md$/);
  assert.match(sources.licenseEvidence,/\/blob\/[a-f0-9]{40}\/LICENSE\.md$/);
  for(const t of tracks){
    assert.equal(t.creator,"Tanner Helland");
    assert.equal(t.performer,"Tanner Helland");
    assert.doesNotMatch(t.repositoryFilename,/final fantasy|castlevania|remix|aerith|eragon|duet|dragonfyre/i);
    assert.ok(t.sizeBytes>1000000);
    assert.equal(t.gitBlobSha.length,40);
    for(const l of ["en","ru","es"])assert.ok(t.name[l].length>1);
  }
});

test("remote master git object hashing is exact rather than a filename-only trust check",()=>{
  const data=Buffer.from("a real test object");
  const expected=createHash("sha1").update(Buffer.from("blob "+data.length+"\0")).update(data).digest("hex");
  assert.equal(gitBlobId(data),expected);
  assert.notEqual(gitBlobId(Buffer.from("different test object")),expected);
});

test("source provenance cannot be changed to download arbitrary external audio",()=>{
  for(const bad of [
    {...sources,sourceRepository:"example.com/evil"},
    {...sources,sourceCommit:"main"},
    {...sources,license:"CC-BY-NC-4.0"},
    {...sources,entries:[...sources.entries,{...sources.entries[0],id:"fake-sixth"}]},
    {...sources,entries:sources.entries.map((t,i)=>i===0?{...t,repositoryFilename:"../../secrets.mp3"}:t)},
    {...sources,entries:sources.entries.map((t,i)=>i===0?{...t,creator:"Unknown"}:t)},
  ])assert.throws(()=>validateAcquisitionManifest(bad));
});

test("lossy source is not misrepresented as a newly recorded original or a paid provider",()=>{
  const source=readFileSync(new URL("scripts/acquire-curated-music-wave.mjs",root),"utf8");
  assert.match(source,/gitBlobId\(bytes\)!==entry\.gitBlobSha/);
  assert.match(source,/source_bytes_differ_from_pinned_git_object/);
  assert.match(source,/probeOriginal\(localPath\)/);
  assert.match(source,/compositionRights:"licensed_for_commercial_sync"/);
  assert.doesNotMatch(source,/shell\s*:\s*true|api\.higgsfield|api\.openai|api\.elevenlabs/i);
  const importer=readFileSync(new URL("scripts/import-reviewed-audio.mjs",root),"utf8");
  assert.match(importer,/"-t",String\(plan\.seconds\)/);
  assert.match(importer,/"-b:a","256k"/);
  assert.match(importer,/durationSeconds:Math\.round\(actualSeconds\*1000\)\/1000/);
});

test("if imported, physically verify five licensed MP3s: SHA-256, actual duration, 256 kbps and stereo",()=>{
  const entries=published.entries.filter(x=>x.id.startsWith("curated-"));
  // A source PR containing this published registry must prove its physical
  // MP3 assets on every CI run; an optional env var must never hide missing,
  // substituted or silent releases.
  assert.equal(entries.length,5,"release requires all five reviewed physical MP3 masters");
  const ids=new Set(sources.entries.map(x=>x.id));
  for(const t of entries){
    assert.ok(ids.has(t.id));
    assert.equal(t.recordingLicense,"CC-BY-4.0");
    assert.equal(t.compositionRights,"licensed_for_commercial_sync");
    assert.equal(t.creator,"Tanner Helland");
    assert.equal(t.performer,"Tanner Helland");
    assert.ok(t.durationSeconds>=60&&t.durationSeconds<=96.2);
    assert.match(t.sourcePage,/\/blob\/[a-f0-9]{40}\/mp3\//);
    assert.equal(t.url,"/audio/mandala/curated/"+t.id+".mp3");
    const path=new URL("public"+t.url,root);
    assert.ok(existsSync(path),"physical MP3 missing "+t.id);
    const digest=createHash("sha256").update(readFileSync(path)).digest("hex");
    assert.equal(t.audioSha256,digest);
    const p=spawnSync("ffprobe",["-v","error","-show_entries",
      "format=duration,bit_rate:stream=codec_name,channels,sample_rate",
      "-of","json",path.pathname],{encoding:"utf8",timeout:20000});
    assert.equal(p.status,0,p.stderr);
    const info=JSON.parse(p.stdout);
    assert.equal(info.streams[0].codec_name,"mp3");
    assert.equal(Number(info.streams[0].sample_rate),44100);
    assert.equal(info.streams[0].channels,2);
    assert.ok(Math.abs(Number(info.format.duration)-t.durationSeconds)<0.05,"catalog duration matches encoded file");
    assert.ok(Number(info.format.bit_rate)>=240000,"encoded bitrate below expected");
    // File existence/codec alone can mask silent or corrupt releases. Decode
    // real samples locally; no provider, patient data or paid audio service.
    const pcm=spawnSync("ffmpeg",[
      "-v","error","-i",path.pathname,"-vn","-ac","1","-ar","8000",
      "-f","s16le","-"
    ],{encoding:null,timeout:20000,maxBuffer:3*1024*1024});
    assert.equal(pcm.status,0,pcm.stderr?.toString()||"MP3 decode failed");
    assert.ok(pcm.stdout.length>8000*2*45,"audio is too short or unreadable: "+t.id);
    let sum=0,peak=0;
    const samples=pcm.stdout.length>>1;
    for(let i=0;i+1<pcm.stdout.length;i+=2){
      const v=pcm.stdout.readInt16LE(i)/32768;
      sum+=v*v;peak=Math.max(peak,Math.abs(v));
    }
    const rms=Math.sqrt(sum/samples);
    assert.ok(rms>0.003,"real MP3 is near-silent: "+t.id);
    assert.ok(peak<0.9999,"real MP3 contains full-scale clipping: "+t.id);
  }
});

test('short licensed recordings keep their physical duration and fade before the actual end',async()=>{
  const {planReviewedAudioClip}=await import('../scripts/import-reviewed-audio.mjs');
  assert.deepEqual(planReviewedAudioClip(89.8),{seconds:89.55,fadeStart:88.75});
  assert.deepEqual(planReviewedAudioClip(125),{seconds:96,fadeStart:95.2});
  for(const value of [0,0.5,NaN,Infinity,-1])assert.throws(()=>planReviewedAudioClip(value));
});

test('duration probe reads real encoded audio and fails closed for missing files',async()=>{
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {probeAudioDuration}=await import('../scripts/import-reviewed-audio.mjs');
  const dir=mkdtempSync(join(tmpdir(),'hh-curated-duration-'));
  try{
    const file=join(dir,'tone.mp3');
    const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-codec:a','libmp3lame',file],{encoding:'utf8'});
    assert.equal(made.status,0,made.stderr);
    const seconds=probeAudioDuration(file);
    assert.ok(seconds>=2&&seconds<2.2,'ffprobe reads real MP3 duration');
    assert.throws(()=>probeAudioDuration(join(dir,'missing.mp3')));
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('curated rights review cannot be reused for an unreviewed recording in the same repository',()=>{
  const altered={...sources,entries:sources.entries.map((track,index)=>index===0?
    {...track,repositoryFilename:'Unreviewed recording.mp3',gitBlobSha:'a'.repeat(40)}:track)};
  assert.throws(()=>validateAcquisitionManifest(altered));
});

test('source acquisition rejects a real recording below its minimum duration',async()=>{
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {probeOriginal}=await import('../scripts/acquire-curated-music-wave.mjs');
  const dir=mkdtempSync(join(tmpdir(),'hh-curated-source-'));
  try{
    const file=join(dir,'short.mp3');
    const made=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-codec:a','libmp3lame',file],{encoding:'utf8'});
    assert.equal(made.status,0,made.stderr);
    assert.throws(()=>probeOriginal(file),/source_recording_invalid_codec_or_duration/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
