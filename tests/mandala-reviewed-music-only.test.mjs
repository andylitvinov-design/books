import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {curatedAudioTracks,recommendCuratedAudio} from "../lib/mandala/curated-audio-recommendations.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const director=read("components/mandala-auto-video-director.tsx");
const manifest=JSON.parse(read("data/video-catalog/curated-audio-imports.json"));

test("new video music catalog contains real physical approved MP3 masters",()=>{
  assert.ok(curatedAudioTracks.length>=5,"a first wave of recorded tracks must exist");
  assert.equal(curatedAudioTracks.length,manifest.entries.length);
  assert.equal(new Set(manifest.entries.map(row=>row.audioSha256)).size,manifest.entries.length);
  for(const row of manifest.entries){
    assert.equal(row.sourceType,"reviewed_external_recording");
    assert.match(row.id,/^curated-[a-z0-9-]+$/);
    assert.match(row.audioSha256,/^[a-f0-9]{64}$/);
    assert.match(row.recordingLicense,/^(CC0-1\.0|CC-BY-3\.0|CC-BY-4\.0|PDM-1\.0)$/);
    assert.ok(["public_domain","licensed_for_commercial_sync"].includes(row.compositionRights));
    assert.ok(existsSync(new URL("../public"+row.url,import.meta.url)),row.id+" missing master");
    for(const lang of ["en","ru","es"])assert.ok(row.name[lang]);
  }
  for(const theme of ["money","relationships","energy","goals","health","life"]){
    assert.ok(recommendCuratedAudio({theme,kind:"melody"}).length>=4,theme);
  }
});

test("Studio picker, featured rail, scene auto music and Director only expose approved recordings",()=>{
  assert.match(studio,/const audioCandidates=\[\.\.\.curatedMatches\]/);
  assert.match(studio,/const featuredMelodies=recommendCuratedAudio\(/);
  assert.match(studio,/const recommendedAudioId = curatedMatches\[0\]\?\.id/);
  assert.match(studio,/const track=recommendCuratedAudio\(\{theme:audioTheme,kind:"melody"\}\)\[0\]/);
  assert.match(studio,/const matched=curatedAudioTracks\.find\(track=>track\.id===id/);
  assert.match(studio,/if\(choice!=="none"&&!curatedAudioTracks\.some\(track=>track\.id===choice\)\)return/);
  assert.match(studio,/if\(!curatedAudioTracks\.some\(track=>track\.id===music\)\)return/);
  assert.match(director,/const melodyOptions=recommendCuratedAudio\(\{theme,kind:"melody"\}\)\.slice\(0,4\)/);
  assert.match(director,/data-auto-video-melody/);
  assert.doesNotMatch(studio,/const matchingScenarioTracks=|const catalogueScenarioMatches=|const baseAudioMatches=/);
  assert.doesNotMatch(studio,/recommendedAudioId\|\|"ocean"/);
  assert.doesNotMatch(director,/const dedicatedMelodies=/);
});

test("historic generated scores remain resolvable without becoming new music choices",()=>{
  assert.match(studio,/const availableAudioCandidates=\[\.\.\.scenarioTracks,\.\.\.filmScenarioTracks,/);
  assert.match(studio,/\.\.\.curatedAudioTracks,\.\.\.libraryScenarioTracks,\.\.\.classicalAudioTracks,\.\.\.mandalaAudioTracks\]/);
  assert.match(studio,/const audioCandidates=\[\.\.\.curatedMatches\]/);
  assert.match(studio,/kind==="presets"/);
  assert.match(studio,/const next=attachedPresetIds\.includes\(choice\)/);
  assert.match(studio,/\.slice\(-3\)/);
});
