export type QuestStepId =
  | "checkin" | "category" | "recommendation" | "firstVideo"
  | "secondVideo" | "test" | "course";
export type QuestState = {
  starts: number;
  completed: Record<QuestStepId, boolean>;
};
export declare const QUEST_STORAGE_KEY: string;
export declare const GUEST_VIDEO_LIMIT: number;
export declare const QUEST_STEPS: readonly QuestStepId[];
export declare function emptyQuest(): QuestState;
export declare function normalizeQuest(input: unknown): QuestState;
export declare function nextQuestLaunch(input: unknown, signedIn?: boolean): QuestState | null;
export declare function markQuestStep(input: unknown, step: QuestStepId): QuestState;
export declare function questCompletedCount(input: unknown): number;
export declare function remainingGuestLaunches(input: unknown): number;
