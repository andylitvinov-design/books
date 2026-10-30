export const LOCAL_DIALOGUE_VERSION:string;
export type LocalTurn = {role:"assistant"|"user";content:string};
export type LocalRequest = {
  mode:"recommend"|"clarify"|"no_match";
  topic:"energy"|"money"|"love"|"meaning"|"goals"|null;
  preferredFormat:"video"|"audio"|"test"|"course"|"service"|null;
  excludedFormats:Array<"video"|"audio"|"test"|"course"|"service">;
  minutes:number|null; brevity:"short"|"normal"|"detailed";
  address:"formal"|"informal"|"neutral";hasApprovedMatches:boolean;
};
export type LocalMemory = {kind:"preferred_name"|"communication_style"|"response_length"|"avoid_format"|"personal_accent";value:string};
export type LocalContext = {version:string;locale:"en"|"ru"|"es";request:LocalRequest;turns:LocalTurn[];memory:LocalMemory[]};
export function prepareLocalConversation(args?:{
  history?:Array<{role:string;text:string}>;
  currentMessage?:string;
  memory?:Array<{kind:string;value:string}>;
  decision?:{
    status?:string;
    state?:{locale?:string;topic?:string|null;format?:string|null;
      excluded?:string[];maxDurationMin?:number|null;brevity?:string;address?:string};
    suggestions?:unknown[];
  };
  locale?:string;
}):LocalContext|null;
export function acceptLocalConversationReply(candidate:unknown,opts?:{
  request?:LocalRequest;locale?:string;
}):string|null;
