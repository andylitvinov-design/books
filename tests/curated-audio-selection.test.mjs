import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync,existsSync} from "node:fs";
import {curatedAudioTracks,recommendCuratedAudio} from "../lib/mandala/curated-audio-recommendations.mjs";
const root=new URL("../",import.meta.url);
const manifest=JSON.parse(readFileSync(new URL("data/video-catalog/curated-audio-imports.json",root),"utf8"));

test("curated audio has real same-origin MP3 files, rights metadata and creator attribution",()=>{
  assert.equal(curatedAudioTracks.length,manifest.entries.length);
  assert.equal(new Set(curatedAudioTracks.map(x=>x.id)).size,curatedAudioTracks.length);
  for(const audio of curatedAudioTracks){
    assert.equal(audio.kind,"melody");
    assert.ok(audio.themes.length&&audio.moods.length);
    assert.equal(audio.rights.sourceType,"reviewed_external_recording");
    assert.match(audio.rights.license,/^(CC0-1\.0|CC-BY-3\.0|CC-BY-4\.0|PDM-1\.0)$/);
    assert.ok(audio.rights.creator&&audio.rights.performer);
    assert.match(audio.rights.sourcePage,/^https:\/\//);
    const file=new URL("public/audio/mandala/curated/"+audio.id+".mp3",root);
    assert.ok(existsSync(file),audio.id+" is not a physically published MP3");
    for(const lang of ["ru","en","es"]){
      assert.ok(audio.name[lang],audio.id+" name "+lang);
      assert.match(audio.detail[lang],new RegExp(audio.rights.license.replace(/[-]/g,"\\-")));
    }
  }
});
test("curated picks are optional and match theme, filters and narration safety",()=>{
  const recommended=recommendCuratedAudio({theme:"health",kind:"melody",mood:"calm",voiceFriendly:true});
  assert.ok(recommended.every(x=>x.themes.includes("health")||x.themes.length>0));
  assert.ok(recommended.every(x=>x.moods.includes("calm")&&x.voiceSafe));
  assert.deepEqual(recommendCuratedAudio({kind:"nature"}),[]);
});
test("reviewed MP3s use the existing native Video Studio player and video-export audio graph",()=>{
  const studio=readFileSync(new URL("components/mandala-free-video-studio.tsx",root),"utf8");
  const engine=readFileSync(new URL("lib/mandala/local-video-music.ts",root),"utf8");
  assert.match(studio,/recommendCuratedAudio\(/);
  assert.match(studio,/curatedAudioTracks/);
  assert.match(studio,/data-reviewed-music-license/);
  assert.match(studio,/reviewedRecording\.rights\.licenseUrl/);
  assert.match(engine,/isCuratedAudioPreset/);
  assert.match(engine,/\/audio\/mandala\/curated\//);
  assert.match(engine,/startPresetMixAudio\(/);
  assert.doesNotMatch(studio,/api\.higgsfield\.ai|api\.heygen\.com|api\.kling\.ai/i);
});
