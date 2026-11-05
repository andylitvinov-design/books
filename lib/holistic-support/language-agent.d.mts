export type LanguageLocale = "en" | "ru" | "es";
export type LanguageTopic = "energy" | "money" | "love" | "meaning" | "goals";
export type LanguageFormat = "video" | "audio" | "test" | "course" | "service";
export type LanguageSuggestion = {
  id:string; kind:LanguageFormat; title:string; href?:string; videoId?:string;
};
export type LanguageState = {
  version:string; locale:LanguageLocale; topic:LanguageTopic|null;
  format:LanguageFormat|null; excluded:LanguageFormat[]; allowed:LanguageFormat[];
  maxDurationMin:number|null; brevity:string; address:string; turns:number;
};
export type LanguageResult = {
  state:LanguageState;
  status:"empty"|"safety_check_required"|"safety_handoff"|"stopped"|"clarify"|"not_permitted"|"recommend"|"no_match";
  text:string; suggestions:LanguageSuggestion[]; allowLocalRewrite:boolean;
  evidence?:{explicitTopic:LanguageTopic|null;explicitFormat:LanguageFormat|null;excluded:LanguageFormat[];maxDurationMin:number|null};
};
export const LANGUAGE_AGENT_VERSION:string;
export function createLanguageSession(input?: {
  locale?:string;seedTopic?:string|null;enabledFormats?:string[];
}):LanguageState;
export function turnLanguageAgent(input?:{
  text?:string;previous?:LanguageState|null;catalog?:{
    videos?:Array<{id:string;title:string;topics:string[];sourceLanguage?:string;durationMinutes?:number}>;
    tests?:Record<string,Array<{key:string;title:string;href:string;durationMinutes:number}>>;
    audio?:Array<{id:string;title:string;locale:string;href:string;verifiedPublicManifest:boolean;playable:boolean}>;
  };locale?:string;
}):LanguageResult;
