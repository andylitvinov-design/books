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
