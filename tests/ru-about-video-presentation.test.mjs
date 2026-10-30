import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { existingAboutIntroVideo, existingAboutIntroVideoRu } from '../lib/site-videos/defaults.js';

const player = readFileSync(new URL('../components/site-video-player.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/[locale]/about/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/site-video-minimal.module.css', import.meta.url), 'utf8');
const image = new URL('../public/images/holistic-house/video-posters/psychic-alchemy-ru-v1.webp', import.meta.url);

test('RU uses a real, small local video poster bound to the exact approved render', () => {
  assert.equal(existingAboutIntroVideoRu.heygenId, 'd4e55c984e54b40fbeb8a21f81d27694');
  assert.match(player, /d4e55c984e54b40fbeb8a21f81d27694: "\/images\/holistic-house\/video-posters\/psychic-alchemy-ru-v1.webp"/);
  const bytes = readFileSync(image);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  assert.ok(statSync(image).size < 100000);
  assert.doesNotMatch(player, /Expires=|Signature=|\.mp4\?/);
});

test('the lightweight mode is opt-in for Russian About, not testimonials or English', () => {
  assert.match(player, /minimal = false/);
  assert.match(page, /minimal=\{typedLocale === "ru"\} posterPriority/);
  assert.match(page, /typedLocale === "en" && aboutIntro.heygenId === existingAboutIntroVideo.heygenId/);
  assert.equal(existingAboutIntroVideo.heygenId, 'fd5fcead9b067f9a0649862675a38771');
});

test('minimal mode keeps accessible title and collapsed transcript without a large caption panel', () => {
  const minimal = player.split('{minimal ? (')[1].split(') : (')[0];
  assert.match(minimal, /styles.accessibleTitle/);
  assert.match(minimal, /<details ref=\{transcriptRef\} className="site-video-transcript">/);
  assert.match(minimal, /text.transcriptShort/);
  assert.match(minimal, /site-video-ai-badge/);
  assert.doesNotMatch(minimal, /site-video-title|site-video-description|site-video-duration-text|<details[^>]*\bopen/);
  assert.match(css, /left: 14px; bottom: 14px/);
  assert.match(css, /prefers-reduced-motion/);
});

test('playback remains click-gated and uses the unchanged stable provider embed', () => {
  assert.match(player, /useState\(false\)/);
  assert.match(player, /onClick=\{\(\) => \{ setShowRecovery\(false\); setPlaying\(true\); \}\}/);
  assert.match(player, /https:\/\/app\.heygen\.com\/embeds\//);
  assert.doesNotMatch(player, /<video|setInterval|fetch\(/);
});

test('RU About browser oracle preserves internal-only links and real keyboard/click gates', () => {
  const browser = readFileSync(new URL('../scripts/verify-ru-about-video.mjs', import.meta.url), 'utf8');
  assert.match(page, /minimal=\{typedLocale === "ru"\} posterPriority internalOnly/);
  assert.match(player, /const externalLink = internalOnly \? null :/);
  assert.match(player, /mirrorId && !internalOnly/);
  const before = browser.split("await summary.press('Enter');")[0];
  const expanded = browser.split("await summary.press('Enter');")[1];
  const noLink = "await expect(intro.locator('.site-video-watch-link')).toHaveCount(0);";
  assert.ok(before.includes(noLink), 'No external link before transcript expansion');
  assert.ok(expanded.includes(noLink), 'No external link after keyboard transcript expansion');
  assert.ok(expanded.includes("toHaveAttribute('open', '')"));
  assert.ok(expanded.includes("toContainText('Буду рад вместе исследовать вашу ситуацию')"));
  assert.ok(browser.includes("assert.equal(await page.locator('iframe').count(), 0)"));
  assert.ok(browser.includes("await intro.getByRole('button', { name: /^Смотреть видео:/ }).click()"));
  assert.ok(browser.includes("toHaveAttribute('src', `https://app.heygen.com/embeds/${videoId}`)"));
});


test('EN About browser oracle retains exact archived testimonials and the original intro', () => {
  const browser = readFileSync(new URL('../scripts/verify-ru-about-video.mjs', import.meta.url), 'utf8');
  const testimonials = readFileSync(new URL('../components/personal-testimonials.tsx', import.meta.url), 'utf8');
  const archived = testimonials.match(/locallyArchivedVideoPosterIds = new Set\(\[([\s\S]*?)\]\)/);
  const expected = browser.match(/const aboutTestimonialIds = \[([\s\S]*?)\];/);
  assert.ok(archived, 'Actual About archived poster inventory must exist');
  assert.ok(expected, 'Browser oracle must enumerate reviewed testimonial identities');
  const ids = text => [...text.matchAll(/["']([A-Za-z0-9_-]{11})["']/g)].map(match => match[1]).sort();
  assert.deepEqual(ids(expected[1]), ids(archived[1]));
  assert.ok(ids(expected[1]).length > 0);
  assert.match(page, /<PersonalTestimonials locale=\{typedLocale\} variant="about"/);
  assert.match(testimonials, /presentedVideos\.filter\(\(item\) => locallyArchivedVideoPosterIds\.has\(item\.id\)\)/);
  assert.match(testimonials, /minimal=\{isAbout\}/);
  assert.ok(browser.includes("const englishIntro = page.locator('#psychic-alchemy-video')"));
  assert.ok(browser.includes("await expect(englishIntro).toBeVisible()"));
  assert.ok(browser.includes("await englishIntro.locator('.site-video-player--minimal').count(), 0"));
  assert.ok(browser.includes('page.locator(\'[data-personal-testimonials="about"]\')'));
  assert.ok(browser.includes("node.getAttribute('data-testimonial-video-id')"));
  assert.ok(browser.includes("[...aboutTestimonialIds].sort()"));
  assert.ok(browser.includes("await expect(card.locator('.site-video-player--minimal')).toHaveCount(1)"));
  assert.ok(browser.includes("await expect(card.locator('.site-video-watch-link')).toHaveCount(0)"));
  assert.doesNotMatch(browser, /\.about-video-grid/);
});

