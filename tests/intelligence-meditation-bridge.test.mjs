import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reasonAcrossMeditations } from '../lib/holistic-support/client-reasoning-bridge.mjs';

const videos = JSON.parse(readFileSync(new URL('../data/academy/meditation-catalog-candidates-20261028.json', import.meta.url), 'utf8')).videos;
// This ID is also in the existing English-guided-meditations source manifest.
const sourceId = 'HqfixazXqRY';
const base = { intent: { language: 'en', selectedTopics: ['energy'] }, safety: { status: 'clear' }, videos, publishedSourceIds: [sourceId] };

test('uses the actual meditation ranker and a published original as a real action', () => {
  const result = reasonAcrossMeditations(base);
  assert.equal(result.status, 'recommend');
  assert.equal(result.primary.id, `youtube:${sourceId}`);
  assert.equal(result.primary.href, `https://www.youtube.com/watch?v=${sourceId}`);
  assert.equal(result.primary.kind, 'video');
  assert.equal(result.modelUsed, false);
});
test('missing safety, missing whitelist, incorrect language and unknown duration fail closed', () => {
  assert.equal(reasonAcrossMeditations({ ...base, safety: {} }).status, 'safety_check_required');
  assert.equal(reasonAcrossMeditations({ ...base, publishedSourceIds: [] }).status, 'no_match');
  assert.equal(reasonAcrossMeditations({ ...base, intent: { language: 'es', selectedTopics: ['energy'] } }).status, 'no_match');
  assert.equal(reasonAcrossMeditations({ ...base, intent: { ...base.intent, maxDurationMinutes: 5 } }).status, 'no_match');
});
test('a crisis cue in free text overrides an upstream clear signal before ranking', () => {
  const result = reasonAcrossMeditations({ ...base, intent: { ...base.intent, goalText: 'I want to die' } });
  assert.equal(result.status, 'safety_handoff');
  assert.deepEqual(result.suggestions, []);
  assert.equal(JSON.stringify(result).includes('I want to die'), false);
});
test('malformed or oversized text cannot use an upstream clear signal', () => {
  for (const goalText of [{}, 'x'.repeat(501)]) {
    const result = reasonAcrossMeditations({ ...base, intent: { ...base.intent, goalText } });
    assert.equal(result.status, 'safety_check_required');
    assert.deepEqual(result.suggestions, []);
  }
});
test('rejects mismatched source URL even when the ID is whitelisted', () => {
  const original = videos.find(video => video.youtube_id === sourceId);
  const result = reasonAcrossMeditations({ ...base, videos: [{ ...original, source_url: 'https://evil.example/' }] });
  assert.equal(result.status, 'no_match');
});
test('no matching requested topic does not produce an unrelated video', () => {
  assert.equal(reasonAcrossMeditations({ ...base, intent: { language: 'en', selectedTopics: ['sleep'] } }).status, 'no_match');
});
test('honors an explicitly different format and excluded safety flags', () => {
  assert.equal(reasonAcrossMeditations({ ...base, intent: { ...base.intent, formats: ['audio'] } }).status, 'no_match');
  const original = videos.find(video => video.youtube_id === sourceId);
  assert.equal(reasonAcrossMeditations({ ...base, videos: [{ ...original, safety_flags: ['flashing'] }], intent: { ...base.intent, avoidSafetyFlags: ['flashing'] } }).status, 'no_match');
});
test('relationship-tagged content remains unavailable until its sensitivity is reviewed', () => {
  const tantra = videos.find(video => video.youtube_id === 'w2BN-HYmHUk');
  const result = reasonAcrossMeditations({ ...base, intent:{language:'en',selectedTopics:['relationships']}, videos:[tantra], publishedSourceIds:[tantra.youtube_id] });
  assert.equal(result.status, 'no_match');
});
