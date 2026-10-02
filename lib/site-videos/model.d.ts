export type Locale = 'en' | 'ru';
/** Public video language; private cabinet/UI locales remain EN/RU. */
export type VideoLocale = Locale | 'es';

export interface PublishedSiteVideo {
  youtubeId: string;
  heygenId?: string;
  title: string;
  description?: string;
  transcript?: string;
  language: VideoLocale;
  durationSeconds?: number;
}

export interface SiteVideoDraft extends PublishedSiteVideo {
  youtubeUrl: string;
  driveUrl?: string;
  youtubeVisibility: 'unlisted' | 'public';
}

export interface SiteVideoRecord {
  key: string;
  slot: string;
  locale: VideoLocale;
  entityId: string;
  revision: number;
  draft: SiteVideoDraft | null;
  published: (PublishedSiteVideo & { scope: 'public'; status: 'published'; visibility: 'public' }) | null;
  updatedAt: string;
}

export interface SiteVideoChange {
  slot: string;
  locale: VideoLocale;
  entityId?: string;
  intent: 'draft' | 'publish' | 'hide';
  youtubeUrl?: string;
  title?: string;
  description?: string;
  transcript?: string;
  driveUrl?: string;
  durationSeconds?: number | string;
  youtubeVisibility?: 'unlisted' | 'public';
  reviewed?: boolean;
}

export interface SiteVideoStore {
  list(): Promise<SiteVideoRecord[]>;
  get(key: string): Promise<SiteVideoRecord | null>;
  save(record: SiteVideoRecord, expectedRevision: number): Promise<void>;
}

export class SiteVideoError extends Error {
  code: 'validation' | 'approval' | 'conflict' | 'storage';
  constructor(code: SiteVideoError['code'], message?: string);
}

export const SITE_VIDEO_SLOTS: readonly Readonly<{
  id: string;
  label: Readonly<Record<Locale, string>>;
  entityType?: 'remedy' | 'book';
}>[];

export function videoKey(slot: string, locale: VideoLocale, entityId?: string): string;
export function videoPagePath(slot: string, locale: VideoLocale, entityId?: string): string;
export function parseYouTubeId(source: unknown): string | null;
export function parseSiteVideoSource(source: unknown): { youtubeId: string; heygenId?: string } | null;
export function siteVideoWatchUrl(video: Pick<PublishedSiteVideo, 'youtubeId' | 'heygenId'>): string;
export function prepareVideoChange(previous: SiteVideoRecord | null | undefined, input: SiteVideoChange, now?: Date | string): SiteVideoRecord;
export function toPublishedSiteVideo(record: unknown): PublishedSiteVideo | undefined;
export function isSiteVideoRecord(record: unknown): record is SiteVideoRecord;
