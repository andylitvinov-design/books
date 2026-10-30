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
