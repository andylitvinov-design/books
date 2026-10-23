import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const learner = read('components/energywork-ai-learner.tsx');
const css = read('components/energywork-ai-learner.module.css');

test('Reiki editorial artwork becomes an accessible, non-cropping backdrop', () => {
  assert.match(learner, /const artBackground = Boolean\(artSource\) && !\["welcome", "voices", "video"\]\.includes\(slide\.kind\)/);
  assert.match(learner, /data-reiki-art-layout=\{artBackground \? "background" : undefined\}/);
  assert.match(learner, /aria-hidden=\{artBackground \? true : undefined\}/);
  assert.match(learner, /alt=\{artBackground \? "" : portraitArt/);
  assert.match(learner, /data-reiki-diagram=\{artBackground && artSource\?\.includes\("kundalini-manual"\)/);
  assert.match(css, /\.slide\[data-reiki-art-layout="background"\] \.slideMain > \.art \{[\s\S]*?position: absolute;/);
  assert.match(css, /\.slide\[data-reiki-art-layout="background"\] \.slideMain > \.art\[data-reiki-diagram="true"\] img \{[\s\S]*?object-fit: contain;/);
  assert.match(css, /\.slide\[data-reiki-art-layout="background"\] \.slideMain > \.content \{[\s\S]*?z-index: 1;/);
  assert.match(learner, /<AcademyVideoPlayer key=\{slide\.id\}/, 'Keep the actual player as normal media');
});

test('Both chapter milestones explain that recorded meditation is not a personal initiation', () => {
  assert.match(learner, /\(slide\.id === "tan-done" \|\| slide\.id === "kun-done"\)/);
  assert.match(learner, /data-reiki-personal-initiation-note/);
  assert.match(learner, /initiationVideoNoteTitle: "A video meditation is not an initiation"/);
  assert.match(learner, /initiationVideoNoteText: "A recording alone is not an initiation\./);
  assert.match(learner, /After all five lessons you can request a free guided initiation in chat or a separate personal session with Andrey\./);
  assert.match(learner, /initiationVideoNoteTitle: "Видеомедитация — это ещё не инициация"/);
  assert.match(learner, /initiationVideoNoteText: "Видеозапись сама по себе не является инициацией\./);
  assert.match(learner, /После пяти уроков можно запросить инициацию с Андреем в чате или отдельную личную сессию\./);
  assert.match(learner, /\(slide\.id === "tan-done" \|\| slide\.id === "kun-done"\)\s*\?\s*\(\s*<aside className=\{styles\.personalInitiationNote\} data-reiki-personal-initiation-note>[\s\S]*?\{t\.initiationVideoNoteTitle\}[\s\S]*?<p>\{t\.initiationVideoNoteText\}<\/p>\s*<\/aside>/);
  assert.match(css, /\.personalInitiationNote \{/);
  assert.match(css, /@media screen and \(max-width: 760px\)/);
});
