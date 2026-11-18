import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectIntelligenceRisk } from '../lib/holistic-support/intelligence-risk.mjs';

test('existing crisis signals interrupt recommendations in all supported languages', () => {
  for (const [language, goalText] of [
    ['en', 'I am worried about work and want to die'],
    ['ru', 'Я думаю о работе и не хочу больше жить'],
    ['es', 'Pienso en el trabajo y quiero morir'],
  ]) {
    assert.deepEqual(inspectIntelligenceRisk({ language, goalText }), { status: 'urgent' });
  }
});

test('absence of a keyword, missing input and malformed input do not establish safety', () => {
  for (const intent of [{ language: 'en', goalText: 'I want to focus on work' }, {}, null, { goalText: { status: 'clear' } }]) {
    assert.deepEqual(inspectIntelligenceRisk(intent), { status: 'unknown' });
  }
});

test('free text and caller-supplied status never leave the risk result', () => {
  assert.deepEqual(inspectIntelligenceRisk({ language: 'en', goalText: 'private details', status: 'clear' }), { status: 'unknown' });
});

test('preflight derives a decision from both explicit answers, with uncertainty fail closed', () => {
  const clear = { immediateDanger: 'no', selfHarmThoughts: 'no' };
  assert.deepEqual(inspectIntelligenceRisk({ language: 'en' }, clear), { status: 'clear' });
  assert.deepEqual(inspectIntelligenceRisk({ language: 'en', goalText: 'I want to die' }, clear), { status: 'urgent' });
  for (const preflight of [
    { ...clear, immediateDanger: 'yes' }, { ...clear, selfHarmThoughts: 'yes' },
  ]) assert.deepEqual(inspectIntelligenceRisk({ language: 'en' }, preflight), { status: 'urgent' });
  for (const preflight of [
    null, {}, { ...clear, immediateDanger: 'unsure' }, { ...clear, selfHarmThoughts: 'unsure' },
    { ...clear, status: 'clear' },
  ]) assert.deepEqual(inspectIntelligenceRisk({ language: 'en' }, preflight), { status: 'unknown' });
});
