import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadActiveFilmPresets} from "../scripts/read-live-film-presets.mjs";
import {recommendScenarioMelodies} from "../lib/mandala/scenario-soundtracks.mjs";
test("all 48 public scenarios offer four distinct localized real WAV melodies",()=>{
 const {presets}=loadActiveFilmPresets();assert.equal(presets.length,48);
 for(const p of presets){
   const songs=recommendScenarioMelodies(p);
   assert.equal(songs.length,4,p.id);
   assert.equal(new Set(songs.map(s=>s.id)).size,4,p.id);
   assert.ok(songs[0].themes.includes(p.theme),p.id);
   for(const song of songs)for(const lang of ["ru","en","es"])
     assert.ok(song.name[lang]&&song.detail[lang]);
 }
});
test("voice-friendly choices retain four unique and safe melodies",()=>{
 const songs=recommendScenarioMelodies({id:"calm-recharge",theme:"energy"},{voiceFriendly:true});
 assert.equal(songs.length,4);assert.ok(songs.every(s=>s.voiceSafe&&s.kind==="melody"));
});
test("video UI buttons attach selected WAV through existing composer",()=>{
 const d=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 const s=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(d,/data-auto-video-melody-options/);
 assert.match(d,/onPickAudio\?\.\(track\.id\)/);
 assert.match(s,/onPickAudio=\{id=>/);
 assert.match(s,/setAttachedAudio\(\{kind:"preset",id:chosenId\}\)/);
});
