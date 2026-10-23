import type { IdeasTopic } from "./ideas-guidance.mjs";
import type { PublicLocale } from "./public-locales";

export type HomeGuideGoal = "understand" | "tests" | "practice" | "consult" | "ideas";
export declare const homeGuideGoals: ReadonlyArray<HomeGuideGoal>;
export type HomeGuideContext = {
  lang: PublicLocale; topic: IdeasTopic | null; matched: boolean; urgent: boolean; interest: "reiki" | null;
};
export declare function resolveHomeGuideQuestion(input: string, fallbackLocale?: PublicLocale, previous?: HomeGuideContext | null): HomeGuideContext;
export declare function homeGuideDestinations(args: {
  goal: HomeGuideGoal;
  topic: IdeasTopic | null;
  locale: PublicLocale;
}): { primary: string; secondary: string };


type LocalizedText = Record<PublicLocale, string>;
export type HomeGuideOffer = {
  id: string; title: string; benefit: string; detail: string; action: string;
  href: string; checkoutStatus: "not_verified";
};
export declare function homeGuideFollowup(context: HomeGuideContext | null): {
  prompt: LocalizedText;
  choices: Array<{ id: string; label: LocalizedText; response: LocalizedText | null; offerIds: string[] }>;
} | null;
export declare function chooseHomeGuideOffer(context: HomeGuideContext | null, choiceId: string, pageLocale?: PublicLocale): {
  context: HomeGuideContext; response: LocalizedText | null; offers: HomeGuideOffer[];
} | null;

export type HomeGuideCategory = "all" | "services" | "courses" | "tests" | "free";
export declare const homeGuideCategories: ReadonlyArray<HomeGuideCategory>;
export declare function browseHomeGuideOffers(args: {
  category: HomeGuideCategory;
  locale: PublicLocale;
  question?: string;
}): { urgent: boolean; matched: boolean; offers: HomeGuideOffer[] };

export type HomeGuideQuickStart = {
  id: "stress" | "relationships" | "direction" | "business" | "resources" | "reiki";
  title: string;
  category: string;
  href: string;
};
export declare function homeGuideQuickStarts(locale?: PublicLocale): HomeGuideQuickStart[];

export declare function matchHomeGuideReply(input: string, context: HomeGuideContext | null): string | null;
