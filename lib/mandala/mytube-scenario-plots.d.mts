export type MyTubePlotLocale = "ru" | "en" | "es";
export type MyTubePlotMode =
  | "grounded_dilemma" | "symbolic_quest" | "relational_mirror" | "branching_future";
export interface MyTubePlot {
  id: string;
  scenarioId: string;
  topicId: string;
  subcategoryId: string;
  categoryId: string;
  plotMode: MyTubePlotMode;
  modeLabel: string;
  label: string;
  synopsis: string;
  transformationIdea: string;
  beats: string[];
  /** English visual cues for source ranking, not evidence that actions were filmed. */
  visualCues: string[];
  sourceStatus: "editorial_only_unbound";
  conceptOnly: true;
  canExport: false;
}
export const MYTUBE_PLOT_COUNTS: Readonly<{
  categories: 4;
  subcategories: 16;
  topics: 64;
  scenarios: 256;
  plotsPerScenario: 4;
  totalPlots: 1024;
  storyBeatsPerPlot: 4;
}>;
export function getMyTubePlotCount(scenarioId:string):number;
export function listMyTubePlots(scenarioId:string, locale?:MyTubePlotLocale | string):Promise<MyTubePlot[]>;
export function auditMyTubePlots():Promise<{
  ok: boolean;
  counts: {categories:number;scenarios:number;plots:number;storyBeats:number};
  uniquePlotTitles:Record<MyTubePlotLocale,number>;
  uniquePlotStoryboards:Record<MyTubePlotLocale,number>;
  errors:string[];
}>;
