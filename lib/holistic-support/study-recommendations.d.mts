export type PublicCourse = {id:string;title:string;description?:string;href:string;kind:string;cost?:string;direction?:string;topic?:string;image?:string;lessons?:number;price?:{amount:number;currency:string}};
export type StudyAnswers=Partial<Record<"goal"|"format"|"time"|"level"|"support",string>>;
export function rankPublishedStudyCourses<T extends PublicCourse>(items:readonly T[],answers?:StudyAnswers,kind?:"courses"|"programs"):T[];
export function studyGoalHasDirectMatch(items:readonly PublicCourse[],goal:string|undefined):boolean;
