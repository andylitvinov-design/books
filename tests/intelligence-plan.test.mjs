import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planIntelligenceRequest } from '../lib/holistic-support/intelligence-plan.mjs';

const videos = JSON.parse(readFileSync(new URL('../data/academy/meditation-catalog-candidates-20261028.json', import.meta.url), 'utf8')).videos;
const sourceId = 'HqfixazXqRY';
const intent = { language: 'en', selectedTopics: ['energy'] };
const preflight = { immediateDanger: 'no', selfHarmThoughts: 'no' };
const body = { requestId: 'd4502108-a8b8-4d3b-813f-c255b452bde4', surface: 'cabinet', intent, preflight };
const loader = async () => ({ videos, publishedSourceIds: [sourceId] });

test('plans one real, eligible meditation and returns a private-data-free response', async () => {
  const result = await planIntelligenceRequest(body, { loadCatalog: loader });
  assert.equal(result.status, 'recommend');
  assert.equal(result.primary.id, `youtube:${sourceId}`);
  assert.equal(result.primary.href, `https://www.youtube.com/watch?v=${sourceId}`);
  assert.equal(result.primary.requiresUserConfirmation, true);
  assert.ok(result.explanation);
  assert.equal(result.feedbackRecording, 'session_only');
  assert.equal(JSON.stringify(result).includes('immediateDanger'), false);
  assert.equal(JSON.stringify(result).includes(body.requestId), false);
  assert.ok(result.alternatives.length <= 2);
});
test('urgent or missing preflight never reads the catalog', async () => {
  const never = async () => { throw new Error('catalog must not be read'); };
  assert.equal((await planIntelligenceRequest({ ...body, preflight: undefined }, { loadCatalog: never })).status, 'unavailable');
  assert.equal((await planIntelligenceRequest({ ...body, preflight: { ...preflight, selfHarmThoughts: 'yes' } }, { loadCatalog: never })).status, 'safety_handoff');
  assert.equal((await planIntelligenceRequest({ ...body, intent: { ...intent, goalText: 'I want to die' } }, { loadCatalog: never })).status, 'safety_handoff');
});
test('invalid claimed ownership is rejected before reading any catalog', async () => {
  await assert.rejects(planIntelligenceRequest({ ...body, ownerScoped: true }, { loadCatalog: async () => { throw Error('unexpected read'); } }), /INVALID_INTELLIGENCE_REQUEST/);
});
test('dismissal changes the next step for this request without recording anything', async () => {
  const result = await planIntelligenceRequest({ ...body, session: { dismissedIds: [`youtube:${sourceId}`] } }, { loadCatalog: loader });
  assert.equal(result.status, 'no_match');
  assert.equal(result.feedbackRecording, 'session_only');
});
test('catalog failure returns unavailable without echoing sensitive input', async () => {
  const result = await planIntelligenceRequest({ ...body, intent: { ...intent, goalText: 'private detail' } }, { loadCatalog: async () => { throw Error('internal secret'); } });
  assert.equal(result.status, 'unavailable');
  assert.equal(JSON.stringify(result).includes('private detail'), false);
  assert.equal(JSON.stringify(result).includes('internal secret'), false);
});
test('crisis language in untrusted catalog titles is never emitted as a recommendation', async () => {
  const badVideo = { ...videos.find(video => video.youtube_id === sourceId), title: 'I want to die' };
  const result = await planIntelligenceRequest(body, { loadCatalog: async () => ({ videos:[badVideo], publishedSourceIds:[sourceId] }) });
  assert.equal(result.status, 'no_match');
  assert.equal(JSON.stringify(result).includes('I want to die'), false);
});
test('crisis handoff and empty results are localized without inventing audio in another language', async () => {
  for (const [language, phrase] of [['ru', 'не хочу больше жить'], ['es', 'quiero morir']]) {
    const risk = await planIntelligenceRequest({ ...body, intent: { language, selectedTopics:['energy'], goalText:phrase } }, { loadCatalog: loader });
    assert.equal(risk.status, 'safety_handoff');
    assert.equal(JSON.stringify(risk).includes(phrase), false);
    const empty = await planIntelligenceRequest({ ...body, intent: { language, selectedTopics:['energy'] } }, { loadCatalog: loader });
    assert.equal(empty.status, 'no_match');
    assert.equal(empty.primary, undefined);
  }
});
test('interface and soundtrack languages stay separate', async () => {
  const result = await planIntelligenceRequest({ ...body, intent:{ language:'ru', audioLanguage:'en', selectedTopics:['energy'] } }, { loadCatalog:loader });
  assert.equal(result.status, 'recommend');
  assert.equal(result.primary.audioLanguage, 'en');
  assert.match(result.explanation, /выбранной/);
});
test('saved coaching topic is read only with explicit consent and no current focus', async () => {
  let reads=0
  const loadCoaching=async()=>{reads++;return {course:{current:{status:'completed',clientTopic:'money',actionPlan:{goal:'Private goal',approvedAt:'2026-01-01T00:00:00Z'}}}}}
  const request={...body,profileFocus:'confirmed_coaching_topic',intent:{language:'en'}}
  const result=await planIntelligenceRequest(request,{loadCatalog:loader,loadCoaching})
  assert.equal(reads,1)
  assert.equal(result.status,'no_match') // The single original fixture has no money topic.
  assert.equal(JSON.stringify(result).includes('Private goal'),false)
  await planIntelligenceRequest({...request,intent:{language:'en',selectedTopics:['energy']}},{loadCatalog:loader,loadCoaching})
  await planIntelligenceRequest({...request,preflight:undefined},{loadCatalog:loader,loadCoaching})
  await planIntelligenceRequest({...request,profileFocus:undefined},{loadCatalog:loader,loadCoaching})
  assert.equal(reads,1)
});
test('a confirmed saved topic can rank a genuinely eligible synthetic source without exposing the plan', async () => {
  const source={...videos.find(video=>video.youtube_id===sourceId),goals:['money'],goal_weights:{money:90}}
  const loadCoaching=async()=>({course:{current:{status:'completed',clientTopic:'money',actionPlan:{goal:'private goal',approvedAt:'2026-01-01T00:00:00Z'}}}})
  const result=await planIntelligenceRequest({...body,profileFocus:'confirmed_coaching_topic',intent:{language:'en'}},{loadCatalog:async()=>({videos:[source],publishedSourceIds:[sourceId]}),loadCoaching})
  assert.equal(result.status,'recommend')
  assert.match(result.explanation,/saved coaching topic/)
  assert.equal(JSON.stringify(result).includes('private goal'),false)
});
test('unapproved, missing, sensitive and future coaching data never becomes a focus', async () => {
  const request={...body,profileFocus:'confirmed_coaching_topic',intent:{language:'en'}}
  for(const current of [
    {status:'active',clientTopic:'money',actionPlan:{goal:'x',approvedAt:'2026-01-01T00:00:00Z'}},
    {status:'completed',clientTopic:'money'},
    {status:'completed',clientTopic:'sexuality',actionPlan:{goal:'x',approvedAt:'2026-01-01T00:00:00Z'}},
    {status:'completed',clientTopic:'money',actionPlan:{goal:'x',approvedAt:'2999-01-01T00:00:00Z'}},
  ]) {
    const result=await planIntelligenceRequest(request,{loadCatalog:loader,loadCoaching:async()=>({course:{current}})})
    assert.equal(result.status,'clarify')
  }
});
test('unavailable private source never becomes a fabricated saved focus', async () => {
  const result=await planIntelligenceRequest({...body,profileFocus:'confirmed_coaching_topic',intent:{language:'en'}},{loadCatalog:loader,loadCoaching:async()=>{throw Error('private detail')}})
  assert.equal(result.status,'unavailable')
  assert.equal(JSON.stringify(result).includes('private detail'),false)
});
test('explicit test format uses the existing public test shortlist and real start route', async () => {
  const { buildIntelligenceTestCatalog }=await import('../lib/holistic-support/intelligence-test-catalog.js')
  const projection=buildIntelligenceTestCatalog('en')
  assert.equal(JSON.stringify(projection).includes('questions'),false)
  assert.equal(JSON.stringify(projection).includes('definition'),false)
  const result=await planIntelligenceRequest({...body,intent:{language:'en',selectedTopics:['energy'],formats:['test']}},{loadTests:buildIntelligenceTestCatalog,loadCatalog:async()=>{throw Error('video catalog must not be read')}})
  assert.equal(result.status,'recommend')
  assert.equal(result.primary.kind,'test')
  assert.match(result.primary.href,/^\/en\/client\?startTests=hh-[a-z0-9-]+$/)
  assert.equal(result.primary.instrumentLanguage,'en')
  assert.equal(result.primary.requiresUserConfirmation,true)
});
test('test format never silently becomes video and sensitive relationship tests stay gated', async () => {
  const { buildIntelligenceTestCatalog }=await import('../lib/holistic-support/intelligence-test-catalog.js')
  const result=await planIntelligenceRequest({...body,intent:{language:'en',selectedTopics:['relationships'],formats:['test']}},{loadTests:buildIntelligenceTestCatalog,loadCatalog:loader})
  assert.equal(result.status,'no_match')
  assert.equal(result.primary,undefined)
});
test('service format uses published catalogue and requires an explicit choice for paid sessions', async () => {
  const {coreServiceOffers}=await import('../data/core-service-offers.ts')
  const request={...body,intent:{language:'en',selectedTopics:['money'],formats:['service']}}
  const loadServices=coreServiceOffers
  const free=await planIntelligenceRequest(request,{loadServices})
  assert.equal(free.primary.id,'service:situation')
  assert.equal(free.primary.href,'/en/services/free-situation-review')
  assert.equal(free.primary.free,true)
  const paid=await planIntelligenceRequest({...request,servicePayment:'include_paid'},{loadServices})
  assert.equal(paid.primary.id,'service:business')
  assert.equal(paid.primary.href,'/en/services/business-consulting')
  assert.equal(paid.primary.free,false)
  assert.equal(paid.primary.requiresUserConfirmation,true)
  assert.equal(JSON.stringify(paid).includes('price'),false)
  const timed=await planIntelligenceRequest({...request,intent:{...request.intent,maxDurationMinutes:5}},{loadServices})
  assert.equal(timed.status,'no_match')
  assert.equal((await planIntelligenceRequest({...request,preflight:undefined},{loadServices:()=>{throw Error('must not read')}})).status,'unavailable')
});
test('service adapter rejects forged routes and never suggests symbolic or unreviewed sensitive services', async () => {
  const {coreServiceOffers}=await import('../data/core-service-offers.ts')
  const offers=coreServiceOffers('en').map(row=>row.id==='business'?{...row,href:'/en/services/alchemy-of-soul'}:row)
  const request={...body,servicePayment:'include_paid',intent:{language:'en',selectedTopics:['money'],formats:['service']}}
  const result=await planIntelligenceRequest(request,{loadServices:()=>offers})
  assert.equal(result.primary.id,'service:situation')
  assert.equal(result.alternatives.length,0)
  await assert.rejects(planIntelligenceRequest({...request,servicePayment:'yes'},{loadServices:()=>offers}),/INVALID_INTELLIGENCE_REQUEST/)
  for (const locale of ['en','ru','es']) {
    const related=await planIntelligenceRequest({...request,intent:{language:locale,selectedTopics:['relationships'],formats:['service']}},{loadServices:coreServiceOffers})
    assert.equal(related.primary.id,'service:situation')
    assert.equal(related.primary.href,`/${locale}/services/free-situation-review`)
    assert.equal(related.alternatives.length,0)
  }
});
test('video history is read only after a cabinet owner explicitly opts in and marked videos are excluded', async () => {
  let reads=0
  const loadVideoHistory=async()=>{reads++;return {records:[{videoId:sourceId,status:'watched',title:'private title'}]}}
  const request={...body,intent:{language:'en',selectedTopics:['energy'],formats:['video']}}
  assert.equal((await planIntelligenceRequest(request,{loadCatalog:loader,loadVideoHistory})).status,'recommend')
  assert.equal(reads,0)
  const avoided=await planIntelligenceRequest({...request,videoHistory:'avoid_marked'},{loadCatalog:loader,loadVideoHistory})
  assert.equal(avoided.status,'no_match')
  assert.equal(reads,1)
  assert.equal(JSON.stringify(avoided).includes('private title'),false)
  await planIntelligenceRequest({...request,videoHistory:'avoid_marked',preflight:undefined},{loadCatalog:loader,loadVideoHistory})
  assert.equal(reads,1)
  await assert.rejects(planIntelligenceRequest({...request,surface:'meditation',videoHistory:'avoid_marked'},{loadCatalog:loader,loadVideoHistory}),/INVALID_INTELLIGENCE_REQUEST/)
  assert.equal((await planIntelligenceRequest({...request,videoHistory:'avoid_marked'},{loadCatalog:loader,loadVideoHistory:()=>{throw Error('private error')}})).status,'unavailable')
});
test('completed tests are used only with explicit per-request consent and are not returned', async () => {
  const {buildIntelligenceTestCatalog}=await import('../lib/holistic-support/intelligence-test-catalog.js')
  const request={...body,intent:{language:'en',selectedTopics:['energy'],formats:['test']}}
  let reads=0
  const loadTestHistory=async()=>{reads++;return {completedKeys:['hh-resource-pulse']}}
  assert.equal((await planIntelligenceRequest(request,{loadTests:buildIntelligenceTestCatalog,loadTestHistory})).primary.id,'test:hh-resource-pulse')
  assert.equal(reads,0)
  const next=await planIntelligenceRequest({...request,testHistory:'avoid_completed'},{loadTests:buildIntelligenceTestCatalog,loadTestHistory})
  assert.equal(next.primary.id,'test:hh-current-state')
  assert.equal(reads,1)
  assert.equal(JSON.stringify(next).includes('hh-resource-pulse'),false)
  await planIntelligenceRequest({...request,testHistory:'avoid_completed',preflight:undefined},{loadTests:buildIntelligenceTestCatalog,loadTestHistory})
  assert.equal(reads,1)
  await assert.rejects(planIntelligenceRequest({...request,surface:'meditation',testHistory:'avoid_completed'},{loadTests:buildIntelligenceTestCatalog,loadTestHistory}),/INVALID_INTELLIGENCE_REQUEST/)
  assert.equal((await planIntelligenceRequest({...request,testHistory:'avoid_completed'},{loadTests:buildIntelligenceTestCatalog,loadTestHistory:()=>{throw Error('private')}})).status,'unavailable')
});
test('a symbolic course preview requires its own explicit choice and points to the existing learner', async () => {
  const request={...body,intent:{language:'es',selectedTopics:['energy'],formats:['course']}}
  const absent=await planIntelligenceRequest(request,{})
  assert.equal(absent.status,'no_match')
  const result=await planIntelligenceRequest({...request,courseSelection:'reiki_preview'},{})
  assert.equal(result.status,'recommend')
  assert.equal(result.primary.href,'/en/academy/principles-of-energywork/learn')
  assert.equal(result.primary.kind,'course')
  assert.equal(result.primary.lessonLanguage,'en')
  assert.equal(result.primary.requiresUserConfirmation,true)
  assert.match(result.explanation,/Reiki/)
  assert.equal((await planIntelligenceRequest({...request,courseSelection:'reiki_preview',preflight:undefined},{})).status,'unavailable')
  assert.equal((await planIntelligenceRequest({...request,courseSelection:'reiki_preview',session:{dismissedIds:['course:reiki-preview']}},{})).status,'no_match')
  assert.equal((await planIntelligenceRequest({...request,courseSelection:'reiki_preview',intent:{...request.intent,maxDurationMinutes:5}},{})).status,'no_match')
  await assert.rejects(planIntelligenceRequest({...request,courseSelection:'other'},{}),/INVALID_INTELLIGENCE_REQUEST/)
  for (const [locale, lessonLanguage] of [['en','en'],['ru','ru'],['es','en']]) {
    const local=await planIntelligenceRequest({...request,courseSelection:'reiki_preview',intent:{...request.intent,language:locale}},{})
    assert.equal(local.primary.lessonLanguage,lessonLanguage)
    assert.equal(local.primary.href,`/${lessonLanguage}/academy/principles-of-energywork/learn`)
  }
});
