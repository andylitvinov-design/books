// One-time, same-tab transition from public Home to the existing Ali conversation.
// No prompt is placed in URL, cookies, analytics, CRM or localStorage.
export const HOME_ALI_HANDOFF_KEY = "hh:home-ali-handoff:v1";
export const HOME_ALI_HANDOFF_MAX_AGE = 180_000;
const LOCALES = new Set(["ru", "en", "es"]);
const MODES = new Set(["self", "business"]);

export function prepareHomeAliHandoff({text, locale, mode, now=Date.now()} = {}) {
  if (typeof text !== "string" || typeof locale !== "string" ||
      !LOCALES.has(locale) || !MODES.has(mode) || !Number.isFinite(now)) return null;
  const prompt = text.trim();
  if (!prompt || prompt.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(prompt)) return null;
  return {v:1, source:"home", text:prompt, locale, mode, createdAt:now};
}

export function stageHomeAliHandoff(storage, data) {
  const payload = prepareHomeAliHandoff(data);
  if (!payload || !storage || typeof storage.setItem !== "function") return false;
  try { storage.setItem(HOME_ALI_HANDOFF_KEY, JSON.stringify(payload)); return true; }
  catch { return false; }
}

export function consumeHomeAliHandoff(storage, locale, now=Date.now()) {
  if (!storage || typeof storage.getItem !== "function" ||
      typeof storage.removeItem !== "function") return null;
  let raw;
  try {
    raw = storage.getItem(HOME_ALI_HANDOFF_KEY);
    // Consume before parsing so refreshing or switching sessions never replays.
    storage.removeItem(HOME_ALI_HANDOFF_KEY);
  } catch { return null; }
  if (!raw || typeof raw !== "string" || raw.length > 3000) return null;
  let candidate;
  try { candidate = JSON.parse(raw); } catch { return null; }
  const verified = prepareHomeAliHandoff({...candidate, now:candidate?.createdAt});
  if (!verified || candidate?.v !== 1 || candidate?.source !== "home" ||
      !LOCALES.has(locale) || candidate.locale !== locale ||
      !Number.isFinite(now) || now < candidate.createdAt ||
      now - candidate.createdAt > HOME_ALI_HANDOFF_MAX_AGE) return null;
  return verified;
}

/** Non-destructive read until the real Ali conversation has responded. */
export function peekHomeAliHandoff(storage, locale, now=Date.now()) {
  if (!storage || typeof storage.getItem!=="function" || !LOCALES.has(locale)) return null;
  let raw;try{raw=storage.getItem(HOME_ALI_HANDOFF_KEY)}catch{return null}
  if(typeof raw!=="string"||!raw||raw.length>3000)return null;
  let item;try{item=JSON.parse(raw)}catch{return null}
  const verified=prepareHomeAliHandoff({...item,now:item?.createdAt});
  if(!verified||item?.v!==1||item?.source!=="home")return null;
  // Locale transitions must not destroy a message staged in the original language.
  if(item.locale!==locale)return null;
  if(!Number.isFinite(now)||now<item.createdAt||now-item.createdAt>HOME_ALI_HANDOFF_MAX_AGE){
    try{storage.removeItem?.(HOME_ALI_HANDOFF_KEY)}catch{}
    return null;
  }
  return verified;
}
/** Compare-and-delete: a previous reply must never clear a newer Home submission. */
export function acknowledgeHomeAliHandoff(storage,received) {
  if(!storage||typeof storage.getItem!=="function"||typeof storage.removeItem!=="function"||!received)return false;
  try{
    const raw=storage.getItem(HOME_ALI_HANDOFF_KEY);
    if(typeof raw!=="string"||raw.length>3000)return false;
    const item=JSON.parse(raw);
    if(item?.v!==1||item?.source!=="home"||item.text!==received.text||
      item.locale!==received.locale||item.mode!==received.mode||item.createdAt!==received.createdAt)return false;
    storage.removeItem(HOME_ALI_HANDOFF_KEY);return true;
  }catch{return false}
}
