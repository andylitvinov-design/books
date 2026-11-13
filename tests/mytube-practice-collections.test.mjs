import test from "node:test";
import assert from "node:assert/strict";
import {originalPsiMasterPracticeMetadata,myTubePracticeCollectionIds,
  matchesMyTubePracticeCollection,listMyTubePracticeCollections,
  ORIGINAL_SUN_IDS,ORIGINAL_PLANET_IDS} from "../lib/video-discovery/mytube-practice-collections.mjs";
const approved=new Set([
  "lOkX_8TM-FA","DPdDGnU4DL8","1oshNCVzHR8","uN5BFjdKVvY","h8r_fIVWM0U",
  "ZYGjw0PtvdM","2GMLhPrEJ3s","8XN-EFpSt8M","owG8gBIQ2hU","3Lc38_-SqD0",
  "ziXmEWe3Dh0","ocks6JP2lD8","-volI7wYbl0","R1krHd3JRXc","6wNdBVoYt50",
]);
const item=id=>({kind:"video",youtubeId:id,sourceGroup:"psimaster-original-meditations",sourceApproved:true,curation:"verified"});
test("four real solar originals and four named planets come only from the 15 approved IDs",()=>{
  assert.equal(ORIGINAL_SUN_IDS.length,4);
  assert.equal(ORIGINAL_PLANET_IDS.length,4);
  for(const id of [...ORIGINAL_SUN_IDS,...ORIGINAL_PLANET_IDS]) assert.ok(approved.has(id),id);
  const collected=[...approved].flatMap(id=>myTubePracticeCollectionIds(item(id)));
  assert.equal(collected.length,15);
  assert.equal(collected.filter(id=>id==="sun").length,4);
  assert.equal(collected.filter(id=>id==="planets").length,4);
  assert.equal(collected.filter(id=>id==="golden").length,1);
  assert.equal(collected.filter(id=>id==="energy").length,6);
});
test("Sun, named planet recordings and Golden Temple money circle match real goal intent",()=>{
  for(const id of [...ORIGINAL_SUN_IDS,...ORIGINAL_PLANET_IDS,"ziXmEWe3Dh0"]){
    const tags=originalPsiMasterPracticeMetadata(id).topicTags;
    assert.ok(tags.includes("meaning")&&tags.includes("goals"),id);
  }
  for(const id of [...ORIGINAL_SUN_IDS,"ziXmEWe3Dh0"])
    assert.ok(originalPsiMasterPracticeMetadata(id).topicTags.includes("work"),id);
  assert.ok(originalPsiMasterPracticeMetadata("ziXmEWe3Dh0").topicTags.includes("money"));
  assert.ok(originalPsiMasterPracticeMetadata("-volI7wYbl0").topicTags.includes("relationships"));
  assert.equal(originalPsiMasterPracticeMetadata("ZYGjw0PtvdM").topicTags.includes("goals"),false);
});
test("collection membership requires eligible approved public original, not private or third-party",()=>{
  const first=item("lOkX_8TM-FA");
  assert.deepEqual(myTubePracticeCollectionIds(first),["sun"]);
  for(const wrong of [
    {...first,sourceApproved:false},{...first,curation:"candidate"},
    {...first,sourceGroup:"approved-meditations"},
    {...first,youtubeId:"fake"},
    {...first,youtubeId:"xxyyddeeff1"},
  ]) assert.deepEqual(myTubePracticeCollectionIds(wrong),[]);
  assert.equal(matchesMyTubePracticeCollection(first,"planets"),false);
  assert.equal(matchesMyTubePracticeCollection(first,"sun"),true);
  assert.equal(matchesMyTubePracticeCollection(first,"all"),true);
});
test("collection choices are unique, localized, relevant, and hidden when no verified items",()=>{
  const rows=[item("lOkX_8TM-FA"),item("lOkX_8TM-FA"),item("ziXmEWe3Dh0"),item("ZYGjw0PtvdM")];
  assert.deepEqual(listMyTubePracticeCollections(rows,"ru").map(x=>[x.id,x.count]),[
    ["sun",1],["golden",1],["energy",1],
  ]);
  assert.equal(listMyTubePracticeCollections(rows,"en")[0].label,"Sun meditations");
  assert.equal(listMyTubePracticeCollections([item("8XN-EFpSt8M")],"es")[0].label,"Meditaciones planetarias");
  assert.deepEqual(listMyTubePracticeCollections([item("xxyyddeeff1")]),[]);
  assert.deepEqual(listMyTubePracticeCollections([]),[]);
});
