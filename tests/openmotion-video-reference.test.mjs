import assert from "node:assert/strict";
import test from "node:test";
import {
  OPENMOTION_REFERENCE_COUNT,OPENMOTION_GUIDE_COUNT,OPENMOTION_REFERENCE_COLLECTIONS,
  getOpenMotionGuideIds,getOpenMotionReference,listOpenMotionReferences,
  planOpenMotionReferenceSelection,
} from "../lib/mandala/openmotion-reference.mjs";

test("OpenMotion catalog indexes external references without bundling their media",()=>{
  assert.equal(OPENMOTION_REFERENCE_COUNT,891);
  assert.equal(OPENMOTION_GUIDE_COUNT,287);
  assert.equal(getOpenMotionGuideIds().length,287);
  assert.equal(new Set(getOpenMotionGuideIds()).size,287);
  assert.deepEqual([...OPENMOTION_REFERENCE_COLLECTIONS],
    ["all","reference","moment","example","block","component"]);
  const all=listOpenMotionReferences({limit:40});
  assert.equal(all.total,891);
  assert.equal(all.items.length,40);
  assert.equal(new Set(all.items.map(item=>item.id)).size,40);
  const categories={reference:42,moment:393,example:8,block:210,component:238};
  for(const [collection,count] of Object.entries(categories)){
    assert.equal(listOpenMotionReferences({collection,limit:1}).total,count);
  }
});
test("search, filtering and pagination are bounded",()=>{
  assert.equal(listOpenMotionReferences({query:"Pond"}).items[0].id,
    "hf-reference-jake-pond");
  assert.equal(listOpenMotionReferences({collection:"invalid"}).total,891);
  assert.equal(listOpenMotionReferences({query:"nothing_matches_this_123"}).total,0);
  assert.equal(listOpenMotionReferences({limit:100}).items.length,18);
  assert.equal(listOpenMotionReferences({offset:-100,limit:2}).items.length,2);
  assert.equal(listOpenMotionReferences({offset:900}).items.length,0);
});
test("adapter never imports protected content or calls a cloud model",()=>{
  const original=getOpenMotionReference("hf-reference-jake-pond");
  assert.ok(original);
  assert.ok(original.preview?.startsWith("https://static.heygen.ai/"));
  assert.ok(original.title.includes("Pond"));
  for(const locale of ["en","ru","es"]){
    const plan=planOpenMotionReferenceSelection(original.id,locale);
    assert.equal(plan.mode,"original_local_adaptation");
    assert.equal(plan.fidelityClaim,false);
    assert.equal(plan.providerRequired,false);
    assert.match(plan.templateId,/^[a-z-]+$/);
    assert.ok(["landscape","portrait","square"].includes(plan.aspect));
    assert.ok([20,30,60].includes(plan.durationSeconds));
    assert.ok(["slow","dynamic"].includes(plan.motion));
    assert.equal("preview" in plan,false);
    assert.equal("video" in plan,false);
    assert.equal("html" in plan,false);
  }
  assert.equal(planOpenMotionReferenceSelection("nonexistent"),null);
  assert.equal(planOpenMotionReferenceSelection(original.id,"wrong"),null);
});
test("original video URLs are external links only, from a limited allowlist",()=>{
  const page=listOpenMotionReferences({limit:40});
  for(const entry of page.items){
    if(entry.preview!==null){
      assert.match(entry.preview,/^https:\/\/(?:static\.heygen\.ai|r\.open-design\.ai)\//);
    }
  }
});
