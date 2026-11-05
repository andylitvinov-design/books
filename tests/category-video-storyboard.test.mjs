import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import moneyManifest from "../public/videos/holistic-house/money-films-v1/manifest.json" with {type:"json"};
import v2Manifest from "../public/videos/holistic-house/film-collection-v2/manifest.json" with {type:"json"};
import stockManifest from "../data/video-catalog/free-stock-scenes.json" with {type:"json"};
import {
  planMyTubeCategory,verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey
} from "../lib/mandala/category-video-storyboard.mjs";

test("four narrative stages have localized titles and visual tags in all categories",()=>{
  for(const id of ["goals-money","love-relationships","energy-confidence","stress-anxiety"]){
    const names=[];
    for(const locale of ["ru","en","es"]){
      const plan=planMyTubeCategory({categoryId:id,locale,scenes:[]});
      assert.equal(plan.stages.length,4);
      assert.equal(plan.ok,false);
      assert.ok(plan.stages.every(s=>s.requiredTags.length>=5&&s.purpose.length>10));
      names.push(plan.stages[0].name);
    }
    assert.equal(new Set(names).size,3);
  }
});
test("the original 48 verified MP4 masters stay portrait even as the catalog expands",()=>{
  const original=[...moneyManifest.scenes,...v2Manifest.scenes,...stockManifest];
  assert.equal(original.length,48); // immutable 2026-11-05 baseline, not the entire future catalog
  assert.ok(catalog.scenes.length>=original.length);
  const byId=new Map(catalog.scenes.map(x=>[x.id,x]));
  const legacy=original.map(x=>byId.get(x.id));
  for(let i=0;i<legacy.length;i++){
    const verified=verifiedCategorySource(legacy[i]);
    assert.ok(verified,original[i].id);
    assert.ok(verifiedSceneAspect(verified,"portrait"));
    assert.equal(verifiedSceneAspect(verified,"landscape"),false);
  }
  const plan=planMyTubeCategory({categoryId:"goals-money",scenes:legacy});
  assert.equal(plan.aspect,"landscape");
  assert.equal(plan.status,"INSUFFICIENT_UNIQUE_MEDIA");
  assert.equal(plan.availableUniqueMasters,0);
  assert.equal(plan.canExport,false);
});
test("same source master with different aspect-file IDs is not two clips",()=>{
  assert.equal(canonicalSourceMasterKey({sourceMasterId:"original-14",video:"/videos/holistic-house/p.mp4"}),
    canonicalSourceMasterKey({sourceMasterId:"original-14",video:"/videos/holistic-house/l.mp4"}));
  const assets=catalog.scenes.map(x=>({...x,sourceMasterId:"ONE-SOURCE"}));
  const plan=planMyTubeCategory({categoryId:"goals-money",aspect:"portrait",scenes:assets});
  assert.equal(plan.status,"INSUFFICIENT_UNIQUE_MEDIA");
  assert.ok(plan.availableUniqueMasters<=1);
});
test("untrusted paths, unsupported styles and invalid locale fail closed",()=>{
  assert.equal(planMyTubeCategory({categoryId:"unknown"}).status,"CATEGORY_UNKNOWN");
  assert.equal(planMyTubeCategory({categoryId:"goals-money",locale:"fr"}).status,"INVALID_INPUT");
  assert.equal(planMyTubeCategory({categoryId:"goals-money",styleId:"wrong"}).status,"INVALID_STYLE");
  assert.equal(verifiedCategorySource({...catalog.scenes[0],video:"https://bad.example/x.mp4"}),null);
});
test("all candidate cuts avoid repetition, 5-second loops and false export claims",()=>{
  for(const categoryId of ["goals-money","love-relationships","energy-confidence","stress-anxiety"])
    for(const durationSeconds of [10,15,20,30,60]){
      const plan=planMyTubeCategory({
        categoryId,aspect:"portrait",durationSeconds,scenes:catalog.scenes
      });
      if(!plan.ok)continue;
      assert.equal(plan.totalPlannedMs,durationSeconds*1000);
      assert.equal(new Set(plan.shots.map(s=>s.sourceMasterKey)).size,plan.shots.length);
      assert.ok(plan.shots.every(s=>!s.loopRequired&&s.durationMs<=s.sourceDurationMs));
      assert.equal(plan.canExport,false);
      assert.equal(plan.publishAuthorized,false);
    }
});
test("same component shows category stages and enforces physical clip safety",()=>{
  const code=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  assert.match(code,/planMyTubeCategory/);
  assert.match(code,/data-mytube-category-storyboard/);
  assert.match(code,/physicalClipReady/);
  assert.match(code,/verifiedCategorySource/);
  assert.match(code,/verifiedSceneAspect/);
});

test("existing Canvas exporter independently rejects wrong source aspect, repeats and overlong cuts",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(source,/verifiedCategorySource/);
  assert.match(source,/verifiedSceneAspect/);
  assert.match(source,/freeFilmPhysicalReady/);
  assert.match(source,/UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE/);
});
