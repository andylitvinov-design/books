import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadActiveFilmPresets} from "../scripts/read-live-film-presets.mjs";
import {SUPPORTED_EXTRA_THEMES,validateFreeSceneBrief,STOCK_POLICIES} from "../lib/mandala/free-stock-sources.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("both live scenario catalogs remain audited, not just the extra JSON list",()=>{
 const full=loadActiveFilmPresets();
 assert.equal(full.presets.length,48);
 assert.equal(full.inlineCount,24);
 assert.equal(full.additionalCount,24);
 assert.equal(new Set(full.presets.map(p=>p.id)).size,48);
 assert.ok(SUPPORTED_EXTRA_THEMES.includes("money"));
});
test("importer accepts one genuine five-second source and never substitutes still frames",()=>{
 const body=read("scripts/import-free-stock-scene.mjs");
 assert.match(body,/single_source_requires_five_seconds_of_real_motion/);
 assert.match(body,/licensed_single_shot_edit/);
 assert.match(body,/sources\.length===1\?5:2\.5/);
 assert.match(body,/ffprobe/);
 assert.match(body,/libx264/);
 assert.doesNotMatch(body,/tpad=stop|loop=loop|screenshot.*video/i);
 const batch=read("scripts/import-scenario-video-batch.mjs");
 assert.match(batch,/allowSingleSource:true/);
 assert.match(batch,/loadActiveFilmPresets\(\)\.presets/);
 assert.match(batch,/duplicate_underlying_source_hash/);
});
test("candidate sources have reviewed CC BY pages but cannot be published before visual QC",()=>{
 const q=JSON.parse(read("data/video-catalog/dareful-verified-candidate-wave-20261101.json"));
 assert.equal(q.approvedForPublication,false);
 assert.equal(q.sources.length,4);
 const ids=new Set();
 for(const s of q.sources){
   assert.equal(s.visualReviewRequired,true);
   assert.ok(!ids.has(s.id));ids.add(s.id);
   assert.equal(s.sourcePage,"https://dareful.com/"+s.id+"/");
   assert.match(s.mediaUrl,/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/);
   assert.ok(s.durationSeconds>=5);
   assert.ok(s.suggestedNames.ru&&s.suggestedNames.en&&s.suggestedNames.es);
 }
 assert.equal(STOCK_POLICIES.dareful.license,q.licenseUrl);
});

test("each new goal-tree scene can be suggested for an exact visual beat, without becoming exportable", async()=>{
 const {resolveEditorialTarget}=await import("../scripts/import-scenario-video-batch.mjs");
 const {VIDEO_GOAL_SCENARIOS,VIDEO_GOAL_TOPICS}=await import("../lib/mandala/video-goal-taxonomy.mjs");
 const chosen=VIDEO_GOAL_SCENARIOS.find(row=>row.id==="work-support-s1")||VIDEO_GOAL_SCENARIOS[0];
 const topic=VIDEO_GOAL_TOPICS.find(row=>row.id===chosen.topicId);
 const linked=resolveEditorialTarget(chosen.id,topic.legacyVideoTheme);
 assert.equal(linked.kind,"unbound_goal_tree");
 assert.equal(linked.sourceStatus,"unbound");
 assert.deepEqual(linked.visualMotifs,chosen.visualMotifs);
 assert.equal(linked.visualMotifs.length,4);
 assert.throws(()=>resolveEditorialTarget(chosen.id,topic.legacyVideoTheme==="money"?"health":"money"),/cross_theme_target/);
 assert.throws(()=>resolveEditorialTarget("made-up-story","health"),/unknown_target/);
 const {loadActiveFilmPresets}=await import("../scripts/read-live-film-presets.mjs");
 const old=loadActiveFilmPresets().presets[0];
 assert.equal(resolveEditorialTarget(old.id,old.theme).kind,"legacy_montage");
 const source=read("scripts/import-scenario-video-batch.mjs");
 assert.match(source,/target_shot_1_to_4_required/);
 assert.match(source,/expected_visual_motif_not_reviewed/);
 assert.match(source,/candidate_only_not_bound/);
});
