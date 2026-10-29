import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPersonalImageryCourse, COURSE_THEMES, COURSE_PLAN_VERSION, selectVerifiedCourseEvidence,
} from "../lib/mandala/personal-guided-course.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ui=read("components/mandala-guided-course.tsx");
const css=read("components/mandala-guided-course.module.css");
const studio=read("components/mandala-free-video-studio.tsx");

test("eight unique gentle session scripts exist in all three languages and six site themes",()=>{
  assert.equal(COURSE_THEMES.length,6);
  assert.equal(new Set(COURSE_THEMES).size,6);
  for(const locale of ["en","ru","es"]){
    for(const theme of COURSE_THEMES){
      const p=buildPersonalImageryCourse({locale,theme});
      assert.equal(p.version,COURSE_PLAN_VERSION);
      assert.equal(p.sessions.length,8);
      assert.equal(p.sessionCount,8);
      assert.equal(p.freeVideoCount,1);
      assert.equal(new Set(p.sessions.map(s=>s.title)).size,8);
      assert.equal(new Set(p.sessions.map(s=>s.motif)).size,8);
      assert.deepEqual(p.sessions.map(s=>s.number),[1,2,3,4,5,6,7,8]);
      assert.ok(p.sessions.every(s=>s.script.length>200 && s.scenes.length===2));
      assert.ok(p.sessions.every(s=>s.script.includes(s.scenes[0])));
      assert.equal(p.sessions[0].delivery,"free-local-preview");
      assert.equal(p.sessions.slice(1).every(s=>s.delivery==="requires-confirmed-package-and-review"),true);
      assert.equal(p.sessions.every(s=>s.videoDurationSeconds===60),true);
      assert.equal(p.requiresPractitionerReview,true);
      assert.equal(p.paidAccessVerified,false);
      assert.equal(p.narrationFileReady,false);
    }
  }
});

test("explicit goals outrank score data; self-ratings are voluntary independent values",()=>{
  const p=buildPersonalImageryCourse({locale:"ru",theme:"health",goals:["relationships","goals","relationships","energy","money"],selfRatings:{
    energy:7, goals:11,other:3,relationships:4.2,money:5,
  }});
  assert.deepEqual(p.goals,["relationships","goals","energy"]);
  assert.equal(p.sessions[0].theme,"relationships");
  assert.equal(p.sessions[1].theme,"goals");
  assert.equal(p.sessions[2].theme,"energy");
  assert.deepEqual(p.selfRatings,{energy:7,money:5});
  const fallback=buildPersonalImageryCourse({locale:"es",theme:"invalid",goals:["unsafe"]});
  assert.deepEqual(fallback.goals,["energy"]);
});

test("resource pace changes only from a single relevant source or an explicit self-checkin",()=>{
  const goal=["energy"];
  const base=buildPersonalImageryCourse({locale:"en",goals:goal});
  const source={axis:"energy",sourceTitle:"My original energy scale",measuredAt:"2026-10-25T18:00:00Z",definitionKey:"e-source"};
  const gentle=buildPersonalImageryCourse({locale:"en",goals:goal,evidence:[{...source,percent:21}]});
  const strong=buildPersonalImageryCourse({locale:"en",goals:goal,evidence:[{...source,percent:81}]});
  const other=buildPersonalImageryCourse({locale:"en",goals:goal,evidence:[
    {...source,axis:"clarity",percent:21}
  ]});
  assert.notEqual(gentle.sessions[0].script,strong.sessions[0].script);
  assert.ok(gentle.sessions[0].script.includes("you can make the image smaller"));
  assert.ok(strong.sessions[0].script.includes("resource or helpful choice"));
  assert.equal(base.sessions[0].script,other.sessions[0].script);
  const checkin=buildPersonalImageryCourse({locale:"en",goals:goal,selfRatings:{energy:3}});
  assert.ok(checkin.sessions[0].script.includes("you can make the image smaller"));
  assert.ok(!base.sessions[0].script.includes("you can make the image smaller"));
});

test("profile import accepts only scoped, dated, validated directional interpretations",()=>{
  const today=Date.parse("2026-10-28T18:00:00Z");
  const entry={mode:"directional",percent:31,resultId:"result-real",
    definitionKey:"instrument-key",sourceTitle:"Author-released test",
    measuredAt:"2026-10-27T18:00:00Z"};
  const portrait={axes:{
    energy:entry,
    boundaries:{...entry,percent:65,resultId:"b",definitionKey:"b-source"},
    meaning:{...entry,measuredAt:"2020-01-01T00:00:00Z"},
    sleep:{...entry,percent:101},
    anxiety:{...entry,mode:"descriptive"},
    focus:{...entry,definitionKey:""},
    stress:{...entry,resultId:""},
    functioning:{...entry,sourceTitle:""},
  }};
  const picked=selectVerifiedCourseEvidence(portrait,["energy","relationships","life"],today);
  assert.deepEqual(picked.map(x=>x.axis),["energy","boundaries"]);
  assert.equal(picked[0].resultId,"result-real");
  assert.equal(picked[0].definitionKey,"instrument-key");
  assert.equal(picked[0].percent,31);
  assert.ok(!JSON.stringify(picked).includes("unsafe"));
  assert.deepEqual(selectVerifiedCourseEvidence({axes:{}},["money"],today),[]);
});

test("no composite psychometric index, diagnostic interpretation or false package fulfilment",()=>{
  const p=buildPersonalImageryCourse({locale:"en",goals:["money"],evidence:[
    {axis:"clarity",sourceTitle:"Work focus scale",measuredAt:"2026-10-20T18:00:00Z",percent:24,definitionKey:"w-01"},
    {axis:"sleep",sourceTitle:"Sleep scale",measuredAt:"2026-10-20T18:00:00Z",percent:88,definitionKey:"h-01"},
  ]});
  assert.deepEqual(p.evidence.map(s=>s.axis),["clarity"]);
  assert.equal(p.evidence[0].sourceTitle,"Work focus scale");
  assert.equal(p.evidence[0].percent,undefined);
  assert.ok(p.sessions.every(s=>!/you have (a |an )?(disorder|trauma|diagnosis)|guaranteed cure|вылеч|diagnosticado/i.test(s.script)));
  assert.equal(p.paidAccessVerified,false);
  assert.equal(p.narrationFileReady,false);
});

test("consent before same-origin profile access; withdraw/goal changes invalidate in-flight responses",()=>{
  assert.match(ui,/data-guided-profile-consent/);
  assert.match(ui,/if\(!consent \|\| disabled \|\| profileStatus==="loading"\)return/);
  assert.match(ui,/fetch\("\/api\/app\/bootstrap\?view=portrait"/);
  assert.match(ui,/credentials:"same-origin",cache:"no-store",redirect:"error"/);
  assert.match(ui,/buildPsychPortrait\(data\.results\)/);
  assert.match(ui,/selectVerifiedCourseEvidence\(portrait,actualGoals\)/);
  assert.match(ui,/profileRequestRef\.current\+\+/);
  assert.match(ui,/if\(requestId!==profileRequestRef\.current\)return/);
  assert.match(ui,/const withdraw=\(\)=>\{/);
  assert.match(ui,/setConsent\(false\);setProfileEvidence\(\[\]\);/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|sendBeacon|navigator\.clipboard|https?:\/\/.+\/api/);
});

test("one canonical editor owns the free user-triggered real render/export; no automatic fake movie",()=>{
  assert.match(studio,/import \{ MandalaGuidedCourse \} from "\.\/mandala-guided-course"/);
  assert.match(studio,/<MandalaGuidedCourse locale=\{locale\} theme=\{theme\}/);
  assert.match(studio,/onApplyFreeVideo=\{session=>\{/);
  assert.match(studio,/setDuration\(60\)/);
  assert.match(studio,/setBackgroundOnly\(true\)/);
  assert.match(studio,/setAffirmations\(\{\.\.\.defaultAffirmations,enabled:true/);
  assert.match(studio,/data-mandala-video-generate/);
  assert.match(studio,/data-mandala-video-download/);
  assert.match(studio,/const \[touchedScores,setTouchedScores\]/);
  assert.match(studio,/selfRatings=\{touchedScores\}/);
  assert.doesNotMatch(ui,/onClick=\{createVideo\}|src=["']https?:\/\/.+film/);
});

test("first session offers script and optional device voice; seven other episodes are locked",()=>{
  assert.match(ui,/data-guided-session=\{session\.number\}/);
  assert.match(ui,/data-guided-free-video/);
  assert.match(ui,/data-guided-eight-sessions/);
  assert.match(ui,/speechSynthesis/);
  assert.match(ui,/new Blob\(\[script\+"\\n"\],\{type:"text\/plain;charset=utf-8"\}\)/);
  assert.match(ui,/index===0\?<div className=\{css\.first\}>/);
  assert.match(ui,/index>0\?<LockKeyhole/);
  assert.match(ui,/\/services\/imagery-therapy/);
  assert.doesNotMatch(ui,/stripe|paypal|charge|paymentIntent|storage\.upload|navigator\.sendBeacon|fetch\("https:/i);
});

test("cream and green compact mobile layout, keyboard focus and reduced motion",()=>{
  assert.match(css,/#fffdf6/);
  assert.match(css,/#087e5e/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/@media\(min-width:740px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(ui,/aria-expanded=\{goalsOpen\}/);
  assert.match(ui,/aria-pressed=\{actualGoals\.includes\(goal\)\}/);
});
