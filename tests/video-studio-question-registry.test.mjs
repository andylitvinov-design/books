import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_REGISTRY, projectFieldsFromAnswers, questionsForDraft, questionsForGroup, subjectIsExplicitlyExcluded, durationFromBrief} from '../lib/mandala/video-studio-question-registry.mjs';

test('extracts supported explicit durations in three languages without treating arbitrary numbers as duration',()=>{
  for(const text of ['for 30 seconds','на 30 секунд','durante 30 segundos']) assert.equal(durationFromBrief(text),30);
  for(const text of ['for one minute','на минуту','durante un minuto']) assert.equal(durationFromBrief(text),60);
  assert.equal(durationFromBrief('30 mountains at sunrise'),null);
  assert.equal(durationFromBrief('на 90 секунд'),null);
});

test('registry preserves the approved 49 IDs with three localized options', () => {
  assert.equal(QUESTION_REGISTRY.length, 49);
  assert.deepEqual(QUESTION_REGISTRY.reduce((counts, question) => {
    counts[question.group] = (counts[question.group] || 0) + 1;
    return counts;
  }, {}), {personalization: 10, principal: 9, advanced: 11, pro: 13, extra: 6});
  for (const question of QUESTION_REGISTRY) {
    assert.equal(question.options.length, 3);
    assert.equal(question.customAllowed, true);
    for (const locale of ['en', 'ru', 'es']) {
      assert.ok(question.labels[locale]);
      assert.ok(question.options.every(option => option.labels[locale]));
    }
  }
});

test('a complete eagle flight does not repeat subject, action, or environment questions', () => {
  const questions = questionsForDraft({
    locale: 'en',
    intentText: 'A white eagle flies over mountains at sunrise for 30 seconds without text',
    answers: {},
  });
  assert.equal(questions.some(question => ['PERSONAL_06', 'PERSONAL_07', 'PERSONAL_12', 'PERSONAL_13'].includes(question.id)), false);
  assert.ok(questions.length <= 2);
});

test('an empty brief asks only the first three visual questions', () => {
  assert.deepEqual(questionsForDraft({locale: 'ru', intentText: '', answers: {}}).map(question => question.id),
    ['PERSONAL_05', 'PERSONAL_12', 'PERSONAL_13']);
});

test('a custom answer remains editable until confirmed', () => {
  const draft = {PERSONAL_05: {selectedOptionId: null, customText: 'Мой герой', confirmed: false}};
  assert.ok(questionsForDraft({intentText: 'История', answers: draft}).some(q => q.id === 'PERSONAL_05'));
  draft.PERSONAL_05.confirmed = true;
  assert.ok(!questionsForDraft({intentText: 'История', answers: draft}).some(q => q.id === 'PERSONAL_05'));
});

test('an explicit subject exclusion reopens the subject clarification in every supported locale', () => {
  const answers = {
    PERSONAL_05: {selectedOptionId: 'other', customText: null, confirmed: true},
    PERSONAL_06: {selectedOptionId: 'animal', customText: null, confirmed: true},
    PERSONAL_07: {selectedOptionId: 'eagle', customText: null, confirmed: true},
  };
  for (const intentText of ['Without an eagle, no other character', 'Sin águila, sin otro personaje', 'Без орла, нет другого героя']) {
    assert.ok(questionsForDraft({intentText, answers}).some(question => question.id === 'PERSONAL_07'));
  }
});

test('an explicit exclusion overrides only the selected animal identity', () => {
  assert.equal(subjectIsExplicitlyExcluded('Без орла, нет другого героя', 'eagle'), true);
  assert.equal(subjectIsExplicitlyExcluded('Без орла, нет другого героя', 'wolf'), false);
  assert.equal(subjectIsExplicitlyExcluded('Белый орёл летит над горами', 'eagle'), false);
});

test('personalization reveals form then animal identity before planning a vague story', () => {
  const character = {PERSONAL_05: {selectedOptionId: 'other', customText: null, confirmed: true}};
  assert.ok(questionsForDraft({intentText: 'A beautiful story', answers: character}).some(question => question.id === 'PERSONAL_06'));
  const animal = {...character, PERSONAL_06: {selectedOptionId: 'animal', customText: null, confirmed: true}};
  assert.ok(questionsForDraft({intentText: 'A beautiful story', answers: animal}).some(question => question.id === 'PERSONAL_07'));
});

test('a confirmed animal identity resumes the missing action question', () => {
  const answers = {
    PERSONAL_05: {selectedOptionId: 'other', customText: null, confirmed: true},
    PERSONAL_06: {selectedOptionId: 'animal', customText: null, confirmed: true},
    PERSONAL_07: {selectedOptionId: 'eagle', customText: null, confirmed: true},
  };
  assert.ok(questionsForDraft({intentText: 'A beautiful story', answers})
    .some(question => question.id === 'PERSONAL_12'));
});

test('Pro and Extra questions remain unavailable until their actual editing context exists', () => {
  assert.deepEqual(questionsForGroup({group: 'pro'}), []);
  assert.ok(questionsForGroup({group: 'pro', sceneSelected: true}).length > 0);
  assert.deepEqual(questionsForGroup({group: 'extra'}), []);
  assert.ok(questionsForGroup({group: 'extra', extraSelected: true}).length > 0);
});

test('confirmed creative choices map to existing storyboard fields without exporting custom text', () => {
  const fields = projectFieldsFromAnswers({
    PERSONAL_07: {selectedOptionId: 'eagle', customText: 'private note', confirmed: true},
    PERSONAL_12: {selectedOptionId: 'transforms', customText: null, confirmed: true},
    BASIC_03: {selectedOptionId: 'animated', customText: null, confirmed: true},
    BASIC_05: {selectedOptionId: '30', customText: null, confirmed: true},
    BASIC_06: {selectedOptionId: 'portrait', customText: null, confirmed: true},
  });
  assert.deepEqual(fields, {subjectChoice: 'eagle', actionChoice: 'metamorphosis', styleId: 'dream', durationSeconds: 30, aspect: 'portrait'});
});
