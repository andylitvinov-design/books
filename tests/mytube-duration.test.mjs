import test from "node:test";
import assert from "node:assert/strict";
import {classifyMyTubeFormat,matchesMyTubeFormat,myTubeFormatCounts}
  from "../lib/video-discovery/mytube-duration.mjs";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("semantic format shelves use content type and source, not a 10-minute cutoff",()=>{
 const cards=[
  {sourceGroup:"site-introduction",title:"Welcome",durationVerifiedSeconds:null},
  {sourceGroup:"tantra-reiki",title:"Tantra Reiki Practice",durationVerifiedSeconds:null},
  {sourceGroup:"videos/greek-mysteries-dionysus",seriesOrder:1,title:"Dionysus",durationVerifiedSeconds:90},
  {sourceGroup:"owner-library",title:"Introduction to Reiki",durationVerifiedSeconds:null},
  {sourceGroup:"owner-library",title:"Deep course on boundaries",durationVerifiedSeconds:60},
  {sourceGroup:"approved-meditations",contentType:"soft_meditation",title:"Guided meditation"},
  {sourceGroup:"owner-library",title:"Untitled approved educational video",durationVerifiedSeconds:null},
 ];
 assert.deepEqual(cards.map(classifyMyTubeFormat),["shorts","study","study","shorts","study","study","study"]);
 assert.deepEqual(myTubeFormatCounts(cards),{all:7,shorts:2,study:5});
 assert.equal(matchesMyTubeFormat(cards[1],"study"),true);
 assert.equal(matchesMyTubeFormat(cards[1],"shorts"),false);
 assert.equal(matchesMyTubeFormat(cards[1],"courses"),true);
 assert.equal(matchesMyTubeFormat(cards[4],"courses"),true);
 assert.equal(matchesMyTubeFormat(cards[0],"courses"),false);
 assert.equal(matchesMyTubeFormat(cards[0],"all"),true);
 assert.equal(matchesMyTubeFormat(cards[1],"nonsense"),false);
});
test("format is an editorial selection; short lesson time and long intro time never overrule it",()=>{
 assert.equal(classifyMyTubeFormat({mytubeFormat:"shorts",title:"Welcome",durationVerifiedSeconds:7200}),"shorts");
 assert.equal(classifyMyTubeFormat({mytubeFormat:"study",title:"Reiki lesson",durationVerifiedSeconds:30}),"study");
 assert.equal(classifyMyTubeFormat({title:"Practice",seriesId:"series"}),"study");
});
test("MyTube segmented format filters keep unknown-duration videos visible",()=>{
 const view=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 const hub=read("components/library-hub.tsx");
 const feed=read("components/library-feed.tsx");
 assert.match(view,/data-mytube-category-rail/);
 assert.match(view,/data-mytube-categories role="group"/);
 assert.match(view,/data-mytube-filter-toggle/);
 assert.match(view,/data-mytube-subcategory-row/);
 assert.match(view,/data-mytube-subcategory-rail/);
 assert.match(view,/data-mytube-language-control/);
 assert.match(view,/data-mytube-audio-language=\{value\}/);
 assert.match(view,/data-mytube-duration/);
 assert.doesNotMatch(view,/preferredSubcategoryIds/);
 assert.match(view,/mytubeCategoryId!=="all"&&<div className=\{styles\.mytubeSubcategoryRail\}/);
 assert.match(view,/data-mytube-format-tabs/);
 assert.match(view,/data-mytube-format-mode=\{mode\}/);
 assert.match(view,/matchesMyTubeShelf\(item,formatMode\)/);
 assert.match(view,/onChange=\{event=>setDurationRange\(event.target.value\)\}/);
 assert.doesNotMatch(view,/matchesMyTubeDuration\(item\.durationVerifiedSeconds/);
 assert.doesNotMatch(view,/durationUnknown|under 10 min|10 min or longer/);
 assert.match(css,/\.mytube \.mytubeFormatTabs\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.mytube \.mytubeCategoryRail\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css.slice(css.indexOf("/* MyTube-only compact five-choice editorial taxonomy.")),/overflow-x:auto/);
 assert.match(hub,/mytubeFormat:classifyMyTubeFormat\(video\)/);
 assert.match(feed,/item\.mytubeFormat === "study"/);
 assert.match(view,/variant!=="mytube"&&<>/);
});
