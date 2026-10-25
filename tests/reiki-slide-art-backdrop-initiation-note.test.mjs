import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assertCurrentInitiationNotes } from './helpers/reiki-initiation-contract.mjs';

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

test('Both chapter milestones distinguish recordings from requested chat guidance and separate personal initiation', () => {
  assertCurrentInitiationNotes();
  assert.match(css, /\.personalInitiationNote \{/);
  assert.match(css, /@media screen and \(max-width: 760px\)/);
});
