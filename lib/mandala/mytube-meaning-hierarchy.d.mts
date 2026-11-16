/** Read-only normalized editorial catalog; these are not approved video assets. */
export type MyTubeLocale="ru"|"en"|"es";
export interface MyTubeMeaningAxis {
 id:string;label:string;description:string;facets:{id:string;label:string}[];
 motifCount:number;sourceStatus:string;conceptOnly:true;
}
export interface MyTubeMeaningMotif {
 id:string;topicId:string;meaningAxisId:string;label:string;meaning:string;
 visualTags:string[];rank:number;recommended:boolean;
 scenarioCount:number;sourceStatus:string;conceptOnly:true;
}
export interface MyTubeMotifFilmScenario {
 id:string;topicId:string;label:string;creativeBrief:string;sceneOutline:string[];
 meaningAxisId:string;motifId:string;pathId:string;
 filmScenarioTemplateId:string;sourceStatus:string;conceptOnly:true;canExport:false;
}
export const MYTUBE_MEANING_COUNTS:Readonly<{
 categories:4;subcategories:16;topics:64;axesPerTopic:8;motifsPerAxis:4;
 scenariosPerMotif:4;pathsPerTopic:128;potentialPaths:8192;uniqueScenarioTemplates:256;
}>;
export function makeMyTubeMeaningPathId(topicId:string,axisId:string,motifId:string,scenarioId:string):string;
export function listMyTubeMeaningAxes(topicId:string,locale?:MyTubeLocale):MyTubeMeaningAxis[];
export function listMyTubeMeaningMotifs(topicId:string,axisId:string,locale?:MyTubeLocale):MyTubeMeaningMotif[];
export function listMyTubeMotifScenarios(topicId:string,axisId:string,motifId:string,locale?:MyTubeLocale):MyTubeMotifFilmScenario[];
export function getMyTubeTopicMeaningTree(topicId:string,locale?:MyTubeLocale):{
 id:string;label:string;categoryId:string;subcategoryId:string;
 meaningAxes:Array<MyTubeMeaningAxis&{motifs:Array<MyTubeMeaningMotif&{scenarios:MyTubeMotifFilmScenario[]}>}>;
}|null;
export function validateMyTubeMeaningPath(path?:{
 topicId?:string;meaningAxisId?:string;motifId?:string;scenarioId?:string;
}):{ok:boolean;status:string;pathId?:string};
export function auditMyTubeMeaningHierarchy():{
 ok:boolean;counts:{topics:number;meaningAxes:number;editorialPaths:number;originalScenarioTemplates:number};
 errors:string[];
};
