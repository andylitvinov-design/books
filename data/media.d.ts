import type { Buffer } from "node:buffer";

export const mediaRoots: Record<string, string>;
export function validateMediaRequest(series: string, file: string): boolean;
export function mediaPathFor(series: string, file: string): string | undefined;
export function getMediaAsset(series: string, file: string): Promise<{
  body: Buffer;
  contentType: string;
} | undefined>;
