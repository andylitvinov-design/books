import 'server-only';

import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';

import { toPublishedSiteVideo } from './model.js';
import { builtInSiteVideoRecords } from './defaults.js';
import type { PublishedSiteVideo, SiteVideoStore } from './model.js';
import { getSiteVideoStore } from './store.js';

/** One read per React request, with no persisted Next.js/HTTP data cache. */
export const getPublishedSiteVideos = cache(async (): Promise<Record<string, PublishedSiteVideo>> => {
  // This also keeps a page dynamic when storage was absent during the build.
  noStore();
  try {
    const store = getSiteVideoStore() as SiteVideoStore | undefined;
    if (!store) {
      console.warn('[site-videos] Public video storage is not configured.');
      // The already-live approved introduction also works before KV is configured.
      // This never includes newly edited or unpublished video content.
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
  } catch {
    console.error('[site-videos] Published videos could not be read.');
    return {};
  }
});
