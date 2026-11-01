export type AxisRef = string;
export type AxisIdentity = {
 topic: string;
 id: string;
 label: { en: string; ru: string; es: string };
 sourceAxis: string;
};
export type AxisOfferLink = { ref: AxisRef; strength: 1 | 2 | 3 };
export type AxisOffer = {
 id: string;
 kind: "video" | "test" | "course" | "service";
 title: string;
 href: string;
 status: "published";
 free?: boolean;
 originalLanguage?: string;
 axisLinks: AxisOfferLink[];
};
export type AxisEvidence = {
 axisRef: AxisRef;
 resultId: string;
 dimensionKey: string;
 definitionKey: string;
 definitionVersion: string;
 instrumentLocale: "en" | "ru" | "es";
 rawValue: number;
 min: number;
 max: number;
 measuredAt: string;
 sourceTitle: string;
 interpretation: "source_score_only";
};
export type AxisMatch = AxisOffer & {
 score: number;
 matchLevel: "primary" | "supporting" | "related";
 axisRef: AxisRef;
 matchedAxes: AxisOfferLink[];
 hasSourceMeasurement: boolean;
};
export const AXIS_REFS: Readonly<Record<AxisRef,AxisIdentity>>;
export const LIFE_AREAS: Readonly<Record<string,readonly string[]>>;
export const SERVICE_AXIS_LINKS: Readonly<Record<string,readonly AxisOfferLink[]>>;
export const ORIGINAL_VIDEO_AXIS_LINKS: Readonly<Record<string,readonly AxisOfferLink[]>>;
export function verifiedAxisEvidence(measurements?: readonly unknown[]): AxisEvidence[];
export function sourceBandPosition(measurement: unknown, band: unknown): "unknown" | "below_reference" | "within_reference" | "above_reference";
export function videoFacetAxisLinks(video?: object): AxisOfferLink[];
export function publishedAxisOffers(input?: {
 locale?: "en"|"ru"|"es";
 services?: readonly {id:string;title:string;href:string}[];
 videos?: readonly {id?:string;youtubeId?:string;title:string;sourceLanguage?:string;topics?:string[]}[];
}): AxisOffer[];
export function rankAxisOffers(input?: {
 chosenAxis?: string;
 chosenAxes?: readonly string[];
 goalRatings?: Record<string,{current:number;desired:number}>;
 offers?: readonly AxisOffer[];
 measurements?: readonly unknown[];
 preferredKinds?: readonly string[];
 includeRelated?: boolean;
 limit?: number;
}): AxisMatch[];
