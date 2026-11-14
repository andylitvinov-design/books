export type MyTubeYouTubeShelf = "practices" | "courses" | "masters" | "videos";
export type MyTubeYouTubeLanguage = "ru" | "en" | "es";
export interface MyTubeYouTubeScope {
  shelf: MyTubeYouTubeShelf;
  locale: MyTubeYouTubeLanguage;
  queryLanguage: MyTubeYouTubeLanguage;
  topic: string;
  query: string;
  key: string;
}
export interface MyTubeExternalVideo {
  id: string;
  provider: "youtube";
  title: string;
  channel: string;
  href: string;
  poster: string;
  durationSeconds: number;
}
export declare function normalizeMyTubeYouTubeScope(input?: Record<string, unknown>): MyTubeYouTubeScope | null;
export declare function youtubeSearchUrl(scope: MyTubeYouTubeScope | null): string | null;
export declare function durationSeconds(iso: unknown): number | null;
export declare function verifiedYouTubeMatches(searchData: unknown, videoData: unknown, shelf: MyTubeYouTubeShelf): MyTubeExternalVideo[];
