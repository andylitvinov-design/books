/** Typed browser/owned-language presentation boundary (no data writes). */
export type DialogueMode = "browser" | "owned" | "none";
export type DecisionStatus = "recommend" | "clarify" | "no_match" |
  "safety_handoff" | "safety_check_required" | "human_review_required" |
  "client_paused" | "paused_for_review" | "needs_focus" | "unavailable";
export type NaturalSuggestion = { id: string; kind: string; title: string;
  href: string; reasons?: string[] };
export type NaturalDecision = { status: DecisionStatus | string;
  message?: string; question?: {key:string;text:string} | null;
  suggestions?: NaturalSuggestion[] };
export type NaturalInput = {
  locale?: "ru" | "en" | "es";
  message?: string;
  decision?: NaturalDecision | null;
  history?: { role: "user" | "assistant"; text: string }[];
  access?: { authenticated?: boolean; ownerScoped?: boolean };
  consent?: { browserInference?: boolean; ownedInference?: boolean; agentMemory?: boolean };
  memory?: { preferredName?: string; preferredStyle?: string };
  channel?: DialogueMode;
  style?: "warm" | "concise" | "structured";
};
export type LanguageRequest = {
  messages: {role:"system"|"user"|"assistant";content:string}[];
  maxOutputTokens: number;
};
export type NaturalEnvelope = {
  version: "hi-natural-dialogue-v1";
  locale: "ru" | "en" | "es";
  status: string;
  modelAllowed: boolean;
  provider: DialogueMode;
  modelRequest: LanguageRequest | null;
  replyFallback: string;
  action: NaturalSuggestion | null;
};
export type NaturalResult = {text:string;provider:DialogueMode;modelUsed:boolean;
  action:NaturalSuggestion|null};
export const NATURAL_DIALOGUE_VERSION:"hi-natural-dialogue-v1";
export function prepareNaturalDialogue(input?:NaturalInput):NaturalEnvelope;
export function acceptNaturalOutput(text:unknown,envelope:NaturalEnvelope):string|null;
export function finishNaturalDialogue(envelope:NaturalEnvelope,
  generator?: (request:LanguageRequest)=>Promise<string>):Promise<NaturalResult>;
