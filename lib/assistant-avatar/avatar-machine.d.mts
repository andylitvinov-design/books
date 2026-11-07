export type AvatarPhase = 'idle'|'reacting'|'thinking'|'speaking'|'error'|'hidden';
export type AvatarEmotion = 'neutral'|'warm'|'attentive'|'concerned'|'curious'|'encouraging'|'grounded';
export type AvatarViewModel = {phase:AvatarPhase;emotion:AvatarEmotion;intensity:0|1|2;visible:boolean;compact:boolean;speaking:boolean};
export type AvatarState = AvatarViewModel & {turnId:number;speechId:number};
export type AvatarEvent = {type:'TURN_START';turnId:number;emotion:AvatarEmotion;intensity:0|1|2} |
  {type:'THINKING'|'TURN_DONE'|'TURN_ERROR';turnId:number} |
  {type:'SPEECH_START'|'SPEECH_END';turnId:number;speechId:number} |
  {type:'RESET';turnId:number} | {type:'HIDE'|'SHOW'|'LOCALE_CHANGE'};
export function initialAvatarState(compact?:boolean):AvatarState;
export function reduceAvatar(state:AvatarState,event:AvatarEvent):AvatarState;
