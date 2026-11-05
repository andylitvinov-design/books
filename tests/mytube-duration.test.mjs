import test from "node:test";
import assert from "node:assert/strict";
import {myTubeDurationCounts,matchesMyTubeDuration,MYTUBE_STUDY_MIN_SECONDS} from "../lib/video-discovery/mytube-duration.mjs";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Shorts is strictly below 10 minutes; Study starts at exactly 10:00",()=>{
 assert.equal(MYTUBE_STUDY_MIN_SECONDS,600);
 for(const seconds of [1,60,599,599.99]){
  assert.equal(matchesMyTubeDuration(seconds,"shorts"),true);
  assert.equal(matchesMyTubeDuration(seconds,"study"),false);
 }
 for(const seconds of [600,601,3600,14400]){
  assert.equal(matchesMyTubeDuration(seconds,"shorts"),false);
  assert.equal(matchesMyTubeDuration(seconds,"study"),true);
 }
});
test("unknown duration stays in All, never fabricated in Shorts or Study",()=>{
 for(const seconds of [undefined,null,0,-1,NaN,Infinity,"9m"]){
  assert.equal(matchesMyTubeDuration(seconds,"all"),true);
  assert.equal(matchesMyTubeDuration(seconds,"shorts"),false);
  assert.equal(matchesMyTubeDuration(seconds,"study"),false);
 }
 assert.equal(matchesMyTubeDuration(500,"invalid"),false);
 assert.deepEqual(myTubeDurationCounts([
  {durationVerifiedSeconds:599},{durationVerifiedSeconds:600},
  {durationVerifiedSeconds:1200},{durationVerifiedSeconds:null},{}
 ]),{all:5,shorts:1,study:2,unknown:2});
});
test("MyTube only: swipeable direction rail, additional filters and duration buttons",()=>{
 const c=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 assert.match(c,/data-mytube-category-rail/);
 assert.match(c,/data-mytube-categories role="group"/);
 assert.match(c,/data-mytube-filter-toggle/);
 assert.match(c,/aria-controls="mytube-refine-controls mytube-more-controls"/);
 assert.match(c,/data-mytube-duration-mode=\{mode\}/);
 assert.match(c,/matchesMyTubeDuration\(item\.durationVerifiedSeconds,durationMode\)/);
 assert.match(c,/durationMode!=="all"\?t\.durationUnknown/);
 assert.match(css,/\.mytube \.mytubeCategoryRail\{[^}]*overflow-x:auto/);
 assert.match(css,/touch-action:pan-x/);
 assert.match(css,/\.mytube \.mytubeDurationTabs button\[aria-pressed=true\]/);
 assert.match(c,/variant!=="mytube"&&<>/);
});
