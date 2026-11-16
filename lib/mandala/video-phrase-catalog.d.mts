export type VideoPhraseLocale="ru"|"en"|"es";
export type VideoPhraseTone="gentle"|"confident"|"grounded"|"inspiring";
export type VideoPhraseSpeaker="self"|"support";
export type VideoPhraseLength="short"|"extended";
export type VideoPhraseContext={
  categoryId:string;topicId:string;scenarioId:string;arc:string;
  legacyTheme:string;visualMotifs:string[];
};
export type VideoPhraseIdea={
  id:string;scenarioId:string;topicId:string;title:string;
  visualMotifId:string;order:number;
};
export type PreparedVideoPhrase={
  id:string;categoryId:string;topicId:string;scenarioId:string;
  ideaId:string;locale:VideoPhraseLocale;tone:VideoPhraseTone;
  speaker:VideoPhraseSpeaker;length:VideoPhraseLength;
  variant:number;text:string;catalogVersion:string;
};
export const VIDEO_PHRASE_CATALOG_VERSION:string;
export const VIDEO_PHRASE_LOCALES:readonly VideoPhraseLocale[];
export const VIDEO_PHRASE_TONES:readonly VideoPhraseTone[];
export const VIDEO_PHRASE_SPEAKERS:readonly VideoPhraseSpeaker[];
export const VIDEO_PHRASE_LENGTHS:readonly VideoPhraseLength[];
export const VIDEO_PHRASE_VARIANTS:number;
export function getVideoPhraseContext(input?:{categoryId?:string|null;topicId?:string|null;scenarioId?:string|null}):VideoPhraseContext|null;
export function listVideoPhraseIdeas(scenarioId:string,locale?:VideoPhraseLocale):VideoPhraseIdea[];
export function listPreparedVideoPhrases(input?:{
  categoryId?:string|null;topicId?:string|null;scenarioId?:string|null;
  ideaId?:string|null;locale?:VideoPhraseLocale;tone?:VideoPhraseTone;
  speaker?:VideoPhraseSpeaker;length?:VideoPhraseLength;limit?:number;
}):PreparedVideoPhrase[];
export function formatVideoPhraseForOverlay(text:string,options?:{
  maxLineLength?:number;maxLines?:number;
}):string|null;
export function suggestVideoPhrasePath(input?:{
  request?:string;legacyTheme?:string;locale?:VideoPhraseLocale;
}):{categoryId:string;topicId:string;scenarioId:string;ideaId:string}|null;
export function auditVideoPhraseCatalog():{
  ok:boolean;categories:number;topics:number;scenarios:number;
  localizedIdeas:number;preparedPhraseRecords:number;issues:string[];
};
