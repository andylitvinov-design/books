import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const director=read("components/mandala-auto-video-director.tsx");
const studio=read("components/mandala-free-video-studio.tsx");
const css=read("components/mandala-auto-video-director.module.css");

test("Goal has real category/subcategory and separate optional topic and request",()=>{
 const goal=director.slice(director.indexOf("const goalPanel="),director.indexOf("const quickTopicPanel="));
 assert.match(goal,/data-auto-video-category=\{item\.id\}/);
 assert.match(goal,/data-mytube-subcategories/);
 assert.match(goal,/taxonomySubcategories\.map\(item=>/);
 assert.doesNotMatch(goal,/data-mytube-meaning-axes|data-mytube-motif-choices|data-mytube-style-filter/);
 assert.match(director,/data-video-optional-topic disabled=\{disabled\|\|!selectedSubcategoryId\}/);
 assert.match(director,/data-auto-video-input value=\{requestDraft\}/);
 assert.match(director,/const nextGoal=requestDraft\.trim\(\)\|\|item\.label/);
 assert.match(director,/onGoalChange\(nextGoal\)/);
 const field=director.slice(director.indexOf("const requestField="),director.indexOf("const requestInput="));
 assert.doesNotMatch(field,/setSelectedSubcategoryId\(|setSelectedTopicId\(/);
});
test("Ideas uses one accessible React-owned disclosure with genuine Safari activation",()=>{
 assert.match(director,/const \[ideaRefinementOpen,setIdeaRefinementOpen\]=useState\(false\)/);
 assert.match(director,/data-video-ideas-refinement-toggle/);
 assert.match(director,/aria-expanded=\{ideaRefinementOpen\}/);
 assert.match(director,/onClick=\{\(\)=>setIdeaRefinementOpen\(open=>!open\)\}/);
 assert.match(director,/data-video-ideas-refinement-panel hidden=\{!ideaRefinementOpen\}/);
 assert.doesNotMatch(director,/ref=\{bindIdeaRefinement\}|ideaRefinementOpenRef/);
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/await refineToggle\.click\(\)/);
 assert.match(browser,/await expect\(refineToggle\)\.toHaveAttribute\("aria-expanded","true"\)/);
 assert.match(browser,/await expect\(refinePanel\)\.toBeVisible\(\)/);
 assert.doesNotMatch(browser,/refineToggle\.click\(\{force:true\}\)/);
});
test("Ideas owns meaning/scenarios and Montage owns motif",()=>{
 assert.match(studio,/data-video-director-idea-controls/);
 assert.match(director,/setIdeaTarget\(document\.querySelector<HTMLElement>\("\[data-video-director-idea-controls\]"\)\)/);
 assert.match(director,/createPortal\(<section className=\{css\.ideaRefinement\} data-video-ideas-refinement[\s\S]*?,ideaTarget\)/);
 const ideaAt=director.indexOf("const topicPanel=");
 const idea=director.slice(ideaAt,director.indexOf("return <section className={css.root}",ideaAt));
 const montage=director.slice(director.indexOf("const montageStylePanel="),ideaAt);
 assert.match(idea,/data-mytube-meaning-axes[\s\S]*?data-mytube-scenario-concepts/);
 assert.doesNotMatch(idea,/data-mytube-motif-choices|data-mytube-style-filter/);
 assert.match(montage,/data-mytube-motif-choices[\s\S]*?data-mytube-style-advanced/);
 assert.match(director,/createPortal\(quickTopicPanel,topicTarget\)/);
 assert.doesNotMatch(director,/createPortal\(topicPanel,topicTarget\)/);
});
test("Montage owns visual-style recommendations without changing rights gates",()=>{
 assert.match(studio,/data-video-director-style-controls/);
 assert.match(director,/setMontageTarget\(document\.querySelector<HTMLElement>\("\[data-video-director-style-controls\]"\)\)/);
 assert.match(director,/createPortal\(montageStylePanel,montageTarget\)/);
 assert.equal((director.match(/data-mytube-style-filter/g)||[]).length,1);
 assert.equal((director.match(/data-mytube-style-choices/g)||[]).length,1);
 assert.match(director,/const chooseCreativeVisuals=[\s\S]*?The style is optional/);
 assert.match(css,/:global\(\[data-active-workspace="video"\]\) \.root/);
 assert.match(css,/\.montageStyleChoices button\{min-height:44px/);
});
test("Three short prompts are labeled in EN/RU/ES",()=>{
 for(const token of ["2. Выберите категорию видео","2. Elige una categoría de vídeo","2. Choose a video category",
 "2. Тема (по желанию)","2. Topic (optional)","2. Tema (opcional)",
 "Refine topic, meaning and story (optional)",
 "Стиль видео","Video style"])
   assert.ok(director.includes(token),token);
 for(const token of ["Ваше пожелание (необязательно)",
 "Your wish (optional)","Tu deseo (opcional)"])
   assert.ok(studio.includes(token),token);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});

test("Goals, optional recipient audio, Concept and original media gates follow real visible actions",()=>{
 assert.match(studio,/const continueToIdeas = \(\) => \{[\s\S]*?setActiveWorkspace\("phrases"\)/);
 assert.match(studio,/const openGoalClarification = \(\) => \{[\s\S]*?setGoalPage\("clarify"\)/);
 assert.match(studio,/data-video-continue-scenarios[\s\S]*?onClick=\{recipientAudioSelected\?continueToIdeas:openGoalClarification\}/);
 assert.match(studio,/recipientAudioSelected[\s\S]*?Continue to montage/);
 assert.match(studio,/onBack=\{\(\)=>setGoalPage\("first"\)\} onContinue=\{continueToIdeas\}/);
 for(const wording of ["Далее: уточнить состояние","Continuar: aclarar mi estado","Next: clarify how I feel"])
   assert.ok(studio.includes(wording),wording);
 assert.match(studio,/const openVideoScenarioStep = \(\) => \{[\s\S]*?setGoalPage\("first"\);[\s\S]*?setVideoScenarioOpen\(true\)/);
 assert.match(studio,/onAddVideo=\{\(\)=>\{[\s\S]*?openVideoScenarioStep\(\);/);
 assert.match(studio,/"video-director-chat":"video"/);
 assert.match(studio,/hash==="video-director-chat"[\s\S]*?setDirectorChatOpen\(true\)/);
 const voice=read("scripts/verify-affirmation-voice-browser.mjs");
 const live=read("scripts/benchmarking/first-video-live-export.mjs");
 const motion=read("scripts/benchmarking/verify-original-motion-export.mjs");
 for(const file of [voice,live,motion]){
   assert.match(file,/data-video-continue-scenarios/);
   assert.match(file,/data-video-goal-clarify-continue/);
   assert.match(file,/data-video-montage-concept/);
   assert.match(file,/data-video-concept-approve/);
   assert.match(file,/data-video-timeline-add-video/);
   assert.doesNotMatch(file,/await (?:allStories|page\.locator\('\[data-auto-video-all-scenes\]'\))\.click\(\)/);
 }
 assert.match(voice,/FOUR_DISTINCT_VERIFIED_ORIGINAL_MASTERS_REQUIRED/);
 assert.match(live,/ENCODED_VIDEO_STREAM_MISSING/);
 assert.match(live,/SELECTED_SOUNDTRACK_MISSING_FROM_EXPORT/);
 assert.match(motion,/ffprobe/);
});
test("Goal step 2 is illustrated, scrollable, accessible and feeds the existing one Ideas editor",()=>{
 const goal=read("components/mandala-video-goal-clarification.tsx");
 const art=read("components/mandala-video-goal-clarification.module.css");
 const mobile=read("components/mandala-video-mobile.module.css");
 const ideas=read("components/mandala-video-ideas.tsx");
 for(const token of ["data-video-goal-clarification","data-video-goal-scroll","data-video-goal-choice",
  "data-video-goal-mood","data-video-goal-axis","data-video-goal-energy",
  "data-video-goal-desired-level","data-video-goal-clarify-continue"])
    assert.ok(goal.includes(token),token);
 for(const photo of ["morning-dew.jpg","wealth-sunrise.jpg","mountain-air.jpg"])
    assert.ok(art.includes(photo),photo);
 assert.match(goal,/listMeaningAxes\(locale\)/);
 assert.match(goal,/goalCurrentMeaningId/);
 assert.match(goal,/goalDesiredMeaningId/);
 assert.match(ideas,/goalProfile:VideoGoalProfile/);
 assert.match(ideas,/data-video-ideas-edit-goal/);
 assert.match(ideas,/data-video-ideas-text-size/);
 assert.match(ideas,/data-video-ideas-record/);
 assert.match(ideas,/selectedCount<5/);
 assert.match(studio,/data-video-goal-page=\{goalPage\}/);
 assert.match(studio,/goalProfile=\{goalProfile\}/);
 assert.match(mobile,/data-video-goal-page="clarify"/);
 assert.equal((studio.match(/<MandalaVideoGoalClarification /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoIdeas /g)||[]).length,1);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});

test("anonymous video export checks the actual Ready player and secured original Blob",()=>{
  const harness=read("scripts/benchmarking/real-guest-video-file.mjs");
  const live=read("scripts/benchmarking/first-video-live-export.mjs");
  const motion=read("scripts/benchmarking/verify-original-motion-export.mjs");
  for(const requirement of ["data-video-ready","data-ready-download","data-ready-save-gate",
    "data-ready-save-gate-signin","__hhTestRecordedVideoBlobs",
    "REAL_GUEST_VIDEO_BLOB_MISSING","GUEST_DOWNLOAD_MUST_REQUIRE_LOGIN"])
    assert.ok(harness.includes(requirement),"real guest video contract: "+requirement);
  assert.match(harness,/video\.readyState>=2/);
  for(const candidate of [live,motion]){
    assert.match(candidate,/installGuestVideoBlobCapture\(context\)/);
    assert.match(candidate,/readRealGuestVideo\(page/);
    assert.doesNotMatch(candidate,/await save\.click\(\)/);
  }
  for(const evidence of ["ENCODED_VIDEO_STREAM_MISSING","EXPORTED_FRAMES_NOT_MOVING",
    "LICENSED_SCENE_ORDER_MISMATCH"])
    assert.ok(live.includes(evidence),"real four-scene export acceptance: "+evidence);
  assert.ok(motion.includes("sceneCorrelations"));
  assert.ok(motion.includes("exported audio is silent"));
});

test("legacy deep links reveal the real advanced video catalog on mobile",()=>{
 assert.match(studio,/if\(hash==="video-templates"\)\{[\s\S]*?setVideoScenarioOpen\(true\)/);
 assert.match(studio,/if\(anchor==="video-templates"\)\{[\s\S]*?setVideoScenarioOpen\(true\)/);
 assert.match(studio,/setShowAdvancedVideo\(true\)/);
 assert.match(studio,/data-free-film-compilation-catalog/);
});

test("optional motif is chosen inside Montage Style without delaying Ideas",()=>{
 const mark=director.indexOf("const chooseMeaningAxis=");
 const logic=director.slice(mark,director.indexOf("const chooseTaxonomyScenario=",mark));
 assert.match(logic,/setSelectedMotifId\(listMyTubeMeaningMotifs\(selectedTopicId,id,locale\)\[0\]\?\.id\|\|""\)/);
 assert.doesNotMatch(logic,/setSelectedMotifId\(id\);setSelectedScenarioId\(""/);
 assert.match(studio,/data-video-director-style-controls hidden=\{montagePanel!=="effects"\}/);
 const mobile=read("components/mandala-video-mobile.module.css");
 assert.match(mobile,/data-video-director-style-controls\]\[hidden\]\{display:none!important\}/);
});


test("visitor-opened iHelp remains visible above the compact three-question Goal without exposing legacy tools",()=>{
 const mobile=read("components/mandala-video-mobile.module.css");
 assert.ok(mobile.includes('[data-video-scenario-open="false"][data-hh-video-ihelp-open="true"]'),
   "only explicitly opened video iHelp overrides the Goals stage hiding rule");
 assert.ok(mobile.includes('[data-video-director-chat-details][data-workspace-section="video"]'));
 assert.match(mobile,/\/\* The compact Goal screen hides legacy advanced sections\./);
 assert.match(studio,/window\.addEventListener\("hh:ihelp-open-video-director"/);
 assert.match(studio,/role=\{videoIHelpOpen\?"dialog":undefined\}/);
});

test("guided course uses visible Ready journey, never hidden legacy tabs or banner",()=>{
 const actual=read("scripts/verify-mandala-practices-browser.mjs");
 const ready=read("components/mandala-video-ready.tsx");
 assert.match(studio,/onOpenCourse=\{\(\)=>\{[\s\S]*?setActiveWorkspace\("practices"\);setStudioMode\("therapy"\)/);
 assert.match(ready,/data-ready-journey/);
 assert.match(ready,/data-ready-eight-sessions/);
 assert.match(ready,/data-ready-create-course/);
 const hydrated=actual.indexOf("data-video-studio-hydrated");
 const tab=actual.indexOf('const readyTab=page.locator');
 const tap=actual.indexOf("await readyTab.click()",tab);
 const journey=actual.indexOf('const journey=ready.locator("[data-ready-journey]")',tap);
 const courseTap=actual.indexOf("await enterCourse.click()",journey);
 const opened=actual.indexOf('course.waitFor({state:"visible"',courseTap);
 assert.ok(hydrated>=0&&tab>hydrated&&tap>tab&&journey>tap&&
   courseTap>journey&&opened>courseTap,
   "visitor must open Ready, preview 8 sessions and tap Create before guided course");
 assert.doesNotMatch(actual,/data-video-quick-control="practices"|data-video-therapy-start|click\(\{force:true\}\)/);
 for(const feature of ["data-guided-focus-state","data-guided-generate-meditation",
   "data-guided-eight-sessions","data-guided-open-personal-meditation",
   "data-meditation-course-contact","data-meditation-course-submit"])
   assert.ok(actual.includes(feature),"retain substantive/private course acceptance: "+feature);
});

test("guided meditation choice commits before opening and omission on real WebKit",()=>{
 const course=read("components/mandala-guided-course.tsx");
 const browser=read("scripts/verify-mandala-practices-browser.mjs");
 assert.match(course,/import \{ flushSync \} from "react-dom"/);
 assert.match(course,/flushSync\(\(\)=>setMeditationChoice\("include"\)\)/);
 assert.match(course,/flushSync\(\(\)=>setMeditationChoice\("omit"\)\)/);
 const add=course.indexOf('flushSync(()=>setMeditationChoice("include"))');
 const parentAdd=course.indexOf('onAddMeditation?.(firstScript)',add);
 const omit=course.indexOf('flushSync(()=>setMeditationChoice("omit"))');
 const parentOmit=course.indexOf('onOmitMeditation?.()',omit);
 assert.ok(add>=0&&parentAdd>add&&omit>=0&&parentOmit>omit,
   "include and omit state commit before parent native details mutations");
 const tap=browser.indexOf('await include.click()');
 const committed=browser.indexOf('await expect(include).toHaveAttribute("aria-pressed","true"',tap);
 const skip=browser.indexOf('await skip.click()',committed);
 const revoked=browser.indexOf('skip?.getAttribute("aria-pressed")==="true"',skip);
 assert.ok(tap>=0&&committed>tap&&skip>committed&&revoked>skip,
   "physical WebKit must verify inclusion, then real opt-out and parent revocation");
 assert.match(browser,/audio\?\.open===false/);
 assert.match(browser,/data-guided-eight-sessions/);
 assert.doesNotMatch(browser,/click\(\{force:true\}\)/);
});
