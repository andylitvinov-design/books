import assert from "node:assert/strict";
import test from "node:test";
import {existsSync,readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {validateReviewedAudioMetadata} from "../scripts/import-reviewed-audio.mjs";

const valid=()=>({
  id:"curated-gentle-piano-01",sourceFile:"gentle-piano.wav",
  sha256:"a".repeat(64),reviewed:true,reviewedOn:"2026-11-01",
  recordingLicense:"CC-BY-4.0",compositionRights:"public_domain",
  sourcePage:"https://commons.wikimedia.org/wiki/File:Example.ogg",
  recordingLicenseEvidence:"https://commons.wikimedia.org/wiki/File:Example.ogg",
  creator:"Example contributor",performer:"Example performer",title:"Original musical recording",
  categories:["body","stress"],moods:["calm","focus"],pace:"slow",voiceSafe:true,
  name:{ru:"Нежное фортепиано",en:"Gentle piano",es:"Piano suave"}
});
test("explicit recording + composition rights, SHA and offline local source are mandatory",()=>{
  const row=validateReviewedAudioMetadata(valid());
  assert.equal(row.id,"curated-gentle-piano-01");
  assert.equal(row.recordingLicense,"CC-BY-4.0");
  assert.equal(row.recordingLicenseUrl,"https://creativecommons.org/licenses/by/4.0/");
  assert.equal(row.name.ru,"Нежное фортепиано");
  for(const change of [
    {recordingLicense:"pixabay-content-license"},
    {recordingLicense:"CC-BY-NC-4.0"},
    {recordingLicense:"all-rights-reserved"},
    {compositionRights:"unknown"},
    {reviewed:false},
    {recordingLicenseEvidence:""},
    {sourcePage:"http://example.com/song"},
    {sourceFile:"../../../../etc/passwd.mp3"},
    {sourceFile:"track.js"},
    {sourceFile:"some folder/file.wav"},
    {sha256:"not-a-real-hash"},
    {categories:["medical-diagnosis"]},
    {moods:["hypnosis"]},
    {pace:"fast"},
    {voiceSafe:"maybe"},
    {name:{ru:"Только RU"}}
  ])assert.throws(()=>validateReviewedAudioMetadata({...valid(),...change}));
});
test("composition-specific license proof is required for modern music",()=>{
  assert.throws(()=>validateReviewedAudioMetadata({...valid(),
    compositionRights:"licensed_for_commercial_sync"}),/composition_license_evidence_required/);
  const passed=validateReviewedAudioMetadata({...valid(),
    compositionRights:"licensed_for_commercial_sync",
    compositionLicenseEvidence:"https://commons.wikimedia.org/wiki/File:Example.ogg"});
  assert.equal(passed.compositionRights,"licensed_for_commercial_sync");
});
test("published curated entries are actual hashed, same-origin MP3s with attribution, not hypothetical imports",()=>{
  const data=JSON.parse(readFileSync(new URL("../data/video-catalog/curated-audio-imports.json",import.meta.url),"utf8"));
  assert.equal(data.version,"hh-curated-audio-imports-v1");
  assert.ok(Array.isArray(data.entries));
  const ids=new Set(),hashes=new Set();
  for(const item of data.entries){
    assert.ok(!ids.has(item.id));
    ids.add(item.id);
    assert.match(item.id,/^curated-[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(item.url,"/audio/mandala/curated/"+item.id+".mp3");
    assert.ok(["CC0-1.0","CC-BY-4.0","CC-BY-3.0","PDM-1.0"].includes(item.recordingLicense));
    assert.ok(item.sourcePage&&item.creator&&item.performer&&item.recordingLicenseEvidence);
    const path=new URL("../public"+item.url,import.meta.url);
    assert.ok(existsSync(path),item.id+" must never appear before actual MP3 is written");
    const bytes=readFileSync(path);
    assert.ok(bytes.byteLength>30000);
    const sha=createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha,item.audioSha256,item.id);
    assert.ok(!hashes.has(sha),"duplicate MP3 bytes");hashes.add(sha);
  }
});
test("new importer has no network, runtime calls or unchecked external license mirroring",()=>{
  const source=readFileSync(new URL("../scripts/import-reviewed-audio.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\bfetch\s*\(|\bhttps\.request\s*\(|\bhttp\.request\s*\(|\bexec\s*\(|shell\s*:\s*true/);
  assert.match(source,/sha256/);
  assert.match(source,/recording_not_reusable_standalone/);
  assert.match(source,/composition_license_not_cleared/);
  assert.match(source,/source_bytes_do_not_match_reviewed_sha256/);
});
