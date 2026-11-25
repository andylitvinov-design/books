/** Type-only boundary for the shared, offline Consultant Mind. No extra model. */
export type ConsultantLocale = "ru" | "en" | "es";
export type ConsultantSuggestion = {
  id: string;
  kind: "service" | "test" | "video" | "course";
  title: string;
  href: string;
};
export type ConsultantAnswer = {
  status: "clarify";
  intent: "price" | "quality" | "compare" | "choose";
  locale: ConsultantLocale;
  reply: string;
  suggestions: ConsultantSuggestion[];
  evidence: string;
  modelUsed: false;
};
export function consultServiceQuestion(options?: {
  message?: string;
  locale?: ConsultantLocale;
  history?: readonly { role: "user" | "assistant"; text: string }[];
}): ConsultantAnswer | null;
export function resolveConsultantSuggestion(
  id: string, locale: ConsultantLocale
): ConsultantSuggestion | null;
