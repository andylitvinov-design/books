import test from 'node:test';
import assert from 'node:assert/strict';
import { readLivePr } from '../scripts/ci-pr-readiness.mjs';

function response(status, payload = { number: 4234, state: 'open' }) {
  return { status, ok: status >= 200 && status < 300, json: async () => payload };
}
function mockHttp(sequence) {
  const calls = [];
  const sleeps = [];
  let i = 0;
  return {
    calls, sleeps,
    transport: async (url, options) => {
      calls.push({url, options});
      const next = sequence[i++];
      if (next instanceof Error) throw next;
      return next;
    },
    sleep: async ms => { sleeps.push(ms); },
  };
}

test('first-pass success uses one request without delay', async () => {
  const m = mockHttp([response(200)]);
  assert.equal((await readLivePr('andylitvinov-design/books', 4234, 'test-token', m.transport, m.sleep)).number, 4234);
  assert.equal(m.calls.length, 1);
  assert.deepEqual(m.sleeps, []);
  assert.equal(m.calls[0].url, 'https://api.github.com/repos/andylitvinov-design/books/pulls/4234');
  assert.equal(m.calls[0].options.headers.authorization, 'Bearer test-token');
  assert.ok(m.calls[0].options.signal instanceof AbortSignal);
});
test('HTTP 503 recovers once, same PR and token', async () => {
  const m = mockHttp([response(503), response(200)]);
  const result = await readLivePr('andylitvinov-design/books', 4234, 'test-token', m.transport, m.sleep);
  assert.equal(result.state, 'open');
  assert.deepEqual(m.sleeps, [750]);
  assert.equal(m.calls.length, 2);
  assert.equal(m.calls[0].url, m.calls[1].url);
});
test('bounded 502/504 then 200 succeeds with maximum three calls', async () => {
  const m = mockHttp([response(502), response(504), response(200)]);
  assert.equal((await readLivePr('andylitvinov-design/books', 4234, 'x', m.transport, m.sleep)).number, 4234);
  assert.equal(m.calls.length, 3);
  assert.deepEqual(m.sleeps, [750,1500]);
});
test('persistent 503 fails closed after 3 reads', async () => {
  const m = mockHttp([response(503), response(503), response(503), response(200)]);
  await assert.rejects(readLivePr('andylitvinov-design/books', 4234, 'x', m.transport, m.sleep), /GitHub PR read failed: HTTP 503/);
  assert.equal(m.calls.length, 3);
  assert.deepEqual(m.sleeps, [750,1500]);
});
for (const status of [401,403,404,409,429,500]) {
  test(`HTTP ${status} never retries or bypasses protected readiness`, async () => {
    const m = mockHttp([response(status),response(200)]);
    await assert.rejects(readLivePr('andylitvinov-design/books', 4234, 'x', m.transport, m.sleep), new RegExp(`HTTP ${status}`));
    assert.equal(m.calls.length,1);
    assert.deepEqual(m.sleeps,[]);
  });
}
test('network errors stay fail-closed, no speculative retry', async () => {
  const m = mockHttp([new Error('network timeout'),response(200)]);
  await assert.rejects(readLivePr('andylitvinov-design/books', 4234, 'x', m.transport, m.sleep), /network timeout/);
  assert.equal(m.calls.length,1);
});
