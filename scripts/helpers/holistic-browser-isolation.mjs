import assert from 'node:assert/strict';
import { createReadOnlyPublicViewportIsolation } from './public-viewport-isolation.mjs';

const locales = ['en', 'ru', 'es'];
const imagePath = path => typeof path === 'string' &&
  /^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|avif|png|jpe?g|svg)$/.test(path) && !path.includes('..');

// Only the four actual public journeys and typed local production assets.
// Arbitrary same-origin GETs, API/customer reads and provider media stay blocked.
export function permittedHolisticRead(request, origin, locale) {
  if (!locales.includes(locale)) return false;
  let url;
  try { url = new URL(request.url()); } catch { return false; }
  if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== origin || url.username || url.password || url.hash) return false;
  if (/\.\.|%2e|%2f|%5c|\\/i.test(url.pathname)) return false;
  const type = request.resourceType();
  const documents = ['/holistic-support', '/services/remote-energy-support', '/services/free-consultation', '/pro']
    .map(path => '/' + locale + path);
  if (documents.includes(url.pathname)) {
    if (type === 'document') return !url.search && !request.url().endsWith('?');
    // Native Next Link routing is still a public read of exactly this route.
    return request.method() === 'GET' && type === 'fetch' && request.headers().rsc === '1' &&
      [...url.searchParams.keys()].join(',') === '_rsc' && /^[a-zA-Z0-9_-]{1,64}$/.test(url.searchParams.get('_rsc'));
  }
  if (url.pathname === '/_next/image') {
    return type === 'image' && [...url.searchParams.keys()].sort().join(',') === 'q,url,w' &&
      imagePath(url.searchParams.get('url')) &&
      /^(?:16|32|48|64|96|128|256|384|640|750|828|1080|1200|1920|2048|3840)$/.test(url.searchParams.get('w')) &&
      /^(?:[1-9]|[1-9][0-9]|100)$/.test(url.searchParams.get('q'));
  }
  if (url.search || request.url().endsWith('?')) return false;
  if (type === 'image' && imagePath(url.pathname)) return true;
  if (type === 'media' && url.pathname === '/audio/holistic-house-soft-melody-gentle-waves-96s.wav') return true;
  const extension = {script:'js', stylesheet:'css', font:'woff2?'}[type];
  return Boolean(extension && new RegExp('^/_next/static/(?:[a-zA-Z0-9_\\[\\]()-]+/)*[a-zA-Z0-9_.-]+\\.(?:' + extension + ')$')
    .test(url.pathname.replace(/%5B/gi, '[').replace(/%5D/gi, ']')));
}

// The current gallery's account-owned GET is fulfilled only by the shared
// fixed anonymous401 fixture, never by the local API/provider/customer store.
export async function createHolisticBrowserIsolation(browser, {origin, locale, viewport}) {
  assert.ok(locales.includes(locale));
  return createReadOnlyPublicViewportIsolation(browser, {
    origin, viewport, mobile:true, anonymousTalismans:true,
    permittedRead: request => permittedHolisticRead(request, origin, locale),
  });
}
