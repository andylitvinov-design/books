import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  curatedAudioTracks,curatedAudioMatchesCategory,inferVideoAudioCategory
} from "../lib/mandala/curated-audio-recommendations.mjs";

test("compact categories strictly select licensed recordings that match each filter",()=>{
  const categories=["all","wellbeing","focus","calm","energy","love"];
  const groups=Object.fromEntries(categories.map(category=>[category,
    curatedAudioTracks.filter(track=>curatedAudioMatchesCategory(track,category))]));
  assert.equal(groups.all.length,curatedAudioTracks.length);
  for(const category of categories.slice(1))
    assert.ok(groups[category].length>0,category+" has approved music");
  assert.ok(groups.focus.every(track=>
    track.moods.includes("focus")&&track.themes.some(t=>t==="money"||t==="goals")));
  assert.ok(groups.calm.every(track=>track.moods.includes("calm")));
  assert.ok(groups.love.every(track=>track.themes.includes("relationships")));
  assert.ok(groups.wellbeing.every(track=>track.themes.includes("health")));
  assert.ok(groups.energy.every(track=>track.themes.includes("energy")&&track.moods.includes("uplift")));
  assert.notDeepEqual(groups.focus.map(t=>t.id),groups.love.map(t=>t.id));
  assert.notDeepEqual(groups.calm.map(t=>t.id),groups.energy.map(t=>t.id));
  assert.equal(curatedAudioMatchesCategory(groups.all[0],"unknown"),false);
  assert.equal(curatedAudioMatchesCategory(null,"all"),false);
});

test("approved concept and user goal determine the initial category in RU/EN/ES",()=>{
  for(const [theme,expected] of Object.entries({
    health:"wellbeing",money:"focus",goals:"focus",life:"calm",
    energy:"energy",relationships:"love"
  }))assert.equal(inferVideoAudioCategory({theme}),expected,theme);
  assert.equal(inferVideoAudioCategory({theme:"energy",wish:"Хочу расслабиться и отдохнуть"}),"calm");
  assert.equal(inferVideoAudioCategory({theme:"life",concept:{goal:"Present my business project"}}),"focus");
  assert.equal(inferVideoAudioCategory({theme:"goals",concept:{goal:"Amor y confianza"}}),"love");
  assert.equal(inferVideoAudioCategory({theme:"money",concept:{semanticPurpose:"celebration"}}),"energy");
  assert.equal(inferVideoAudioCategory({theme:"health",concept:{emotionalProgram:["Deep calm"]}}),"calm");
});

test("compact cards and Browse share strict music filtering while existing selections persist",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(source,/const audioCategory=audioCategoryOverride\|\|inferVideoAudioCategory\(\{theme,concept:approvedVideoConcept,wish\}\)/);
  assert.match(source,/\.filter\(track=>curatedAudioMatchesCategory\(track,audioCategory\)\)/);
  assert.match(source,/\{filteredAudio\.slice\(0,5\)\.map\(\(track,index\)=>\{/);
  assert.match(source,/\{filteredAudio\.slice\(0,showAllAudio\?filteredAudio.length:5\)\.map\(track=>\{/);
  assert.match(source,/setAudioCategoryOverride\(item.id\)/);
  assert.match(source,/\},\[theme,approvedVideoConcept\?\.signature\]\)/);
  assert.match(source,/setAudioAuto\(false\)/,"manual music selection is explicit");
  assert.match(source,/const availableAudioCandidates=\[\.\.\.scenarioTracks/,"keep attached tracks available after switching filters");
  assert.match(source,/toggleQuickMusic\(id\)/);
  assert.match(source,/playQuickTrack\(id\)/);
});
