export type IdeasTopic = "relationships" | "stress" | "resources" | "work" | "direction";
export type IdeasFreeId = "review" | "tests" | "dao";
export declare const ideaTopics: ReadonlyArray<IdeasTopic>;
export declare function matchIdeasTopic(question: string): { topic: IdeasTopic; matched: boolean };
export declare function getIdeasAphorisms(topic: IdeasTopic, locale: "ru" | "en" | "es"): string[];
export declare function getIdeasFreeRecommendations(topic: IdeasTopic): IdeasFreeId[];
