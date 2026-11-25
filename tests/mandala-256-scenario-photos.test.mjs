import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import source from "../data/video-catalog/mytube-story-photo-snapshot-v1.json" with {type:"json"};
import taxonomy from "../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import {STORY_SCENARIO_PHOTOS,STORY_PHOTO_BY_ID,
  MYTUBE_SCENARIO_PHOTO_COVERAGE,MYTUBE_SCENARIO_PHOTO_SUMMARY,
  getMyTubeScenarioPhotos,isTrustedStoryPhoto} from "../lib/mandala/story-photo-library.mjs";

test("all 256 canonical stories have six distinct, source-checked photos",()=>{
 const ids=taxonomy.categories.flatMap(category=>category.subcategories.flatMap(sub=>
  sub.topics.flatMap(topic=>topic.scenarios.map(scenario=>scenario.id))));
 assert.equal(ids.length,256);
 assert.equal(new Set(ids).size,256);
 assert.equal(MYTUBE_SCENARIO_PHOTO_SUMMARY.scenarios,256);
 assert.equal(MYTUBE_SCENARIO_PHOTO_SUMMARY.photos,117);
 assert.equal(MYTUBE_SCENARIO_PHOTO_SUMMARY.links,1536);
 assert.equal(Object.keys(MYTUBE_SCENARIO_PHOTO_COVERAGE).length,256);
 assert.equal(STORY_SCENARIO_PHOTOS.length,117);
 assert.equal(new Set(STORY_SCENARIO_PHOTOS.map(photo=>photo.upstreamSrc)).size,117);
 for(const id of ids){
  const meta=MYTUBE_SCENARIO_PHOTO_COVERAGE[id],photos=getMyTubeScenarioPhotos(id);
  assert.ok(meta,id);
  assert.equal(photos.length,6,id);
  assert.deepEqual([...new Set(meta.sceneNos)].sort(),[1,2,3,4],id);
  assert.equal(new Set(meta.photoIds).size,6,id);
  assert.equal(new Set(photos.map(photo=>photo.upstreamSrc)).size,6,id);
  assert.ok(photos.every(photo=>isTrustedStoryPhoto(photo)&&photo.autoUseEligible===false&&
   photo.src==="/api/video/story-photo/"+photo.id),id);
 }
 assert.deepEqual(getMyTubeScenarioPhotos("unlisted-video-s1"),[]);
 assert.deepEqual(getMyTubeScenarioPhotos("../private"),[]);
});

test("the published snapshot is restricted to pre-reviewed Pexels source IDs",()=>{
 assert.equal(source.photos.length,117);
 assert.equal(source.scenarios.length,256);
 for(const photo of source.photos){
  assert.match(photo.photoId,/^pexels-[1-9][0-9]+$/);
  const number=photo.photoId.slice("pexels-".length);
  assert.equal(photo.upstreamSrc,
   `https://images.pexels.com/photos/${number}/pexels-photo-${number}.jpeg?auto=compress&cs=tinysrgb&w=1280`);
  assert.equal(photo.licenseUrl,"https://www.pexels.com/license/");
  assert.match(photo.sourcePage,/^https:\/\/www\.pexels\.com\/photo\//);
  assert.ok(STORY_PHOTO_BY_ID.has(photo.photoId));
 }
});

test("MyTube photo CTA reuses the existing Story proxy and local Canvas renderer",()=>{
 const discover=readFileSync(new URL("../components/video-discovery.tsx",import.meta.url),"utf8");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const proxy=readFileSync(new URL("../app/api/video/story-photo/[id]/route.ts",import.meta.url),"utf8");
 assert.match(discover,/data-mytube-scenario-photos/);
 assert.match(discover,/photoScenario=/);
 assert.match(studio,/getMyTubeScenarioPhotos\(chosen\)/);
 assert.match(studio,/applyAutoFilm\(preset.id,30/);
 assert.match(proxy,/STORY_PHOTO_BY_ID\.get\(id\)/);
 assert.match(proxy,/await result\.arrayBuffer\(\)/);
 assert.match(studio,/await image\.decode\(\)/);
 assert.match(studio,/image\.naturalWidth<600/);
});
