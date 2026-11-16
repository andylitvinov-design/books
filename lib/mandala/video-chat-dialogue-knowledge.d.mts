export type VideoChatInfoTopic=
  "cost"|"privacy"|"ai"|"footage"|"photo"|"voice"|"phrases"|"music"|
  "format"|"duration"|"preview"|"current"|"options"|"steps"|"why"|"unknown";
export function classifyVideoChatQuestion(value:string):VideoChatInfoTopic|null;
export type VideoChatInfoContext={
  locale?:"ru"|"en"|"es";
  stage?:string;
  options?:readonly string[];
  selected?:{
    category?:string|null;topic?:string|null;story?:string|null;
    duration?:number|null;aspect?:string|null;music?:string|null;
  };
};
export function answerVideoChatQuestion(kind:VideoChatInfoTopic,
  context?:VideoChatInfoContext):string;
