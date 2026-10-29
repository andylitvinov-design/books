/** Stateless, server-authorized guide adapter. */
import type { IntelligenceInput, IntelligenceFormat } from "./holistic-intelligence.mjs";
export type GuidedConsent = {
  profilePersonalization?: boolean;
  measuredPersonalization?: boolean;
  practiceHistory?: boolean;
  paidSuggestions?: boolean;
  sensitiveContent?: boolean;
};
export type GuidedSafety = { status?: "clear" | "urgent" | "human_review" | string };
export type GuidedFeedback = { dismissedIds?: readonly string[]; completedIds?: readonly string[] };
export type GuidedTurnInput = {
  locale?: "en" | "ru" | "es";
  intent?: IntelligenceInput["intent"] | null;
  /** Trusted server assertion, never supplied by request JSON. */
  access?: { authenticated?: boolean; ownerScoped?: boolean } | null;
  consent?: GuidedConsent | null;
  safety?: GuidedSafety | null;
  profile?: { measurements?: readonly unknown[] } | null;
  catalogs?: IntelligenceInput["catalogs"] | null;
  feedback?: GuidedFeedback | null;
  history?: GuidedFeedback | null;
  limit?: number;
};
export type GuidedSuggestion = {
  id: string;
  kind: Exclude<IntelligenceFormat, "meditation">;
  title: string;
  href: string;
  reasons: string[];
  relevanceClass: string;
  free: boolean;
  requiresUserConfirmation: true;
};
export type GuidedTurn = {
  status: "safety_handoff" | "safety_check_required" | "clarify" |
    "unavailable" | "no_match" | "recommend";
  language: "en" | "ru" | "es";
  version: string;
  guideVersion: "hi-guided-turn-v1";
  catalogOrchestratorVersion: "hi-core-v1";
  message: string;
  suggestions: GuidedSuggestion[];
  primary?: GuidedSuggestion;
  question?: { key: string; text: string } | null;
  saved: false;
  externalModelUsed: false;
  historyUsed: boolean;
  modelUsed: false;
  measuredProfileUsed: boolean;
  automatedAction: false;
};
export const GUIDED_INTELLIGENCE_VERSION: "hi-guided-turn-v1";
export function buildHolisticGuidedTurn(input?: GuidedTurnInput): GuidedTurn;
