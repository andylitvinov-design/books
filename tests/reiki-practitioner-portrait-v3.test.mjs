import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const learner = read('components/energywork-ai-learner.tsx');
const style = read('components/energywork-ai-learner.module.css');
const curriculum = read('data/academy/energywork-ai-curriculum.ts');
const schema = read('data/academy/energywork-ai-schema.js');
const localPortrait = '/images/holistic-house/reiki-approved-sunrise-v3.webp';

test('Approved V3 retains the complete five-lesson, 69-screen real learning flow', () => {
  assert.match(learner,/data-course-visual="reiki-airy-v2" data-course-portrait="v3"/);
  assert.match(learner,/data-reiki-reviews="v4"/);
  assert.match(learner,/energyworkLessons\.map\(\(lesson, number\) =>/);
  assert.match(learner,/const slides = useMemo\(\(\) => energyworkSlides\(\), \[\]\)/);
  assert.match(learner,/const total = slides\.length/);
  assert.match(curriculum,/ENERGYWORK_COURSE_VERSION = "2026-10-19\.p9"/);
  assert.match(schema,/ENERGYWORK_VERSION = '2026-10-19\.p9'/);
  assert.match(learner,/<AcademyVideoPlayer/);
  assert.match(learner,/styles\.milestoneCard/);
  assert.match(learner,/styles\.voicesCard/);
  assert.match(learner,/action: "start", consent: true/);
  assert.match(learner,/data-energywork-next/);
  assert.doesNotMatch(learner,/<img\s+src=["']https?:/);
});

test('The already-approved, locally owned meditating woman is prominently shown without flattening UI', () => {
  assert.equal(existsSync(new URL('../public' + localPortrait,import.meta.url)),true);
  assert.match(learner,/portraitArt = slide\.id === "welcome-01" \|\| slide\.id === "flight-01" \|\| slide\.id === "tan-01" \|\| slide\.id === "flight-done"/);
  assert.ok(learner.includes('const artSource = portraitArt || voicesArt ? "'+localPortrait+'" : slide.image;'));
  assert.match(learner,/data-reiki-person=\{portraitArt \|\| voicesArt \? "true" : undefined\}/);
  assert.match(learner,/unoptimized=\{portraitArt \|\| voicesArt\}/);
  assert.match(style,/REIKI PORTRAIT V3/);
  assert.ok(style.includes('reiki-approved-sunrise-v3.webp'));
  assert.ok(!learner.includes('reiki-practitioner-sunrise.webp'));
  assert.match(style,/\.page\[data-course-portrait="v3"\]::before/);
  assert.ok(style.includes(localPortrait));
  assert.match(style,/\.page\[data-course-portrait="v3"\] \.welcomeSlide \.art \{display:block;\}/);
  assert.match(style,/reiki-heaven-sky\.svg/);
});

test('V3 increases all mobile teaching typography and preserves pinned navigation', () => {
  const start = style.indexOf('REIKI PORTRAIT V3');
  assert.ok(start>0);
  const v3 = style.slice(start);
  for(const name of ['journeyLabel','content h1','description','eyebrow','questionBadge','prompt','choice','experienceChoice','textarea','practiceTimer','progressHeader','next','back','programme summary']) {
    assert.ok(v3.includes(name),'V3 enhances '+name);
  }
  assert.match(v3,/\.page\[data-course-portrait="v3"\] \.description \{\s*font-size: clamp\(14px/);
  assert.match(v3,/\.page\[data-course-portrait="v3"\] \.next \{\s*min-height:55px/);
  assert.match(v3,/\.page\[data-course-portrait="v3"\] \.experienceSlide \.experienceChoice \{\s*min-height: 53px/);
  assert.match(v3,/overflow-y: auto/);
  assert.match(v3,/@media \(max-width: 760px\) and \(max-height:700px\)/);
  assert.match(v3,/@media print/);
  assert.match(v3,/\.milestoneCard strong/);
  assert.match(v3,/\.feedbackRequired/);
});
