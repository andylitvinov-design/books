import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  classifyWisdomRequest,wisdomTopicQuestion,selectWisdomRow,formatWisdomTurn,
} from '../lib/coaching/wisdom-retrieval.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const example=(overrides={})=>({
  entry_id:'hh-coach-editorial-boundaries-01',topic:'boundaries',
  content_type:'aphorism',origin:'holistic_editorial',attribution:'modern_original',
  coach_enabled:true,review_status:'curated',avoid_when:['crisis','acute_distress'],
  text_ru:'Граница — это дверь с ручкой изнутри, а не стена без выхода.',
  text_en:'A boundary can be a door you open from within, not a wall with no exit.',
  text_es:'Un límite puede ser una puerta que abres desde dentro, no un muro sin salida.',
  coach_question_ru:'Какое «нет» сейчас могло бы защитить важное для вас?',
  coach_question_en:'What no could protect what matters to you right now?',
  coach_question_es:'¿Qué «no» podría proteger lo importante para ti ahora?',
  ...overrides,
});
const intent=(message,locale='ru',turns=[])=>classifyWisdomRequest({message,locale,turns});

test('explicit multilingual requests match the current user goal',()=>{
  assert.equal(intent('Мне трудно сказать нет, подбери афоризм')?.topic,'boundaries');
  assert.equal(intent('Give me a quote about work','en')?.topic,'work');
  assert.equal(intent('Dame un aforismo sobre límites','es')?.topic,'boundaries');
  assert.equal(intent('Расскажи коан про страх')?.preferredType,'koan');
  assert.equal(intent('Подбери афоризм про работу','ru',[
    {role:'user',content:'До этого мы говорили об отношениях'},
  ])?.topic,'work');
});

test('ordinary talk, refusal, no-metaphors and crisis are never intercepted',()=>{
  for(const [text,lang] of [
    ['Мне трудно сказать нет','ru'],['Не хочу афоризмов, просто выслушай','ru'],
    ['Мне не нужны цитаты','ru'],['I do not want quotes','en'],
    ['I am afraid at work','en'],['no quiero citas','es'],
    ['Расскажи коан, я хочу убить себя','ru'],['Give me a quote, I might kill myself','en'],
  ])assert.equal(intent(text,lang),null,text);
});

test('user can continue the assistant topic-clarification without a new trigger',()=>{
  assert.equal(intent('Про границы','ru',[{role:'assistant',content:wisdomTopicQuestion('ru')}])?.topic,'boundaries');
  assert.equal(intent('нет','ru',[{role:'assistant',content:wisdomTopicQuestion('ru')}]),null);
  assert.equal(intent('Sobre relaciones','es',[{role:'assistant',content:wisdomTopicQuestion('es')}])?.topic,'relationships');
});

test('retrieval fails closed on hold, language mismatch, missing attribution and repeated quote',()=>{
  const base={topic:'boundaries',locale:'ru'};
  assert.equal(selectWisdomRow([example()],base)?.entry_id,example().entry_id);
  assert.equal(selectWisdomRow([example({review_status:'needs_review',coach_enabled:false})],base),null);
  assert.equal(selectWisdomRow([example({topic:'stress'})],base),null);
  assert.equal(selectWisdomRow([example({text_en:null,coach_question_en:null})],{...base,locale:'en'}),null);
  assert.equal(selectWisdomRow([example({attribution:'classical_paraphrase'})],base),null);
  assert.equal(selectWisdomRow([example()],{...base,turns:[{role:'assistant',content:example().text_ru}]}),null);
});

test('one appropriate thought has a transparent label and one localized question',()=>{
  for(const locale of ['ru','en','es']){
    const response=formatWisdomTurn(example(),locale);
    assert.equal(response.mode,'wisdom');
    assert.equal(response.wisdomEntryId,example().entry_id);
    assert.equal(response.planSuggestion,'');
    assert.ok(response.reflection.includes(example()['text_'+locale]));
    assert.equal(response.question,example()['coach_question_'+locale]);
    assert.ok(response.reflection.length+response.question.length<=870);
  }
  const classic=example({content_type:'classical_paraphrase',
    attribution:'classical_paraphrase',origin:'public_domain_paraphrase',
    source_title:'Dao De Jing',source_locator:'11',source_url:'https://ctext.org/dao-de-jing'});
  assert.match(formatWisdomTurn(classic,'ru').reflection,/Современное переложение: Dao De Jing · 11/);
  const koan=example({content_type:'koan',origin:'user_archive',attribution:'modern_archive'});
  assert.match(formatWisdomTurn(koan,'ru').reflection,/Современная притча из архива/);
});

test('all three first-party coaching routes use the same server-side catalogue',()=>{
  const brain=source('lib/app/coaching-brain.js');
  const api=source('app/api/app/[...path]/route.js');
  const messenger=source('app/api/holistic-agent/turn/route.js');
  const server=source('lib/app/coaching-wisdom.js');
  const client=source('components/my-coach-live-dialogue.jsx');
  assert.match(brain,/resolveWisdomRequest\(config,actor/);
  assert.match(brain,/if\(boundary\)return boundary[\s\S]*wisdomLookup/);
  assert.match(api,/myCoachGenerativeTurn\(await readBody\(request,16384\)/);
  assert.match(api,/reserveCoachingFreeCall,config,actor/);
  assert.match(messenger,/safety\.status==="clear" && !recentUnsafe[\s\S]*resolveWisdomRequest/);
  assert.match(server,/FROM public\.hh_coach_wisdom_catalog_v1/);
  assert.match(server,/topic=\$1/);
  assert.doesNotMatch(server,/NEXT_PUBLIC_|OPENROUTER_API_KEY|write.*client.*message/iu);
  assert.match(client,/turn.mode==='wisdom'\?t.wisdom/);
});


test('checked-in wisdom migration preserves RLS and no client-side catalogue access',()=>{
  const ddl=source('supabase/migrations/20261112150000_coach_wisdom_catalog_v1.sql');
  assert.match(ddl,/CREATE TABLE IF NOT EXISTS public\.hh_coach_wisdom_additions_v1/);
  assert.match(ddl,/ENABLE ROW LEVEL SECURITY/);
  assert.match(ddl,/WITH \(security_invoker=true\)/);
  assert.match(ddl,/REVOKE ALL ON TABLE public\.hh_coach_wisdom_additions_v1 FROM PUBLIC, anon, authenticated/);
  assert.match(ddl,/REVOKE ALL ON TABLE public\.hh_coach_wisdom_catalog_v1 FROM PUBLIC, anon, authenticated/);
  assert.match(ddl,/GRANT SELECT ON TABLE public\.hh_coach_wisdom_catalog_v1 TO service_role,hh_app_backend/);
  assert.match(ddl,/hh_wisdom_backend_curated_v1/);
  assert.match(ddl,/hh_ideas_backend_published_v1/);
  assert.doesNotMatch(ddl,/GRANT SELECT ON TABLE public\.hh_coach_wisdom_catalog_v1 TO anon/);
});
