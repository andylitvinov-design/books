export declare const SAVED_STORY_CHARACTERS_KEY: string;
export declare const SAVED_STORY_CHARACTERS_LIMIT: number;
export declare function sanitizeSavedStoryCharacters(ids: unknown, allowedIds: unknown): string[];
export declare function parseSavedStoryCharacters(raw: unknown, allowedIds: unknown): string[];
export declare function addSavedStoryCharacter(existing: unknown, id: unknown, allowedIds: unknown): string[];
export declare function removeSavedStoryCharacter(existing: unknown, id: unknown, allowedIds: unknown): string[];
export declare function serializeSavedStoryCharacters(ids: unknown, allowedIds: unknown): string;
