import type { CoreServiceOffer } from "../../data/core-service-offers";
import type { MeditationRequest } from "./meditation-catalog-types";
export const CLIENT_GOALS: readonly ["money","energy","relationships","goals","meaning"];
export function evaluateClientFit(item: {
 goals?: readonly string[];
 goalWeights?: Record<string,number>;
 situations?: readonly string[];
 desiredStates?: readonly string[];
 techniques?: readonly string[];
}, request?: MeditationRequest): {
 goalMatched: boolean; score: number;
 matchType: "exact" | "partial" | "topic" | "related";
 matched: Record<"situations"|"desiredStates"|"techniques",string[]>;
 groups: string[];
 reasons: Array<{facet: "goal"|"situation"|"outcome"|"technique",value:string}>;
};
export const CLIENT_SERVICE_FITS: Readonly<Record<string,{
 goals: readonly string[]; situations: readonly string[];
 desiredStates: readonly string[]; techniques: readonly string[];
 free:boolean; format:string;
}>>;
export type ServiceMatch = {
 offer: CoreServiceOffer; free:boolean; format:string; score:number;
 matchType: "exact" | "partial" | "topic" | "related";
 reasons: Array<{facet:"goal"|"situation"|"outcome"|"technique"|"axis",value:string}>;
};
export function rankClientServices(input?: {
 offers?: CoreServiceOffer[];
 request?: MeditationRequest & {paymentPreference?: "free" | "any"};
 limit?: number;
}): ServiceMatch[];
