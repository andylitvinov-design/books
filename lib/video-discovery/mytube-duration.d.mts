export type MyTubeFormatMode = "all" | "shorts" | "courses" | "study";
export type MyTubeEditorialFormat = "shorts" | "study";
export interface MyTubeClassifiableVideo {
  mytubeFormat?: MyTubeEditorialFormat | null;
  contentType?: string | null;
  sourceGroup?: string;
  seriesId?: string;
  seriesOrder?: number;
  title?: string;
  description?: string;
}
export declare function classifyMyTubeFormat(video?: MyTubeClassifiableVideo | null): MyTubeEditorialFormat;
export declare function matchesMyTubeFormat(video: MyTubeClassifiableVideo, mode?: MyTubeFormatMode): boolean;
export declare function myTubeFormatCounts(items?: ReadonlyArray<MyTubeClassifiableVideo>): {all: number; shorts: number; study: number};
