export type VideoIdeaGoalId="calm"|"love"|"energy"|"confidence"|"focus"|"trust"|"growth"|"rest"|"meaning";
export type VideoIdeaGoalLocale="ru"|"en"|"es";
export type VideoIdeaGoal={id:VideoIdeaGoalId;topicId:string;categoryId:string;subcategoryId:string;copy:Record<VideoIdeaGoalLocale,{title:string;detail:string;intent:string}>};
export declare const IDEA_GOAL_PAGES:readonly (readonly VideoIdeaGoal[])[];
export declare function getVideoIdeaGoal(id:VideoIdeaGoalId|null|undefined):VideoIdeaGoal|null;
export declare function composeVideoIdeaGoalIntent(wish:string,locale:VideoIdeaGoalLocale,id:VideoIdeaGoalId|null|undefined):string;
