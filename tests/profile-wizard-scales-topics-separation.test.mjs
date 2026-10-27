import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const builder = readFileSync(new URL('../components/personality-profiles-builder.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/personality-profiles-builder.module.css', import.meta.url), 'utf8');
const mapping = readFileSync(new URL('../lib/profile/profile-scale-selection.js', import.meta.url), 'utf8');

function stage(n) {
  const from = builder.indexOf(`{step === ${n} && <section`);
  const to = builder.indexOf(`{step === ${n + 1} && <section`, from + 10);
  assert.ok(from !== -1 && to > from, `missing stage ${n}`);
  return builder.slice(from, to);
}

test('five steps keep order Focus → Scales → Topics → Tests → Ready in EN/RU/ES', () => {
  assert.match(builder, /stages: \["Focus", "Scales", "Topics", "Tests", "Ready"\]/);
  assert.match(builder, /stages: \["Запрос", "Шкалы", "Темы", "Тесты", "Начало"\]/);
  assert.match(builder, /stages: \["Interés", "Escalas", "Temas", "Pruebas", "Inicio"\]/);
});

test('the three goal scales are independently selectable source-backed facets, not questionnaire results', () => {
  for (const [id, en, ru, es] of [
    ['clarity', 'Goal clarity', 'Ясность цели', 'Claridad de la meta'],
    ['motivation', 'Motivation', 'Мотивация', 'Motivación'],
    ['confidence', 'Confidence', 'Уверенность', 'Confianza'],
  ]) {
    assert.ok(builder.includes(`"goal::${id}": "${en}"`));
    assert.ok(builder.includes(`"goal::${id}": "${ru}"`));
    assert.ok(builder.includes(`"goal::${id}": "${es}"`));
    assert.ok(mapping.includes(`researchAxis('${id}',`));
  }
  const scales = stage(1);
  assert.match(scales, /data-profile-scale-selection-step/);
  assert.match(scales, /group\.researchAxes\.map\(axis/);
  assert.match(scales, /data-profile-research-choice=\{axis\.id\}/);
  assert.match(scales, /aria-pressed=\{selectedResearchIds\.includes\(axis\.id\)\}/);
  assert.doesNotMatch(scales, /scale\.testTitle|test\.minutes|scale\.questions/);
  assert.match(builder, /selectedResearchIds\.length && scaleGroups\.some/);
});

test('third screen is topics only; full tests and questionnaire length appear on screen four', () => {
  const topics = stage(2);
  const tests = stage(3);
  assert.match(topics, /data-profile-topics-step/);
  assert.match(topics, /data-profile-topic-choice=\{scale\.id\}/);
  assert.match(topics, /<strong>\{topicLabel\(group\.area, scale, locale\)\}<\/strong>/);
  assert.doesNotMatch(topics, /scale\.testTitle|scale\.scaleQuestions|scale\.minutes|scale\.questions|\{t\.scaleSourceLabel\}/);
  assert.match(tests, /data-profile-tests-step/);
  assert.match(tests, /data-profile-recommended-tests/);
  assert.match(tests, /data-profile-mode=\{mode\}/);
  assert.match(tests, /\["questionnaires", "pro"\]/);
  assert.match(tests, /test\.questions/);
  assert.match(tests, /data-profile-start-tests/);
});

test('fourth screen lists additional eligible matching tests without requiring another profile click', () => {
  assert.match(builder, /: scaleGroups;/);
  assert.match(builder, /: selectedAxisRefs;/);
  assert.match(builder, /\.filter\(test => extraTestKeys\.has\(test\.key\)\)/);
  assert.doesNotMatch(builder, /extraProfile !== null && extraTestKeys\.has/);
  assert.match(builder, /data-profile-extra-profile="selected"/);
  assert.match(builder, /setExtraProfile\(null\)/);
  assert.match(builder, /keys\.length < 12/);
  assert.match(builder, /makeTestSelectionIntent\(selectedKeys\)/);
  assert.match(builder, /startTests=/);
});

test('independent scale controls and test mode targets are mobile accessible', () => {
  assert.match(css, /\.researchChoice\{[^}]*min-height:49px/);
  assert.match(css, /\.researchChoice\[aria-pressed=true\]/);
  assert.match(css, /\.researchChoice:focus-visible/);
  assert.match(css, /@media\(max-width:450px\)/);
  assert.match(css, /\.batteryModeChoices button\{[^}]*min-height:65px/);
});

test('goal topics are source-keyed and not presented as questionnaire names', () => {
  const supportRules = readFileSync(new URL('../lib/profile/goal-profile.js', import.meta.url), 'utf8');
  const sources = [...supportRules.matchAll(/supportingSource\('(clarity|motivation|confidence)', '[^']+', '([^']+)',/g)];
  assert.equal(sources.length, 11);
  const goalTopics = builder.slice(builder.indexOf('const goalTopicLabels:'), builder.indexOf('const topicLabel ='));
  for (const [, facet, key] of sources) {
    assert.match(goalTopics, new RegExp('"' + key.replaceAll('.', '\\.') + '":'));
    assert.ok(['clarity', 'motivation', 'confidence'].includes(facet));
  }
  assert.match(builder, /area === "goal" \? goalTopicLabels\[locale\]\[scale\.key\]/);
  assert.match(builder, /focuses\.includes\("goal"\) && <p className=\{styles\.scaleSourceNote\}>\{t\.goalScaleNote\}/);
});
