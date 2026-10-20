import assert from 'node:assert/strict';

// Install before opening any page. Exact page-level fixture routes take
// precedence; every other write and off-origin document navigation is denied.
export async function installPublicUiNetworkGuard(context, origin) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/,
    'Public UI network guard requires an explicit loopback origin');
  const blocked = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const target = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())
        || (request.isNavigationRequest() && target.origin !== origin)) {
      // Do not store the query, body, or headers in diagnostics.
      blocked.push({ method: request.method(), origin: target.origin, path: target.pathname });
      await route.abort('blockedbyclient');
      return;
    }
    if (request.isNavigationRequest()) {
      // Playwright routes only the first URL in a redirect chain. Inspect a
      // local document response without following redirects; never hand a 3xx
      // to the browser, even if it currently points back to loopback.
      const response = await route.fetch({ maxRedirects: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        blocked.push({ method: request.method(), origin: target.origin, path: target.pathname, reason: 'document-redirect' });
        await route.abort('blockedbyclient');
        return;
      }
      await route.fulfill({ response });
      return;
    }
    await route.continue();
  });
  return {
    blocked,
    assertNoUnexpectedRequests() {
      assert.deepEqual(blocked, [], 'Unexpected write or external document navigation was blocked; no real save is permitted');
    },
  };
}
