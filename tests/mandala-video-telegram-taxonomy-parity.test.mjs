import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {initialMessengerVideoDraft,messengerVideoChoices,advanceMessengerVideo} from "../lib/mandala/video-chat-messenger-flow.mjs";

const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
const cardBlock=director.match(/const videoGoalCategories=\[([\s\S]*?)\] as const;/)?.[1];
const cardIds=[...(cardBlock||"").matchAll(/\{id:"([^"]+)"/g)].map(match=>match[1]);

test("Goal category cards and their labels match Telegram in all locales",()=>{
  assert.equal(cardIds.length,4);
  assert.equal(new Set(cardIds).size,4);
  assert.ok(!director.includes("goalCardLabels"),"remove duplicate labels");
  assert.ok(!director.includes("quickTopicLabels"),"use full source-backed topic names");
  assert.ok(director.includes("<strong>{taxonomyCategories.find(category=>category.id===item.id)?.label||item.id}</strong>"));
  assert.ok(director.includes("<span>{fullLabel}</span>"));
  assert.ok(director.includes("data-video-goal-art"));
  for(const locale of ["ru","en","es"]){
    const telegram=messengerVideoChoices(initialMessengerVideoDraft(),"category",locale);
    assert.deepEqual(cardIds,telegram.map(choice=>choice.id),locale+": category order");
    assert.deepEqual(telegram,listMyTubeCategories(locale).map(({id,label})=>({id,label})));
  }
});

test("Goal subcategory and topic questions mirror Telegram 4×4×4 choices",()=>{
  assert.ok(director.includes("listMyTubeSubcategories(selectedCategoryId,locale)"));
  assert.ok(director.includes("listMyTubeTopics(selectedCategoryId,selectedSubcategoryId,locale)"));
  assert.match(director,/taxonomySubcategories\.map\(/);
  assert.ok(director.includes("taxonomyTopics.map(item=>item.id).slice(0,4)"));
  assert.ok(director.includes('goalQuizComplete=videoAudience==="self"&&goalCategoryAnswered'));
  for(const locale of ["ru","en","es"]){
    for(const category of listMyTubeCategories(locale)){
      const a=advanceMessengerVideo(initialMessengerVideoDraft(),"category",category.id,locale);
      assert.equal(a.valid,true,category.id);
      assert.equal(a.step,"subcategory",category.id);
      const subs=listMyTubeSubcategories(category.id,locale);
      assert.equal(subs.length,4,category.id);
      assert.deepEqual(messengerVideoChoices(a.draft,"subcategory",locale),
        subs.map(({id,label})=>({id,label})));
      for(const sub of subs){
        const b=advanceMessengerVideo(a.draft,"subcategory",sub.id,locale);
        assert.equal(b.valid,true,sub.id);
        assert.equal(b.step,"mytube-topic",sub.id);
        const topics=listMyTubeTopics(category.id,sub.id,locale);
        assert.equal(topics.length,4,sub.id);
        assert.deepEqual(messengerVideoChoices(b.draft,"mytube-topic",locale),
          topics.map(({id,label})=>({id,label})));
      }
    }
  }
});
