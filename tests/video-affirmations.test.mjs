import test from "node:test";
import "./hypno-wave-engine.test.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path,import.meta.url),"utf8");
const library = read("lib/mandala/video-affirmations.ts");
const panel = read("components/mandala-video-affirmations.tsx");
const css = read("components/mandala-video-affirmations.module.css");
const studio = read("components/mandala-free-video-studio.tsx");
const transpile = ts.transpileModule(library,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  reportDiagnostics:true,
});
assert.deepEqual(transpile.diagnostics || [],[]);
const exposed = {};
new Function("exports",transpile.outputText)(exposed);
const {defaultAffirmations,suggestedVideoAffirmations,linesForVideoAffirmations,paintVideoAffirmations,affirmationGoalCatalog,personalizedVideoAffirmations,compactCustomAffirmationInput,MAX_AFFIRMATION_LENGTH,buildHypnoFilteredPhrases} = exposed;
const {videoProfileFocus} = await import("../lib/mandala/video-affirmation-focus.mjs");

test("three locales and all six site themes have five ready-to-select, non-clinical phrases", () => {
  for(const locale of ["en","ru","es"]){
    for(const theme of ["energy","money","relationships","goals","life","health"]){
      const choices=suggestedVideoAffirmations[locale][theme];
      assert.equal(choices.length,5,locale+" "+theme);
      assert.ok(choices.every(phrase=>phrase.trim().length>=5 && phrase.length<=26 && phrase.trim().split(/\s+/).length<=4), locale+" "+theme);
    }
  }
  assert.deepEqual(defaultAffirmations.selected,[0,1,2]);
  assert.equal(defaultAffirmations.enabled,false);
});

test("selected presets and custom lines are local-only, normalized and bounded", () => {
  const settings={...defaultAffirmations,enabled:true,selected:[0,1,1,2,3,4,10],custom:"  Моя фраза\n\n<личная> фраза\n" + "а".repeat(500)};
  const lines=linesForVideoAffirmations("ru","energy",settings);
  assert.equal(lines.length,8);
  assert.equal(lines[0],suggestedVideoAffirmations.ru.energy[0]);
  assert.equal(lines[5],"Моя фраза");
  assert.equal(lines[6],"личная фраза");
  assert.equal(lines[7].length,MAX_AFFIRMATION_LENGTH);
  assert.ok(lines.every(line=>!/[<>]/.test(line)));
});

test("custom affirmations are visibly limited to five concise lines", () => {
  const input=["A".repeat(90),"B".repeat(45),"I am calm","I choose care","I can rest","ignored"].join("\n");
  const short=compactCustomAffirmationInput(input);
  const phrases=short.split("\n");
  assert.equal(MAX_AFFIRMATION_LENGTH,36);
  assert.equal(phrases.length,5);
  assert.ok(phrases.every(value=>Array.from(value).length<=MAX_AFFIRMATION_LENGTH));
  const lines=linesForVideoAffirmations("ru","energy",{
    ...defaultAffirmations, selected:[],enabled:true,custom:short,
  });
  assert.deepEqual(lines,phrases);
});

test("the renderer draws only when enabled, uses visible readable text, and keeps brief frames brief", () => {
  const drawn=[];
  const context={
    canvas:{width:720,height:1280},
    save(){},restore(){},fillRect(){},
    fillText(value){drawn.push(value);},
    set textAlign(value){},set textBaseline(value){},set font(value){},
    set fillStyle(value){},set shadowBlur(value){},set shadowColor(value){},
  };
  const words=["A thoughtful personal message"];
  paintVideoAffirmations(context,0,words,defaultAffirmations);
  assert.equal(drawn.length,0);
  paintVideoAffirmations(context,2,words,{...defaultAffirmations,enabled:true,visibility:["large"]});
  assert.ok(drawn.includes(words[0]));
  drawn.length=0;
  const frame={...defaultAffirmations,enabled:true,visibility:["frame"]};
  paintVideoAffirmations(context,1.02,words,frame);
  assert.equal(drawn.length,1);
  drawn.length=0;
  paintVideoAffirmations(context,1.20,words,frame);
  assert.equal(drawn.length,0);
});

test("existing video preview and export use identical overlays; frame mode requests 25fps", () => {
  assert.ok(studio.includes("<MandalaHypnoCompact locale={locale} theme={theme}"),"Hypno must remain mounted across theme changes");
  assert.match(read("components/mandala-hypno-compact.tsx"),/MandalaVideoAffirmations locale=\{locale\} theme=\{theme\}/);
  assert.match(studio,/const \[affirmations,setAffirmations\]/);
  // Invalidate both the old single-shot film and the NEW cinematic export
  // when visual grade or shot selection changes, without dropping affirmation state.
  assert.match(studio,/caption,affirmations,\s*cinematicPlan\?\.version,cinematicPlan\?\.styleId/);
  assert.match(studio,/cinematicPlan\?\.shots\.map\(shot=>shot\.sceneId\)\]\)/);
  assert.equal((studio.match(/paintVideoAffirmations\(ctx,/g)||[]).length,4);
  assert.match(studio,/affirmations\.enabled && affirmations\.visibility\.includes\("frame"\)/);
  assert.match(studio,/\? 25 : quality === "fullhd" \? 12 : 15/);
  assert.match(studio,/setAffirmations\(defaultAffirmations\)/);
  assert.match(panel,/data-video-affirmations-enable/);
  assert.match(panel,/data-video-affirmation-preset/);
  assert.match(panel,/data-video-custom-affirmations/);
  assert.match(panel,/data-video-affirmations-custom/);
  assert.match(panel,/data-video-affirmations-settings/);
  assert.match(panel,/compactCustomAffirmationInput/);
  assert.match(panel,/data-video-affirmation-frequency/);
  assert.match(panel,/data-video-affirmation-density/);
  assert.match(panel,/data-video-affirmation-visibility/);
  assert.match(panel,/checked=\{settings\.visibility\.includes\(item\)\}/);
  assert.doesNotMatch(panel+library,/\bfetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|sendBeacon/i);
});

test("affirmation panel uses original light cream and green UI with narrow iPhone controls", () => {
  assert.match(css,/background:\s*#fffdf6/);
  assert.match(css,/background:\s*#087f5e/);
  assert.match(css,/@media \(max-width: 360px\)/);
  assert.match(css,/\.settingsDetails/);
  assert.match(css,/\.customDetails/);
  assert.match(css,/\.frequencyChoices/);
  assert.match(css,/\.visibilityChoices\s*\{[^}]*grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/min-width:\s*0/);
  assert.match(css,/grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  const component=ts.transpileModule(panel,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.deepEqual(component.diagnostics || [],[]);
});


test("personalized suggestions only consume eligible, fresh, source-reviewed psych-portrait axes",()=>{
  const reading=(axis,percent,more={})=>[axis,{
    mode:"directional",percent,resultId:"owned-result",rule:{goalEligible:true},...more,
  }];
  const data={axes:Object.fromEntries([
    reading("anxiety",22),reading("focus",30),reading("boundaries",48),
    reading("stress",3,{mode:"descriptive"}),reading("energy",5,{rule:{goalEligible:false}}),
    reading("mood",10,{resultId:null}),reading("functioning",NaN),reading("unknown",12),
  ])};
  assert.deepEqual(videoProfileFocus(data),{axes:["anxiety","focus","boundaries"]});
  assert.deepEqual(videoProfileFocus({axes:{}}),{axes:[]});
  const changed={axes:Object.fromEntries([
    reading("focus",9),reading("anxiety",65),reading("boundaries",28),
  ])};
  assert.deepEqual(videoProfileFocus(changed),{axes:["focus","boundaries","anxiety"]});
  assert.doesNotMatch(JSON.stringify(videoProfileFocus(data)),/owned-result|percent|22|30|48/);
});

test("goals and sourced axes yield five local, editable sentences in RU EN ES",()=>{
  for(const locale of ["ru","en","es"]){
    const catalog=affirmationGoalCatalog[locale];
    assert.equal(catalog.length,12);
    const selected=personalizedVideoAffirmations(locale,"money",["anxiety","focus"],["boundaries","recovery"]);
    assert.equal(selected.length,5);
    assert.equal(selected[0],catalog.find(row=>row.id==="boundaries").sentence);
    assert.equal(selected[1],catalog.find(row=>row.id==="recovery").sentence);
    assert.equal(new Set(selected).size,5);
    assert.ok(selected.every(phrase=>phrase.length>5&&phrase.length<=MAX_AFFIRMATION_LENGTH));
    const lines=linesForVideoAffirmations(locale,"energy",{
      ...defaultAffirmations,enabled:true,selected:[0,1,2,3,4],presetOverride:selected,custom:"My own words"
    });
    assert.deepEqual(lines.slice(0,5),selected);
    assert.equal(lines[5],"My own words");
  }
});

test("Hypnoaffirmations has precise user-facing EN/RU/ES copy and two real choices",()=>{
  const personal=read("components/mandala-personal-affirmations.tsx");
  for(const word of ["Hypnoaffirmations","Гипноаффирмации","Hipnoafirmaciones"]) {
    assert.ok(panel.includes(word),"missing locale heading: "+word);
  }
  assert.match(panel,/25-го кадра/);
  assert.match(panel,/научно не доказано/);
  assert.match(panel,/lasting effects on beliefs are not scientifically established/);
  assert.match(panel,/data-video-hypno-intro/);
  assert.match(personal,/data-video-choice-mode/); // Child owns its two actual buttons.
  assert.match(personal,/data-video-manual-select/);
  assert.match(personal,/data-video-personal-suggest/);
  assert.match(personal,/aria-pressed=\{selectionMethod==="manual"\}/);
  assert.match(personal,/aria-pressed=\{selectionMethod==="tests"\}/);
  assert.match(personal,/onClick=\{onManualSelect\}/);
  assert.match(personal,/apply\(fresh,goals\);onTestsSelected\(\);/);
  assert.match(panel,/setSelectionMethod\("manual"\)/);
  assert.match(panel,/setSelectionMethod\("tests"\)/);
  assert.match(panel,/presetOverride: undefined/);
  assert.match(panel,/id="video-hypno-manual"/);
  assert.match(personal,/await appFetch\("video-affirmation-focus"\)/);
  assert.match(css,/\.hypnoIntro/);
  assert.match(css,/\.choiceBar/);
  assert.match(css,/\.personalManual/);
  assert.doesNotMatch(panel+personal,/\bsetInterval\s*\(|autoPlay|sendBeacon|localStorage|sessionStorage/i);
});

test("personal matching is click-only, auth-gated and no scores leave the server",()=>{
  const personal=read("components/mandala-personal-affirmations.tsx");
  const focus=read("lib/mandala/video-affirmation-focus.mjs");
  const route=read("app/api/app/[...path]/route.js");
  assert.match(panel,/MandalaPersonalAffirmations locale=\{locale\}/);
  assert.match(personal,/data-video-personal-suggest/);
  assert.match(personal,/await appFetch\("video-affirmation-focus"\)/);
  assert.match(personal,/data-video-goals-toggle/);
  assert.match(personal,/data-video-goal=/);
  assert.match(personal,/data-video-goals-apply/);
  assert.match(personal,/goals.length>=3/);
  assert.match(route,/const actor = await auth\.verified\(\),[\s\S]*?joined === 'video-affirmation-focus'/);
  assert.match(route,/videoProfileFocus\(buildPsychPortrait\(data\.results\)\)/);
  assert.doesNotMatch(focus+personal,/sendBeacon|localStorage|sessionStorage|XMLHttpRequest/);
  assert.match(read("scripts/verify-holistic-mandala-browser.mjs"),/data-video-goals-toggle/);
  const jsx=ts.transpileModule(personal,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
  assert.deepEqual(jsx.diagnostics||[],[]);
});

test("HD master starts its own load and remains gated on a decoded frame in WebKit",()=>{
  assert.match(studio,/const decoded=Boolean\(activeFilm && master && master\.readyState>=2 &&[\s\S]*master\.videoWidth>0 && master\.videoHeight>0\)/);
  assert.match(studio,/setPremiumReady\(decoded\)/,
    "already decoded HD frames must remain ready even if preload beat the effect");
  assert.match(studio,/if\(activeFilm && master && !decoded\)master\.load\(\)/,
    "unready scenes must still request real media data");
  assert.match(studio,/onLoadedData=\{event=>\{[\s\S]*event\.currentTarget\.readyState>=2 && event\.currentTarget\.videoWidth>0/);
  assert.match(studio,/onCanPlay=\{\(\)=>setPremiumReady\(true\)\}/);
  assert.match(studio,/\(!activeFilm \|\| premiumReady\)/);
  assert.match(studio,/master\.readyState < 2\)throw new Error\("HD MP4 scene not loaded"\)/);
});

test("iPhone photo-consent gesture wakes the real HD scene without bypassing readiness",()=>{
  assert.match(studio,/function primeNativeMasterFromUserGesture\(\)/);
  assert.match(studio,/if\(!activeFilm \|\| !video \|\| video\.readyState>=2\)return/);
  assert.match(studio,/video\.load\(\)/);
  assert.match(studio,/void video\.play\(\)\.then/);
  assert.match(studio,/if\(video\.readyState>=2 && video\.videoWidth>0 && video\.videoHeight>0\)/);
  assert.match(studio,/if\(approved\)primeNativeMasterFromUserGesture\(\)/);
  assert.match(studio,/\(!activeFilm \|\| premiumReady\)/,
    "Create stays disabled until a real decoded master frame is present");
});


test("compact request flows are locally sourced, goal-first, nonclinical and localized",()=>{
  const compact=read("components/mandala-hypno-compact.tsx");
  const compactCss=read("components/mandala-hypno-compact.module.css");
  const studio=read("components/mandala-free-video-studio.tsx");
  const expected=["energy","money","relationships","goals","life","health"];
  const {hypnoRequestProblems,buildHypnoRequestPhrases}=exposed;
  for(const locale of ["ru","en","es"]){
    for(const theme of expected){
      assert.equal(hypnoRequestProblems[locale][theme].length,3);
      for(let index=0;index<3;index++){
        const goalId=affirmationGoalCatalog[locale][0].id;
        const proposals=buildHypnoRequestPhrases(locale,theme,index,goalId);
        assert.equal(proposals.length,5);
        assert.equal(proposals[0],hypnoRequestProblems[locale][theme][index].phrase);
        assert.ok(proposals.every(x=>x.length>4&&x.length<=MAX_AFFIRMATION_LENGTH));
        assert.ok(!proposals.some(x=>/cure|guarantee|излеч|вылеч|garantiz/i.test(x)));
      }
    }
  }
  for(const marker of ["data-hypno-request","data-hypno-request-edit","data-hypno-apply-request",
    "data-hypno-phrases","data-hypno-smart","data-hypno-ready","data-hypno-tests",
    "data-hypno-display","data-hypno-frequency","data-hypno-size","data-hypno-position",
    "data-hypno-design","data-hypno-scene","data-hypno-preview"]){
    assert.ok(compact.includes(marker),marker);
  }
  assert.match(studio,/activePoster=\{activeFilm\?\.poster\|\|null\}/);
  assert.match(compact,/data-hypno-create-video disabled=\{disabled\|\|!settings\.enabled\}/);
  assert.ok(compact.indexOf("data-hypno-overview-enable")<compact.indexOf("data-hypno-preview"),
    "opt-in must be visible before preview/create");

  assert.match(studio,/data-video-wish-disclosure/);
  assert.match(studio,/<summary>\{ui\.wishTitle\}<\/summary>/);
  assert.match(studio,/onPreview=\{openAffirmationPreview\}/);
  assert.match(compactCss,/@media\(max-width:360px\)/);
  assert.match(compactCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(compact,/sendBeacon|localStorage|sessionStorage|XMLHttpRequest|autoPlay/);
  assert.match(compact,/maxLength=\{400\}/);
});

test("new text size and position change the actual shared canvas renderer",()=>{
  const positions=[];
  const fonts=[];
  const context={
    canvas:{width:720,height:1280},
    save(){},restore(){},fillRect(){},
    fillText(phrase,x,y){positions.push(y);},
    set textAlign(v){},set textBaseline(v){},
    set font(v){fonts.push(v);},
    set fillStyle(v){},set shadowBlur(v){},set shadowColor(v){},
  };
  for(const position of ["top","center","bottom"]){
    paintVideoAffirmations(context,2,["Test phrase"],{
      ...defaultAffirmations,enabled:true,density:"low",visibility:["large"],position,
    });
  }
  assert.equal(positions.length,3);
  assert.ok(positions[0]<positions[1]&&positions[1]<positions[2]);
  fonts.length=0;
  for(const textScale of ["small","medium","large"]){
    paintVideoAffirmations(context,2,["Test phrase"],{
      ...defaultAffirmations,enabled:true,density:"low",visibility:["large"],textScale,
    });
  }
  const px=fonts.map(x=>Number(x.match(/(\d+(?:\.\d+)?)px/)[1]));
  assert.ok(px[0]<px[1]&&px[1]<px[2]);
});

test("compact Hypno v5.3 shows two consented paths, editable request, five effective phrase filters",()=>{
 const c=read("components/mandala-hypno-compact.tsx");
 const css=read("components/mandala-hypno-compact.module.css");
 for(const marker of ["data-hypno-accent","data-hypno-suggest-tests","data-hypno-short-request",
  "data-hypno-update-request","data-hypno-profile-proposal","data-hypno-accept-proposal",
  "data-hypno-filter-type","data-hypno-filter-goal","data-hypno-filter-tone",
  "data-hypno-filter-focus","data-hypno-filter-length","data-hypno-generate-new",
  "data-hypno-approve","data-hypno-phrase"]){
   assert.ok(c.includes(marker),marker);
 }
 assert.match(c,/await appFetch\("video-affirmation-focus"\)/);
 assert.match(c,/function acceptTestProposal\(\)/);
 assert.match(c,/setTestProposal\(proposed\)/);
 assert.match(css,/\.topicMiniRail\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.filtersMini\{display:grid/);
 const compiled=ts.transpileModule(c,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 assert.deepEqual(compiled.diagnostics||[],[]);
});
test("locale-specific Hypno tone, role, focus, and length meaningfully change recommended text",()=>{
 const themes=["energy","money","relationships","goals","life","health"];
 const ids=["rhythm","value","boundaries","clarity","meaning","recovery"];
 for(const locale of ["ru","en","es"]){
   for(let i=0;i<themes.length;i++){
     const theme=themes[i],goal=ids[i];
     const a=buildHypnoFilteredPhrases(locale,theme,0,goal,"gentle","support","support","medium",0);
     const b=buildHypnoFilteredPhrases(locale,theme,0,goal,"balanced","support","support","medium",0);
     const c=buildHypnoFilteredPhrases(locale,theme,0,goal,"gentle","action","support","medium",0);
     const d=buildHypnoFilteredPhrases(locale,theme,0,goal,"gentle","support","confidence","medium",0);
     const e=buildHypnoFilteredPhrases(locale,theme,0,goal,"gentle","support","support","short",0);
     assert.equal(a.length,5);
     assert.ok(a.every(v=>v.length>4&&Array.from(v).length<=MAX_AFFIRMATION_LENGTH));
     // Verify real replacement text, not a shuffle of the same five words.
     for(const variants of [b,c,d,e]){
       assert.ok(variants.some(word=>!a.includes(word)),
         locale+" "+theme+" filter must introduce a new semantic phrase");
     }
     const regenerated=buildHypnoFilteredPhrases(locale,theme,0,goal,"gentle","support","support","medium",1);
     assert.ok(regenerated.some(word=>!a.includes(word)),
       "Generate new options must supply a different curated text");
     assert.notDeepEqual(a,b);
     assert.ok(!a.some(v=>/guaranteed cure|вылеч|garantiz/i.test(v)));
   }
 }
});


test("Wave/Gemini strategy appears before phrases, uses enum privacy and approved drafts",()=>{
 const source=read("lib/mandala/hypno-psych-strategy.ts");
 const transpiled=ts.transpileModule(source,{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
 },reportDiagnostics:true});
 assert.deepEqual(transpiled.diagnostics||[],[]);
 const exported={};new Function("exports",transpiled.outputText)(exported);
 for(const locale of ["ru","en","es"])for(const [theme,goalId] of Object.entries({
   energy:"rhythm",money:"value",relationships:"boundaries",
   goals:"clarity",life:"meaning",health:"recovery",
 })){
   const input={locale,theme,problemIndex:0,goalId,tone:"gentle",focus:"support",
     kind:"support",length:"medium"};
   assert.ok(exported.buildWaveStrategy(input).length>70);
   assert.notEqual(exported.buildWaveStrategy(input),
     exported.buildWaveStrategy({...input,problemIndex:1}));
   assert.throws(()=>exported.validateWaveInput({...input,privateNote:"sensitive"}));
 }
 const draft={strategy:"Notice everyday tension while choosing a small, gentle action without pressure.",
   phrases:["I can choose one step","I allow a pause","I value my effort",
     "I can seek support","I make room to learn"]};
 assert.deepEqual(exported.reviewGeminiStrategy(draft,"en","medium"),draft);
 assert.equal(exported.reviewGeminiStrategy({...draft,phrases:[...draft.phrases.slice(0,4),"I always heal"]},"en","medium"),null);
 const ui=read("components/mandala-hypno-compact.tsx");
 const route=read("app/api/holistic-support/hypno-strategy/route.js");
 assert.ok(ui.indexOf("data-hypno-strategy>")<ui.indexOf("data-hypno-phrases>"));
 for(const label of ["data-hypno-model=\"wave\"","data-hypno-model=\"gemini\"",
   "data-hypno-gemini-consent","data-hypno-gemini-generate",
   "data-hypno-strategy-summary","approvePhrases","externalModelOptIn:true"])
   assert.ok(ui.includes(label),label);
 for(const label of ["auth.verified()","requireSameOrigin(request,config)",
   "onlyKeys(body,FIELDS)","externalModelOptIn!==true","HH_HYPNO_GEMINI_FREE_TIER_CONFIRMED",
   "reviewGeminiStrategy","consumeRate(config","PRIVATE_HEADERS","gemini-3.5-flash-lite"])
   assert.ok(route.includes(label),label);
 assert.doesNotMatch(route,/body\.(?:problemNote|goalNote|testScores|profile|custom|medicalHistory)/);
});

test("Wave draft leaves live video unchanged until explicit approval",()=>{
  const src=read("components/mandala-hypno-compact.tsx");
  const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
  for(const [a,b] of [["function filtered(","async function suggestFromTests()"],
    ["function addCustom()","const toggle=(panel"],["const ready=()=>","async function generateGemini()"]]){
    assert.doesNotMatch(section(a,b),/onChange\(\{\.\.\.settings/);
  }
  assert.match(section("function approvePhrases()","  return ("),/onChange\(next\)/);
  assert.match(src,/buildWaveNarrativeDraft\(\{\.\.\.waveInput,currentText:problemNote,goalText:goalNote/);
  assert.match(src,/requestKey=JSON\.stringify\(\[waveInput,problemNote,goalNote\]\)/);
});
