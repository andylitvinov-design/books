"use client";

// Question text stays only in transient JS memory during same-site client routing.
// Cookies persist ONLY the chosen language. No question is put in a URL,
// persistent storage, analytics event, API request or server-rendered prop.
import { detectIdeasQuestionLocale } from "@/lib/ideas-guidance.mjs";
import { publicCounterpart, savePublicLocale, type PublicLocale } from "@/lib/public-locales";
import { saveUiLocale } from "@/lib/ui-locale";

type Flow = "ideas" | "home";
type Pending = { locale: PublicLocale; createdAt: number; data: unknown };
const pending = new Map<Flow, Pending>();
const MAX_HANDOFF_MS = 30_000;

export function switchToQuestionLocale<T>(
  flow: Flow,
  question: string,
  currentLocale: PublicLocale,
  data: T,
  navigate: (href: string) => void,
): boolean {
  const selected = detectIdeasQuestionLocale(question, currentLocale) as PublicLocale;
  if (selected === currentLocale) return false;
  const destination = publicCounterpart(window.location.pathname, selected);
  if (destination === window.location.pathname) return false;

  pending.set(flow, { locale: selected, createdAt: Date.now(), data });
  savePublicLocale(selected);
  if (selected !== "es") saveUiLocale(selected);
  navigate(destination);
  return true;
}

export function takeQuestionLocaleHandoff<T>(flow: Flow, locale: PublicLocale): T | null {
  const saved = pending.get(flow);
  if (!saved) return null;
  if (Date.now() - saved.createdAt > MAX_HANDOFF_MS) {
    pending.delete(flow);
    return null;
  }
  if (saved.locale !== locale) return null;
  pending.delete(flow);
  return saved.data as T;
}
