import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createScenarioAcquisitionQueue} from "../lib/mandala/scenario-media-acquisition.mjs";
import {loadActiveFilmPresets} from "../scripts/read-live-film-presets.mjs";
import {auditScenarioMedia,planDedicatedScenarioMedia,isUsableFilm}
  from "../lib/mandala/scenario-media-coverage.mjs";

const film=(id,theme="energy")=>({
 id,theme,collection:"film-collection-v2",status:"approved",media:"licensed_mp4",
 video:"/videos/holistic-house/film-collection-v2/"+id+".mp4",
 poster:"/videos/holistic-house/film-collection-v2/"+id+".jpg",
 rightsReference:{kind:"existing_approved_first_party_master"},
 tags:["light"],categories:[theme],motifs:["light"]
});
const scenario=(id,clips)=>({id,theme:"energy",clips,focusTags:["light"]});
test("current real library has no fake/unknown clip in its four-shot scenarios",()=>{
 const p=loadActiveFilmPresets();
 const s=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url)));
 const audit=auditScenarioMedia(p.presets,s.scenes);
 assert.equal(audit.scenarios,48);
 assert.equal(audit.requiredSlots,audit.scenarios*4);
 assert.deepEqual(audit.errors,[]);
 assert.ok(audit.approvedScenes>=44);
});
test("different IDs within each scenario are NOT enough to meet global uniqueness",()=>{
 const scenes=["a","b","c","d"].map(id=>film(id));
 const presets=[scenario("first",["a","b","c","d"]),
   scenario("second",["a","b","c","d"])];
 const audit=auditScenarioMedia(presets,scenes);
 assert.equal(audit.fourClipsPerScenarioReady,true);
 assert.equal(audit.dedicatedScenesReady,false);
 assert.equal(audit.minimumNewDedicatedScenes,4);
 assert.equal(audit.repeatedClips.length,4);
 const plan=planDedicatedScenarioMedia(presets,scenes);
 assert.equal(plan.ready,false);
 assert.equal(plan.missingSlots.length,4);
});
test("new distinct same-theme masters are fairly assigned to every scenario",()=>{
 const scenes=["a","b","c","d","e","f","g","h"].map(id=>film(id));
 const presets=[scenario("first",["a","b","c","d"]),
   scenario("second",["a","b","c","d"])];
 const plan=planDedicatedScenarioMedia(presets,scenes);
 assert.equal(plan.ready,true);
 const clips=Object.values(plan.assignments).flat();
 assert.equal(clips.length,8);
 assert.equal(new Set(clips).size,8);
 assert.deepEqual(plan.missingSlots,[]);
});
test("unlicensed URLs, missing rights or rejected footage cannot become approved clips",()=>{
 assert.equal(isUsableFilm({...film("a"),status:"pending"}),false);
 assert.equal(isUsableFilm({...film("a"),video:"https://third-party.example/a.mp4"}),false);
 assert.equal(isUsableFilm({...film("a"),rightsReference:{kind:"unknown"}}),false);
 const audit=auditScenarioMedia([scenario("first",["a","b","c","d"])],
   ["a","b","c","d"].map(id=>id==="b"?{...film(id),status:"pending"}:film(id)));
 assert.ok(audit.errors.some(e=>e.type==="missing_or_unapproved_clip"));
 assert.throws(()=>planDedicatedScenarioMedia([scenario("first",["a","b","c","d"])],
   ["a","b","c","d"].map(id=>id==="b"?{...film(id),status:"pending"}:film(id))));
});
test("invalid scenario with duplicate stages fails even if source is licensed",()=>{
 const s=["a","b","c","d"].map(id=>film(id));
 const audit=auditScenarioMedia([scenario("repeat",["a","a","b","c"])],s);
 assert.ok(audit.errors.some(e=>e.type==="scenario_requires_four_distinct_clips"));
});

test("editorial queue enumerates the exact independent scenes still required",()=>{
 const presets=loadActiveFilmPresets().presets;
 const scenes=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url))).scenes;
 const q=createScenarioAcquisitionQueue(presets,scenes);
 assert.equal(q.expectedNewMp4,148);
 assert.equal(q.slots.length,148);
 assert.equal(new Set(q.slots.map(row=>row.id)).size,148);
 for(const row of q.slots){
   assert.equal(row.importStatus,"not_imported");
   assert.equal(row.rightsStatus,"needs_individual_editorial_review");
   assert.equal(row.sourceUrl,null);
   assert.equal(row.newIndependentVideoRequired,true);
 }
});
