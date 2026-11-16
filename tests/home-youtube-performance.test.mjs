import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('EN/RU/ES home videos use a lightweight YouTube poster facade while the full player remains for other routes', () => {
  const facade = read('components/home-youtube-facade.tsx');
  const presentation = read('components/home-presentation-video-section.tsx');
  const testimonials = read('components/personal-testimonials.tsx');
  const more = read('components/home-testimonial-more.tsx');
  assert.match(facade, /data-home-video-facade="true"/);
  assert.match(facade, /setPlaying\(true\)/);
  assert.match(facade, /useEffect\(\(\) => \{ setInteractive\(true\); \}, \[\]\)/);
  assert.match(facade, /disabled=\{!interactive\}/);
  assert.match(facade, /aria-busy=\{!interactive\}/);
  assert.match(facade, /aria-disabled=\{!interactive\}/);
  assert.match(facade, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(facade, /playing \? \(/);
  assert.match(facade, /youtube-nocookie\.com\/embed\/\$\{youtubeId\}/);
  assert.match(facade, /\^\[A-Za-z0-9_-\]\{11\}\$/);
  assert.match(facade, /loading="lazy"/);
  assert.doesNotMatch(facade, /from ["']@\/components\/site-video-player["']/);
  assert.match(presentation, /<HomeYoutubeFacade video=\{video\} locale=\{locale\} \/>/);
  assert.match(testimonials, /isHome \? \(/);
  assert.match(testimonials, /<HomeYoutubeFacade/);
  assert.match(testimonials, /<SiteVideoPlayer/);
  assert.match(more, /<HomeYoutubeFacade/);
  assert.doesNotMatch(more, /from ["']@\/components\/site-video-player["']/);
});

test('home profile card reuses the existing 8KB AVIF with no new pinned source variants', () => {
  const home = read('components/home-featured-workspace.tsx');
  const path = '/images/holistic-house/report-lighthouse-coast.avif';
  const image = readFileSync(new URL('../public' + path, import.meta.url));
  assert.match(home, /loading="lazy"/);
  assert.ok(home.includes('"profile": "' + path + '"'), 'Use the already committed small illustration');
  assert.ok(image.byteLength > 0 && image.byteLength <= 16_000, 'Never load the 535KB master for a small card');
  const manifest = JSON.parse(read('data/public-card-artwork.json'));
  assert.equal(Object.keys(manifest.images).length, 31, 'Keep existing 31 reviewed source entries');
  assert.ok(!Object.hasOwn(manifest.images, '/images/holistic-house/report-lighthouse-coast.webp'),
    'No unnecessary hashed master or two more generated variants');
});

test('nonce-bound root layout is not incorrectly marked force-static', () => {
  const root = read('app/layout.tsx');
  assert.match(root, /await headers\(\)/);
  assert.match(root, /nonce=\{nonce\}/);
  assert.doesNotMatch(root, /force-static/);
});
