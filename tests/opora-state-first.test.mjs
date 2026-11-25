import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('OPORA 1.1 makes state and comparable baseline the first measure, not XP or forced action', () => {
  const doc = src('docs/myspace/HOLISTIC_HOUSE_OPORA_COURSE_METHODOLOGY_CANONICAL_2026-10-14.md');
  assert.match(doc, /Версия:\*\* 1\.1/);
  assert.match(doc, /состояние первично/);
  assert.match(doc, /До начала первого персонального урока должен существовать измеренный baseline/);
  assert.match(doc, /один и тот же допустимый инструмент/);
  assert.match(doc, /не методологическая необходимость/);
  assert.match(doc, /Primary:/);
  assert.match(doc, /Secondary:/);
});

test('R2/R3 curriculum retains lesson IDs and adds state-first supportive checkpoints', () => {
  const workbook = src('data/inner-growth/workbook-days.js');
  const journey = src('data/inner-growth/course-journey.js');
  for (const day of [1, 5, 7, 10, 14]) assert.match(workbook, new RegExp('day: ' + day + ', key:'));
  assert.match(workbook, /не нужно обязательно улучшать самочувствие/i);
  assert.match(workbook, /Выберите один путь/);
  assert.match(workbook, /оставить \/ упростить \/ заменить/);
  assert.match(workbook, /урока 6/);
  assert.match(workbook, /допустимом интервале/);
  assert.match(journey, /baseline state/);
  assert.match(journey, /урока 6/);
});

test('focussed lesson immediately offers a non-punitive uncomfortable path and CBT ACT neutral options', () => {
  const player = src('components/app/course-slide-player.jsx');
  const css = src('components/app/course-slide-player.module.css');
  assert.match(player, /data-course-discomfort-support/);
  assert.match(player, /setNeutralMode\(true\)/);
  assert.match(player, /setDiscomfortOpen\(true\)/);
  assert.match(player, /!neutralMode && <details/);
  assert.match(player, /aria-pressed=\{thoughtChoice===key\}/);
  assert.match(player, /cbtChoice/);
  assert.match(player, /actChoice/);
  assert.match(player, /neutralChoice/);
  assert.match(player, /Специалист не наблюдает/);
  assert.match(player, /finalRetestReady/);
  assert.match(css, /\.discomfortPanel/);
  assert.match(css, /\.thoughtChoices/);
  assert.match(player, /day:cycle\.day,lessonId:lesson\.id,operationId:sessionOp\.current/);
});

test('public methodology explains the state-first model and pre/post assessment in RU EN ES', () => {
  const page = src('components/public-course-methodology.tsx');
  const css = src('components/public-course-methodology.module.css');
  assert.match(page, /Сначала состояние и самочувствие/);
  assert.match(page, /Our courses begin with how you feel/);
  assert.match(page, /Empezamos con tu estado/);
  assert.match(page, /measureSection/);
  assert.match(page, /не обещаем улучшения/);
  assert.match(css, /\.measureSection/);
});
