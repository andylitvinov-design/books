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
 assert.match(director,/const nextGoal=text\.trim\(\)\|\|fallback/);
 const field=director.slice(director.indexOf("const requestField="),director.indexOf("const requestInput="));
 assert.doesNotMatch(field,/setSelectedSubcategoryId\(|setSelectedTopicId\(/);
});
test("Ideas keeps native Safari summary activation and remembers open state across portal remounts",()=>{
 assert.match(director,/const ideaRefinementOpenRef=useRef\(false\)/);
 assert.match(director,/const ideaRefinementNodeRef=useRef<HTMLDetailsElement\|null>\(null\)/);
 assert.match(director,/const bindIdeaRefinement=useCallback\(\(node:HTMLDetailsElement\|null\)=>\{/);
 assert.match(director,/if\(node && ideaRefinementOpenRef\.current\)node\.open=true/);
 assert.match(director,/ref=\{bindIdeaRefinement\}/);
 assert.match(director,/if\(event\.currentTarget===ideaRefinementNodeRef\.current\)/);
 assert.match(director,/ideaRefinementOpenRef\.current=event\.currentTarget\.open/);
 assert.doesNotMatch(director,/open=\{ideaRefinementOpen\}/);
 assert.doesNotMatch(director,/preventDefault\(\);setIdeaRefinementOpen/);
 assert.match(director,/createPortal\(<details[\s\S]*?data-video-ideas-refinement[\s\S]*?,ideaTarget\)/);
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.match(browser,/await refinement\.locator\(":scope > summary"\)\.click\(\)/);
 assert.match(browser,/await expect\(refinement\)\.toHaveAttribute\("open",""\)/);
 assert.doesNotMatch(browser,/refinement\.locator[^\n]*\.click\(\{force:/);
});
test("Ideas owns meaning/scenarios and Montage owns motif",()=>{
 assert.match(studio,/data-video-director-idea-controls/);
 assert.match(director,/setIdeaTarget\(document\.querySelector<HTMLElement>\("\[data-video-director-idea-controls\]"\)\)/);
 assert.match(director,/createPortal\(<details[\s\S]*?data-video-ideas-refinement[\s\S]*?,ideaTarget\)/);
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
 for(const token of ["1б. Подкатегория","1b. Subcategoría","1b. Subcategory",
 "2. Тема (по желанию)","2. Topic (optional)","2. Tema (opcional)",
 "Refine topic, meaning and story (optional)",
 "Рекомендуемый визуальный стиль","Recommended visual style"])
   assert.ok(director.includes(token),token);
 for(const token of ["3. Ваше желание (необязательно)",
 "3. Your wish (optional)","3. Tu deseo (opcional)"])
   assert.ok(studio.includes(token),token);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});

test("Goals CTA, Montage Add video, Messenger handoff and media e2es use the real visible route",()=>{
  assert.match(studio,/const continueToIdeas = \(\) => \{[\s\S]*?setActiveWorkspace\("phrases"\)/);
  assert.match(studio,/data-video-continue-scenarios[\s\S]*?onClick=\{continueToIdeas\}/);
  for(const text of ["Далее к идеям","Continuar a ideas","Continue to ideas"])
    assert.ok(studio.includes(text),text);
  assert.match(studio,/const openVideoScenarioStep = \(\) => \{[\s\S]*?setVideoScenarioOpen\(true\);[\s\S]*?setShowAdvancedVideo\(true\);[\s\S]*?setActiveWorkspace\("video"\)/);
  assert.match(studio,/onAddVideo=\{\(\)=>\{[\s\S]*?openVideoScenarioStep\(\);/);
  assert.match(studio,/"video-director-chat":"video"/);
  assert.match(studio,/hash==="video-director-chat"[\s\S]*?setDirectorChatOpen\(true\)/);
  const voice=read("scripts/verify-affirmation-voice-browser.mjs");
  const live=read("scripts/benchmarking/first-video-live-export.mjs");
  const motion=read("scripts/benchmarking/verify-original-motion-export.mjs");
  for(const file of [voice,live,motion])
    assert.match(file,/data-video-continue-scenarios/);
  for(const file of [live,motion]){
    assert.match(file,/data-video-montage-tab="text"/);
    assert.match(file,/data-video-montage-effects/);
    assert.match(file,/data-video-montage-next="text"/);
    assert.match(file,/VISIBLE_STYLE_NEXT_MUST_OPEN_TEXT/);
    assert.match(file,/await page\.waitForFunction\(\(\)=>[\s\S]*?data-video-montage-tab="text"/,
      "real WebKit must await a committed Text tab, not inspect pre-commit React state");
    assert.doesNotMatch(file,/await page\.locator\('\[data-video-montage-tab="text"\]'\)\.click\(\)/,
      "the protected browser must use the current visible Style -> Text Next CTA");
    assert.match(file,/data-video-timeline-add-video/);
    assert.doesNotMatch(file,/await (?:allStories|page\.locator\('\[data-auto-video-all-scenes\]'\))\.click\(\)/);
  }
  assert.match(live,/ENCODED_VIDEO_STREAM_MISSING/);
  assert.match(live,/SELECTED_SOUNDTRACK_MISSING_FROM_EXPORT/);
  assert.match(motion,/ffprobe/);
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
