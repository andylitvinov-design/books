import { getIdeasAphorismMatches, ideasAphorismCatalog } from "./ideas-guidance.mjs";

// The three stored IDs are public editorial content, not a visitor identifier or answer.
const PREVIEW_KEY = "hh_ideas_last_preview_aphorisms_v1";
const themes = [...new Set(ideasAphorismCatalog.map(entry => entry.topic))];

/** Draw three distinct, correctly attributed sayings from the full multilingual catalog. */
export function pickIdeasPreviewAphorisms(locale, previousIds = [], random = Math.random) {
  // Existing formatter preserves editorial/proverb provenance in EN/RU/ES.
  const allById = new Map();
  for (const theme of themes) {
    for (const saying of getIdeasAphorismMatches("", locale, theme)) allById.set(saying.id, saying);
  }
  const previous = new Set(previousIds);
  const fresh = [...allById.values()].filter(saying => !previous.has(saying.id));
  const pool = fresh.length >= 3 ? fresh : [...allById.values()];
  // Partial Fisher-Yates shuffle; the user question plays no role.
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const value = Number(random());
    const fraction = Number.isFinite(value) ? Math.max(0, Math.min(value, 1 - Number.EPSILON)) : 0;
    const j = i + Math.floor(fraction * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Browser only; store last three public catalog IDs so a reload yields new sayings. */
export function rotateIdeasPreviewAphorisms(locale, storage) {
  let store = storage;
  if (!store) {
    try { store = typeof window !== "undefined" ? window.localStorage : null; }
    catch { store = null; }
  }
  let previousIds = [];
  try {
    const saved = store?.getItem(PREVIEW_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (Array.isArray(parsed)) previousIds = parsed.filter(id => typeof id === "string").slice(0, 3);
  } catch { /* No storage: the page can still show three random quotes. */ }
  const selected = pickIdeasPreviewAphorisms(locale, previousIds);
  try { store?.setItem(PREVIEW_KEY, JSON.stringify(selected.map(({ id }) => id))); }
  catch { /* Blocked storage is not a blocker. */ }
  return selected;
}
