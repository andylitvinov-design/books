export type VideoGoalLocale = "ru" | "en" | "es";
export type VideoGoalCategoryId = "body" | "business" | "energy" | "love" | "stress";
export type LegacyVideoTheme = "health" | "money" | "energy" | "life" | "goals" | "relationships";
export type VideoGoalArc = "journey" | "shelter" | "awakening" | "connection";
export type VideoGoalLabels = Readonly<Record<VideoGoalLocale,string>>;
export type VideoGoalCategory = Readonly<{
  id:VideoGoalCategoryId; label:VideoGoalLabels; subtitle:VideoGoalLabels;
  topicIds:readonly string[];
}>;
export type VideoGoalTopic = Readonly<{
  id:string;categoryId:VideoGoalCategoryId;label:VideoGoalLabels;
  desiredOutcome:VideoGoalLabels;aliases:Readonly<Record<VideoGoalLocale,readonly string[]>>;
  legacyVideoTheme:LegacyVideoTheme;legacyProfileTopic:string;
  scenarioIds:readonly string[];
}>;
export type VideoGoalScenario = Readonly<{
  id:string;categoryId:VideoGoalCategoryId;topicId:string;
  label:VideoGoalLabels;arc:VideoGoalArc;visualMotifs:readonly string[];
  sourceStatus:"unbound";
}>;
export type VideoStoryBeat = {
  shot:number;phase:string;visualMotifId:string;visualHint:string;
};
export type VideoGoalStoryCard = {
  id:string;categoryId:VideoGoalCategoryId;topicId:string;
  title:string;arc:VideoGoalArc;sourceStatus:"unbound";
  canExport:false;storyboard:VideoStoryBeat[];
};
export type VideoGoalScenarioPlan = {
  version:string;categoryId:VideoGoalCategoryId;topicId:string;scenarioId:string;
  categoryTitle:string;topicTitle:string;goal:string;title:string;
  legacyVideoTheme:LegacyVideoTheme;legacyProfileTopic:string;
  shots:VideoStoryBeat[];requiresMediaBinding:true;
  mediaStatus:"unbound";audioStatus:"unbound";canExport:false;
  clientDataIncluded:false;
};
export type TopicResolveResult = {
  status:"matched"|"needs_topic"|"needs_category"|"invalid_selection"|"ambiguous";
  categoryId:VideoGoalCategoryId|null;topicId:string|null;
  confidence:"explicit"|"high"|"medium"|"low"|"none";
  suggestedTopicIds?:string[];
};
export const VIDEO_GOAL_TAXONOMY_VERSION:string;
export const VIDEO_GOAL_CATEGORY_ORDER:readonly VideoGoalCategoryId[];
export const VIDEO_GOAL_CATEGORIES:readonly VideoGoalCategory[];
export const VIDEO_GOAL_TOPICS:readonly VideoGoalTopic[];
export const VIDEO_GOAL_SCENARIOS:readonly VideoGoalScenario[];
export const VIDEO_STORY_MOTIFS:Readonly<Record<string,VideoGoalLabels>>;
export const VIDEO_STORY_ARC_IDS:readonly VideoGoalArc[];
export const VIDEO_GOAL_LEGACY_PROFILE_TOPICS:readonly string[];
export function listVideoGoalCategories(locale?:VideoGoalLocale):
  {id:VideoGoalCategoryId;title:string;subtitle:string;topicCount:number}[];
export function listVideoGoalTopics(categoryId:VideoGoalCategoryId|string,locale?:VideoGoalLocale):
  {id:string;categoryId:VideoGoalCategoryId;title:string;desiredOutcome:string;scenarioCount:number}[];
export function getVideoGoalTopic(topicId:string,locale?:VideoGoalLocale):
  {id:string;categoryId:VideoGoalCategoryId;title:string;desiredOutcome:string;
    legacyVideoTheme:LegacyVideoTheme;legacyProfileTopic:string;scenarioCount:number}|null;
export function listVideoGoalScenarios(topicId:string,locale?:VideoGoalLocale):VideoGoalStoryCard[];
export function buildVideoGoalScenarioPlan(input?:{
  categoryId?:VideoGoalCategoryId|null;topicId?:string|null;
  scenarioId?:string|null;locale?:VideoGoalLocale;
}):VideoGoalScenarioPlan|null;
export function resolveVideoGoalTopic(input?:{
  categoryId?:VideoGoalCategoryId|null;topicId?:string|null;
  request?:string;locale?:VideoGoalLocale;
}):TopicResolveResult;
export function auditVideoGoalTaxonomy():{
  ok:boolean;version:string;categories:number;topics:number;scenarios:number;
  storyboardBeats:number;issues:string[];
};
