import 'server-only';

import { cache } from 'react';
import { unstable_cache, unstable_noStore as noStore } from 'next/cache';

import { toPublishedSiteVideo } from './model.js';
import { builtInSiteVideoRecords } from './defaults.js';
import type { PublishedSiteVideo, SiteVideoStore } from './model.js';
import { getPublicSiteVideoStore } from './store.js';
const diagnosticCategories = new Set([
  'provider-limit', 'provider-auth', 'provider-endpoint', 'provider-5xx',
  'provider-http', 'provider-command', 'provider-protocol', 'timeout', 'transport',
]);
function safeStorageDiagnostic(error: unknown): string {
  const category = error && typeof error === 'object' && 'diagnosticCode' in error
    ? error.diagnosticCode : undefined;
  return typeof category === 'string' && diagnosticCategories.has(category)
    ? category : 'unknown';
}


function approvedBuiltInVideos(): Record<string, PublishedSiteVideo> {
  // Storage-off mode is cheap and deterministic. Never share its cache key
  // with a previous storage-on process (e.g. isolated CI followed by fallback).
  return Object.fromEntries(builtInSiteVideoRecords().flatMap(record => {
    const video = toPublishedSiteVideo(record);
    return video ? [[record.key, video]] : [];
  }));
}

// Cache only already-filtered published data from the configured server store.
// No draft fields, session data, cookies or per-request CSP nonce are cached.
const readStoredPublishedVideos = unstable_cache(
  async (): Promise<Record<string, PublishedSiteVideo>> => {
    const store = getPublicSiteVideoStore() as Pick<SiteVideoStore, 'get' | 'list'> | undefined;
    // Cached snapshots can still revalidate after a deployment switched to
    // the supported storage-off mode. Return an empty stored snapshot rather
    // than throwing (and retrying) during background revalidation. The actual
    // public request uses the approved built-in records in storage-off mode.
    if (!store) return {};
    const videos: Record<string, PublishedSiteVideo> = {};
    try {
      // Video placements are optional content. Do not block public HTML for
      // the full 5-second admin-store timeout if the Redis API is unhealthy.
      for (const record of await store.list({ timeoutMs: 1200 })) {
        const video = toPublishedSiteVideo(record);
        if (video) videos[record.key] = video;
      }
      return videos;
    } catch (error) {
      // Cached published-only snapshot stays empty rather than restoring an
      // unseen/hidden editorial override. No provider data enters this log.
      console.warn('[site-videos] Public video storage unavailable; category=' + safeStorageDiagnostic(error) + '; serving an empty 60s snapshot.');
      return {};
    }
  },
  ['holistic-house:published-videos:stored:v3'],
  { revalidate: 60, tags: ['holistic-house-published-site-videos'] },
);

/**
 * Public placements need one reviewed record, not every draft+transcript in
 * the editorial Redis hash. The durable store's HGET honours hidden/malformed
 * overrides and the explicit published-only conversion; never fall back to a
 * built-in video on upstream error.
 */
const readStoredPublishedSiteVideo = unstable_cache(
  async (key: string): Promise<PublishedSiteVideo | undefined> => {
    const store = getPublicSiteVideoStore() as Pick<SiteVideoStore, 'get' | 'list'> | undefined;
    if (!store) return undefined;
    try {
      // This is a streamed or below-fold media section. A bounded HGET is
      // cheaper than HGETALL and cannot block the primary hero render.
      // The existing Redis integration still times out after 3 seconds on
      // exact production SHA. Keep the original low-latency public ceiling
      // while an authorized provider repair is pending.
      return toPublishedSiteVideo(await store.get(key, { timeoutMs: 1800 }));
    } catch (error) {
      // This fixed diagnostic enum reveals neither request parameters nor
      // credentials. Keep the publication gate fail-closed during an outage.
      console.warn('[site-videos] Public single-video read unavailable; category=' + safeStorageDiagnostic(error) + '; keeping placement hidden for 60s.');
      return undefined;
    }
  },
  ['holistic-house:published-video:single-key:v2'],
  { revalidate: 60, tags: ['holistic-house-published-site-videos'] },
);

export const getPublishedSiteVideo = cache(async (key: string): Promise<PublishedSiteVideo | undefined> => {
  // Preserve the per-response CSP nonce and URL-derived locale; only the
  // explicitly approved public record is shared by the data cache.
  noStore();
  if (!getPublicSiteVideoStore()) {
    const record = builtInSiteVideoRecords().find(item => item.key === key);
    return record ? toPublishedSiteVideo(record) : undefined;
  }
  try {
    return await readStoredPublishedSiteVideo(key);
  } catch {
    // Nothing from Redis (or its credentials) may be reflected to a visitor.
    return undefined;
  }
});

/** Dynamic HTML, bounded data cache only. Never cache the storage-off fallback. */
export const getPublishedSiteVideos = cache(async (): Promise<Record<string, PublishedSiteVideo>> => {
  // The document's CSP nonce and locale can change on every request.
  noStore();
  if (!getPublicSiteVideoStore()) {
    return approvedBuiltInVideos();
  }
  try {
    return await readStoredPublishedVideos();
  } catch {
    // A transient Redis error must not poison the cache with an empty record.
    console.error('[site-videos] Published videos could not be read.');
    return {};
  }
});
