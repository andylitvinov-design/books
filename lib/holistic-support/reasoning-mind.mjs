/**
 * Reasoning Mind v1 — compact, auditable decision support for dialogue.
 *
 * This deliberately does NOT generate or expose private chain-of-thought.
 * It records only observable evidence provenance, calibrated confidence,
 * uncertainty flags, contradiction signals and a recommended next move.
 * Pure/offline/ephemeral: no network, persistence, diagnosis, consent or action.
 */
import { understandConversationTurn, resolveRecentConversationTopic } from "./conversation-intelligence.mjs";
import { interpretDialogueCoherence } from "./dialogue-coherence.mjs";

export const REASONING_MIND_VERSION = "hh-reasoning-mind-v1";
const LIMIT = 3000;
const LOCALES = new Set(["ru", "en", "es"]);
const norm = value => String(value ?? "").toLocaleLowerCase()
  .replace(/ё/g, "е").normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "").replace(/[’']/gu, "")
  .replace(/\s+/gu, " ").trim();

function contradictionSignals(message, currentTopic, priorTopic, act) {
  const text = norm(message);
  const signals = [];
  if (act === "correction") signals.push("explicit_user_correction");
  if (currentTopic && priorTopic && currentTopic !== priorTopic)
    signals.push("topic_changed_since_recent_user_turn");
  if (/\b(?:but|however|although|though)\b|(?:^|\s)(?:но|однако)(?:\s|$)|\b(?:pero|sin embargo|aunque)\b/u.test(text) &&
      /(?:afraid|scared|worried|concerned|doubt|unsure|miedo|preocup|duda|боюсь|страшно|сомнева|тревож)/u.test(text))
    signals.push("mixed_wish_and_concern");
  if (act === "ambivalence") signals.push("ambivalence_detected");
  return signals;
}
function nextMove(act, coherence, hasContext) {
  if (coherence.act === "ambiguous" || act === "ambivalence") return "reflect_tradeoff_then_clarify";
  if (coherence.act === "correct_topic" || act === "correction") return "accept_correction_and_reframe";
  if (coherence.act === "switch" || coherence.act === "choose") return "honor_explicit_choice";
  if (act === "follow_up") return hasContext ? "answer_in_recent_user_context" : "ask_what_to_clarify";
  if (act === "disclosure") return "acknowledge_before_advice";
  if (act === "rejection") return "respect_refusal_and_offer_alternative";
  if (act === "affirmation") return "acknowledge_without_authorizing_action";
  if (act === "feedback") return "repair_answer_style_or_relevance";
  if (["greeting", "thanks", "goodbye"].includes(act)) return "respond_socially";
  if (act === "uncertainty") return "reduce_scope_and_clarify";
  if (act === "topic_statement") return "clarify_user_goal";
  return "answer_directly_or_ask_one_question";
}
function certainty(act, parserConfidence, coherence, contradictions) {
  if (coherence.act === "ambiguous" || act === "ambivalence") return "low";
  if (act === "correction" || coherence.act === "correct_topic" ||
      coherence.act === "switch" || coherence.act === "choose") return "high";
  if (["greeting", "thanks", "goodbye", "affirmation", "rejection"].includes(act)) return "high";
  if (contradictions.includes("topic_changed_since_recent_user_turn")) return "low";
  if (parserConfidence >= .85) return "moderate";
  return "low";
}

/**
 * Explainable decision envelope — concise, not a token-by-token reasoning trace.
 * @returns {{
 *  version:string, act:string, currentTopic:string|null, contextTopic:string|null,
 *  evidence:string[], contradictionSignals:string[], uncertainty:string[],
 *  confidence:"low"|"moderate"|"high", confidenceScore:number,
 *  nextMove:string, requiresClarification:boolean, rationaleCode:string
 * }}
 */
export function reasonAboutConversationTurn({ message = "", locale = "en", history = [] } = {}) {
  const lang = LOCALES.has(locale) ? locale : "en";
  const raw = typeof message === "string" ? message.trim() : "";
  const text = norm(raw);
  const empty = {
    version: REASONING_MIND_VERSION, act: "unknown", currentTopic: null,
    contextTopic: null, evidence: [], contradictionSignals: [],
    uncertainty: ["insufficient_explicit_evidence"], confidence: "low",
    confidenceScore: 0, nextMove: "ask_one_clarifying_question",
    requiresClarification: true, rationaleCode: "INSUFFICIENT_EVIDENCE",
  };
  if (!text || raw.length > LIMIT) return { ...empty, act: text ? "over_limit" : "empty" };

  const turn = understandConversationTurn({ message: raw, locale: lang, history });
  const coherence = interpretDialogueCoherence({ message: raw, history });
  const context = resolveRecentConversationTopic(history);
  const currentTopic = turn.topic || (coherence.act === "correct_topic" ? coherence.topic : null);
  const contextTopic = context || turn.contextTopic || null;
  const contradictions = contradictionSignals(raw, currentTopic, contextTopic, turn.act);
  const evidence = ["explicit_current_utterance"];
  if (contextTopic && ["follow_up", "affirmation", "rejection"].includes(turn.act))
    evidence.push("recent_user_turn_context");
  if (coherence.act !== "none") evidence.push("dialogue_coherence_signal");
  const uncertainty = [];
  if (turn.act === "unknown") uncertainty.push("intent_not_resolved");
  if (turn.requiresClarification) uncertainty.push("meaning_may_need_confirmation");
  if (contradictions.includes("mixed_wish_and_concern")) uncertainty.push("competing_motivations");
  if (contradictions.includes("topic_changed_since_recent_user_turn"))
    uncertainty.push("current_topic_overrides_older_context");
  if (!contextTopic && turn.act === "follow_up") uncertainty.push("no_reliable_user_topic_context");
  const level = certainty(turn.act, turn.confidence, coherence, contradictions);
  const score = level === "high" ? Math.max(.9, turn.confidence || .9)
    : level === "moderate" ? Math.max(.65, Math.min(.84, turn.confidence || .7))
    : Math.min(.6, turn.confidence || .4);
  const move = nextMove(turn.act, coherence, Boolean(contextTopic));
  const rationaleCode = coherence.act === "correct_topic" || turn.act === "correction"
    ? "CURRENT_CORRECTION_WINS"
    : turn.act === "follow_up" && contextTopic ? "FOLLOW_UP_GROUNDED_IN_USER_CONTEXT"
    : turn.act === "ambivalence" ? "MIXED_MOTIVATION_REQUIRES_REFLECTION"
    : turn.act === "disclosure" ? "DISCLOSURE_ACKNOWLEDGEMENT_FIRST"
    : turn.act === "rejection" ? "REFUSAL_MUST_BE_RESPECTED"
    : turn.act === "affirmation" ? "AFFIRMATION_IS_NOT_ACTION_CONSENT"
    : turn.act === "unknown" ? "INSUFFICIENT_EVIDENCE"
    : "CURRENT_UTTERANCE_PRIMARY";
  return {
    version: REASONING_MIND_VERSION,
    act: turn.act,
    currentTopic: currentTopic || null,
    contextTopic,
    evidence,
    contradictionSignals: contradictions,
    uncertainty,
    confidence: level,
    confidenceScore: Number(score.toFixed(2)),
    nextMove: move,
    requiresClarification: turn.requiresClarification ||
      coherence.requiresClarification || level === "low",
    rationaleCode,
  };
}
