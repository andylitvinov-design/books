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
test("Idea owns topic, meaning, motif and scenario drill-down",()=>{
 assert.match(studio,/data-video-director-idea-controls/);
 assert.match(director,/setIdeaTarget\(document\.querySelector<HTMLElement>\("\[data-video-director-idea-controls\]"\)\)/);
 assert.match(director,/createPortal\(<details[\s\S]*?data-video-ideas-refinement[\s\S]*?,ideaTarget\)/);
 assert.match(director,/data-mytube-meaning-axes[\s\S]*?data-mytube-motif-choices[\s\S]*?data-mytube-scenario-concepts/);
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
 "Refine topic, meaning, motif and story (optional)",
 "Рекомендуемый визуальный стиль","Recommended visual style"])
   assert.ok(director.includes(token),token);
 for(const token of ["3. Опишите ваш запрос (необязательно)",
 "3. Describe your request (optional)","3. Describe tu idea (opcional)"])
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
