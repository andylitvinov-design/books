export type MyTubePlotLocale="ru"|"en"|"es";
export type MyTubePlotType="everyday"|"nature"|"symbolic"|"practice";
export interface MyTubePlotShot{
  shot:number;
  phase:string;
  visualHint:string;
  directorNote:string;
  sequence:string;
}
export interface MyTubePlotChoice {
  id:string;
  scenarioId:string;
  topicId:string;
  categoryId:string;
  label:string;
  fullLabel:string;
  plotType:MyTubePlotType;
  plotTypeLabel:string;
  archetype:string;
  storyboard:MyTubePlotShot[];
  sourceStatus:"editorial_only_unbound";
  requiresMediaBinding:true;
  canExport:false;
}
export const MYTUBE_PLOT_COUNTS:Readonly<{
  categories:4;
  subcategories:16;
  topics:64;
  scenarios:256;
  plotsPerScenario:4;
  plots:1024;
  shots:4096;
}>;
export function listMyTubePlotChoices(scenarioId:string,locale?:MyTubePlotLocale|string):MyTubePlotChoice[];
export function buildMyTubePlotPlan(args:{scenarioId:string;plotId:string;locale?:MyTubePlotLocale|string}):(
 MyTubePlotChoice & {mediaStatus:"unbound";clientDataIncluded:false}
)|null;
export function auditMyTubePlotCatalog():{
  ok:boolean;
  counts:{topics:number;scenarios:number;plots:number;shots:number};
  errors:string[];
};
