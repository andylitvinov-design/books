import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existingAboutIntroVideo, builtInSiteVideoRecords } from '../lib/site-videos/defaults.js';
const component = readFileSync(new URL('../components/psychic-alchemy-intro-video.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/[locale]/about/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/psychic-alchemy-intro-video.module.css', import.meta.url), 'utf8');
test('intro uses the archived approved final and a stable embed, not expiring media', () => {
  assert.equal(existingAboutIntroVideo.heygenId, 'fd5fcead9b067f9a0649862675a38771');
  assert.match(component, /https:\/\/app\.heygen\.com\/embeds\//);
  assert.doesNotMatch(component, /Expires=|Signature=|drive\.google\.com|\.mp4\?/);
});
test('player is opt-in, has no autoplay, and is responsive', () => {
  assert.match(component, /useState\(false\)/);
  assert.match(component, /onClick=\{\(\) => setActive\(true\)\}/);
  assert.match(component, /loading="lazy"/);
  assert.doesNotMatch(component, /autoPlay|autoplay[=:;]/);
  assert.match(css, /aspect-ratio: 16 \/ 9/);
  assert.match(css, /max-width: 767px/);
});
test('full methods and CTA remain in transcript, with an AI disclosure', () => {
  for (const text of ['homeopathy with systemic constellations and hypnotherapy', 'patterns in emotions and relationships', 'read the testimonials and leave a request', 'finding new resources and solutions']) assert.ok(existingAboutIntroVideo.transcript.includes(text));
  assert.ok(component.includes('AI-assisted video'));
});
test('EN and RU About intros are managed by their locale video slots; biography, testimonials, form and cabinet remain', () => {
  assert.deepEqual(builtInSiteVideoRecords().map(record => record.key), ['about-intro:en', 'about-intro:ru']);
  assert.match(page, /videoKey\("about-intro", typedLocale\)/);
  assert.match(page, /typedLocale === "en" && aboutIntro.heygenId === existingAboutIntroVideo.heygenId/);
  assert.match(page, /<PsychicAlchemyIntroVideo video=\{aboutIntro\}/);
  for (const text of ['current.intro.map', 'current.sections.map', 'videoTestimonials.map', 'PersonalConsultationForm locale', 'about-client-cabinet', 'testimonials-title', 'personal-consultation-title']) assert.ok(page.includes(text));
});
