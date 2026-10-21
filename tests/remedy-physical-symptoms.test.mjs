import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getRemedySymptoms, isBachEssence, remedySymptomSlugs } from '../data/remedy-symptoms.js';
import { splitAtRemedyIndications } from '../lib/remedies/symptom-placement.js';

const root = process.cwd();
const body = (slug, locale) => readFileSync(path.join(root, 'content', 'remedies', locale, slug + '.md'), 'utf8')
  .replace(/^---\n[\s\S]*?\n---\n+/, '');

function check(locale, slugs) {
  for (const slug of slugs) {
    const symptoms = getRemedySymptoms(slug, locale);
    assert.equal(symptoms.length, 4, slug + '/' + locale);
    assert.equal(new Set(symptoms.map(text => text.toLocaleLowerCase())).size, 4, slug + '/' + locale);
    symptoms.forEach(text => {
      assert.ok(text.trim().length >= 8, slug + '/' + locale);
      assert.doesNotMatch(text, /<[^>]*>|\\n/, slug + '/' + locale);
    });
  }
}

test('all 104 canonical remedies have exactly four localized symptoms in RU EN ES', () => {
  const slugs = readdirSync(path.join(root, 'content', 'remedies', 'ru'))
    .filter(file => file.endsWith('.md')).map(file => file.slice(0, -3)).sort();
  assert.equal(slugs.length, 104);
  assert.deepEqual([...remedySymptomSlugs].sort(), slugs);
  assert.deepEqual(readdirSync(path.join(root, 'content', 'remedies', 'en'))
    .filter(file => file.endsWith('.md')).map(file => file.slice(0, -3)).sort(), slugs);
  for (const locale of ['ru', 'en', 'es']) check(locale, slugs);
  assert.equal(getRemedySymptoms('missing-remedy', 'ru').length, 0);
});

test('plain author indications end before the next unchanged author heading', () => {
  const blocks = ['INTRO', '💥 ПОКАЗАНИЯ', '- First observed complaint', '- Second observation', '🔥 АРХЕТИПЫ', 'A Guardian'];
  const copy = [...blocks];
  const result = splitAtRemedyIndications(blocks);
  assert.equal(result.foundIndications, true);
  assert.deepEqual(result.before, blocks.slice(0, 4));
  assert.deepEqual(result.after, blocks.slice(4));
  assert.deepEqual(blocks, copy, 'never edit the original source');
  for (const heading of ['## ПОКАЗАНИЯ', '💥 INDICATIONS', 'Indicaciones']) {
    const translated = splitAtRemedyIndications(['INTRO', heading, '- symptom from source', '## TRANSFORMACIÓN', 'Original']);
    assert.equal(translated.foundIndications, true, heading);
    assert.equal(translated.after[0], '## TRANSFORMACIÓN');
  }
});

test('real multilingual Ambra source keeps indications immediately before the editorial section', () => {
  const samples = [
    ['ru', body('ambra-grisea', 'ru')],
    ['en', body('ambra-grisea', 'en')],
    ['es', JSON.parse(readFileSync(path.join(root, 'data/spanish-remedies.json'), 'utf8')).entries['ambra-grisea'].fields.description],
  ];
  for (const [locale, source] of samples) {
    const paragraphs = source.split(/\n{2,}/).map(text => text.trim()).filter(Boolean);
    const result = splitAtRemedyIndications(paragraphs);
    assert.equal(result.foundIndications, true, locale);
    assert.ok(result.before.some(text => /показания|indications|indicaciones/i.test(text)), locale);
    assert.ok(result.after.length > 0, locale);
    assert.equal([...result.before, ...result.after].join('\n\n'), paragraphs.join('\n\n'), locale);
  }
});

test('Bach flower bodily correlates are clearly separated from medical indications', () => {
  for (const slug of ['bach-cerato', 'bach-willow', 'rock-water', 'rock-rose', 'star-of-bethlehem']) {
    assert.equal(isBachEssence(slug), true);
    assert.equal(getRemedySymptoms(slug, 'ru').length, 4);
  }
  assert.equal(isBachEssence('nux-vomica'), false);
  const section = readFileSync(path.join(root, 'components/remedy-symptoms-section.tsx'), 'utf8');
  assert.match(section, /не специфичные для эссенций Баха/);
  assert.match(section, /not a proven indication for treatment/);
});

test('standalone EN RU, Book 02 and Spanish pages reuse the four-symptom component without changing full-source appendices', () => {
  const compact = readFileSync(path.join(root, 'components/remedy-content.tsx'), 'utf8');
  const spanish = readFileSync(path.join(root, 'components/spanish-remedy-content.tsx'), 'utf8');
  const esPage = readFileSync(path.join(root, 'app/es/homeopathy/remedies/[slug]/page.tsx'), 'utf8');
  assert.match(compact, /<RemedySymptomsSection/);
  assert.match(compact, /splitAtRemedyIndications\(content.intro\)/);
  assert.match(compact, /symptomsAfterState/);
  assert.match(compact, /if \(fullSource\) return/);
  assert.match(spanish, /<RemedySymptomsSection slug=\{slug\} locale="es"/);
  assert.match(esPage, /<SpanishRemedyContent description=\{remedy.description\} slug=\{slug\}/);
});
