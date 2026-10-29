import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {videoProfileFocus} from "../lib/mandala/video-affirmation-focus.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const lib=read("lib/mandala/video-affirmations.ts");
const component=read("components/mandala-personal-affirmations.tsx");
const panel=read("components/mandala-video-affirmations.tsx");
const route=read("app/api/app/[...path]/route.js");
const css=read("components/mandala-video-affirmations.module.css");
const script=read("scripts/verify-holistic-mandala-browser.mjs");
const result=ts.transpileModule(lib,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert.deepEqual(result.diagnostics||[],[]);
const module={};
new Function("exports",result.outputText)(module);
const reading=(axis,percent,more={})=>[axis,{mode:"directional",percent,resultId:"own-result",rule:{goalEligible:true},...more}];

test("only valid owner-scoped, current directional psych-portrait axes are projected",()=>{
  const data={axes:Object.fromEntries([
    reading("anxiety",22),reading("focus",30),reading("boundaries",48),
    reading("stress",3,{mode:"descriptive"}),reading("energy",5,{rule:{goalEligible:false}}),
    reading("mood",10,{resultId:null}),reading("functioning",NaN),reading("unknown",12)
  ])};
  assert.deepEqual(videoProfileFocus(data),{axes:["anxiety","focus","boundaries"]});
  assert.deepEqual(videoProfileFocus({axes:{}}),{axes:[]});
  assert.doesNotMatch(JSON.stringify(videoProfileFocus(data)),/own-result|percent|22|30|48/);
});

test("personal and prioritized goals provide five distinct editable sentences in EN/RU/ES",()=>{
  for(const locale of ["en","ru","es"]){
    assert.equal(module.affirmationGoalCatalog[locale].length,12);
    const result=module.personalizedVideoAffirmations(locale,"money",["focus","anxiety"],["boundaries","recovery"]);
    assert.equal(result.length,5);
    assert.equal(result[0],module.affirmationGoalCatalog[locale].find(row=>row.id==="boundaries").sentence);
    assert.equal(result[1],module.affirmationGoalCatalog[locale].find(row=>row.id==="recovery").sentence);
    assert.equal(new Set(result).size,5);
    assert.ok(result.every(s=>s.length>5&&s.length<=90));
    const render=module.linesForVideoAffirmations(locale,"money",{
      ...module.defaultAffirmations,enabled:true,presetOverride:result,selected:[0,1,2,3,4],custom:"Extra phrase"
    });
    assert.deepEqual(render.slice(0,5),result);
    assert.equal(render[5],"Extra phrase");
  }
});

test("manual filter needs no login and profile fetch is only on a click",()=>{
  assert.match(component,/data-video-personal-suggest/);
  assert.match(component,/data-video-goals-toggle/);
  assert.match(component,/data-video-goal=/);
  assert.match(component,/goals.length>=3/);
  assert.match(component,/data-video-goals-apply/);
  assert.match(component,/await appFetch\("video-affirmation-focus"\)/);
  assert.match(panel,/MandalaPersonalAffirmations locale=\{locale\}/);
  assert.match(route,/const actor = await auth\.verified\(\),[\s\S]*?joined === 'video-affirmation-focus'/);
  assert.match(route,/videoProfileFocus\(buildPsychPortrait\(data\.results\)\)/);
  assert.match(css,/grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(script,/data-video-goals-toggle/);
  assert.doesNotMatch(component+lib,/localStorage|sessionStorage|sendBeacon|https:\/\/.*api\./);
  const jsx=ts.transpileModule(component,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.deepEqual(jsx.diagnostics||[],[]);
});
