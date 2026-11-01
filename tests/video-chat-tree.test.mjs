import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  VIDEO_CHAT_TREE_STEPS,initialVideoChatTree,nextVideoChatTreeStep,
  videoChatTreeOptions,chooseVideoChatTreeOption,resolveVideoChatTreeRequest,
  changeVideoChatPhraseFilter,chooseCustomVideoChatPhrase,autocompleteVideoChatTree,
} from "../lib/mandala/video-chat-tree.mjs";
import {
  listVideoGoalCategories,listVideoGoalTopics,listVideoGoalScenarios,
} from "../lib/mandala/video-goal-taxonomy.mjs";
import {listVideoPhraseIdeas} from "../lib/mandala/video-phrase-catalog.mjs";

const draft=(goal="",locale="ru")=>({
  ...initialVideoChatTree(goal,locale),goal,
  mood:null,aspect:null,duration:null,music:null,phrases:null,
});
const pick=(current,stage,id,locale="ru")=>{
  const next=chooseVideoChatTreeOption(current,stage,id,locale);
  assert.ok(next,`valid ${stage} selection ${id}`);
  return next;
};

test("all three locales offer the same canonical 5/30/120/480 tree without a second catalog",()=>{
  assert.deepEqual([...VIDEO_CHAT_TREE_STEPS],["category","topic","scenario","idea","phrase"]);
  for(const locale of ["ru","en","es"]){
    let topics=0,scenarios=0,ideas=0;
    for(const category of videoChatTreeOptions(draft(),"category",locale)){
      const base=pick(draft(),"category",category.id,locale);
      const subject=videoChatTreeOptions(base,"topic",locale);
      assert.equal(subject.length,6);
      topics+=subject.length;
      for(const topic of subject){
        const t=pick(base,"topic",topic.id,locale);
        const stories=videoChatTreeOptions(t,"scenario",locale);
        assert.equal(stories.length,4);
        scenarios+=stories.length;
        for(const story of stories){
          const s=pick(t,"scenario",story.id,locale);
          const storyIdeas=videoChatTreeOptions(s,"idea",locale);
          assert.equal(storyIdeas.length,4);
          ideas+=storyIdeas.length;
          for(const idea of storyIdeas){
            const i=pick(s,"idea",idea.id,locale);
            assert.equal(videoChatTreeOptions(i,"phrase",locale).length,3);
          }
        }
      }
    }
    assert.equal(videoChatTreeOptions(draft(),"category",locale).length,5);
    assert.deepEqual([topics,scenarios,ideas],[30,120,480]);
  }
});

test("chat walks goal → topic → scenario → idea → selected phrase → production settings",()=>{
  let d=draft();
  assert.equal(nextVideoChatTreeStep(d),"category");
  d=pick(d,"category","love");
  assert.equal(nextVideoChatTreeStep(d),"topic");
  d=pick(d,"topic","love-trust");
  assert.equal(nextVideoChatTreeStep(d),"scenario");
  d=pick(d,"scenario","love-trust-s2");
  assert.equal(nextVideoChatTreeStep(d),"idea");
  d=pick(d,"idea","love-trust-s2-i3");
  assert.equal(nextVideoChatTreeStep(d),"phrase");
  const option=videoChatTreeOptions(d,"phrase","ru")[0];
  d=pick(d,"phrase",option.id);
  assert.equal(d.phraseText,option.label);
  assert.equal(d.phrases,true);
  assert.equal(nextVideoChatTreeStep(d),"mood");
  const ready={...d,goal:"Доверие",mood:"slow",aspect:"portrait",
    duration:20,music:"love",phrases:true};
  assert.equal(nextVideoChatTreeStep(ready),"review");
});

test("parent changes invalidate all dependent IDs and reject mismatched paths",()=>{
  let d=pick(draft(),"category","love");
  assert.equal(chooseVideoChatTreeOption(d,"topic","stress-anxiety"),null);
  d=pick(d,"topic","love-trust");
  assert.equal(chooseVideoChatTreeOption(d,"scenario","love-self-s1"),null);
  d=pick(d,"scenario","love-trust-s1");
  assert.equal(chooseVideoChatTreeOption(d,"idea","love-trust-s2-i1"),null);
  d=pick(d,"idea","love-trust-s1-i2");
  d=pick(d,"phrase",videoChatTreeOptions(d,"phrase")[0].id);
  const changed=pick(d,"category","stress");
  assert.equal(changed.categoryId,"stress");
  for(const field of ["topicId","scenarioId","ideaId","phraseId","phraseText"])
    assert.equal(changed[field],null,field);
  const newTopic=pick(changed,"topic","stress-anxiety");
  assert.equal(newTopic.categoryId,"stress");
});

test("changing an editorial goal clears only generated goal copy, not the visitor's own words",()=>{
  const path=pick(pick(draft(),"category","love"),"topic","love-trust");
  const generatedGoal=listVideoGoalTopics("love","ru").find(row=>row.id==="love-trust")?.desiredOutcome;
  assert.ok(generatedGoal);
  const changed=pick({...path,goal:generatedGoal},"category","business");
  assert.equal(changed.goal,"");
  const custom=pick({...path,goal:"Моя личная история"},"category","business");
  assert.equal(custom.goal,"Моя личная история");
  const topicChanged=pick({...path,goal:generatedGoal},"topic","love-self");
  assert.equal(topicChanged.goal,"");
});

test("text search never invents a category for unsupported food subject",()=>{
  const matched=initialVideoChatTree("доверие","ru");
  assert.equal(matched.categoryId,"love");
  assert.equal(matched.topicId,"love-trust");
  const unknown=draft("Сделай видео о еде");
  assert.equal(unknown.categoryId,null);
  assert.equal(autocompleteVideoChatTree(unknown,"energy","ru"),null);
  assert.equal(resolveVideoChatTreeRequest(unknown,"еда","category","ru"),null);
  const valid=resolveVideoChatTreeRequest(draft(),"доверие","category","ru");
  assert.equal(valid?.topicId,"love-trust");
  const restricted=resolveVideoChatTreeRequest(
    pick(draft(),"category","stress"),"доверие","topic","ru");
  assert.equal(restricted,null);
});

test("tone, addressee and length change only phrase selection, not chosen story",()=>{
  let d=pick(pick(pick(pick(draft(),"category","body"),"topic","body-release"),
    "scenario","body-release-s1"),"idea","body-release-s1-i1");
  d=pick(d,"phrase",videoChatTreeOptions(d,"phrase")[0].id);
  const ids=[d.categoryId,d.topicId,d.scenarioId,d.ideaId];
  for(const [key,value] of [["tone","confident"],["speaker","support"],
    ["length","extended"]]){
    const next=changeVideoChatPhraseFilter(d,key,value);
    assert.ok(next);
    d=next;
    assert.deepEqual([d.categoryId,d.topicId,d.scenarioId,d.ideaId],ids);
    assert.equal(d.phraseId,null);
  }
  assert.equal(changeVideoChatPhraseFilter(d,"tone","fake"),null);
  const candidate=videoChatTreeOptions(d,"phrase")[0];
  assert.ok(candidate?.label);
  d=pick(d,"phrase",candidate.id);
  assert.equal(d.phraseText,candidate.label);
  assert.equal(d.length,"extended");
  assert.ok(d.phraseText.includes("\n"));
  const typed=chooseCustomVideoChatPhrase(d,"Я выбираю свой путь.");
  assert.equal(typed?.phraseId,"custom");
  assert.equal(typed?.phraseText,"Я выбираю свой путь.");
  assert.equal(chooseCustomVideoChatPhrase(d,"x".repeat(97)),null);
  assert.equal(chooseCustomVideoChatPhrase(d,"<script>"),null);
});

test("one-click shortcut fills missing nodes and filters without overwriting choices",()=>{
  const selected=pick(pick(draft(),"category","love"),"topic","love-trust");
  const chosen=pick(selected,"scenario","love-trust-s3");
  const next=autocompleteVideoChatTree({
    ...chosen,aspect:"square",music:"none",phrases:false,
  },"relationships","ru");
  assert.equal(next?.scenarioId,"love-trust-s3");
  assert.equal(next?.ideaId,"love-trust-s3-i1");
  assert.equal(next?.aspect,"square");
  assert.equal(next?.music,"none");
  assert.equal(next?.phrases,false);
  assert.equal(next?.phraseId,null);
  assert.equal(nextVideoChatTreeStep({...next,mood:"slow",duration:30}),"review");
});

test("auto-selected extended phrase keeps both sentences for two actual scene captions",()=>{
  const selected=pick(pick(draft(),"category","love"),"topic","love-trust");
  const auto=autocompleteVideoChatTree({...selected,length:"extended"},
    "relationships","ru");
  assert.equal(auto?.length,"extended");
  assert.ok(auto?.phraseText.includes("\\n"));
  assert.ok(auto?.phraseText.length>35);
});

test("source integration uses one existing renderer, safe unbound warning and client-only prepared copy",()=>{
  const chat=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(chat,/videoChatTreeOptions\(draft,step,locale\)/);
  assert.match(chat,/data-video-chat-tree-choice/);
  assert.match(chat,/data-video-chat-phrase-filters/);
  assert.match(chat,/data-chat-concept-unbound/);
  assert.match(chat,/captionTexts:captions/);
  assert.match(chat,/approvedPlanKeyRef\.current!==planKey/);
  assert.match(studio,/MandalaVideoDirectorChat/);
  assert.match(studio,/scenario\.edit,scenario\.aspect/);
  assert.match(studio,/compileFreeFilmPreset/);
  assert.match(studio,/MediaRecorder/);
  assert.equal(listVideoGoalCategories("ru").length,5);
  assert.equal(listVideoGoalTopics("love","ru").length,6);
  assert.equal(listVideoGoalScenarios("love-trust","ru").length,4);
  assert.equal(listVideoPhraseIdeas("love-trust-s1","ru").length,4);
});
