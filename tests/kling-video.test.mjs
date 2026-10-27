import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  normalizeKlingScene, klingRequestForScene, submitKlingScene, queryKlingScene,
} from '../lib/kling-video.mjs';

const request = {
  mode: 'text',
  prompt: 'Cinematic slow tracking shot of a bright forest in springtime.',
  duration: 3,
  resolution: '720p',
  aspectRatio: '16:9',
  imageUrl: '',
  externalTaskId: 'hh_kling_12345678901234567890',
};

test('default is silent Kling 3.0 text-to-video, 3s, 720p and 16:9', () => {
  const scene = normalizeKlingScene(request);
  const { path, body } = klingRequestForScene(scene);
  assert.equal(path, '/text-to-video/kling-3.0');
  assert.equal(body.prompt, request.prompt);
  assert.deepEqual(body.settings, {
    duration: 3, resolution: '720p', audio: 'off',
    multi_shot: false, aspect_ratio: '16:9',
  });
  assert.equal(body.options.external_task_id, request.externalTaskId);
  assert.equal(body.options.callback_url, undefined);
});

test('approved public images use the image route; do not send arbitrary URLs', () => {
  const imageUrl = 'https://holistichouse.vercel.app/images/holistic-house/coaching-ancient/egyptian-cover.jpg';
  const scene = normalizeKlingScene({ ...request, mode: 'image', duration: 5, imageUrl, publicImageApproved: true });
  const { path, body } = klingRequestForScene(scene);
  assert.equal(path, '/image-to-video/kling-2.5-turbo');
  assert.deepEqual(body.contents, [
    { type: 'prompt', text: request.prompt },
    { type: 'first_frame', url: imageUrl },
  ]);
  assert.deepEqual(body.settings, { duration: 5, resolution: '720p' });
  assert.equal(body.settings.audio, undefined);
});

test('reject client-private, external, URL token, http, encoded traversal and non-approved media', () => {
  const invalid = [
    'https://drive.google.com/file/d/something',
    'https://holistichouse.vercel.app.evil.org/images/photo.jpg',
    'http://holistichouse.vercel.app/images/photo.jpg',
    'https://holistichouse.vercel.app/images/photo.jpg?token=secret',
    'https://holistichouse.vercel.app/images/%2e%2e/client.jpg',
    'https://holistichouse.vercel.app/api/client/private.jpg',
    'https://holistichouse.vercel.app/images/photo.svg',
    'https://holistichouse.vercel.app/images/holistic-house/video-posters/home-en-v2.webp',
  ];
  for (const imageUrl of invalid) assert.throws(
    () => normalizeKlingScene({ ...request, mode: 'image', duration: 5, imageUrl, publicImageApproved: true }),
    /validation/, imageUrl,
  );
  assert.throws(() => normalizeKlingScene({
    ...request, mode: 'image', duration: 5, publicImageApproved: false,
    imageUrl: 'https://holistichouse.vercel.app/images/holistic-house/a.jpg',
  }), /validation/);
});

test('cheapest image-to-video API rejects unsupported 3s requests before billable submit', () => {
  const imageUrl = 'https://holistichouse.vercel.app/images/holistic-house/coaching-ancient/egyptian-cover.jpg';
  assert.throws(() => normalizeKlingScene({ ...request, mode: 'image', duration: 3, imageUrl, publicImageApproved: true }), /validation/);
});

test('input validation protects paid requests from malformed options', () => {
  for (const change of [
    { mode: 'clip' }, { duration: 100 }, { resolution: '4k' }, { aspectRatio: 'free' },
    { prompt: 'short' }, { prompt: 'x'.repeat(2501) }, { externalTaskId: 'bad' },
    { mode: 'text', imageUrl: 'https://holistichouse.vercel.app/images/x.jpg' },
  ]) assert.throws(() => normalizeKlingScene({ ...request, ...change }), /validation/);
});

test('submit makes one authenticated request and never logs or returns key', async () => {
  const calls = [];
  const apiKey = 'a-private-server-only-key';
  const result = await submitKlingScene(request, { apiKey, fetchImpl: async (...args) => {
    calls.push(args);
    return { ok: true, json: async () => ({ code: 0, data: { id: 'klingtask123456', status: 'submitted' } }) };
  } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://api-singapore.klingai.com/text-to-video/kling-3.0');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer ' + apiKey);
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(result.taskId, 'klingtask123456');
  assert.ok(!JSON.stringify(result).includes(apiKey));
});

test('no key and provider failure cannot submit jobs and do not expose provider errors', async () => {
  let networkCalled = false;
  await assert.rejects(submitKlingScene(request, { apiKey: '', fetchImpl: async () => { networkCalled = true; } }), /not_configured/);
  assert.equal(networkCalled, false);
  await assert.rejects(submitKlingScene(request, {
    apiKey: 'a-private-server-only-key',
    fetchImpl: async () => ({ ok: false, json: async () => ({ message: 'sensitive internal provider details' }) }),
  }), /provider_unavailable/);
});

test('status by ID safely extracts only the video output; never autosubmits', async () => {
  const calls = [];
  const result = await queryKlingScene('klingtask123456', {
    apiKey: 'a-private-server-only-key',
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ code: 0, data: [{
        id: 'klingtask123456', status: 'succeeded',
        outputs: [
          { type: 'image', url: 'https://example.com/private-image.jpg' },
          { type: 'video', duration: '5', url: 'https://p2-kling.klingai.com/video.mp4' },
        ],
      }] }) };
    },
  });
  assert.equal(calls[0][1].method, 'GET');
  assert.ok(calls[0][0].endsWith('/tasks?task_ids=klingtask123456'));
  assert.equal(result.videoUrl, 'https://p2-kling.klingai.com/video.mp4');
  assert.equal(result.duration, 5);
});

test('unknown task and unsafe output URLs never become player sources', async () => {
  const fetchImpl = async () => ({
    ok: true, json: async () => ({ code: 0, data: [{
      id: 'klingtask123456', status: 'succeeded', outputs: [{ type: 'video', url: 'javascript:alert(1)' }],
    }] }),
  });
  const result = await queryKlingScene('klingtask123456', { apiKey: 'a-private-server-only-key', fetchImpl });
  assert.equal(result.videoUrl, null);
  await assert.rejects(queryKlingScene('../../etc/passwd', { apiKey: 'a-private-server-only-key', fetchImpl }), /validation/);
});

test('admin integration is auth-gated, opt-in-only, with no publish or key in client', () => {
  const actions = readFileSync(new URL('../app/admin/videos/kling-actions.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../components/kling-scene-studio.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../app/admin/videos/page.tsx', import.meta.url), 'utf8');
  assert.match(actions, /requireAdminRequest\(\)/);
  assert.match(actions, /input\?\.paidApproved !== true/);
  assert.match(actions, /HH_KLING_PAID_GENERATION_ENABLED === 'true'/);
  assert.match(actions, /process\.env\.KLING_API_KEY/);
  assert.ok(!ui.includes('process.env.KLING_API_KEY'));
  assert.match(page, /requireAdminRequest\(\)/);
  assert.ok(!actions.includes('publishSiteVideo'));
});


test('owner money-flow image preset is no-charge until explicit media and paid consent', () => {
  const ui=readFileSync(new URL('../components/kling-scene-studio.tsx', import.meta.url), 'utf8');
  assert.match(ui,/key: "wealth"/);
  assert.match(ui,/andy-about\.png/);
  assert.match(ui,/setMode\(personal \? "image" : "text"\)/);
  assert.match(ui,/setDuration\(personal \? 5 : 3\)/);
  assert.match(ui,/setResolution\("720p"\)/);
  assert.match(ui,/setImageApproved\(false\)/);
  assert.match(ui,/setApproved\(false\)/);
});
