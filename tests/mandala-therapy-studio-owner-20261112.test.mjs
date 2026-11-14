import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {buildMandalaWriterRequest} from "../lib/holistic-support/meditation-writer/mandala-bridge.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const parent=read("components/mandala-free-video-studio.tsx");
const ui=read("components/mandala-therapy-studio.tsx");
const writer=read("components/mandala-personal-meditation.tsx");
const css=read("components/mandala-therapy-studio.module.css");
test("Therapy is sixth, after Ready; six original destinations remain intact",()=>{
 const block=parent.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(block);
 assert.deepEqual([...block.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
  ["video","phrases","editor","pro","ready","effects"]);
 for(const l of ["ru","en","es"])assert.match(parent,new RegExp(l+":\\{[\\s\\S]*?effects:\\{tab:\"Therapy\""));
 assert.match(parent,/data-video-quick-control=\{item\.id\}/);
 assert.equal((parent.match(/<MandalaTherapyStudio /g)||[]).length,1);
});
test("Single and eight sessions selector appears BEFORE Meditation Voice Practice subtabs",()=>{
 assert.ok(ui.indexOf("data-therapy-format-switch")<ui.indexOf("data-therapy-tabs"));
 for(const format of ["single","course"])assert.match(ui,new RegExp('data-therapy-format="'+format+'"'));
 for(const tab of ["meditation","voice","practice"])assert.ok(ui.includes('data-therapy-subtab={id}'));
 assert.match(ui,/editor\(isCourse\)/);
 assert.match(parent,/coursePreview=\{isCourse\}/);
 assert.match(ui,/role="tablist"/);
 assert.match(ui,/role="tabpanel"/);
});
test("Source stays one existing private local meditation generator and one real phrase narrator",()=>{
 assert.match(parent,/editor=\{isCourse=><MandalaPersonalMeditation/);
 assert.match(parent,/voiceEditor=\{hypnoVoiceEditor\}/);
 assert.match(parent,/onVideoPhrases=\{\(\)=>\{/);
 assert.match(writer,/buildPersonalMeditationScript/);
 assert.match(writer,/buildAdaptiveMeditationOutline/);
 assert.match(writer,/data-meditation-topic/);
 assert.match(writer,/data-meditation-method/);
 assert.match(writer,/data-meditation-length/);
 assert.match(writer,/data-meditation-extra/);
 assert.match(writer,/Generate meditation text/);
 assert.match(writer,/data-meditation-result/);
 assert.match(writer,/data-meditation-voice/);
 assert.match(writer,/MandalaCloudVoiceStudio/);
 assert.match(ui,/data-therapy-script-host data-pane=\{pane\}/);
});
test("Existing visual, quiet and binaural effects remain optional with no automatic rendering",()=>{
 assert.match(parent,/data-video-hypnocorrection-panel/);
 assert.match(parent,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
 assert.match(ui,/data-therapy-advanced-effects/);
 assert.match(ui,/effectsOpen\?advancedEffects:null/);
 assert.doesNotMatch(ui,/fetch\(|checkout|supabase|createQuickVideo|localStorage/);
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/data-therapy-subtab="practice"/);
 assert.match(browser,/data-therapy-effects-toggle/);
});
test("Mobile visuals have roomy touch targets and correct eight-draft disclosure",()=>{
 assert.match(css,/min-height:74px/);
 assert.match(css,/min-height:50px/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(ui,/Eight-session mode starts with a plan and one script/);
 assert.match(ui,/Курс начинается с плана и первого текста/);
});

test("Therapy WebKit preserves voice and reviewed recording rights",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.ok(browser.includes("await expect(personalMusic.locator('[role=\"radio\"]')).toHaveCount(0);"));
 assert.ok(browser.includes("data-phrase-music-guidance=\"voice\""));
 assert.ok(browser.includes("data-therapy-subtab=\"practice\""));
 assert.ok(browser.includes("data-therapy-effects-toggle"));
});

test("Therapy uses the existing consented writer only for a verified seven-part AI draft",()=>{
 const api=read("app/api/holistic-support/meditation-writer/brief/route.js");
 const bridge=read("lib/holistic-support/meditation-writer/mandala-bridge.mjs");
 assert.match(parent,/approvedVideoConcept=\{approvedVideoConcept\}/);
 assert.match(writer,/buildMandalaWriterRequest\(/);
 assert.match(writer,/approvedVideoConcept\?\.signature/);
 assert.match(writer,/approvedVideoConcept\?\.sceneOutline/);
 assert.match(writer,/allowPersonalNotes:false/);
 assert.match(writer,/data-meditation-ai-opt-in/);
 assert.match(writer,/resourceImageryOptIn:true,generationMode:"llm"/);
 assert.match(writer,/externalModelOptIn:true,providerPreference:"auto"/);
 assert.match(writer,/fetch\("\/api\/holistic-support\/meditation-writer\/brief"/);
 assert.match(writer,/data\.modelUsed!==true/);
 assert.match(writer,/data\.segments\.length!==7/);
 assert.match(writer,/writerOrigin==="openrouter_free"/);
 assert.match(writer,/writerOrigin==="gemini_free"/);
 assert.match(api,/requiresEditorialReview:true/);
 assert.match(api,/freeWriterProviders\(process\.env,providerPreference\)/);
 assert.match(bridge,/MOTIFS=new Set/);
 assert.doesNotMatch(writer,/x-goog-api-key|api\.openrouter\.ai|generativelanguage\.googleapis\.com/);
 const safe=buildMandalaWriterRequest({locale:"en",theme:"relationships",
   selectedGoals:["relationships"],motifId:"comfortable_corner",durationMinutes:10,
   styleId:"grounded_practical",avoidElements:["water"]});
 assert.equal(safe.status,"ready");
 assert.equal(safe.request.motifId,"comfortable_corner");
 assert.deepEqual(safe.request.avoidElements,["water"]);
 assert.equal(safe.privateNotesAvailableToExternalFreeModel,false);
 assert.equal(safe.externalProviderCalled,false);
 const forged=buildMandalaWriterRequest({locale:"en",theme:"relationships",
   selectedGoals:["relationships"],motifId:"unreviewed_script_injection"});
 assert.equal(forged.status,"invalid");
});

test("course generates all eight local texts only on individual requests",()=>{
 assert.match(writer,/function openCourseSession\(dayNumber:number\)/);
 assert.match(writer,/dayNumber<1\|\|dayNumber>8/);
 assert.match(writer,/data-meditation-course-create-day=\{day.number\}/);
 assert.match(writer,/setCourseScripts\(current=>/);
 assert.match(writer,/scene:day.motif/);
 assert.match(writer,/isMeditationSafetyResponse\(output,locale\)/);
 assert.match(writer,/Sessions 2–8 are an explicit local request/);
 assert.doesNotMatch(ui,/autoPay|autoRender|autoGenerate/);
});
