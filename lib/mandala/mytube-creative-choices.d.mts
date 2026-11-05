/**
 * Public typed contract: editorial motif/style suggestions are not media rights.
 * @version hh-mytube-creative-choices-v1
 */
export type CreativeLocale="ru"|"en"|"es";
export interface CreativeMotifChoice {
  id:string;label:string;meaning:string;recommended:boolean;rank:number;
  status:"editorial_symbol_not_verified_footage";
}
export interface CreativeStyleChoice {
  id:string;label:string;description:string;
  status:"editorial_style_hint_not_frame_verified";
}
export interface CreativeScene {
  id?:string;media?:string;status?:string;
  motifs?:readonly string[];tags?:readonly string[];categories?:readonly string[];
  visualMotifsVerified?:readonly string[];visualStyles?:readonly string[];
  visualOrigin?:string;
}
export const MYTUBE_VISUAL_MOTIFS:ReadonlyArray<{
  id:string;label:Record<CreativeLocale,string>;
  meaning:Record<CreativeLocale,string>;visualTags:readonly string[];
  status:"editorial_symbol_not_verified_footage";
}>;
export const MYTUBE_VISUAL_STYLES:ReadonlyArray<{
  id:string;label:Record<CreativeLocale,string>;
  description:Record<CreativeLocale,string>;visualTags:readonly string[];
  status:"editorial_style_hint_not_frame_verified";
}>;
export function getMyTubeMotif(motifId:string):typeof MYTUBE_VISUAL_MOTIFS[number]|null;
export function getMyTubeStyle(styleId:string):typeof MYTUBE_VISUAL_STYLES[number]|null;
export function listMyTubeMotifs(locale?:CreativeLocale):Array<{
  id:string;label:string;meaning:string;status:"editorial_symbol_not_verified_footage";
}>;
export function listMyTubeStyles(locale?:CreativeLocale):CreativeStyleChoice[];
export function listMyTubeScenarioMotifs(scenarioId:string,locale?:CreativeLocale):CreativeMotifChoice[];
export function getMyTubeCreativeChoices(scenarioId:string,locale?:CreativeLocale):{
  scenarioId:string;topicId:string;categoryId:string;
  motifs:CreativeMotifChoice[];styles:CreativeStyleChoice[];
  plotChoicesUnaffected:true;sourceStatus:"editorial_not_bound_to_video";
}|null;
export function validateMyTubeCreativeSelection(options?:{
  topicId?:string;scenarioId?:string;motifId?:string|null;styleId?:string|null;meaningAxisId?:string|null;
}):{ok:boolean;status:string};
export function evaluateMyTubeSceneCreativeMatch(scene:CreativeScene,options?:{
  motifId?:string|null;styleId?:string|null;
}):{
  motifMatch:boolean;styleMatch:boolean;motifFrameVerified:boolean;
  styleEvidence:string;motifEvidence:string;
};
export function evaluateMyTubeMontageCreativeMatch(options?:{
  clipIds?:readonly string[];scenes?:readonly CreativeScene[];
  motifId?:string|null;styleId?:string|null;
}):{
  ok:boolean;status:string;motifMatches:number;styleMatches:number;
  literalMotifVerified?:boolean;visualMatchOnly?:true;
};
export function videoMatchesMyTubeVisualFilter(video:{
  mytubeVisualTagEvidence?:string;mytubeMotifIds?:readonly string[];mytubeStyleIds?:readonly string[];
},filters?:{motifId?:string|null;styleId?:string|null}):boolean;
export function auditMyTubeCreativeChoices():{
  mappingDiversity:{ordered:number;unordered:number};
  ok:boolean;counts:{scenarios:number;motifs:number;styles:number;suggestions:number};
  errors:string[];
};
