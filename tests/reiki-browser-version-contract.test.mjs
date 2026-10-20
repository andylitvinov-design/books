import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ENERGYWORK_VERSION } from '../data/academy/energywork-ai-schema.js';

const script = readFileSync(new URL('../scripts/verify-reiki-all-slides-browser.mjs', import.meta.url), 'utf8');

test('browser verifier current-version contract is independently pinned to owner-approved p10', () => {
  assert.equal(ENERGYWORK_VERSION, '2026-10-20.p10');
  assert.match(script, /import \{ ENERGYWORK_VERSION, energyworkLessonRanges, energyworkSequence \} from "\.\.\/data\/academy\/energywork-ai-schema\.js"/);
});

test('local synthetic progress fixture uses the current p10 schema version', () => {
  const fixture = script.split('async function installLocalAccountMock(page) {')[1]?.split('async function exerciseJourney(page, locale, width) {')[0];
  assert.ok(fixture);
  assert.match(fixture, /courseId: "academy-energywork-principles", courseVersion: ENERGYWORK_VERSION,/);
  assert.doesNotMatch(fixture, /courseVersion: "2026-10-19\.p9"/);
  assert.match(fixture, /const pattern = "\*\*\/api\/app\/academy-energywork"/);
  assert.match(fixture, /await page\.route\(pattern/);
  assert.match(fixture, /await page\.unroute\(pattern\)/);
});

test('rendered version is checked against current schema without weakening the full journey', () => {
  const journey = script.split('async function exerciseJourney(page, locale, width) {')[1];
  assert.ok(journey);
  assert.match(journey, /await expect\(root\)\.toHaveAttribute\("data-course-version",ENERGYWORK_VERSION\)/);
  assert.doesNotMatch(journey, /toHaveAttribute\("data-course-version","2026-10-19\.p9"\)/);
  assert.match(journey, /assert\.deepEqual\(journey,expectedSequence,/);
});
