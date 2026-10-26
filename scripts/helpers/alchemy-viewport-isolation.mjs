import assert from 'node:assert/strict';
import { createReadOnlyPublicViewportIsolation } from './public-viewport-isolation.mjs';

// Production-only local document/typed assets. API, private routes, speculative
// pages, provider media and arbitrary optimizer sources are never transported.
export function permittedAlchemyViewportRead(request, origin, locale) {
  let url;
  try { url = new URL(request.url()); } catch { return false; }
  if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== origin || url.username || url.password || url.hash) return false;
  if (url.pathname.includes('..') || /%2e|%2f|%5c|\\/i.test(url.pathname)) return false;
  const type = request.resourceType();
  const root = '/' + locale + '/services/alchemy-of-soul';
  if ([root, root + '/example-report'].includes(url.pathname)) return type === 'document' && !url.search && !request.url().endsWith('?');
  const safeImage = path => /^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|avif|png|jpe?g|svg)$/.test(path) && !path.includes('..');
  if (url.pathname === '/_next/image') {
    const keys = [...url.searchParams.keys()].sort();
    return type === 'image' && keys.join(',') === 'q,url,w'
      && safeImage(url.searchParams.get('url'))
      && /^(?:16|32|48|64|96|128|256|384|640|750|828|1080|1200|1920|2048|3840)$/.test(url.searchParams.get('w'))
      && /^(?:[1-9]|[1-9][0-9]|100)$/.test(url.searchParams.get('q'));
  }
  if (url.search || request.url().endsWith('?')) return false;
  if (type === 'image' && safeImage(url.pathname)) return true;
  const extension = {script:'js',stylesheet:'css',font:'woff2?'}[type];
  // Literal locale route brackets are expected in production chunk paths.
  return Boolean(extension && new RegExp('^/_next/static/(?:[a-zA-Z0-9_\\[\\]()-]+/)*[a-zA-Z0-9_.-]+\\.(?:' + extension + ')$').test(url.pathname.replace(/%5B/gi, '[').replace(/%5D/gi, ']')));
}

export async function createAlchemyViewportIsolation(browser, { origin, locale, viewport }) {
  assert.ok(['en', 'ru', 'es'].includes(locale));
  return createReadOnlyPublicViewportIsolation(browser, {
    origin, viewport, permittedRead: request => permittedAlchemyViewportRead(request, origin, locale),
  });
}
