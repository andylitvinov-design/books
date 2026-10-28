import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROFILE_RESEARCH_AXES } from "../lib/profile/profile-scale-selection.js";
import {
 AXIS_REFS, LIFE_AREAS, SERVICE_AXIS_LINKS, ORIGINAL_VIDEO_AXIS_LINKS,
 verifiedAxisEvidence, sourceBandPosition, publishedAxisOffers, rankAxisOffers,
} from "../lib/holistic-support/axis-offer-matcher.mjs";

const sample = (override = {}) => ({
 key:"energy",dimensionKey:"weekly.energy",resultId:"verified-result",
 rawValue:3,min:0,max:10,mode:"directional",sourceTitle:"Weekly Pulse",
 measuredAt:"2026-10-25T10:00:00Z",...override,
});
const offer = (axis, id = "video:example") => ({
 id,kind:"video",title:"Public example",href:"/en/holistic-support",
 status:"published",free:true,axisLinks:[{ref:axis,strength:3}],
});
test("all 34 registered facets remain canonical; no parallel diagnostic scale registry",()=>{
 const refs = Object.entries(PROFILE_RESEARCH_AXES).flatMap(([topic,rows])=>
   rows.map(row=>topic+"::"+row.id));
 assert.equal(refs.length,34);
 assert.deepEqual([...Object.keys(AXIS_REFS)].sort(),refs.sort());
 assert.equal(Object.keys(LIFE_AREAS).length,4);
 const testOffers=publishedAxisOffers({locale:"en"}).filter(x=>x.kind==="test");
 assert.equal(testOffers.length,4);
 const covered=new Set(testOffers.flatMap(x=>x.axisLinks.map(a=>a.ref)));
 assert.deepEqual([...covered].sort(),refs.sort());
});
test("score provenance and raw values are validated; no below-average fiction",()=>{
 assert.deepEqual(verifiedAxisEvidence([sample({resultId:""})]),[]);
 assert.deepEqual(verifiedAxisEvidence([sample({rawValue:50})]),[]);
 assert.deepEqual(verifiedAxisEvidence([sample({measuredAt:"bad"})]),[]);
 const valid=verifiedAxisEvidence([sample(),sample()]);
 assert.equal(valid.length,1);
 assert.equal(valid[0].axisRef,"recovery::energy");
 assert.equal(valid[0].rawValue,3);
 const measurements=sample({definitionKey:"hh-weekly-pulse",definitionVersion:"v1",instrumentLocale:"en"});
 assert.equal(sourceBandPosition(measurements,null),"unknown");
 assert.equal(sourceBandPosition(measurements,{reviewed:true,dimensionKey:"weekly.energy",definitionKey:"hh-weekly-pulse",definitionVersion:"v1",instrumentLocale:"ru",lower:3,upper:7}),"unknown");
 const sourceBand={reviewed:true,dimensionKey:"weekly.energy",definitionKey:"hh-weekly-pulse",definitionVersion:"v1",instrumentLocale:"en",lower:4,upper:7};
 assert.equal(sourceBandPosition(measurements,sourceBand),"below_reference");
 assert.equal(sourceBandPosition({...measurements,rawValue:5},sourceBand),"within_reference");
 assert.equal(sourceBandPosition({...measurements,rawValue:9},sourceBand),"above_reference");
});
test("financial dimensions cannot be faked from a generic resource scale",()=>{
 assert.equal(verifiedAxisEvidence([sample({key:"resource",dimensionKey:"resource.self_support"})])[0].axisRef,"support::resources");
 assert.equal(verifiedAxisEvidence([sample({key:"resource",dimensionKey:"resources.financial_wellbeing.cfpb_short"})])[0].axisRef,"money::financial_wellbeing");
 assert.equal(verifiedAxisEvidence([sample({key:"stress",dimensionKey:"state.money_pressure.difficulty"})])[0].axisRef,"money::money_pressure");
});
test("explicit chosen axis controls ranking; source values do not imply urgency",()=>{
 const videos=[offer("recovery::energy"),offer("emotions::stress","video:stress")];
 assert.deepEqual(rankAxisOffers({offers:videos}),[]);
 const a=rankAxisOffers({chosenAxis:"recovery::energy",offers:videos,measurements:[sample({rawValue:2})]});
 const b=rankAxisOffers({chosenAxis:"recovery::energy",offers:videos,measurements:[sample({rawValue:9})]});
 assert.equal(a.length,1);
 assert.equal(a[0].id,"video:example");
 assert.equal(a[0].matchLevel,"primary");
 assert.equal(a[0].score,b[0].score);
 assert.equal(a[0].hasSourceMeasurement,true);
 assert.ok(!JSON.stringify(a).includes("rawValue"));
});
test("two selected axes reward real intersections, with no cross-test averaging",()=>{
 const same=[{...offer("recovery::energy","video:both"),
   axisLinks:[{ref:"recovery::energy",strength:3},{ref:"recovery::sleep",strength:2}]},
   offer("recovery::energy","video:only")];
 const hits=rankAxisOffers({chosenAxes:["recovery::energy","recovery::sleep"],offers:same});
 assert.equal(hits[0].id,"video:both");
 assert.deepEqual(hits[0].matchedAxes.map(x=>x.ref),["recovery::energy","recovery::sleep"]);
 assert.ok(hits[0].score>hits[1].score);
 const explicit=rankAxisOffers({chosenAxis:"recovery::energy",chosenAxes:["recovery::sleep"],
    offers:same,goalRatings:{"recovery::energy":{current:2,desired:8}}});
 const invalid=rankAxisOffers({chosenAxis:"recovery::energy",chosenAxes:["recovery::sleep"],
    offers:same,goalRatings:{"recovery::energy":{current:-4,desired:50}}});
 assert.ok(explicit[0].score>invalid[0].score);
 assert.equal(rankAxisOffers({chosenAxes:[],offers:same}).length,0);
});
test("published catalogue is re-used; no guessed paid checkouts or unapproved source videos",()=>{
 const services=[
  {id:"business",title:"Business",href:"/ru/services/business-consulting"},
  {id:"made-up",title:"Fake",href:"/ru/services/made-up"},
  {id:"dao",title:"Bad URL",href:"https://evil.example.test"},
 ];
 const videos=[
  {youtubeId:"HqfixazXqRY",title:"Flight",sourceLanguage:"en"},
  {youtubeId:"aaaaaaaaaaa",title:"Unreviewed external",sourceLanguage:"en"},
  {id:"bbbbbbbbbbb",title:"Original RU",sourceLanguage:"ru",topics:["energy"]},
 ];
 const rows=publishedAxisOffers({locale:"ru",services,videos});
 assert.ok(rows.find(x=>x.id==="service:business"));
 assert.ok(!rows.some(x=>x.id==="service:made-up" || x.id==="service:dao" || x.id==="youtube:aaaaaaaaaaa"));
 assert.ok(rows.find(x=>x.id==="youtube:HqfixazXqRY" && x.originalLanguage==="en"));
 assert.ok(rows.find(x=>x.id==="youtube:bbbbbbbbbbb" && x.originalLanguage==="ru"));
 assert.ok(rows.every(x=>x.href.startsWith("/ru/") || x.href.startsWith("https://www.youtube.com/watch?v=")));
 assert.equal(Object.keys(SERVICE_AXIS_LINKS).length,5);
 assert.equal(Object.keys(ORIGINAL_VIDEO_AXIS_LINKS).length,4);
});
test("private sexual wellbeing cannot drive paid offers, media or automated enrolment",()=>{
 const all=[offer("connection::sexual_wellbeing"),
   { ...offer("connection::sexual_wellbeing","service:alchemy"),kind:"service"},
   {...offer("connection::sexual_wellbeing","test:relationship"),kind:"test"}];
 const results=rankAxisOffers({chosenAxis:"connection::sexual_wellbeing",offers:all});
 assert.deepEqual(results.map(x=>x.kind),["test"]);
 assert.deepEqual(rankAxisOffers({chosenAxis:"nonsense",offers:all}),[]);
 assert.deepEqual(rankAxisOffers({chosenAxis:"recovery::energy",offers:[{...offer("recovery::energy"),status:"candidate"}]}),[]);
});
test("client integration is opt-in, local only, responsive, and reused from completed tests",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const ui=read("components/app/personal-axis-matches.jsx");
 const css=read("components/app/personal-axis-matches.module.css");
 const myTests=read("components/app/my-tests-dashboard.jsx");
 const portrait=read("components/app/portrait-recommendations.jsx");
 assert.match(ui,/data-personal-axis-matching/);
 assert.match(ui,/PROFILE_RESEARCH_AXES/);
 assert.match(ui,/data-axis-context/);
 assert.match(ui,/data-axis-secondary-controls/);
 assert.match(ui,/data-axis-personal-gap/);
 assert.match(ui,/chosenAxes:selectedAxes/);
 assert.match(ui,/data-axis-offer-kind/);
 assert.match(ui,/sourceLanguage:"en"/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(myTests,/buildPortraitRecommendations\(results \|\| \[\], locale\)/);
 assert.match(myTests,/<PersonalAxisMatches measurements=\{axisModel\?\.measurements \|\| \[\]\}/);
 assert.match(portrait,/<PersonalAxisMatches measurements=\{model\.measurements\}/);
 assert.ok(!ui.includes("localStorage") && !ui.includes("fetch(") && !ui.includes("analytics"));
});
