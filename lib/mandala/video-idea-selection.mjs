// Pure projection for Ideas: one list feeds the editor, Canvas, and video export.
export const sanitizeIdeaPhrase = value => Array.from(String(value ?? "")
  .replace(/[<>]/g, "").replace(/\s+/g, " ").trim()).slice(0, 36).join("");

export function planIdeaSelection(candidates, indices, suggested, signature) {
  const options = (Array.isArray(candidates) ? candidates : []).slice(0, 14)
    .map(sanitizeIdeaPhrase).filter(Boolean);
  const chosen = [...new Set(Array.isArray(indices) ? indices : [])]
    .filter(index => Number.isInteger(index) && index >= 0 && index < options.length)
    .sort((a, b) => a - b).slice(0, 10);
  const picked = chosen.map(index => options[index]);
  // Selected Ideas are the complete source of visible/exported phrases.
  // Never back-fill a deselected phrase from the default suggestions: that can
  // make an old narration appear valid after the user's approved words changed.
  const presetOverride = picked.slice(0, 5);
  return {
    editor: {signature, options, chosen},
    settingsPatch: {
      enabled: picked.length > 0,
      selected: Array.from({length: Math.min(5, picked.length)}, (_, index) => index),
      presetOverride,
      custom: picked.slice(5, 10).join("\n"),
    },
  };
}

export function isIdeaEditorSnapshot(snapshot, signature) {
  return Boolean(snapshot && snapshot.signature === signature
    && Array.isArray(snapshot.options) && snapshot.options.length >= 5 && snapshot.options.length <= 14
    && snapshot.options.every(text => typeof text === "string" && !!text && sanitizeIdeaPhrase(text) === text)
    && Array.isArray(snapshot.chosen) && snapshot.chosen.length <= 10
    && new Set(snapshot.chosen).size === snapshot.chosen.length
    && snapshot.chosen.every(index => Number.isInteger(index) && index >= 0 && index < snapshot.options.length));
}
