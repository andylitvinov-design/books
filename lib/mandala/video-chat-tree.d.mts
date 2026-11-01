import type {VideoPhraseLocale,VideoPhraseTone,VideoPhraseSpeaker,VideoPhraseLength} from "./video-phrase-catalog.mjs";
export type VideoChatTreeStep="category"|"topic"|"scenario"|"idea"|"phrase";
export type VideoChatTreeDraft={
  goal?:string; categoryId:string|null;topicId:string|null;
  scenarioId:string|null;ideaId:string|null;phraseId:string|null;
  phraseText:string|null;tone:VideoPhraseTone;speaker:VideoPhraseSpeaker;
  length:VideoPhraseLength;phrases?:boolean|null;
  mood?:string|null;aspect?:string|null;duration?:number|null;
  music?:string|null;
};
export const VIDEO_CHAT_TREE_STEPS: readonly string[];
export function initialVideoChatTree(goal?:string,locale?:VideoPhraseLocale):VideoChatTreeDraft;
export function nextVideoChatTreeStep(draft:VideoChatTreeDraft):
  VideoChatTreeStep|"mood"|"aspect"|"duration"|"music"|"phrases"|"review";
export function videoChatTreeOptions(draft:VideoChatTreeDraft,step:string,
  locale?:VideoPhraseLocale):Array<{id:string;label:string}>;
export function chooseVideoChatTreeOption(draft:VideoChatTreeDraft,step:string,
  value:string,locale?:VideoPhraseLocale):VideoChatTreeDraft|null;
export function resolveVideoChatTreeRequest(draft:VideoChatTreeDraft,request:string,
  step:string,locale?:VideoPhraseLocale):VideoChatTreeDraft|null;
export function changeVideoChatPhraseFilter(draft:VideoChatTreeDraft,
  filter:"tone"|"speaker"|"length",value:string):VideoChatTreeDraft|null;
export function chooseCustomVideoChatPhrase(draft:VideoChatTreeDraft,value:string):
  VideoChatTreeDraft|null;
export function autocompleteVideoChatTree(draft:VideoChatTreeDraft,
  legacyTheme?:string,locale?:VideoPhraseLocale):VideoChatTreeDraft|null;
