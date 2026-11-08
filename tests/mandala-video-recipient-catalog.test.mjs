import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import originalMotion from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {planMyTubeCategory,verifiedCategorySource,verifiedSceneAspect} from "../lib/mandala/category-video-storyboard.mjs";
import {
  RECIPIENT_VIDEO_KIND_IDS,getRecipientVideoKind,listRecipientVideoKinds,
  listRecipientVideoOccasions,buildRecipientVideoBrief,
  classifyRecipientVideoWish,buildRecipientVideoCaptions
} from "../lib/mandala/video-recipient-catalog.mjs";

const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");

test("self catalogue remains canonical while others have three distinct categories",()=>{
  assert.deepEqual(RECIPIENT_VIDEO_KIND_IDS,["gift","greeting","presentation"]);
  assert.match(director,/const videoGoalCategories=\[/);
  assert.match(director,/videoAudience==="self"\?<[^\n]*>/);
  assert.match(director,/data-auto-video-category=\{item.id\}/);
  assert.match(director,/data-auto-video-audience=\{mode\}/);
  assert.match(director,/data-auto-video-recipient-kind=\{item.id\}/);
  assert.match(director,/data-auto-video-recipient-occasion=\{item.id\}/);
  assert.match(director,/getRecipientVideoKind\(recipientKindId\)/);
  assert.match(director,/buildRecipientVideoCaptions\(/);
  assert.match(director,/onApply\(chosen.id,length/);
  assert.match(studio,/<MandalaAutoVideoDirector/);
  assert.match(css,/\.recipientKinds\{/);
});
test("every category has four unique occasions, localized for RU EN ES",()=>{
  for(const locale of ["ru","en","es"]){
    const kinds=listRecipientVideoKinds(locale);
    assert.equal(kinds.length,3);
    for(const kind of kinds){
      const occasions=listRecipientVideoOccasions(kind.id,locale);
      assert.equal(occasions.length,4);
      assert.equal(new Set(occasions.map(x=>x.id)).size,4);
      assert.ok(kind.label&&kind.description);
      for(const option of occasions)assert.ok(option.label);
    }
  }
});
test("other-person selection produces a brief and four renderable captions, not made-up media",()=>{
  for(const locale of ["ru","en","es"]){
    for(const kindId of RECIPIENT_VIDEO_KIND_IDS){
      const meta=getRecipientVideoKind(kindId);
      assert.ok(["relationships","energy","money"].includes(meta.theme));
      assert.ok(["love-relationships","energy-confidence","goals-money"].includes(meta.sourceCategoryId));
      const first=listRecipientVideoOccasions(kindId,locale)[0];
      const brief=buildRecipientVideoBrief({kindId,occasionId:first.id,wish:"A short note",locale});
      assert.ok(brief.includes(first.label)&&brief.includes("A short note"));
      const captions=buildRecipientVideoCaptions({kindId,occasionId:first.id,wish:"For you",locale});
      assert.equal(captions.length,4);
      assert.equal(captions[0],first.label);
      assert.equal(captions[1],"For you");
      assert.ok(captions.every(Boolean));
    }
  }
});
test("local intent inference is bounded and does not turn ordinary self goals into gifts",()=>{
  assert.deepEqual(classifyRecipientVideoWish("Поздравь сестру с днём рождения"),
    {kindId:"greeting",occasionId:"birthday",confidence:"keyword"});
  assert.deepEqual(classifyRecipientVideoWish("Подарок другу"),
    {kindId:"gift",occasionId:"friendship",confidence:"keyword"});
  assert.deepEqual(classifyRecipientVideoWish("Presentation of my project"),
    {kindId:"presentation",occasionId:"project",confidence:"keyword"});
  assert.equal(classifyRecipientVideoWish("хочу больше уверенности"),null);
  assert.deepEqual(buildRecipientVideoCaptions({kindId:"unknown"}),["","","",""]);
});

test("recipient greeting selects 9:16 real verified sources, never invents 16:9",()=>{
  // 684 original masters are physically portrait; no 16:9 crop is certified.
  assert.ok(originalMotion.scenes.length>=684);
  const plan=planMyTubeCategory({categoryId:"energy-confidence",aspect:"portrait",
    durationSeconds:30,locale:"ru",scenes:originalMotion.scenes});
  assert.equal(plan.ok,true,plan.status);
  assert.equal(plan.shots.length,6);
  assert.equal(new Set(plan.shots.map(shot=>shot.sourceMasterKey)).size,6);
  const byId=new Map(originalMotion.scenes.map(scene=>[scene.id,scene]));
  for(const shot of plan.shots){
    const source=verifiedCategorySource(byId.get(shot.sceneId));
    assert.ok(source);
    assert.ok(verifiedSceneAspect(source,"portrait"));
    assert.equal(verifiedSceneAspect(source,"landscape"),false);
    assert.ok(shot.durationMs<=source.durationSeconds*1000);
  }
  const unsupported=planMyTubeCategory({categoryId:"energy-confidence",
    aspect:"landscape",durationSeconds:30,scenes:originalMotion.scenes});
  assert.equal(unsupported.ok,false);
  assert.match(unsupported.status,/INSUFFICIENT/);
  assert.match(director,/onAspectChange\?\.\("portrait"\)/);
  assert.match(director,/selfAspectRef\.current=aspect/);
  assert.match(director,/onAspectChange\?\.\(selfAspectRef\.current\)/);
  assert.match(studio,/onAspectChange=\{next=>/);
  assert.match(director,/data-video-recipient-format-note/);
});
