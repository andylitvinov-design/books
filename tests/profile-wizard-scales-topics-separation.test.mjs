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

test('fourth screen keeps five scoped alternatives visible without a repeated profile choice', () => {
  assert.ok(builder.includes('data-profile-five-more-tests'));
  assert.ok(builder.includes('data-profile-extra-selected-scope'));
  assert.ok(builder.includes('rankProfileAxisTests(tests, scaleGroups, selectedScaleIds, batteryMode)'));
  assert.ok(builder.includes('if (!eligibleTestKeys.has(key)) return;'));
  assert.doesNotMatch(builder, /extraProfile|extraScales|extraGroups|setExtra/);
  assert.ok(builder.includes('keys.length < 12'));
  assert.ok(builder.includes('makeTestSelectionIntent(selectedKeys)'));
  assert.ok(builder.includes('startTests='));
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

test('main scales are short broad choices; step three selects source-backed topic axes, not questionnaires', () => {
  const scales = stage(1);
  const topics = stage(2);
  const tests = stage(3);
  // Five focuses map to at most three main area cards per direction.
  assert.match(scales, /visibleScaleGroups\.flatMap\(group => group\.area === "goal"/);
  assert.match(scales, /data-profile-main-scales/);
  assert.match(scales, /data-profile-main-scale=\{group\.area\}/);
  assert.match(scales, /toggleMainScale\(group\.area\)/);
  assert.match(scales, /data-profile-main-scale=\{axis\.id\}/);
  assert.doesNotMatch(scales, /group\.scales\.map\(scale/);
  assert.doesNotMatch(scales, /scale\.testTitle|scale\.scaleQuestions|scale\.minutes/);
  assert.match(topics, /data-profile-topic-choice=\{axis\.id\}/);
  assert.match(topics, /toggleTopicAxis\(axis\.id\)/);
  assert.match(topics, /researchLabel\(axis\.id, locale\)/);
  // The 11 goal-specific supporting topics stay selectable separately.
  assert.match(topics, /group\.area === "goal"/);
  assert.match(topics, /data-profile-topic-choice=\{scale\.id\}/);
  assert.doesNotMatch(topics, /previewProfileScales|scale\.testTitle|scale\.minutes/);
  assert.match(tests, /data-profile-recommended-tests/);
  assert.match(tests, /data-profile-five-more-tests/);
  assert.doesNotMatch(tests, /data-profile-extra-profile-filter/);
  assert.match(tests, /remainingTestKeys\.size > 0 && <section className=\{styles\.extraPanel\}/);
  assert.match(tests, /id="profile-builder-extra-results" hidden=\{!showMore\}/);
  assert.ok(tests.indexOf('data-profile-extra-toggle') < tests.indexOf('data-profile-extra-selected-scope'),
    'overflow must start with a single small toggle, not a long form');
  assert.match(builder, /setSelectedScaleIds\(\[\]\);/);
  assert.match(builder, /setSelectedByMode\(\{ questionnaires: \[\], pro: \[\] \}\)/);
  assert.match(css, /\.mainScaleBody\{display:flex/);
  assert.match(css, /\.researchChoices\{grid-template-columns:minmax\(0,1fr\)\}/);
});
