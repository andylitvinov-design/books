import test from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {
  METHOD_KINDS,METHOD_TAG_FIELDS,normalizeMethodRecord,buildMethodCatalog,
  inferRequestSemantics,rankMethodCatalog,rankVerifiedSuggestions,
} from "../lib/holistic-support/semantic-method-catalog.mjs";

const method = (id,kind,concept,{locale="ru",cost="free",depth=1,duration=3,status="available",...rest}={}) => ({
  id,kind,title:"Published "+id,href:"/"+locale+"/client/tests",
  sourcePublished:true,rightsCleared:true,editorialReviewed:true,safetyApproved:true,
  tags:{problem:[concept],goal:[],state:[],language:[locale],durationMinutes:duration,
    depth,cost:{kind:cost},availability:{status}},...rest,
});
test("one common schema contains exactly the eight owner-approved dimensions",()=>{
  assert.deepEqual(METHOD_TAG_FIELDS,[
    "problem","goal","state","language","durationMinutes","depth","cost","availability",
  ]);
  for(const kind of ["test","practice","video","koan","specialist","course"])
    assert.ok(METHOD_KINDS.includes(kind),kind);
});
test("all six methods share one validator and no second database",()=>{
  const sources={
    tests:[method("test:one","test","stress")],
    practices:[method("practice:one","practice","stress")],
    videos:[method("video:one","video","stress")],
    koans:[method("koan:one","koan","stress")],
    specialists:[method("specialist:one","specialist","stress")],
    courses:[method("course:one","course","stress")],
  };
  const actual=buildMethodCatalog(sources,{locale:"ru"});
  assert.equal(actual.length,6);
  assert.equal(new Set(actual.map(x=>x.kind)).size,6);
  for(const item of actual) assert.deepEqual(Object.keys(item.tags),METHOD_TAG_FIELDS);
});
test("unpublished, rights-pending, unreviewed, unsafe and unknown access never recommend",()=>{
  for(const key of ["sourcePublished","rightsCleared","editorialReviewed","safetyApproved"]){
    assert.equal(normalizeMethodRecord(method("test:bad","test","stress",{[key]:false}),{locale:"ru"}),null,key);
  }
  assert.equal(normalizeMethodRecord(method("test:inactive","test","stress",{tags:{
    ...method("test:source","test","stress").tags,availability:{status:"unverified"}
  }}),{locale:"ru"}),null);
  assert.equal(normalizeMethodRecord(method("test:external","test","stress",{href:"https://evil.example/steal"}),{locale:"ru"}),null);
});
test("one user language does not magically translate a recording",()=>{
  const original=method("video:ru","video","stress");
  assert.equal(normalizeMethodRecord(original,{locale:"en"}),null);
  assert.ok(normalizeMethodRecord(original,{locale:"ru"}));
});
test("RU/EN/ES paraphrases reach the same confidence theme without literal keywords",()=>{
  const examples=[
    ["ru","Меня осуждают на работе"],
    ["en","I fear being judged by colleagues"],
    ["es","Me da vergüenza hablar en público"],
  ];
  for(const [locale,message] of examples){
    assert.ok(inferRequestSemantics({message}).includes("confidence"),locale);
    const c=method("test:"+locale,"test","confidence",{locale});
    const ranked=rankMethodCatalog({catalog:[c],message,locale});
    assert.equal(ranked.length,1,locale);
  }
});
test("specific request outranks unrelated generic content, no false second match",()=>{
  const options=[method("test:money","test","money"),method("test:confidence","test","confidence")];
  assert.deepEqual(rankMethodCatalog({catalog:options,message:"Боюсь критики",locale:"ru"}).map(x=>x.id),["test:confidence"]);
});
test("unknown duration never passes explicit maximum, unknown price never passes free-only",()=>{
  assert.deepEqual(rankMethodCatalog({catalog:[method("test:long","test","stress",{duration:null})],
    message:"Тревога",locale:"ru",maxDurationMinutes:5}),[]);
  assert.deepEqual(rankMethodCatalog({catalog:[method("course:unknown","course","stress",{cost:"unknown"})],
    message:"Тревога",locale:"ru",freeOnly:true}),[]);
});
test("ranking never infers treatment success, diagnoses or fabricated percentages",()=>{
  const x=rankMethodCatalog({catalog:[method("test:stress","test","stress")],
    message:"стресс",locale:"ru"})[0];
  assert.equal(x.relevance.description,"relative_topic_relevance_not_efficacy");
  assert.equal(typeof x.relevance.score,"number");
});
test("existing verified suggestions keep exact source IDs, titles and URLs",()=>{
  const candidates=[
    {id:"test:work",kind:"test",title:"Work check-in",href:"/ru/client/tests"},
    {id:"service:situation",kind:"service",title:"Situation",href:"/ru/services/free-situation-review"},
  ];
  const sources=[
    {...candidates[0],status:"published",free:true,axisLinks:[{ref:"goal::confidence"}]},
    {...candidates[1],status:"published",free:true,axisLinks:[{ref:"work::clarity"}]},
  ];
  const result=rankVerifiedSuggestions({suggestions:candidates,sourceOffers:sources,
    message:"I fear being judged",locale:"ru",limit:2});
  assert.deepEqual(result,[candidates[0]]);
});
test("unindexed, upstream-authorized audio is preserved, not invented",()=>{
  const audio={id:"audio:reiki:flight:ru",kind:"audio",title:"Verified public audio",
    href:"https://sample.supabase.co/a.mp3"};
  assert.deepEqual(rankVerifiedSuggestions({suggestions:[audio],locale:"ru"}),[audio]);
});
test("duplicate sources are counted only once",()=>{
  const one=method("koan:one","koan","meaning");
  assert.equal(buildMethodCatalog({koans:[one,one]},{locale:"ru"}).length,1);
});

test("main authenticated chat applies semantic re-ranking only AFTER published source/consent gates",()=>{
  const route=readFileSync(new URL("../app/api/holistic-agent/turn/route.js",import.meta.url),"utf8");
  assert.match(route,/import \{ rankVerifiedSuggestions \}/);
  assert.match(route,/sourceOffers:axisOffers/);
  assert.match(route,/suggestions:candidateDecision\.suggestions/);
  assert.match(route,/selectedGoal:goal,locale:body\.locale,limit:2/);
  assert.ok(route.indexOf("const rawDecision=buildHolisticGuidedTurn(")<route.indexOf("rankVerifiedSuggestions({"));
  assert.ok(route.indexOf("const axisOffers=publishedAxisOffers(")<route.indexOf("rankVerifiedSuggestions({"));
  assert.ok(route.indexOf("const safety=preflight(")<route.indexOf("rankVerifiedSuggestions({"));
});

test("verified paid sources cannot reappear through unindexed fallback",()=>{
  const item={id:"service:alchemy",kind:"service",title:"Paid",href:"/ru/services/alchemy-of-soul"};
  const source={...item,status:"published",free:false,axisLinks:[{ref:"meaning::meaning"}]};
  assert.deepEqual(rankVerifiedSuggestions({suggestions:[item],sourceOffers:[source],
    message:"хочу понять смысл",locale:"ru"}),[]);
});
test("a known source ID with a changed URL is not a fallback suggestion",()=>{
  const item={id:"test:work",kind:"test",title:"Test",href:"/ru/client/tests"};
  const source={...item,status:"published",free:true,href:"/ru/client/private"};
  assert.deepEqual(rankVerifiedSuggestions({suggestions:[item],sourceOffers:[source],
    message:"проблема на работе",locale:"ru"}),[]);
});
test("matched semantic option is not padded with unindexed unrelated audio",()=>{
  const testItem={id:"test:work",kind:"test",title:"Confidence",href:"/ru/client/tests"};
  const originalAudio={id:"audio:reiki:flight:ru",kind:"audio",title:"Approved audio",
    href:"https://media.example/audio.mp3"};
  const sources=[{...testItem,status:"published",free:true,
    axisLinks:[{ref:"goal::confidence"}]}];
  assert.deepEqual(rankVerifiedSuggestions({suggestions:[testItem,originalAudio],
    sourceOffers:sources,message:"Боюсь осуждения",locale:"ru"}),[testItem]);
});
test("untranslated video audio is not labeled as language-matched",()=>{
  const item={id:"youtube:abcdefghijk",kind:"video",title:"Original English recording",
    href:"https://www.youtube.com/watch?v=abcdefghijk"};
  const source={...item,status:"published",free:true,originalLanguage:"en"};
  assert.deepEqual(rankVerifiedSuggestions({suggestions:[item],sourceOffers:[source],
    message:"Меня тревожит стресс",locale:"ru"}),[]);
});
