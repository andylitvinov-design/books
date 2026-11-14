import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

test('home profile card loads an immutable 256px WebP instead of its 535KB master', () => {
  const home = read('components/home-featured-workspace.tsx');
  const manifest = JSON.parse(read('data/public-card-artwork.json'));
  const source = '/images/holistic-house/report-lighthouse-coast.webp';
  const image = manifest.images[source];
  assert.ok(image, 'missing review-pinned original image');
  assert.match(home, /loading="lazy"/);
  assert.ok(home.includes('"profile": "' + image.thumb + '"'));
  assert.notEqual(image.thumb, source);
  const contents = readFileSync(new URL('../' + image.source, import.meta.url));
  const sha = createHash('sha1').update('blob ' + contents.length + '\0').update(contents).digest('hex');
  assert.equal(sha, image.sha);
  assert.equal(contents.length, image.bytes);
  assert.match(image.thumb, /-w256\.webp$/);
});

test('nonce-bound root layout is not incorrectly marked force-static', () => {
  const root = read('app/layout.tsx');
  assert.match(root, /await headers\(\)/);
  assert.match(root, /nonce=\{nonce\}/);
  assert.doesNotMatch(root, /force-static/);
});
