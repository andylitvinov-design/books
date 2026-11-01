export const FIRST_VIDEO_PROMPT_CONTRACT_VERSION: "hh-first-video-prompt-v1";
export const FIRST_VIDEO_PROMPT_FILTER_KEYS: readonly [
  "theme","style","aspect","durationSeconds","motion","music","caption","avoid",
];
export const FIRST_VIDEO_PROMPT_ALLOWED_FIELDS: readonly string[];

export type FirstVideoFilterName=(typeof FIRST_VIDEO_PROMPT_FILTER_KEYS)[number];
export type FirstVideoPreferences={
  theme:"auto"|"energy"|"money"|"relationships"|"goals"|"life"|"health";
  style:"warm"|"nature"|"dream"|"minimal";
  aspect:"landscape"|"portrait"|"square";
  durationSeconds:20|30|60;
  motion:"slow"|"dynamic";
  music:"none"|"harmony"|"meditation";
  caption:boolean;
  avoid:string;
};
export type FirstVideoRenderOptions={
  quality:"hd"|"fullhd";
  brightness:"soft"|"bright";
  audioVolumePercent:number;
};
export type FirstVideoPromptRequest=FirstVideoPreferences & {
  schemaVersion:typeof FIRST_VIDEO_PROMPT_CONTRACT_VERSION;
  locale:"ru"|"en"|"es";
  wish:string;
  variant:number;
  selectedFields:FirstVideoFilterName[];
  consent:true;
  templateId?:string;
  manualPrompt?:string;
  renderOptions?:FirstVideoRenderOptions;
};
export function makeFirstVideoPromptRequest(input:{
  locale:"ru"|"en"|"es";
  wish:string;
  preferences:FirstVideoPreferences;
  templateId?:string|null;
  variant?:number;
  manualPrompt?:string|null;
  selectedFields?:readonly FirstVideoFilterName[];
  renderOptions?:FirstVideoRenderOptions|null;
}):FirstVideoPromptRequest;
export function parseFirstVideoPromptInput(body:unknown): (FirstVideoPromptRequest & {
  templateId:string|null;
  manualPrompt:string|null;
  renderOptions:FirstVideoRenderOptions|null;
})|null;
export function buildFirstVideoPromptContext(input:FirstVideoPromptRequest):{
  contractVersion:string;
  locale:string;
  visitorWish:string;
  effectiveFilters:Record<string,string|number|boolean>;
  explicitlySelectedFilters:FirstVideoFilterName[];
  scenarioVariant:number;
  mediaGeneration:string;
  verifiedLocalStoryboard:{
    shotCount:number;
    scenes:{sceneId:string;seconds:number;visualCue:string}[];
  };
  availableSceneChoices:{sceneId:string;visualCue:string|undefined}[];
  [key:string]:unknown;
};
