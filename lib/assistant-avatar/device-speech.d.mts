export type SpeechResult = {ok:true;id:number}|{ok:false;reason:string};
export type SpeechCallbacks = {voiceURI?:string;onStart?:(id:number)=>void;onEnd?:(reason:string,id:number)=>void;onBoundary?:(index:number,id:number)=>void};
export type SpeechOptions = {rate?:number;voiceURI?:string};
export type SpeechController = {available:()=>boolean;speak:(text:string,locale:'ru'|'en'|'es',callbacks?:SpeechCallbacks,options?:SpeechOptions)=>SpeechResult;stop:()=>void;watchVoices:(listener:(voices:SpeechSynthesisVoice[])=>void)=>()=>void;destroy:()=>void};
export function createDeviceSpeech(environment:()=>Window):SpeechController;
