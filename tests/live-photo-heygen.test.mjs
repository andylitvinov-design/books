import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LIVE_PHOTO_MOTIONS, buildLivePhotoPrompt, buildHeyGenLivePhotoBody,
  isLivePhotoCreationEnabled, hasLivePhotoProviderKey, getHeyGenLivePhotoStatus, isAllowedHeyGenDownloadUrl,
} from '../lib/app/live-photo-heygen.mjs';

test('HeyGen calls are off without two owner gates and a private provider key', () => {
  const key = 'hh_'.padEnd(32, 'x');
  assert.equal(isLivePhotoCreationEnabled({ HH_LIVE_PHOTOS_ENABLED: 'true',
    HH_LIVE_PHOTO_HEYGEN_API_KEY: key }), false);
  assert.equal(isLivePhotoCreationEnabled({ HH_LIVE_PHOTOS_SPEND_APPROVED: 'true',
    HH_LIVE_PHOTO_HEYGEN_API_KEY: key }), false);
  assert.equal(isLivePhotoCreationEnabled({ HH_LIVE_PHOTOS_ENABLED: 'true',
    HH_LIVE_PHOTOS_SPEND_APPROVED: 'true' }), false);
  assert.equal(isLivePhotoCreationEnabled({ HH_LIVE_PHOTOS_ENABLED: 'true',
    HH_LIVE_PHOTOS_SPEND_APPROVED: 'true', HH_LIVE_PHOTO_HEYGEN_API_KEY: key }), true);
});
test('fixed cost and motion: 5 seconds, 768p, no arbitrary prompt or data', () => {
  assert.deepEqual(LIVE_PHOTO_MOTIONS, ['smile', 'greeting', 'wave', 'blink', 'turn']);
  for (const motion of LIVE_PHOTO_MOTIONS) {
    const body = buildHeyGenLivePhotoBody('e0f7f5bdc42a4c61b0747c1bbd75cbb6', motion);
    assert.equal(body.model, 'heygen-video-1');
    assert.equal(body.mode, 'image_to_video');
    assert.equal(body.image.type, 'asset_id');
    assert.equal(body.duration, 5);
    assert.equal(body.resolution, '768p');
    assert.match(body.prompt, /no talking/i);
  }
  assert.throws(() => buildLivePhotoPrompt('talk like my therapist'), /INVALID_LIVE_PHOTO_MOTION/);
  assert.throws(() => buildHeyGenLivePhotoBody('https://evil.example/a.jpg', 'smile'));
});
test('natural portrait prompts preserve identity and restrict motion in all locales', () => {
  const smile = buildLivePhotoPrompt('smile');
  const greeting = buildLivePhotoPrompt('greeting');
  const wave = buildLivePhotoPrompt('wave');
  assert.match(smile, /gentle warm smile/i);
  assert.match(greeting, /one small friendly greeting nod/i);
  assert.match(wave, /hand and forearm already visible/i);
  assert.match(wave, /never invent an arm or hand/i);
  for (const prompt of [smile, greeting, wave]) {
    assert.match(prompt, /exact identity/i);
    assert.match(prompt, /fixed camera/i);
    assert.match(prompt, /no talking/i);
    assert.match(prompt, /no artificial face warping/i);
  }
  const ui = readFileSync('components/app/my-live-photos.jsx', 'utf8');
  assert.match(ui, /greeting: 'Приветствие'/);
  assert.match(ui, /greeting: 'Friendly greeting'/);
  assert.match(ui, /greeting: 'Saludo amable'/);
  assert.match(ui, /motion === 'wave'/);
  const migration = readFileSync('supabase/migrations/20261121230500_hh_client_live_photo_greeting_v1.sql', 'utf8');
  assert.match(migration, /'greeting'/);
  assert.match(migration, /client_live_photos_v1_motion_check/);
});
test('private video archive rejects SSRF destinations and disguised credentials', () => {
  for (const bad of [
    'http://resource2.heygen.ai/clip.mp4',
    'https://resource2.heygen.ai.evil.example/test.mp4',
    'https://127.0.0.1/internal',
    'https://user:pass@cdn.heygen.ai/a',
    'https://cdn.heygen.ai:444/a',
    'https://cdn.heygen.ai/a#test',
  ]) assert.equal(isAllowedHeyGenDownloadUrl(bad), false, bad);
  assert.equal(isAllowedHeyGenDownloadUrl('https://resource2.heygen.ai/secure.mp4?token=signed'), true);
});
test('endpoint contracts keep authenticated owner/consent and private bucket', () => {
  const base = 'app/api/app/live-photos/';
  const start = readFileSync(base + 'route.js', 'utf8');
  const status = readFileSync(base + '[id]/route.js', 'utf8');
  const service = readFileSync('lib/app/live-photo-service.js', 'utf8');
  const webhook = readFileSync('app/api/integrations/heygen/live-photo/route.js', 'utf8');
  const ui = readFileSync('components/app/my-live-photos.jsx', 'utf8');
  assert.match(start, /requireSameOrigin/);
  assert.match(start, /auth\.verified\(\)/);
  assert.match(start, /consumeRate/);
  assert.match(status, /auth\.verified\(\)/);
  assert.match(service, /consentAi/);
  assert.match(service, /consentSubject/);
  assert.match(service, /hh-client-private-media/);
  assert.match(service, /createSignedUrl/);
  assert.match(service, /status='deleted'/);
  assert.match(webhook, /finalizeLivePhotoCallback/);
  assert.match(ui, /data-client-live-photos/);
  assert.doesNotMatch(start + status + ui, /HH_LIVE_PHOTO_HEYGEN_API_KEY/);
});

test('new metered requests stop on budget hold while submitted provider status remains readable', async () => {
  const old = {
    key: process.env.HH_LIVE_PHOTO_HEYGEN_API_KEY,
    enabled: process.env.HH_LIVE_PHOTOS_ENABLED,
    spend: process.env.HH_LIVE_PHOTOS_SPEND_APPROVED,
    fetch: globalThis.fetch,
  };
  const restore = (name, value) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  try {
    process.env.HH_LIVE_PHOTO_HEYGEN_API_KEY = 'test_'.padEnd(32, 'x');
    delete process.env.HH_LIVE_PHOTOS_ENABLED;
    delete process.env.HH_LIVE_PHOTOS_SPEND_APPROVED;
    assert.equal(hasLivePhotoProviderKey(), true);
    assert.equal(isLivePhotoCreationEnabled(), false);
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /\/v3\/models\/videos\/abcdefgh12345678$/);
      assert.equal(init.method, 'GET');
      assert.equal(init.headers['x-api-key'], process.env.HH_LIVE_PHOTO_HEYGEN_API_KEY);
      return new Response(JSON.stringify({data:{
        video_id:'abcdefgh12345678', status:'completed',
        video_url:'https://resource2.heygen.ai/cdn/ready.mp4',
      }}), {status:200, headers:{'content-type':'application/json'}});
    };
    assert.deepEqual(await getHeyGenLivePhotoStatus('abcdefgh12345678'), {
      state:'completed', url:'https://resource2.heygen.ai/cdn/ready.mp4',
    });
  } finally {
    restore('HH_LIVE_PHOTO_HEYGEN_API_KEY', old.key);
    restore('HH_LIVE_PHOTOS_ENABLED', old.enabled);
    restore('HH_LIVE_PHOTOS_SPEND_APPROVED', old.spend);
    globalThis.fetch = old.fetch;
  }
});
test('sitewide daily budget includes failed and deleted reservations', () => {
  const service = readFileSync('lib/app/live-photo-service.js', 'utf8');
  assert.match(service, /where created_at > now\(\) - interval '24 hours'/);
  assert.doesNotMatch(service, /where created_at > now\(\) - interval '24 hours' and status not in/);
});
