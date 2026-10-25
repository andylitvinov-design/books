// Independent acceptance expectations for the nine existing public detail
// journeys. Never derive an expected identity from the observed iframe src.
const entry = (route, locale, audioLocale, player, selector, provider, id, internalOnly = false) => Object.freeze({
  route, locale, audioLocale, player, selector, provider, id, internalOnly,
  canonicalRoute: route.replace('/psychohomeopathy', '/alchemy-of-soul'),
});
export const SERVICE_VIDEO_DETAIL_CASES = Object.freeze([
  entry('/en/services/alchemy-of-soul', 'en', 'en', 'alchemy-method', '[data-alchemy-panel="video"]', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc'),
  entry('/en/services/hypnotherapy-course', 'en', 'en', 'hypnotherapy-method', '[data-service-video="hypnotherapy"]', 'heygen', '8c1634ce904434a91931429b6a7eefe1'),
  entry('/ru/services/alchemy-of-soul', 'ru', 'ru', 'alchemy-method', '[data-alchemy-panel="video"]', 'youtube', 'Cz6SxXJNZbw'),
  entry('/ru/services/hypnotherapy-course', 'ru', 'ru', 'hypnotherapy-method', '[data-service-video="hypnotherapy"]', 'youtube', 'eLsjFaKCBhI'),
  entry('/en/services/psychohomeopathy', 'en', 'en', 'alchemy-method', '[data-alchemy-panel="video"]', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc'),
  entry('/ru/services/psychohomeopathy', 'ru', 'ru', 'alchemy-method', '[data-alchemy-panel="video"]', 'youtube', 'Cz6SxXJNZbw'),
  entry('/es/services/imagery-therapy', 'es', 'en', 'hypnotherapy-method', '[data-service-video="hypnotherapy"]', 'heygen', '8c1634ce904434a91931429b6a7eefe1'),
  entry('/en/services/systemic-constellations', 'en', 'en', 'constellation-case', '[data-service-video="constellation-case"]', 'youtube', 'sfVFOQNr2qk'),
  entry('/en/services/free-situation-review', 'en', 'en', 'free-review-featured', '#service-video[data-featured-constellations-video]', 'youtube', 'sfVFOQNr2qk', true),
]);

function knownEntry(value) {
  if (!SERVICE_VIDEO_DETAIL_CASES.includes(value)) throw new Error('Unknown public video case');
  return value;
}

export function expectedServiceVideoWatchUrl(value) {
  const detail = knownEntry(value);
  return detail.provider === 'heygen'
    ? `https://app.heygen.com/share/${detail.id}`
    : `https://www.youtube.com/watch?v=${detail.id}`;
}

export function matchesServiceVideoPlayback(source, value) {
  const detail = knownEntry(value);
  if (typeof source !== 'string' || source.length > 2048) return false;
  if (detail.provider === 'heygen') return source === `https://app.heygen.com/embeds/${detail.id}`;
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.host !== 'www.youtube-nocookie.com' || url.username || url.password || url.hash ||
      url.pathname !== `/embed/${detail.id}` || !source.startsWith(`https://www.youtube-nocookie.com/embed/${detail.id}?`)) return false;
    const expected = { autoplay: '1', playsinline: '1', rel: '0', hl: detail.locale, cc_lang_pref: detail.audioLocale };
    return [...url.searchParams.keys()].sort().join(',') === Object.keys(expected).sort().join(',') &&
      Object.entries(expected).every(([key, value]) => url.searchParams.get(key) === value);
  } catch { return false; }
}

// Diagnostics expose only IDs already enumerated above, never arbitrary source
// strings, query values, text, account identifiers or page URLs.
const approvedSources = new Set(SERVICE_VIDEO_DETAIL_CASES.map(({ provider, id }) => `${provider}:${id}`));
export function safeServiceVideoIdentity(source) {
  if (typeof source !== 'string' || source.length > 2048) return null;
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const provider = url.hostname === 'www.youtube-nocookie.com' ? 'youtube' : url.hostname === 'app.heygen.com' ? 'heygen' : null;
    const id = provider === 'youtube' ? url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/)?.[1]
      : provider === 'heygen' ? url.pathname.match(/^\/embeds\/([a-f0-9]{32})$/)?.[1] : null;
    return id && approvedSources.has(`${provider}:${id}`) ? { provider, id } : null;
  } catch { return null; }
}

const boundedCount = count => Number.isSafeInteger(count) && count >= 0 ? Math.min(count, 1000) : null;
export async function serviceVideoFailureContext(page, value) {
  const detail = knownEntry(value);
  const receipt = {
    schema: 1, route: detail.route, locale: detail.locale, audioLocale: detail.audioLocale,
    player: detail.player, expected: { provider: detail.provider, id: detail.id },
    internalOnly: detail.internalOnly, contextStatus: 'unavailable',
  };
  try {
    const block = page.locator(detail.selector);
    const count = await block.count();
    // Never resolve an ambiguous player to whichever node happens to be first.
    receipt.blockCount = boundedCount(count);
    receipt.canonicalRouteMatched = new URL(page.url()).pathname === detail.canonicalRoute;
    if (count === 1) {
      receipt.playerCount = boundedCount(await block.locator('.site-video-player').count());
      receipt.iframeCount = boundedCount(await block.locator('iframe').count());
      receipt.posterCount = boundedCount(await block.locator('.site-video-play').count());
      receipt.playerWatchLinkCount = boundedCount(await block.locator('.site-video-watch-link').count());
      const sources = await block.locator('iframe').evaluateAll(frames => frames.slice(0, 3).map(frame => frame.getAttribute('src')));
      receipt.observed = sources.map(safeServiceVideoIdentity);
    }
    receipt.contextStatus = 'captured';
  } catch { /* Bounded partial context only; never serialize a diagnostic error. */ }
  return receipt;
}

export async function withServiceVideoFailureContext({ page, detail, write }, verify) {
  knownEntry(detail);
  try {
    return await verify();
  } catch (error) {
    try { await write(await serviceVideoFailureContext(page, detail)); }
    catch { /* Preserve the original fatal acceptance error even if writing fails. */ }
    throw error;
  }
}
