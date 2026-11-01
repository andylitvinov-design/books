import assert from "node:assert/strict";
import test from "node:test";
import {existsSync,readFileSync} from "node:fs";
import {
  SCENARIO_AUDIO_REGISTRY,SCENARIO_AUDIO_VARIANTS,isScenarioAudioId,
} from "../lib/mandala/scenario-audio-catalog.mjs";
import {
  GOAL_TREE_AUDIO_TOTALS,goalTreeAudioCoverage,
  getGoalTreeAudioChoices,recommendedGoalAudio,isKnownGoalAudioScenario,
} from "../lib/mandala/goal-tree-audio-playlists.mjs";

const manifest=JSON.parse(readFileSync(new URL("../data/video-catalog/goal-tree-audio-playlists-v1.json",import.meta.url),"utf8"));
const categories=["body","business","energy","love","stress"];

test("goal taxonomy coverage: all 120 current editorial stories get four different REAL first-party MP3 masters",()=>{
  assert.deepEqual(manifest.categoryOrder,categories);
  assert.equal(manifest.assignments.length,120);
  assert.deepEqual(GOAL_TREE_AUDIO_TOTALS,manifest.totals);
  assert.deepEqual(manifest.totals,{categories:5,topics:30,scenarios:120,audioPlacements:480,physicalDistinctAudioFiles:192});
  assert.equal(SCENARIO_AUDIO_REGISTRY.length,48);
  assert.equal(SCENARIO_AUDIO_VARIANTS.length,4);
  const seenScenarios=new Set(),seenTopic=new Map(),seenCategory=new Map(),all=new Set();
  for(const row of manifest.assignments){
    assert.ok(!seenScenarios.has(row.scenarioId),row.scenarioId);
    seenScenarios.add(row.scenarioId);
    assert.ok(categories.includes(row.categoryId));
    assert.equal(isKnownGoalAudioScenario(row.scenarioId),true);
    const choices=getGoalTreeAudioChoices(row.scenarioId);
    assert.equal(choices.length,4,row.scenarioId);
    assert.equal(new Set(choices.map(x=>x.id)).size,4,row.scenarioId);
    const perTopic=seenTopic.get(row.topicId)||new Set();
    const perCategory=seenCategory.get(row.categoryId)||new Set();
    for(const track of choices){
      assert.ok(isScenarioAudioId(track.id),"do not invent static audio URL: "+track.id);
      assert.ok(!perTopic.has(track.id),"within-topic repeat "+row.topicId);
      assert.ok(!perCategory.has(track.id),"within-category repeat "+row.categoryId);
      assert.equal(track.kind,"melody");
      assert.equal(track.durationSeconds,32);
      assert.equal(track.rights.license,"first_party_original");
      assert.equal(track.mediaUrl,"/audio/mandala/scenarios/"+track.id+".mp3");
      assert.equal(track.goalScenarioId,row.scenarioId);
      for(const locale of ["ru","en","es"])assert.ok(track.name[locale]?.includes(row.label[locale]),locale+" "+row.scenarioId);
      perTopic.add(track.id);perCategory.add(track.id);all.add(track.id);
    }
    seenTopic.set(row.topicId,perTopic);
    seenCategory.set(row.categoryId,perCategory);
  }
  assert.equal(seenScenarios.size,120);
  assert.equal(seenTopic.size,30);
  assert.ok([...seenTopic.values()].every(set=>set.size===16),"each topic's 4 stories use 16 separate audio masters");
  assert.ok([...seenCategory.values()].every(set=>set.size===96),"no recording repeats within one category");
  assert.equal(all.size,192,"cross-category reuse avoids 480 unnecessary MP3 masters");
  assert.deepEqual(getGoalTreeAudioChoices("fake-scenario"),[]);
  assert.equal(recommendedGoalAudio("fake-scenario"),null);
});

test("localized goal-tree soundtrack playlist is usable without a new renderer or paid service",()=>{
  const item=manifest.assignments[0];
  for(const locale of ["ru","en","es"]){
    const playback=recommendedGoalAudio(item.scenarioId,locale);
    assert.ok(playback);
    assert.equal(playback.scenarioId,item.scenarioId);
    assert.equal(playback.selected,item.audioIds[0]);
    assert.equal(playback.choices.length,4);
    assert.equal(playback.finalVideoReady,false,"unbound visual scenarios are not executable videos");
    assert.ok(playback.choices.every(x=>x.url.startsWith("/audio/mandala/scenarios/")));
    assert.ok(playback.choices.every(x=>x.name&&x.detail&&x.rights));
  }
  const coverage=goalTreeAudioCoverage();
  assert.equal(coverage.scenarios,120);
  assert.equal(coverage.audioPlacements,480);
  assert.equal(coverage.physicalDistinctFiles,192);
  assert.deepEqual(coverage.failed,[]);
  assert.equal(coverage.pendingVideoBinding,true);
  for(const category of categories){
    assert.equal(coverage.categories[category].scenarios,24);
    assert.equal(coverage.categories[category].audioPlacements,96);
    assert.equal(coverage.categories[category].uniqueFiles,96);
  }
});

test("canonical #2949 taxonomy is present and all 120 audio scenario IDs match exactly",()=>{
  const paths=categories.map(category=>new URL("../data/video-catalog/video-goal-taxonomy-"+category+"-v1.json",import.meta.url));
  assert.ok(paths.every(existsSync),"all five canonical production taxonomy files are required");
  const canonical=paths.flatMap(path=>JSON.parse(readFileSync(path,"utf8")).topics.flatMap(t=>t.scenarios.map(s=>s.id)));
  assert.equal(canonical.length,120);
  assert.deepEqual(canonical.slice().sort(),manifest.assignments.map(x=>x.scenarioId).sort());
});

test("compiled MP3s share one stable URL with the existing native Video Studio",()=>{
  const source=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  const builder=readFileSync(new URL("../scripts/generate-scenario-melodies.mjs",import.meta.url),"utf8");
  assert.match(source,/\/audio\/mandala\/scenarios\//);
  assert.match(builder,/buildScenarioMusic/);
  // Source file paths are audited in specialist CI after the generator step.
  const generated=new URL("../public/audio/mandala/scenarios",import.meta.url);
  if(existsSync(generated)){
    for(const id of new Set(manifest.assignments.flatMap(x=>x.audioIds))){
      const path=new URL("../public/audio/mandala/scenarios/"+id+".mp3",import.meta.url);
      assert.ok(existsSync(path),"missing actual prebuilt MP3 "+id);
    }
  }
});
