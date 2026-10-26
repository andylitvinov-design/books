import assert from 'node:assert/strict';
import { createReadOnlyPublicViewportIsolation } from './public-viewport-isolation.mjs';

// Only documents actually visited by the general public-services scenarios.
// Free review/hub and Holistic journeys own separate, narrower contexts.
const documents = new Set(['en', 'ru', 'es'].flatMap(locale => [
  '/services', '/services/catalog', '/services/imagery-therapy',
  '/services/systemic-constellations', '/services/business-consulting',
  '/services/alchemy-of-soul', '/tests', '/services/dao-health-profile',
  ...(['en', 'ru'].includes(locale) ? ['/services/hypnotherapy-course'] : []),
].map(path => '/' + locale + path)));
const imagePath = path => typeof path === 'string' &&
  /^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|avif|png|jpe?g|svg)$/.test(path) && !path.includes('..');

export function permittedPublicServicesRead(request, origin) {
  let url;
  try { url = new URL(request.url()); } catch { return false; }
  if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== origin || url.username || url.password || url.hash) return false;
  if (/\.\.|%2e|%2f|%5c|\\/i.test(url.pathname)) return false;
  const type = request.resourceType();
  if (documents.has(url.pathname)) return type === 'document' && !url.search && !request.url().endsWith('?');
  if (url.pathname === '/_next/image') {
    return type === 'image' && [...url.searchParams.keys()].sort().join(',') === 'q,url,w' &&
      imagePath(url.searchParams.get('url')) &&
      /^(?:16|32|48|64|96|128|256|384|640|750|828|1080|1200|1920|2048|3840)$/.test(url.searchParams.get('w')) &&
      /^(?:[1-9]|[1-9][0-9]|100)$/.test(url.searchParams.get('q'));
  }
  if (url.search || request.url().endsWith('?')) return false;
  if (type === 'image' && imagePath(url.pathname)) return true;
  const extension = {script: 'js', stylesheet: 'css', font: 'woff2?'}[type];
  return Boolean(extension && new RegExp('^/_next/static/(?:[a-zA-Z0-9_\\[\\]()-]+/)*[a-zA-Z0-9_.-]+\\.(?:' + extension + ')$')
    .test(url.pathname.replace(/%5B/gi, '[').replace(/%5D/gi, ']')));
}

// Sequential scenario ownership keeps only one general context alive. The real
// scenario still closes its page; the next create (or outer finally) drains and
// closes that entire context before another general page can be created.
export function createPublicServicesPageManager(browser, { origin }) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  const completed = [];
  let active = null, closed = false, pendingCreation = null, closing = null;
  const retire = async () => {
    if (!active) return;
    const previous = active;
    active = null;
    try { await previous.close(); }
    finally { completed.push(previous.summary()); }
  };
  return {
    async createPage(width) {
      assert.equal(closed, false, 'Public services manager is closed');
      assert.equal(pendingCreation, null, 'Public services scenarios must be sequential');
      assert.ok([320, 360, 390, 1188].includes(width), 'Only existing public-services viewports are authorized');
      const operation = (async () => {
        if (active) assert.equal(active.page.isClosed(), true, 'Previous public-services scenario must close its page');
        await retire();
        assert.equal(closed, false, 'Public services manager is closed');
        active = await createReadOnlyPublicViewportIsolation(browser, {
          origin, viewport: { width, height: 844 },
          permittedRead: request => permittedPublicServicesRead(request, origin),
        });
        return active.page;
      })();
      pendingCreation = operation;
      try { return await operation; }
      finally { pendingCreation = null; }
    },
    async assertClean() { if (active) await active.assertClean(); },
    summary: () => [...completed, ...(active ? [active.summary()] : [])],
    async close() {
      if (closing) return closing;
      closed = true;
      closing = (async () => {
        // A concurrently pending setup still belongs to this manager. Its caller
        // retains the setup exception; successful setup must be closed below.
        if (pendingCreation) await pendingCreation.catch(() => {});
        await retire();
      })();
      return closing;
    },
  };
}
