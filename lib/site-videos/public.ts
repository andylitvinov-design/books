import 'server-only';

import { cache } from 'react';
import { unstable_cache, unstable_noStore as noStore } from 'next/cache';

import { toPublishedSiteVideo } from './model.js';
import { builtInSiteVideoRecords } from './defaults.js';
import type { PublishedSiteVideo, SiteVideoStore } from './model.js';
import { getSiteVideoStore } from './store.js';

// Cache only the already-filtered, public-facing snapshot. Neither private records,
// editorial drafts nor request-specific cookies or CSP nonces enter this data cache.
// Every page still renders dynamically; the administrator invalidates this tag on save.
const readPublishedSiteVideos = unstable_cache(
  async (): Promise<Record<string, PublishedSiteVideo>> => {
    const store = getSiteVideoStore() as SiteVideoStore | undefined;
    if (!store) {
      console.warn('[site-videos] Public video storage is not configured.');
      // Preserve the approved pre-KV publications, never unpublished drafts.
      return Object.fromEntries(builtInSiteVideoRecords().flatMap(record => {
        const video = toPublishedSiteVideo(record);
        return video ? [[record.key, video]] : [];
      }));
    }
    const videos: Record<string, PublishedSiteVideo> = {};
    for (const record of await store.list()) {
      const video = toPublishedSiteVideo(record);
      if (video) videos[record.key] = video;
    }
    return videos;
  },
  ['holistic-house:published-videos:v1'],
  { revalidate: 60, tags: ['holistic-house-published-site-videos'] },
);

/** React request deduplication plus a bounded cross-request cache of public data. */
export const getPublishedSiteVideos = cache(async (): Promise<Record<string, PublishedSiteVideo>> => {
  // Dynamic document HTML is intentional: the CSP nonce and locale vary by request.
  // The private cabinet and account/API no-store boundary are unaffected.
  noStore();
  try {
    return await readPublishedSiteVideos();
  } catch {
    // Do not cache a transient Redis error as an empty public video library.
    console.error('[site-videos] Published videos could not be read.');
    return {};
  }
});
