import type { MeditationCatalogRecord, MeditationMatch, MeditationRequest } from "./meditation-catalog-types";
import type { CoreServiceOffer } from "../../data/core-service-offers";
import type { AxisOffer, AxisMatch } from "./axis-offer-matcher.mjs";
import type { ServiceMatch } from "./client-intent-model.mjs";

export type IntelligenceFormat = "meditation" | "video" | "audio" | "test" | "course" | "service";
export type AudioPreference = {
  kind?: "all" | "tones" | "pulse" | "nature";
  mood?: "all" | "calm" | "focus" | "uplift";
  pace?: "all" | "slow" | "steady" | "active";
  voiceFriendly?: boolean;
};
export type PublishedReikiAudio = {
  lesson: "flight" | "tantra" | "kundalini" | "yggdrasil" | "initiation";
  locale: "ru" | "en";
  src: string;
  publishedAt: string;
  verifiedPublicManifest: boolean;
};
export type IntelligenceAudioMatch = {
  id: string;
  kind: "audio";
  audioType: "approved_course_introduction" | "on_site_video_soundtrack";
  source: "public_reiki_course_manifest" | "site_original_synthetic_audio";
  title: string;
  href: string;
  playable: boolean;
  free: true;
  originalLanguage?: "en" | "ru";
  matchedAxes?: string[];
  goalMatched?: boolean;
  publishedAt?: string;
  editorTrackId?: string;
  detail?: string;
};
export type IntelligenceIntent = MeditationRequest & {
  chosenAxes?: readonly string[];
  enabledFormats?: readonly IntelligenceFormat[];
  preferredFormat?: IntelligenceFormat;
  paymentPreference?: "free" | "any";
  goalRatings?: Record<string, {current: number; desired: number}>;
  audioPreferences?: AudioPreference;
  dismissedIds?: readonly string[];
  rawUtterance?: string;
  safetyStop?: boolean;
  videoLimit?: number;
};
export type IntelligenceInput = {
  locale?: "en" | "ru" | "es";
  intent?: IntelligenceIntent;
  profile?: {
    ownerAuthorized?: boolean;
    consentToUseResults?: boolean;
    measurements?: readonly unknown[];
  };
  catalogs?: {
    axisOffers?: readonly AxisOffer[];
    meditationVideos?: MeditationCatalogRecord[];
    publishedSourceIds?: string[];
    services?: CoreServiceOffer[];
    publishedReikiAudio?: readonly PublishedReikiAudio[];
  };
  limits?: {
    axisOffers?: number;
    services?: number;
    editorAudio?: number;
    publicAudio?: number;
  };
};
export type IntelligencePrimary = {
  id: string;
  kind: IntelligenceFormat;
  href: string;
  source: string;
};
export type IntelligencePlan = {
  version: string;
  locale: "en" | "ru" | "es";
  status: "ready" | "needs_focus" | "safety_stop" | "no_reviewed_match";
  context: {
    usedVerifiedSourceEvidence: boolean;
    chosenAxes: string[];
    goal: string | null;
  };
  meditations: MeditationMatch[];
  services: ServiceMatch[];
  axisOffers: AxisMatch[];
  audio: IntelligenceAudioMatch[];
  primary: IntelligencePrimary | null;
  safetyAction?: "human_support_required";
};
export const HOLISTIC_INTELLIGENCE_VERSION: "hi-core-v1";
export const HI_FORMATS: readonly IntelligenceFormat[];
export function publishedReikiAudioRecommendations(input?: {
  locale?: string;
  goal?: string | null;
  chosenAxes?: readonly string[];
  publishedAudio?: readonly PublishedReikiAudio[];
  limit?: number;
}): IntelligenceAudioMatch[];
export function editorSoundtrackRecommendations(input?: {
  locale?: string;
  goal?: string | null;
  chosenAxes?: readonly string[];
  audioPreferences?: AudioPreference;
  limit?: number;
}): IntelligenceAudioMatch[];
export function buildHolisticIntelligencePlan(input?: IntelligenceInput): IntelligencePlan;
