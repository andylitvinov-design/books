import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(name)=>readFileSync(new URL("../components/"+name,import.meta.url),"utf8");
const director=read("mandala-auto-video-director.tsx");
const studio=read("mandala-free-video-studio.tsx");
const layout=read("mandala-video-goal-refresh.css");
const mobile=layout.slice(layout.indexOf("/* Goal 1: owner mobile correction"));

test("Goal keeps one live audience toggle in the same mobile title row",()=>{
  assert.match(studio,/data-video-director-audience-controls/);
  assert.match(studio,/1\. Choose your goal/);
  assert.match(studio,/1\. Выберите цель/);
  assert.match(studio,/1\. Elige tu objetivo/);
  assert.match(director,/createPortal\(audienceBar,audienceTarget\)/);
  assert.match(mobile,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(mobile,/white-space:nowrap!important/);
});
test("Subcategories are a distinct prominent step with touch-sized choices",()=>{
  assert.match(director,/data-auto-video-subcategories/);
  assert.match(director,/2\. Choose a subcategory/);
  assert.match(director,/2\. Выберите подкатегорию/);
  assert.match(director,/2\. Elige una subcategoría/);
  assert.match(mobile,/\[data-auto-video-subcategories\]/);
  assert.match(mobile,/\[data-mytube-subcategories\]/);
  assert.match(mobile,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(mobile,/min-height:62px!important/);
  assert.match(director,/data-auto-video-subcategory=\{item\.id\}/);
});
test("Exactly four source-backed topics replace prior choices at the third quiz step",()=>{
  assert.match(director,/const visibleQuickTopicIds=goalQuizStep===3/);
  assert.ok(director.includes('taxonomyTopics.map(item=>item.id).slice(0,4)'));
  assert.match(director,/data-video-goal-topic-chips/);
  assert.match(director,/data-video-optional-topic/);
  assert.match(mobile,/\[data-video-goal-topic-chips\] button/);
  assert.match(mobile,/min-height:60px!important/);
});

test("legacy CSS cannot hide mobile subcategory heading or shrink choice buttons",()=>{
  assert.match(mobile,/\[data-auto-video-goal-panel\] \[data-auto-video-subcategories\] > p\[data-video-goal-category-title\]\s*\{\s*display:block!important;/);
  assert.match(mobile,/\[data-auto-video-goal-panel\] \[data-auto-video-subcategories\] \[data-mytube-subcategories\] button\[data-auto-video-subcategory\]\s*\{[^}]*min-height:62px!important;[^}]*font:750 clamp\(14px,3\.9vw,16px\)/);
  assert.match(mobile,/button\[data-auto-video-subcategory\] span\s*\{\s*font:inherit!important;/);
  assert.match(mobile,/button\[data-auto-video-subcategory\]\[aria-pressed="true"\]\s*\{[^}]*border:2px solid #087f69!important;/);
});


test("explicit three-step quiz gates Generate and Personalization with back support",()=>{
  assert.ok(director.includes('goalQuizComplete=videoAudience==="self"&&goalCategoryAnswered'));
  assert.ok(director.includes('setGoalCategoryAnswered(true);setGoalQuizStep(2);'));
  assert.ok(director.includes('setGoalCategoryAnswered(true);setGoalQuizStep(3);'));
  assert.ok(director.includes('const backGoalQuiz=()=>'));
  assert.ok(director.includes('setSelectedSubcategoryId("");setSelectedTopicId("");'));
  assert.ok(director.includes('if(videoAudience==="self")return goalQuizComplete;'));
  assert.ok(studio.includes('onGoalQuizChange={setGoalQuizState}'));
  assert.ok(studio.includes('if(!goalQuizReady)return;'));
  assert.ok(studio.includes('if(!goalQuizReady||!studioHydrated||recording||preparing)return false;'));
  assert.equal((studio.match(/disabled=\{!goalQuizReady\|\|!studioHydrated\|\|recording\|\|preparing\}/g)||[]).length,2);
  assert.ok(studio.includes('hidden={goalQuizState.audience==="self"&&goalQuizState.step!==3}'));
  assert.ok(layout.includes('[data-video-goal-quiz-topic-stage][hidden]{display:none!important}'));
});


test("canonical taxonomy has exactly four unique choices at every stage, RU/EN/ES",()=>{
  const catalog=JSON.parse(readFileSync(new URL("../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json",import.meta.url),"utf8"));
  assert.equal(catalog.categories.length,4);
  for(const category of catalog.categories){
    assert.equal(category.subcategories.length,4,category.id);
    const seen=new Set();
    for(const subcategory of category.subcategories){
      assert.equal(subcategory.topics.length,4,subcategory.id);
      for(const topic of subcategory.topics){
        assert.equal(seen.has(topic.id),false,topic.id);
        seen.add(topic.id);
        for(const lang of ["ru","en","es"])assert.ok(topic.label[lang],topic.id+lang);
      }
    }
  }
  assert.ok(studio.includes('goalQuizReady=goalQuizState.audience==="others"||goalQuizState.complete'));
  assert.ok(director.includes('const quickTopicPanel=videoAudience==="others"'));
});
