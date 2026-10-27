import assert from 'node:assert/strict';

// One observed anonymous Academy mount probe, not a backend/auth health check.
// The real missing-session branch returns this denial before any repository call.
export const anonymousBootstrapDenial = Object.freeze({
  status: 401,
  contentType: 'application/json',
  body: '{"error":"SIGN_IN_REQUIRED"}',
  headers: Object.freeze({
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', Vary: 'Cookie',
  }),
});
const browserHeaders = new Set(['accept','accept-encoding','accept-language','cache-control','connection','dnt','host','origin','pragma','priority','referer','user-agent',
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode','sec-fetch-site']);

export function createAnonymousAcademyBootstrapFixture(origin, locale) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  assert.equal(new URL(origin).origin, origin);
  assert.ok(['en','ru','es'].includes(locale));
  let denials = 0;
  return {
    get denials() { return denials; },
    async tryFulfill(route, phase) {
      if (denials !== 0 || phase !== 'academy') return false;
      try {
        const request = route.request();
        if (request.url() !== origin + '/api/app/bootstrap' || request.method() !== 'GET' ||
            request.resourceType() !== 'fetch' || request.isNavigationRequest() !== false ||
            ![null, ''].includes(request.postData()) || request.frame().url() !== origin + '/' + locale + '/academy') return false;
        // Full header observation is required. Unknown/private/auth/session or
        // prefetch headers fail closed; values/identifiers are never recorded.
        const headers = await request.allHeaders();
        if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return false;
        const names = Object.keys(headers);
        if (new Set(names.map(name => name.toLowerCase())).size !== names.length || names.some(name => !browserHeaders.has(name.toLowerCase()))) return false;
        const value = key => headers[names.find(name => name.toLowerCase() === key)];
        if (value('host') !== undefined && value('host') !== new URL(origin).host) return false;
        if (value('referer') !== undefined && value('referer') !== origin + '/' + locale + '/academy') return false;
        if (value('origin') !== undefined && value('origin') !== origin) return false;
        if (value('sec-fetch-site') !== undefined && value('sec-fetch-site') !== 'same-origin') return false;
      } catch { return false; }
      // Reserve before awaiting fulfillment: concurrent duplicates cannot pass.
      if (denials !== 0) return false;
      denials++;
      await route.fulfill({ ...anonymousBootstrapDenial, headers: { ...anonymousBootstrapDenial.headers } });
      return true;
    },
  };
}
