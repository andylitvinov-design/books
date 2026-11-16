export type ReasoningConfidence = "low" | "moderate" | "high";
export type ReasoningNextMove =
  | "reflect_tradeoff_then_clarify" | "accept_correction_and_reframe"
  | "honor_explicit_choice" | "answer_in_recent_user_context"
  | "ask_what_to_clarify" | "acknowledge_before_advice"
  | "respect_refusal_and_offer_alternative"
  | "acknowledge_without_authorizing_action"
  | "repair_answer_style_or_relevance" | "respond_socially"
  | "reduce_scope_and_clarify" | "clarify_user_goal"
  | "answer_directly_or_ask_one_question";
export interface ConversationReasoning {
  version: "hh-reasoning-mind-v1";
  act: string;
  currentTopic: string | null;
  contextTopic: string | null;
  evidence: string[];
  contradictionSignals: string[];
  uncertainty: string[];
  confidence: ReasoningConfidence;
  confidenceScore: number;
  nextMove: ReasoningNextMove;
  requiresClarification: boolean;
  rationaleCode: string;
}
export declare const REASONING_MIND_VERSION: "hh-reasoning-mind-v1";
export declare function reasonAboutConversationTurn(options?: {
  message?: string;
  locale?: "ru" | "en" | "es";
  history?: Array<{role: "user" | "assistant"; text: string}>;
}): ConversationReasoning;
