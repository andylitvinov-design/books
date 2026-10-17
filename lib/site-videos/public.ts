import 'server-only';

import { cache } from 'react';
import { unstable_cache, unstable_noStore as noStore } from 'next/cache';

import { toPublishedSiteVideo } from './model.js';
import { builtInSiteVideoRecords } from './defaults.js';
import type { PublishedSiteVideo, SiteVideoStore } from './model.js';
import { getSiteVideoStore } from './store.js';

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
    const store = getSiteVideoStore() as SiteVideoStore | undefined;
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
    } catch {
      // Fail closed: never show a draft, hidden override, or unverified builtin.
      // Cache this *empty* public result for 60 seconds rather than throwing on
      // every stale revalidation and re-hitting an unavailable external store.
      // A successful owner publication invalidates the tag immediately.
      console.warn('[site-videos] Public video storage unavailable; serving an empty 60s snapshot.');
      return {};
    }
  },
  ['holistic-house:published-videos:stored:v2'],
  { revalidate: 60, tags: ['holistic-house-published-site-videos'] },
);

/** Dynamic HTML, bounded data cache only. Never cache the storage-off fallback. */
export const getPublishedSiteVideos = cache(async (): Promise<Record<string, PublishedSiteVideo>> => {
  // The document's CSP nonce and locale can change on every request.
  noStore();
  if (!getSiteVideoStore()) {
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
