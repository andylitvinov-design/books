import test from "node:test";
import assert from "node:assert/strict";
import {
  auditVideoGoalTaxonomy,VIDEO_GOAL_TAXONOMY_VERSION,
  VIDEO_GOAL_CATEGORY_ORDER,VIDEO_GOAL_LEGACY_PROFILE_TOPICS,
  VIDEO_GOAL_CATEGORIES,VIDEO_GOAL_TOPICS,VIDEO_GOAL_SCENARIOS,
  VIDEO_STORY_MOTIFS,
  listVideoGoalCategories,listVideoGoalTopics,listVideoGoalScenarios,
  getVideoGoalTopic,buildVideoGoalScenarioPlan,resolveVideoGoalTopic,
} from "../lib/mandala/video-goal-taxonomy.mjs";

test("five categories, thirty specific topics, 120 different storyboards and 480 beats",()=>{
  const audit=auditVideoGoalTaxonomy();
  assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues));
  assert.deepEqual({ok:audit.ok,categories:audit.categories,topics:audit.topics,
    scenarios:audit.scenarios,storyboardBeats:audit.storyboardBeats},
    {ok:true,categories:5,topics:30,scenarios:120,storyboardBeats:480});
  assert.equal(audit.version,VIDEO_GOAL_TAXONOMY_VERSION);
  assert.deepEqual([...VIDEO_GOAL_CATEGORY_ORDER],["body","business","energy","love","stress"]);
  assert.equal(VIDEO_GOAL_CATEGORIES.every(c=>c.topicIds.length===6),true);
  assert.equal(VIDEO_GOAL_TOPICS.every(t=>t.scenarioIds.length===4),true);
  assert.equal(VIDEO_GOAL_SCENARIOS.every(s=>s.visualMotifs.length===4&&s.sourceStatus==="unbound"),true);
});

test("all ten preexisting profile discovery themes remain mapped, legacy themes unchanged",()=>{
  assert.deepEqual([...VIDEO_GOAL_LEGACY_PROFILE_TOPICS],[
    "business/money","business/work","energy_health/body","energy_health/emotions",
    "energy_health/recovery","personal_growth/goal","personal_growth/meaning",
    "personal_growth/support","personal_growth/traits","relationships/connection",
  ]);
  const legacy=new Set(["energy","money","relationships","goals","life","health"]);
  assert.equal(VIDEO_GOAL_TOPICS.every(x=>legacy.has(x.legacyVideoTheme)),true);
  assert.ok(getVideoGoalTopic("stress-anxiety").legacyVideoTheme==="health");
  assert.ok(getVideoGoalTopic("work-support").legacyVideoTheme==="money");
});

test("RU EN ES category-topic-story selectors keep exactly four separate named storyboards",()=>{
  for(const locale of ["ru","en","es"]){
    const categories=listVideoGoalCategories(locale);
    assert.equal(categories.length,5);
    for(const category of categories){
      assert.ok(category.title);
      assert.equal(category.topicCount,6);
      const topics=listVideoGoalTopics(category.id,locale);
      assert.equal(topics.length,6);
      for(const topic of topics){
        assert.ok(topic.title);
        assert.ok(topic.desiredOutcome);
        assert.equal(topic.scenarioCount,4);
        const scenarios=listVideoGoalScenarios(topic.id,locale);
        assert.equal(scenarios.length,4);
        assert.equal(new Set(scenarios.map(s=>s.title)).size,4,
          locale+" "+topic.id+" should offer 4 differently named scripts");
        assert.equal(new Set(scenarios.map(s=>s.storyboard.map(b=>b.visualMotifId).join(","))).size,4);
        for(const scenario of scenarios){
          assert.equal(scenario.canExport,false);
          assert.equal(scenario.sourceStatus,"unbound");
          assert.equal(scenario.storyboard.length,4);
          assert.ok(scenario.storyboard.every((beat,i)=>
            beat.shot===i+1&&beat.phase&&beat.visualHint&&
            Object.hasOwn(VIDEO_STORY_MOTIFS,beat.visualMotifId)));
          const plan=buildVideoGoalScenarioPlan({
            categoryId:category.id,topicId:topic.id,scenarioId:scenario.id,locale});
          assert.equal(plan.shots.length,4);
          assert.equal(plan.requiresMediaBinding,true);
          assert.equal(plan.clientDataIncluded,false);
          assert.equal(plan.canExport,false);
          assert.equal(plan.mediaStatus,"unbound");
          assert.equal(plan.categoryId,category.id);
          assert.equal(plan.topicId,topic.id);
        }
      }
    }
  }
});

test("specific explicit choice outranks inferred text and cannot cross into other category",()=>{
  assert.deepEqual(resolveVideoGoalTopic({
    categoryId:"business",topicId:"work-focus",request:"Любовь и сон"}),
  {status:"matched",categoryId:"business",topicId:"work-focus",confidence:"explicit"});
  assert.equal(resolveVideoGoalTopic({
    categoryId:"love",topicId:"money-stability",request:"деньги"}).status,"invalid_selection");
  assert.equal(resolveVideoGoalTopic({categoryId:"invented"}).status,"invalid_selection");
  assert.equal(buildVideoGoalScenarioPlan({
    categoryId:"stress",topicId:"work-support",scenarioId:"work-support-s1"}),null);
  assert.equal(buildVideoGoalScenarioPlan({
    categoryId:"love",topicId:"love-trust",scenarioId:"love-closeness-s1"}),null);
  assert.deepEqual(listVideoGoalTopics("unknown"),[]);
  assert.deepEqual(listVideoGoalScenarios("unknown"),[]);
});

test("clear requests map to existing categories and client topic, not arbitrary default film",()=>{
  const cases=[
    [{request:"Больше близости"},["love","love-closeness"]],
    [{request:"Деньги и стабильность"},["business","money-stability"]],
    [{request:"Свободное дыхание"},["body","body-breath"]],
    [{request:"Меньше тревоги"},["stress","stress-anxiety"]],
    [{request:"Новый этап"},["energy","energy-fresh-start"]],
    [{request:"Уверенное выступление"},["business","work-speaking"]],
    [{request:"Меньше тревоги",categoryId:"stress"},["stress","stress-anxiety"]],
    [{request:"Sleep and rest",locale:"en"},["body","body-sleep"]],
    [{request:"Más cercanía",locale:"es"},["love","love-closeness"]],
  ];
  for(const [input,expected] of cases){
    const result=resolveVideoGoalTopic(input);
    assert.equal(result.status,"matched",JSON.stringify({input,result}));
    assert.deepEqual([result.categoryId,result.topicId],expected,JSON.stringify(input));
  }
});

test("unknown or unrelated subjects stay unassigned; no imaginary medical/video match",()=>{
  assert.deepEqual(resolveVideoGoalTopic({request:"еда"}),{
    status:"needs_category",categoryId:null,topicId:null,confidence:"none",
  });
  assert.deepEqual(resolveVideoGoalTopic({categoryId:"body",request:"еда"}),{
    status:"needs_topic",categoryId:"body",topicId:null,confidence:"none",
  });
  assert.equal(resolveVideoGoalTopic({request:""}).status,"needs_category");
  assert.equal(resolveVideoGoalTopic({categoryId:"stress",request:""}).status,"needs_topic");
  assert.equal(resolveVideoGoalTopic({request:{some:"not a string"}}).status,"needs_category");
});

test("output contains original four-stage semantic ideas, never fake media filenames",()=>{
  for(const s of VIDEO_GOAL_SCENARIOS){
    const p=buildVideoGoalScenarioPlan({topicId:s.topicId,scenarioId:s.id});
    const serialized=JSON.stringify(p);
    assert.ok(!serialized.includes(".mp4"));
    assert.ok(!serialized.includes("youtube.com"));
    assert.ok(!serialized.includes("storage_url"));
    assert.equal(p.shots.length,4);
  }
});
