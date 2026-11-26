export type SupportGoalSector = "energy" | "money" | "love" | "meaning";
export type SupportGoalSnapshot = {
  checkin: number; concerns: string[]; tasks: string[];
  ratings: Record<string, { current: number; desired: number }>;
  amounts?: Record<string, { current: number | null; desired: number | null }>;
  currency?: "CAD" | "EUR" | "USD" | "GBP";
};
export type SavedSupportGoalProfile = {
  version: 1;
  scores: Record<"energy" | "money" | "relationships" | "meaning", number>;
  savedSectors: Partial<Record<SupportGoalSector, SupportGoalSnapshot>>;
  activeSector: SupportGoalSector;
};
export declare const SUPPORT_GOAL_PROFILE_VERSION: 1;
export declare const SUPPORT_GOAL_HANDOFF_KEY: string;
export declare const SUPPORT_GOAL_HANDOFF_MAX_AGE_MS: number;
export declare function normalizeSavedGoalProfile(input: unknown): SavedSupportGoalProfile | null;
export declare function stageSupportGoalProfile(profile: unknown, storage?: Storage, now?: number, accountId?: string | null): SavedSupportGoalProfile;
export declare function readStagedSupportGoalProfile(storage?: Storage, now?: number): SavedSupportGoalProfile | null;
export declare function clearStagedSupportGoalProfile(storage?: Storage): void;

export type SupportGoalHandoff = { profile: SavedSupportGoalProfile; createdAt: number; accountId: string | null };
export declare function readStagedSupportGoalHandoff(storage?: Storage, now?: number): SupportGoalHandoff | null;
export declare function bindStagedSupportGoalHandoff(accountId: string, createdAt: number, storage?: Storage, now?: number): boolean;
export declare function isCurrentSupportGoalHandoff(expected: SupportGoalHandoff | null, storage?: Storage, now?: number): boolean;
export declare function clearCurrentSupportGoalHandoff(expected: SupportGoalHandoff | null, storage?: Storage, now?: number): boolean;
