import type { IdeasTopic } from "./ideas-guidance.mjs";
import type { PublicLocale } from "./public-locales";

export type HomeGuideGoal = "understand" | "tests" | "practice" | "consult" | "ideas";
export declare const homeGuideGoals: ReadonlyArray<HomeGuideGoal>;
export declare function resolveHomeGuideQuestion(input: string, fallbackLocale?: PublicLocale): {
  lang: PublicLocale;
  topic: IdeasTopic | null;
  matched: boolean;
  urgent: boolean;
};
export declare function homeGuideDestinations(args: {
  goal: HomeGuideGoal;
  topic: IdeasTopic | null;
  locale: PublicLocale;
}): { primary: string; secondary: string };
