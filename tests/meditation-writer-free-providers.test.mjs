import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileAnonymousAffirmationStrategy,reviewAffirmationPhrases,
  createAnonymousFreeAffirmationProvider } from "../lib/holistic-support/meditation-writer/affirmation-writer.mjs";
import { freeWriterProviders,requestAnonymousFreeJson,
  FREE_OPENROUTER_MODEL } from "../lib/holistic-support/meditation-writer/free-json.mjs";
import { createAnonymousOpenRouterSegmentProvider } from "../lib/holistic-support/meditation-writer/free-openrouter.mjs";
import { prepareMeditationCreativeBrief } from "../lib/holistic-support/meditation-writer/brief.mjs";
import { writeMeditationDraft } from "../lib/holistic-support/meditation-writer/writer.mjs";

const secret="SECRET_PERSONAL_HEALTH_TEXT_X";
const phrases=[
  "Мне можно выбирать свой темп",
  "Я могу сделать маленький шаг",
  "Я ценю своё время и силы",
  "У меня есть право на выбор",
  "Я могу попросить поддержку",
];
const strategy=()=>compileAnonymousAffirmationStrategy({
  locale:"ru",theme:"relationships",problemIndex:0,goalId:"connection",
  tone:"gentle",focus:"agency",
});
test("providers are disabled without independent free-tier attestations",()=>{
  const env={HH_COUNCIL_GEMINI_API_KEY:"gemini_demo_valid_123456",
    HH_COUNCIL_OPENROUTER_API_KEY:"openrouter_demo_valid_123456",
    HH_MEDITATION_WRITER_GEMINI_FREE_ENABLED:"true",
    HH_MEDITATION_WRITER_OPENROUTER_FREE_ENABLED:"true"};
  assert.deepEqual(freeWriterProviders(env),[]);
  assert.deepEqual(freeWriterProviders({
    ...env,HH_MEDITATION_WRITER_GEMINI_FREE_TIER_CONFIRMED:"true",
    HH_MEDITATION_WRITER_OPENROUTER_FREE_TIER_CONFIRMED:"true",
  }).map(x=>x.id),["gemini_free","openrouter_free"]);
  assert.equal(FREE_OPENROUTER_MODEL,"openrouter/free");
});
test("Psychologist Mind's public goal + issue codes form a bounded strategy",()=>{
  const value=strategy();
  assert.equal(value.issueCode,"fear_of_rejection");
  assert.equal(value.goalCode,"connection");
  assert.equal(value.psychologicalFocusCode,"relationships");
  assert.equal(value.approvedSkillId,"boundary_rehearsal");
  assert.equal(value.approvedApproachId,"interpersonal");
  for(const bad of [
    {locale:"ru",theme:"relationships",problemIndex:0,goalId:"connection",
      personalThought:"private",tone:"gentle"},
    {locale:"ru",theme:"relationships",problemIndex:3,goalId:"connection"},
    {locale:"ru",theme:"relationships",problemIndex:0,goalId:"stability"},
    {locale:"ru",theme:"health",problemIndex:0,goalId:"recovery",tone:"clinical"},
    {locale:"ru",theme:"relations",problemIndex:0,goalId:"connection"},
  ])assert.throws(()=>compileAnonymousAffirmationStrategy(bad),/AFFIRMATION_STRATEGY_INVALID/);
  const allowed={energy:["rhythm","recovery","strength"],money:["value","planning","stability"],
    relationships:["connection","boundaries","dialogue"],
    goals:["clarity","progress","meaning"],life:["meaning","rhythm","connection"],
    health:["recovery","rhythm","strength"]};
  for(const locale of ["ru","en","es"])
    for(const [theme,goals] of Object.entries(allowed))
      for(let i=0;i<3;i++)
        assert.equal(compileAnonymousAffirmationStrategy({locale,theme,
          problemIndex:i,goalId:goals[0]}).locale,locale);
});
test("free OpenRouter receives no personal material, and never selects paid models",async()=>{
  let sent="",url="";
  const writer=createAnonymousFreeAffirmationProvider({
    provider:"openrouter_free",key:"openrouter_demo_valid_123456",
    fetcher:async (endpoint,options)=>{
      sent=options.body;url=endpoint;
      assert.equal(options.redirect,"error");
      assert.equal(options.cache,"no-store");
      assert.equal(options.headers.Authorization,"Bearer openrouter_demo_valid_123456");
      return {ok:true,status:200,text:async()=>JSON.stringify({
        choices:[{message:{content:JSON.stringify({phrases})}}]})};
    },
  });
  const result=await writer({strategy:{...strategy(),
    rawClientPhrase:secret,profile:{symptoms:secret},clientId:secret}});
  assert.equal(result.status,"draft_review_required");
  assert.equal(result.modelUsed,true);
  assert.equal(result.requiresEditorialReview,true);
  assert.equal(result.published,false);
  assert.deepEqual([...result.phrases],phrases);
  assert.equal(url,"https://openrouter.ai/api/v1/chat/completions");
  assert.equal(JSON.parse(sent).model,"openrouter/free");
  for(const term of [secret,"rawClientPhrase","profile","clientId","symptoms"])
    assert.equal(sent.includes(term),false,term);
});
test("Gemini receives generic creative strategy and strict JSON structure only",async()=>{
  let body="",endpoint="";
  const writer=createAnonymousFreeAffirmationProvider({
    provider:"gemini_free",key:"gemini_demo_valid_123456",
    fetcher:async (url,options)=>{
      endpoint=url;body=options.body;
      return {ok:true,status:200,text:async()=>JSON.stringify({
        candidates:[{content:{parts:[{text:JSON.stringify({phrases})}]}}]})};
    },
  });
  assert.equal((await writer({strategy:strategy()})).status,"draft_review_required");
  assert.ok(endpoint.endsWith("gemini-3.5-flash-lite:generateContent"));
  assert.equal(JSON.parse(body).generationConfig.responseMimeType,"application/json");
  assert.equal(body.includes(secret),false);
});
test("reject duplicate, long, clinical, forced, markup and wrong-locale phrases",()=>{
  assert.equal(reviewAffirmationPhrases(phrases,"ru").ok,true);
  for(const bad of [
    phrases.slice(0,4),
    [...phrases.slice(0,4),phrases[0]],
    [...phrases.slice(0,4),"Я всегда полностью здорова"],
    [...phrases.slice(0,4),"Я гарантированно разбогатею"],
    [...phrases.slice(0,4),"Эта самая необыкновенная аффирмация намного длиннее предела"],
    [...phrases.slice(0,4),"Open a new life"],
    [...phrases.slice(0,4),"<script>abcdefghi</script>"],
  ])assert.equal(reviewAffirmationPhrases(bad,"ru").ok,false,bad.at(-1));
});
test("bad upstream JSON, paid models and exhausted quota never return an AI draft",async()=>{
  await assert.rejects(()=>requestAnonymousFreeJson({
    provider:"paid_model",key:"test_api_key_123456",task:"affirmations",
    system:"Original nonclinical text",data:strategy(),maxOutputTokens:500,
  }),/FREE_WRITER_INVALID_CALL/);
  const bad=createAnonymousFreeAffirmationProvider({
    provider:"openrouter_free",key:"openrouter_demo_valid_123456",
    fetcher:async()=>({ok:true,status:200,text:async()=>"{bad-json"}),
  });
  await assert.rejects(()=>bad({strategy:strategy()}),/FREE_WRITER_INVALID_OUTPUT/);
  const limited=createAnonymousFreeAffirmationProvider({
    provider:"openrouter_free",key:"openrouter_demo_valid_123456",
    fetcher:async()=>({ok:false,status:429}),
  });
  await assert.rejects(()=>limited({strategy:strategy()}),/FREE_WRITER_QUOTA/);
});
test("anonymous OpenRouter meditation still passes the independent seven-beat editor",async()=>{
  const prepared=prepareMeditationCreativeBrief({
    program:{status:"ready",mode:"self_guided",focus:"stress"},
    consent:{resourceImagery:true},
    request:{locale:"ru",focus:"stress",durationMinutes:10,
      styleId:"gentle_simple",motifId:"gentle_nature",clientPhrase:secret},
  });
  assert.equal(prepared.status,"brief_ready");
  const narration="Можно увидеть спокойное дерево у знакомой дорожки. Его ветви неторопливо движутся, и вокруг остаётся место для выбора. Нет необходимости придумывать правильный ответ. Можно наблюдать эту сцену, а можно прислушаться к звукам комнаты. Пусть темп остаётся вашим собственным и удобным сейчас.";
  let outgoing="";
  const provider=createAnonymousOpenRouterSegmentProvider({
    key:"openrouter_demo_valid_123456",
    fetcher:async (_,opts)=>{
      outgoing=opts.body;
      return {ok:true,status:200,text:async()=>JSON.stringify({
        choices:[{message:{content:JSON.stringify({segments:
          prepared.brief.beats.map(beat=>({beatId:beat.id,text:narration}))})}}]})};
    },
  });
  const result=await writeMeditationDraft(prepared,{writeSegments:provider});
  assert.equal(result.status,"draft_review_required");
  assert.equal(result.modelUsed,true);
  assert.equal(result.published,false);
  assert.equal(outgoing.includes(secret),false);
});
test("both real app surfaces enforce opt-in, private server flags and no raw notes",()=>{
  const route=readFileSync(new URL("../app/api/holistic-support/meditation-writer/affirmations/route.js",import.meta.url),"utf8");
  const meditation=readFileSync(new URL("../app/api/holistic-support/meditation-writer/brief/route.js",import.meta.url),"utf8");
  const component=readFileSync(new URL("../components/mandala-hypno-compact.tsx",import.meta.url),"utf8");
  for(const code of ["HH_MEDITATION_WRITER_BRIEF_ENABLED",
    "HH_MEDITATION_WRITER_PRODUCTION_APPROVED","requireSameOrigin",
    "auth.verified()","onlyKeys(body,FIELDS)","consumeRate",
    "externalModelOptIn!==true","PRIVATE_HEADERS"])
    assert.ok(route.includes(code),code);
  assert.ok(meditation.includes("createAnonymousOpenRouterSegmentProvider"));
  assert.ok(component.includes("data-hypno-ai-generate"));
  assert.ok(component.includes("aiConsent"));
  const request=component.match(/body:JSON.stringify\(\{locale,theme,problemIndex,goalId[\s\S]*?\}\)/u)?.[0];
  assert.ok(request);
  for(const forbidden of ["problemNote","goalNote","settings.custom","clientPhrase","profile","tests"])
    assert.equal(request.includes(forbidden),false,forbidden);
});
