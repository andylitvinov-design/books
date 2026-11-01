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
  assert.match(studio,/data-video-phrase-catalog-details/);
  assert.match(studio,/setPhraseAudioExpanded\(true\)/);
  assert.match(studio,/onOpenAudio=\{\(\)=>\{/);
  assert.equal((studio.match(/<MandalaHypnoCompact /g)||[]).length,1,
    "reuse the approved single phrase editor");
  assert.match(studio,/onPhraseChoose=\{stageCatalogPhrase\}/);
  assert.doesNotMatch(studio,/onPhraseChoose=\{phrase=>\{\s*setAffirmations/);
});

test("each tone keeps distinct wording for the same selected story/idea",()=>{
  for(const scenario of VIDEO_GOAL_SCENARIOS)
    for(const locale of VIDEO_PHRASE_LOCALES){
      for(const idea of listVideoPhraseIdeas(scenario.id,locale))
        for(const speaker of VIDEO_PHRASE_SPEAKERS)
          for(const length of VIDEO_PHRASE_LENGTHS){
            const all=VIDEO_PHRASE_TONES.flatMap(tone=>listPreparedVideoPhrases({
              scenarioId:scenario.id,ideaId:idea.id,locale,tone,speaker,length,
            }).map(x=>x.text));
            assert.equal(new Set(all).size,12,
              `duplicate tone phrase for ${scenario.id}/${idea.id}/${locale}/${speaker}/${length}`);
          }
    }
});

test("all four stories have distinct, actionable idea titles for each topic and language",()=>{
  const topicMap=new Map();
  for(const scenario of VIDEO_GOAL_SCENARIOS){
    const group=topicMap.get(scenario.topicId)||[];
    group.push(scenario.id);
    topicMap.set(scenario.topicId,group);
  }
  assert.equal(topicMap.size,30);
  for(const storyIds of topicMap.values()){
    assert.equal(storyIds.length,4);
    for(const locale of VIDEO_PHRASE_LOCALES){
      const titles=storyIds.flatMap(id=>listVideoPhraseIdeas(id,locale).map(x=>x.title));
      assert.equal(titles.length,16);
      assert.equal(new Set(titles).size,16,"four stories must visibly change the phrasing");
    }
  }
});
test("manual phrase-path selection survives locale switching without a state-reset effect",()=>{
  const picker=readFileSync(new URL("../components/mandala-phrase-catalog.tsx",import.meta.url),"utf8");
  assert.match(picker,/const intentKey=JSON\.stringify\(\[wish,theme\]\)/);
  assert.match(picker,/selection\?\.intentKey===intentKey\?selection\.path/);
  assert.doesNotMatch(picker,/useEffect\(\(\)=>\{if\(recommended\)setPath\(recommended\)/);
  assert.match(picker,/const scenarioKey=path\.scenarioId\+"\:"\+locale/);
});

test("public phrase SQL preserves strict RLS and read-only grants, without patient input",()=>{
  const seed=readFileSync(new URL("../sql/hh-video-phrase-catalog-v1-20261101.sql",import.meta.url),"utf8");
  const revisions=["hh-video-phrase-tone-copy-revision-v1-20261101.sql",
    "hh-video-phrase-story-arc-copy-v1-20261101.sql"].map(file=>
      readFileSync(new URL("../sql/"+file,import.meta.url),"utf8"));
  assert.match(seed,/alter table public\.hh_video_phrase_catalog_v1 enable row level security/i);
  assert.match(seed,/revoke all on table public\.hh_video_phrase_catalog_v1 from public,anon,authenticated/i);
  assert.match(seed,/grant select on table public\.hh_video_phrase_catalog_v1 to anon,authenticated/i);
  assert.match(seed,/for select to anon,authenticated\s+using \(true\)/i);
  assert.match(seed,/hh_video_phrase_filter_v1_idx/);
  assert.doesNotMatch([seed,...revisions].join("\n"),/grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.hh_video_phrase_catalog_v1\s+to\s+(?:anon|authenticated)/i);
  assert.doesNotMatch([seed,...revisions].join("\n"),/security\s+definer/i);
  assert.doesNotMatch([seed,...revisions].join("\n"),/public\.profiles|auth\.users|patient_id|user_id\s*=|client_email/i);
});
