export type VideoGoalLocale="ru"|"en"|"es";
export type VideoGoalType="leisure"|"support"|"change";
export type VideoGoalStrategy="journey"|"shelter"|"reframe"|"integration";
export type PersonalizedVideoGoal={
 id:string; type:VideoGoalType; mechanismId:string;
 scenarioStrategy:VideoGoalStrategy; secondaryScenarioStrategy:VideoGoalStrategy;
 photo:string; topicId:string|null; categoryId:string|null; subcategoryId:string|null;
 meaningAxisId:string; currentId:string|null; desiredId:string|null;
 ordinal:number; voicePerson:"first"|"second"|"none"; measurement:"enjoyment_rating"|"support_rating"|"goal_progress_rating";
 copy:Partial<Record<VideoGoalLocale,{title:string;detail:string;intent:string}>>;
};
export type VideoGoalOptions={
 version:string;contextKey:string;mode:"leisure"|"support"|"change"|"mixed";
 topicId:string|null;categoryId:string|null;subcategoryId:string|null;
 profileUsed:boolean;goals:readonly PersonalizedVideoGoal[];
};
export declare const VIDEO_GOAL_COMPOSER_VERSION:string;
export declare const VIDEO_GOAL_TYPES:readonly VideoGoalType[];
export declare function buildPersonalVideoGoalOptions(input?:{
 locale?:VideoGoalLocale;wish?:string;theme?:string;
 selectedTopic?:{topicId?:string|null}|null;
 profile?:{current?:string[];desired?:string[];axes?:string[];supportNeed?:string;energy?:number;desiredLevel?:number}|null;
 profileConfirmed?:boolean;
}):VideoGoalOptions;
export declare function composePersonalVideoGoalIntent(
 wish:string,selected:PersonalizedVideoGoal|null|undefined,locale?:VideoGoalLocale
):string;
export declare function goalScenarioPlan(selected:PersonalizedVideoGoal|null|undefined,contextKey:string):{
 id:string;type:VideoGoalType;mechanismId:string;
 scenarioStrategy:VideoGoalStrategy;secondaryScenarioStrategy:VideoGoalStrategy;
 meaningAxisId:string;topicId:string|null;voicePerson:"first"|"second"|"none";contextKey:string
}|null;
