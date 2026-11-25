import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateWave2,auditWave2} from "../scripts/acquire-curated-music-wave-v2.mjs";

const source=JSON.parse(readFileSync(new URL("../data/video-catalog/curated-music-source-wave-v2.json",import.meta.url),"utf8"));

test("20 original composer MIDI scores are byte-exact and every MP3 source is pinned, unapproved",()=>{
 const candidates=validateWave2(source);
 assert.equal(candidates.length,20);
 assert.equal(new Set(candidates.map(e=>e.id)).size,20);
 assert.equal(new Set(candidates.map(e=>e.sourceMp3GitSha)).size,20);
 assert.equal(new Set(candidates.map(e=>e.sourceMidiGitSha)).size,20);
 assert.ok(candidates.every(e=>e.voiceSafe===false&&e.sourceStatus==="candidate_pending_listening"));
 assert.ok(candidates.every(e=>!/(aerith|eragon|final fantasy|castlevania|white knight|bloody tears)/i.test(e.title)));
 const audit=auditWave2();
 assert.equal(audit.newScoreAssets,20);
 assert.equal(audit.newRecordedCandidates+audit.liveMp3sFromWave2,20);
 assert.ok(audit.sourceMidiBytes>400000);
 assert.ok(audit.sourceMp3Bytes>90000000);
});

test("unapproved records and fake licence/licence provenance fail closed",()=>{
 const cases=[
  m=>{m.editorialStatus="published";},
  m=>{m.recordingLicense="CC-BY-NC-4.0";},
  m=>{m.sourceCommit="main";},
  m=>{m.entries[0].sourceStatus="published";},
  m=>{m.entries[0].sourceMidiGitSha="0".repeat(39);},
  m=>{m.entries[0].sourceMp3GitSha=m.entries[1].sourceMp3GitSha;},
  m=>{m.entries[0].localMidiPath="../../../../../unsafe.mid";},
  m=>{m.entries[0].voiceSafe=true;}
 ];
 for(const modify of cases){
  const bad=structuredClone(source);
  modify(bad);
  assert.throws(()=>validateWave2(bad),/curated_wave2_/);
 }
});
