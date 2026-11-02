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
  assert.match(importer,/"-t","96"/);
  assert.match(importer,/"-b:a","256k"/);
  assert.match(importer,/durationSeconds:96/);
});

test("if imported, physically verify five licensed MP3s: SHA-256, 96 sec, 256 kbps and stereo",()=>{
  const entries=published.entries.filter(x=>x.id.startsWith("curated-"));
  if(process.env.HH_CURATED_AUDIO_EXPECT_PUBLISHED!=="1"){
    assert.ok(entries.length===0||entries.length===5,"only complete batch publication");
    return;
  }
  assert.equal(entries.length,5);
  const ids=new Set(sources.entries.map(x=>x.id));
  for(const t of entries){
    assert.ok(ids.has(t.id));
    assert.equal(t.recordingLicense,"CC-BY-4.0");
    assert.equal(t.compositionRights,"licensed_for_commercial_sync");
    assert.equal(t.creator,"Tanner Helland");
    assert.equal(t.performer,"Tanner Helland");
    assert.equal(t.durationSeconds,96);
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
    assert.ok(Number(info.format.duration)>95&&Number(info.format.duration)<98);
    assert.ok(Number(info.format.bit_rate)>=240000,"encoded bitrate below expected");
  }
});
