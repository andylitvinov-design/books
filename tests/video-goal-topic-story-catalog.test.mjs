import test from "node:test";
import assert from "node:assert/strict";
import {VIDEO_GOAL_TOPIC_STORY_CATALOG,VIDEO_STORY_CATEGORY_IDS,VIDEO_STORY_COUNTS,videoStoryCategory,videoStoryTopic,videoStoryScenario,videoStoryTopics,videoStoryScenarios,videoStoryLegacyGoalTopic,videoStoryPlan,findVideoStoryTopics} from "../lib/mandala/video-goal-topic-story-catalog.mjs";
test("5 categories, 30 unique topics, 120 source-safe 4-beat narrative storyboards",()=>{
 assert.deepEqual(VIDEO_STORY_CATEGORY_IDS,["body","work","energy","love","stress"]);
 assert.deepEqual(VIDEO_STORY_COUNTS,{categories:5,topics:30,scenarios:120});
 const tIds=[],sIds=[];
 for(const c of VIDEO_GOAL_TOPIC_STORY_CATALOG.categories){
  assert.equal(c.topics.length,6);assert.ok(videoStoryCategory(c.id));
  for(const lang of ["ru","en","es"])assert.ok(c.label[lang]);
  for(const t of c.topics){
   tIds.push(t.id);assert.equal(videoStoryTopic(t.id).categoryId,c.id);
   assert.equal(videoStoryTopics(c.id).length,6);assert.equal(videoStoryScenarios(t.id).length,4);
   assert.ok(["health","goals","money","energy","life","relationships"].includes(t.legacyTheme));
   for(const lang of ["ru","en","es"])assert.ok(t.label[lang]);
   assert.deepEqual(t.scenarios.map(s=>s.narrativeMode),["journey","encounter","renewal","practice"]);
   for(const s of t.scenarios){
    sIds.push(s.id);assert.equal(videoStoryScenario(s.id).topicId,t.id);
    assert.equal(s.shots.length,4);assert.equal(s.mediaStatus,"unassigned");
    assert.deepEqual(s.shots.map(shot=>shot.stage),["opening","discovery","turning_point","integration"]);
    assert.equal(s.shots.reduce((a,b)=>a+b.durationWeight,0),100);
    assert.ok(s.shots.every(shot=>shot.visualIntent.trim()&&shot.clipId===null&&shot.photoId===null));
    for(const lang of ["ru","en","es"])assert.ok(s.label[lang]);
    const p=videoStoryPlan(s.id);assert.equal(p.canRender,false);assert.equal(p.status,"media_unassigned");
   }
  }
 }
 assert.equal(new Set(tIds).size,30);assert.equal(new Set(sIds).size,120);
});
test("legacy six quick goals map to exact topics",()=>{
 const m={calm:"stress-anxiety",vitality:"energy-vitality",confidence:"work-confidence",connection:"love-closeness","fresh-start":"energy-new-stage",stability:"work-finance"};
 for(const [id,topic] of Object.entries(m))assert.equal(videoStoryLegacyGoalTopic(id).id,topic);
 assert.equal(videoStoryLegacyGoalTopic("missing"),null);
});
test("local recommendations respect the chosen category",()=>{
 assert.ok(findVideoStoryTopics({categoryId:"work",query:"хочу уверенность"}).some(x=>x.id==="work-confidence"));
 assert.deepEqual(findVideoStoryTopics({categoryId:"love",query:"финансовые расходы"}),[]);
 assert.equal(findVideoStoryTopics({categoryId:"stress"}).length,6);
 assert.equal(findVideoStoryTopics({categoryId:"unknown"}).length,0);
 assert.equal(videoStoryPlan("fake"),null);
});
