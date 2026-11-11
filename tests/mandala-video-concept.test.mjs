import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept,reviseVideoConcept,videoConceptIsValid}
  from "../lib/mandala/auto-video-concept.mjs";
import {getMyTubeTopic,listMyTubeScenarios} from "../lib/mandala/mytube-content-taxonomy.mjs";

test("Auto Concept produces a real canonical taxonomy path in RU/EN/ES without any provider",()=>{
  for(const locale of ["ru","en","es"]){
    for(const theme of ["energy","money","relationships","goals","life","health"]){
      const proposal=suggestVideoConcept({locale,goal:"",theme,styleIndex:0});
      assert.equal(videoConceptIsValid(proposal),true,locale+":"+theme);
      assert.equal(proposal.mediaBindingStatus,"editorial_only_unverified");
      assert.equal(proposal.source,"catalog_example");
      assert.equal(proposal.sceneOutline.length,4);
      assert.equal(proposal.emotionalProgram.length,4);
      assert.equal(proposal.hasPersonalInput,false);
      assert.equal(getMyTubeTopic(proposal.topicId)?.category.id,proposal.categoryId);
    }
  }
});
test("Same user input is deterministic; modified intent changes proposal signature",()=>{
  const a=suggestVideoConcept({locale:"ru",goal:"Хочу спокойствие",theme:"health",styleIndex:0});
  const b=suggestVideoConcept({locale:"ru",goal:"Хочу спокойствие",theme:"health",styleIndex:0});
  const changed=suggestVideoConcept({locale:"ru",goal:"Хочу развитие",theme:"health",styleIndex:0});
  assert.deepEqual(a,b);
  assert.notEqual(changed.signature,a.signature);
  assert.equal(videoConceptIsValid(changed),true);
});
test("Editing applies dependent category/topic/meaning/motif/scenario cascades",()=>{
  const base=suggestVideoConcept({locale:"en",goal:"Calm",theme:"health"});
  const categoryChanged=reviseVideoConcept(base,{categoryId:"goals-money",subcategoryId:"",
    topicId:"",scenarioId:"",motifId:""},"en");
  assert.equal(categoryChanged.categoryId,"goals-money");
  assert.equal(videoConceptIsValid(categoryChanged),true);
  const meaningChanged=reviseVideoConcept(categoryChanged,{meaningAxisId:"growth",
    motifId:""},"en");
  assert.equal(meaningChanged.meaningAxisId,"growth");
  assert.equal(videoConceptIsValid(meaningChanged),true);
  const scenario=listMyTubeScenarios(meaningChanged.topicId,"en")[1];
  const selected=reviseVideoConcept(meaningChanged,{scenarioId:scenario.id},"en");
  assert.equal(selected.scenarioId,scenario.id);
  assert.deepEqual(selected.sceneOutline,scenario.sceneOutline);
  assert.equal(videoConceptIsValid(selected),true);
});
test("Concept never claims video exists; unsupported IDs are rejected",()=>{
  const p=suggestVideoConcept({locale:"es",goal:"Quiero energía",theme:"energy"});
  assert.equal(p.mediaBindingStatus,"editorial_only_unverified");
  assert.equal(videoConceptIsValid({...p,scenarioId:"invented"}),false);
  assert.equal(videoConceptIsValid({...p,motifId:"invented"}),false);
});
test("Ideas Concept owns the single editor and Montage retains its real timeline and guest gate",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const concept=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/mandala-video-concept.module.css",import.meta.url),"utf8");
  assert.match(source,/data-video-ideas-concept-panel/);
  assert.match(source,/data-video-montage-concept/);
  assert.equal((source.match(/<MandalaVideoConcept /g)||[]).length,1,
    "the written concept remains a single editor in Ideas");
  assert.equal((source.match(/<MandalaCinematicDirector /g)||[]).length,1,
    "the separate cinematic storyboard remains a single editor in Montage");
  assert.match(source,/id:"concept",Icon:Film/);
  assert.match(source,/setMontagePanel\("concept"\)/);
  assert.match(source,/data-video-pro-open-montage-storyboard/);
  assert.match(source,/\{id:"effects",Icon:Sparkles\},\{id:"text",Icon:Type\}/);
  assert.match(source,/\{id:"audio",Icon:Music2\},\{id:"settings",Icon:SlidersHorizontal\}/);
  assert.match(source,/data-video-montage-open-concept/);
  assert.match(source,/data-video-concept-text-tools/);
  assert.match(source,/data-video-montage-text/);
  assert.match(source,/MandalaMultiTrackTimeline/);
  assert.match(source,/setMontagePanel\("audio"\)/);
  assert.match(source,/onApprove=\{approved=>/);
  assert.match(source,/approvedConcept=\{approvedVideoConcept\}/);
  assert.match(source,/setApprovedVideoConcept\(approved\)/);
  assert.match(concept,/approvedConcept\?\.signature===concept\.signature/);
  assert.match(source,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
  assert.match(concept,/data-video-concept-approve/);
  assert.match(concept,/data-video-concept-edit/);
  assert.match(concept,/if\(signedIn\)setEditing\(true\);else setLoginOpen\(true\)/);
  assert.match(concept,/data-video-concept-signin/);
  assert.match(concept,/data-video-concept-auth-overlay/);
  assert.match(concept,/data-video-concept-check-login/);
  assert.match(concept,/aria-modal="true"/);
  assert.match(concept,/target="_blank"/);
  assert.match(css,/@media\(max-width:359px\)/);
  assert.match(css,/safe-area-inset-bottom/);
});

test("macOS WebKit opens Style by default and still allows reviewed Concept",()=>{
  const source=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const start=source.indexOf('const editorTab=page.locator');
  const end=source.indexOf('const selectedStyle=page.locator',start);
  assert.ok(start>0&&end>start);
  const route=source.slice(start,end);
  assert.match(route,/\[data-video-montage-tab="effects"\]/);
  assert.match(source,/\[data-video-ideas-concept-panel\]/);
  assert.match(route,/await montageStyleTab\.click\(\)/);
  assert.match(route,/await expect\(montageStyleTab\)\.toHaveAttribute\("aria-pressed","true"/);
  assert.doesNotMatch(route,/force:\s*true|setMontagePanel/);
});

test("required Hypno three tabs, relocated effects and guided kind remain browser-tested after Concept",()=>{
  const webkit=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  const guided=readFileSync(new URL("../scripts/verify-mandala-practices-browser.mjs",import.meta.url),"utf8");
  const exportFlow=readFileSync(new URL("../scripts/benchmarking/first-video-live-export.mjs",import.meta.url),"utf8");
  assert.match(webkit,/await expect\(hypnoTabs\.getByRole\("tab"\)\)\.toHaveCount\(3\)/);
  assert.match(webkit,/await effectsTab\.click\(\)/);
  assert.match(webkit,/data-hypno-visual-effect="sunlight"/);
  assert.match(webkit,/await expect\(briefFrame\)\.toHaveAttribute\("aria-checked","false"\)/);
  assert.match(guided,/await expect\(kind\)\.toHaveAttribute\("aria-pressed","true",\{timeout:15000\}\)/);
  assert.match(guided,/GUIDED_KIND_DID_NOT_COMMIT/);
  assert.match(exportFlow,/const montageStyle=page\.locator/);
  assert.match(exportFlow,/await concept\.locator\('\[data-video-concept-approve\]'\)\.click\(\)/);
  assert.match(exportFlow,/FOUR_DISTINCT_SOURCES_REQUIRED/);
});

test("macOS same-runner heap permits the existing real WebKit movie and voice gate",()=>{
  const workflow=readFileSync(new URL("../.github/workflows/holistic-support-mandala.yml",import.meta.url),"utf8");
  assert.match(workflow,/voice-webkit-macos:[\s\S]*?runs-on: macos-15/);
  assert.match(workflow,/NODE_OPTIONS=--max-old-space-size=3072 npm run build/);
  assert.match(workflow,/node scripts\/verify-affirmation-voice-browser\.mjs/);
  assert.match(workflow,/node scripts\/benchmarking\/first-video-live-export\.mjs/);
});

test("Ideas keeps production's one-click Safari disclosure with ref persistence",()=>{
  const source=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  const start=source.indexOf("ideaTarget?createPortal(<details");
  const end=source.indexOf("{topicPanel}",start);
  assert.ok(start>0&&end>start);
  const disclosure=source.slice(start,end);
  assert.match(source,/const bindIdeaRefinement=useCallback/);
  assert.match(disclosure,/ref=\{bindIdeaRefinement\}/);
  assert.match(disclosure,/event\.preventDefault\(\)/);
  assert.match(disclosure,/node\.open=!node\.open/);
  assert.match(disclosure,/ideaRefinementOpenRef\.current=node\.open/);
  assert.doesNotMatch(disclosure,/open=\{ideaRefinementExpanded\}/);
});


test("Concept shows editable story first, followed by all parameters in one column",()=>{
 const panel=readFileSync(new URL("../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/mandala-video-concept.module.css",import.meta.url),"utf8");
 const semantic=readFileSync(new URL("../lib/mandala/video-concept-semantic.mjs",import.meta.url),"utf8");
 assert.match(panel,/data-video-concept-text/);
 assert.match(panel,/data-video-concept-text-edit/);
 assert.match(panel,/data-video-concept-text-input/);
 assert.match(panel,/data-video-concept-paragraph/);
 assert.match(panel,/data-video-concept-main-idea/);
 assert.match(panel,/data-video-concept-all-parameters/);
 assert.match(panel,/data-video-concept-journey/);
 assert.ok(panel.indexOf("data-video-concept-text")<panel.indexOf("data-video-concept-all-parameters"),
   "Narrative precedes all creative parameters");
 assert.ok(panel.indexOf("data-video-concept-all-parameters")<panel.indexOf("data-video-concept-action-rail"),
   "All parameters are visible above the approval rail in DOM order");
 assert.match(panel,/allParameterRows\.map\(row=>/);
 assert.equal((panel.match(/data-video-concept-approve/g)||[]).length,1);
 assert.equal((panel.match(/data-video-concept-edit disabled/g)||[]).length,1);
 assert.match(panel,/onApprove\(approvedToSave\)/);
 assert.match(css,/\.parameterList\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.emotionSteps\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.editor\{grid-template-columns:minmax\(0,1fr\)/);
 assert.doesNotMatch(panel,/className=\{css\.compactGrid\}/);
 assert.match(css,/\.panel \.actions\{position:fixed/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/display-mode:standalone/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(semantic,/const raw=audio\|\|clean\(creativeBrief,800\)\|\|plainGoal\|\|clean\(phraseText,1200\)/);
 assert.match(semantic,/const selected=getMyTubeTopic\(selectedTopicId\)/);
 assert.match(semantic,/const topicChoice=selected\?\{id:selectedTopicId,confidence:"explicit",reason:"user_selection"\}/);
 assert.match(semantic,/const dynamic=energizing&&!explicitSlow/);
 assert.match(semantic,/const audience=matched\(low,AUDIENCES\)/);
 assert.match(semantic,/const anxiety=ANXIETY_CONTEXT\.test\(low\)/);
 assert.match(panel,/if\(signedIn\)setEditing\(true\);else setLoginOpen\(true\)/);
});
