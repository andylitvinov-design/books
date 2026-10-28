// Only anonymous activity flags and an aggregate number of player launches.
// No assessment scores, answers, goals, media IDs, titles, notes or account IDs.
export const QUEST_STORAGE_KEY = "hh-support-free-journey-v1";
export const GUEST_VIDEO_LIMIT = 10;
export const QUEST_STEPS = Object.freeze([
  "checkin", "category", "recommendation", "firstVideo", "secondVideo", "test", "course",
]);

export function emptyQuest() {
  return { starts: 0, videoQuestionAnswered: false, completed: Object.fromEntries(QUEST_STEPS.map(id => [id, false])) };
}

export function normalizeQuest(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const starts = Number.isSafeInteger(source.starts) && source.starts >= 0 && source.starts <= 1000
    ? source.starts : 0;
  const completed = Object.fromEntries(QUEST_STEPS.map(id => [
    id, id === "firstVideo" ? starts > 0
      : id === "secondVideo" ? starts > 1 : source.completed?.[id] === true,
  ]));
  return { starts, videoQuestionAnswered: source.videoQuestionAnswered === true && starts > 0, completed };
}

// This is a soft, local preview budget, NOT a paid entitlement or security gate.
// YouTube's existing public external links remain available.
export function nextQuestLaunch(input, signedIn = false) {
  const state = normalizeQuest(input);
  if (!signedIn && state.starts >= GUEST_VIDEO_LIMIT) return null;
  const starts = Math.min(1000, state.starts + 1);
  return normalizeQuest({ ...state, starts });
}

export function markQuestStep(input, step) {
  const state = normalizeQuest(input);
  if (!QUEST_STEPS.includes(step) || step === "firstVideo" || step === "secondVideo") return state;
  return { ...state, completed: { ...state.completed, [step]: true } };
}

export function questCompletedCount(input) {
  const state = normalizeQuest(input);
  return QUEST_STEPS.filter(step => state.completed[step]).length;
}

export function remainingGuestLaunches(input) {
  return Math.max(0, GUEST_VIDEO_LIMIT - normalizeQuest(input).starts);
}

// A voluntary reflection after an actual player launch. Never store its answer,
// emotion, media ID or a claim of full video completion.
export function answerQuestVideoQuestion(input) {
  const state = normalizeQuest(input);
  return state.starts > 0 ? { ...state, videoQuestionAnswered: true } : state;
}
