import {
  validateGuideQualityFeedback,
  validateGuideQualityPriorities,
} from "./home-guide-quality.mjs";
import type { PublicLocale } from "./public-locales";

export type GuideCategory = "energy" | "love" | "business" | "courses" | "site" | "other";
export type GuideSignal = "clarified" | "unresolved" | "helpful" | "unhelpful";

export async function getGuideClarificationPriorities(): Promise<GuideCategory[]> {
  try {
    const response = await fetch("/api/home-guide/priorities", {
      method: "GET", credentials: "omit", cache: "default",
    });
    if (!response.ok) return [];
    return validateGuideQualityPriorities(await response.json()) as GuideCategory[];
  } catch { return []; }
}

export async function shareGuideQualityFeedback({
  category, signal, locale, consent,
}: { category: GuideCategory; signal: GuideSignal; locale: PublicLocale; consent: boolean }): Promise<boolean> {
  const payload = validateGuideQualityFeedback({ category, signal, locale, consent });
  if (!payload) return false;
  try {
    const response = await fetch("/api/home-guide/quality", {
      method: "POST", credentials: "omit", cache: "no-store", keepalive: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, consent: true }),
    });
    return response.status === 201;
  } catch { return false; }
}
