/** Device-local bookmarks for first-party public Video Studio character IDs.
 * Never store photos, names, prompts, private paths, tokens, or paid capability flags.
 * Account sync is a separate authenticated feature and is NOT implemented here.
 */
export const SAVED_STORY_CHARACTERS_KEY = "hh-video-studio-saved-characters-v1";
export const SAVED_STORY_CHARACTERS_LIMIT = 5;
export function sanitizeSavedStoryCharacters(ids, allowedIds) {
  if (!Array.isArray(ids) || !Array.isArray(allowedIds)) return [];
  const allowed = new Set(allowedIds.filter(id => typeof id === "string" && /^C\d{2}$/.test(id)));
  const saved = [];
  for (const id of ids) {
    if (typeof id !== "string" || !allowed.has(id) || saved.includes(id)) continue;
    saved.push(id);
    if (saved.length === SAVED_STORY_CHARACTERS_LIMIT) break;
  }
  return saved;
}
export function parseSavedStoryCharacters(raw, allowedIds) {
  if (typeof raw !== "string" || raw.length > 1024) return [];
  try {
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object" ||
        value.version !== 1 || !Array.isArray(value.characterIds) ||
        value.characterIds.length > 30 ||
        Object.keys(value).some(key => !["version", "characterIds"].includes(key))) return [];
    return sanitizeSavedStoryCharacters(value.characterIds, allowedIds);
  } catch { return []; }
}
export function addSavedStoryCharacter(existing, id, allowedIds) {
  const valid = sanitizeSavedStoryCharacters([id], allowedIds);
  const current = sanitizeSavedStoryCharacters(existing, allowedIds);
  return valid.length ? sanitizeSavedStoryCharacters([valid[0], ...current], allowedIds) : current;
}
export function removeSavedStoryCharacter(existing, id, allowedIds) {
  return sanitizeSavedStoryCharacters(existing, allowedIds).filter(item => item !== id);
}
export function serializeSavedStoryCharacters(ids, allowedIds) {
  return JSON.stringify({version: 1, characterIds: sanitizeSavedStoryCharacters(ids, allowedIds)});
}
