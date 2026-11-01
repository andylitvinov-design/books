import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  auditVideoPhraseCatalog,listVideoPhraseIdeas,listPreparedVideoPhrases,
  getVideoPhraseContext,formatVideoPhraseForOverlay,suggestVideoPhrasePath,
  VIDEO_PHRASE_LOCALES,VIDEO_PHRASE_TONES,VIDEO_PHRASE_SPEAKERS,VIDEO_PHRASE_LENGTHS
} from "../lib/mandala/video-phrase-catalog.mjs";
import {VIDEO_GOAL_SCENARIOS} from "../lib/mandala/video-goal-taxonomy.mjs";

test("all 120 canon story IDs have four ideas and 69,120 ready phrase records",()=>{
  const report=auditVideoPhraseCatalog();
  assert.deepEqual(report.issues,[]);
  assert.equal(report.ok,true);
  assert.equal(report.categories,5);
  assert.equal(report.topics,30);
  assert.equal(report.scenarios,120);
  assert.equal(report.localizedIdeas,120*4*3);
  assert.equal(report.preparedPhraseRecords,120*4*3*4*2*2*3);
});
test("filters are exact, stable, language aware and free of AI latency",()=>{
  for(const scenario of VIDEO_GOAL_SCENARIOS)
    for(const locale of VIDEO_PHRASE_LOCALES){
      const ideas=listVideoPhraseIdeas(scenario.id,locale);
      assert.equal(ideas.length,4);
      assert.equal(new Set(ideas.map(i=>i.title)).size,4);
      for(const idea of ideas)
        for(const tone of VIDEO_PHRASE_TONES)
          for(const speaker of VIDEO_PHRASE_SPEAKERS)
            for(const length of VIDEO_PHRASE_LENGTHS){
              const params={categoryId:scenario.categoryId,topicId:scenario.topicId,
                scenarioId:scenario.id,ideaId:idea.id,locale,tone,speaker,length};
              const a=listPreparedVideoPhrases(params);
              const b=listPreparedVideoPhrases(params);
              assert.deepEqual(a,b);
              assert.equal(a.length,3);
              assert.ok(a.every(r=>r.id.includes(idea.id)&&r.tone===tone&&r.speaker===speaker));
              for(const line of a){
                const prepared=formatVideoPhraseForOverlay(line.text);
                assert.ok(prepared,JSON.stringify(line));
                assert.ok(prepared.split("\n").every(l=>Array.from(l).length<=36));
              }
            }
    }
});
test("wrong category/topic/idea and unknown filter never fall back to another user's choice",()=>{
  const args={categoryId:"love",topicId:"love-trust",
    scenarioId:"love-trust-s1",ideaId:"love-trust-s1-i2",locale:"ru"};
  assert.equal(listPreparedVideoPhrases(args).length,3);
  assert.deepEqual(listPreparedVideoPhrases({...args,categoryId:"stress"}),[]);
  assert.deepEqual(listPreparedVideoPhrases({...args,topicId:"love-self"}),[]);
  assert.deepEqual(listPreparedVideoPhrases({...args,ideaId:"stress-anxiety-s1-i2"}),[]);
  assert.deepEqual(listPreparedVideoPhrases({...args,tone:"magical"}),[]);
  assert.deepEqual(listVideoPhraseIdeas("unknown-s1","ru"),[]);
  assert.equal(getVideoPhraseContext({scenarioId:"love-trust-s1",topicId:"love-self"}),null);
  assert.equal(formatVideoPhraseForOverlay("verylongstringwithoutspaces".repeat(3)),null);
});
test("goal text changes default path; manual selected path is never overwritten by a phrase query",()=>{
  assert.equal(suggestVideoPhrasePath({request:"доверие",locale:"ru",legacyTheme:"money"}).topicId,"love-trust");
  assert.equal(suggestVideoPhrasePath({request:"zzzzzz",locale:"ru",legacyTheme:"money"}).categoryId,"business");
  assert.equal(suggestVideoPhrasePath({request:"",locale:"ru",legacyTheme:"health"}).categoryId,"stress");
});
test("one repository catalog and a single selection path, no hidden paid provider dependency",()=>{
  const mod=readFileSync(new URL("../lib/mandala/video-phrase-catalog.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(mod,/fetch\s*\(|openai|gemini|stripe|service_role|navigator\./i);
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.match(studio,/MandalaPhraseCatalog/);
  assert.match(studio,/onPhraseChoose=/);
});

test("read-only API queries the public catalog and rejects invalid remote rows",()=>{
  const api=readFileSync(new URL("../app/api/holistic-support/video-phrases/route.js",import.meta.url),"utf8");
  assert.match(api,/hh_video_phrase_catalog_v1/);
  assert.match(api,/listVideoPhraseIdeas\(scenarioId,locale\)/);
  assert.match(api,/verifiedRemoteRows/);
  assert.match(api,/asResponse\(localRows,"bundled"\)/);
  assert.match(api,/HH_APP_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(api,/SERVICE_ROLE|SECRET_KEY|SUPABASE_SERVICE_KEY/);
  assert.match(api,/scenario_id/);
  assert.match(api,/locale/);
});
test("phrase picker is wired to existing client settings and single audio UI",()=>{
  const widget=readFileSync(new URL("../components/mandala-phrase-catalog.tsx",import.meta.url),"utf8");
  assert.match(widget,/data-video-phrase-goal/);
  assert.match(widget,/data-video-phrase-topic/);
  assert.match(widget,/data-video-phrase-scenario/);
  assert.match(widget,/data-video-phrase-idea/);
  assert.match(widget,/data-video-phrase-tone/);
  assert.match(widget,/data-video-phrase-speaker/);
  assert.match(widget,/data-video-phrase-length/);
  assert.match(widget,/data-video-prepared-phrase/);
  assert.match(widget,/data-video-phrase-audioguide/);
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(studio,/quickSupportPhrases/);
  assert.match(studio,/onOpenAudio=\{\(\)=>openQuickDetailed\("video-audio"\)\}/);
  assert.match(studio,/custom:phrase,visibility:\["large"\]/);
});
