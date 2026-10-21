import assert from 'node:assert/strict';
import test from 'node:test';
import { installPublicUiNetworkGuard } from '../scripts/helpers/public-ui-network-guard.mjs';

async function harness() {
  let intercept;
  const guard = await installPublicUiNetworkGuard({ route: async (pattern, handler) => {
    assert.equal(pattern, '**/*'); intercept = handler;
  } }, 'http://127.0.0.1:3100');
  return { guard, async request(method, url, navigation = false, status = 200) {
    const calls = [];
    await intercept({ request: () => ({ method: () => method, url: () => url, isNavigationRequest: () => navigation }),
      abort: async reason => calls.push('abort:' + reason), continue: async () => calls.push('continue'),
      fetch: async options => { assert.deepEqual(options, { maxRedirects: 0 }); calls.push('fetch-without-redirects'); return { status: () => status }; },
      fulfill: async ({ response }) => calls.push('fulfill:' + response.status()),
    });
    return calls;
  } };
}
test('network guard permits read-only resources and same-origin public navigation', async () => {
  const mounted = await harness();
  for (const [method, url, navigation] of [
    ['GET', 'http://127.0.0.1:3100/en/services', true],
    ['HEAD', 'http://127.0.0.1:3100/image.webp', false],
    ['GET', 'https://i.ytimg.com/vi/public/hqdefault.jpg', false],
  ]) assert.deepEqual(await mounted.request(method, url, navigation), navigation ? ['fetch-without-redirects', 'fulfill:200'] : ['continue']);
  mounted.guard.assertNoUnexpectedRequests();
});

test('network guard blocks every unmocked mutation, including wrong endpoints and remote destinations', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    for (const url of ['http://127.0.0.1:3100/api/service-enquiries', 'http://127.0.0.1:3100/api/wrong', 'https://holistichouse.vercel.app/api/service-enquiries?private=never-log']) {
      const mounted = await harness();
      assert.deepEqual(await mounted.request(method, url), ['abort:blockedbyclient']);
      assert.throws(() => mounted.guard.assertNoUnexpectedRequests(), /Unexpected write/);
      assert.ok(!JSON.stringify(mounted.guard.blocked).includes('never-log'));
    }
  }
});

test('network guard blocks external document navigation even when GET', async () => {
  for (const url of ['https://wa.me/14376066502', 'https://t.me/AndyTherapist', 'https://holistichouse.vercel.app/en/services', 'http://localhost:3100/en/services']) {
    const mounted = await harness();
    assert.deepEqual(await mounted.request('GET', url, true), ['abort:blockedbyclient']);
    assert.throws(() => mounted.guard.assertNoUnexpectedRequests());
  }
});

test('network guard refuses external/ambiguous origins before registration', async () => {
  for (const origin of ['https://holistichouse.vercel.app', 'http://localhost.evil:3100', 'http://127.0.0.1:3100/path', 'http://user@127.0.0.1:3100']) {
    let registered = false;
    await assert.rejects(installPublicUiNetworkGuard({ route: async () => { registered = true; } }, origin));
    assert.equal(registered, false);
  }
});


test('network guard never hands a local document redirect to the browser or follows it', async () => {
  for (const status of [300, 301, 302, 303, 304, 307, 308, 399]) {
    const mounted = await harness();
    assert.deepEqual(await mounted.request('GET', 'http://127.0.0.1:3100/redirect?private=never-log', true, status),
      ['fetch-without-redirects', 'abort:blockedbyclient']);
    assert.throws(() => mounted.guard.assertNoUnexpectedRequests());
    assert.equal(mounted.guard.blocked[0].reason, 'document-redirect');
    assert.ok(!JSON.stringify(mounted.guard.blocked).includes('never-log'));
  }
});
