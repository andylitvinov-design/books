/** Voice Companion's browser-only speech contract (no external network). */
export const VOICE_LANGUAGES:Readonly<{ru:'ru-RU';en:'en-US';es:'es-ES'}>;
export function browserSpeechLanguage(locale:'ru'|'en'|'es'):string;
export function prepareSpeechText(value:unknown):string;
export function speechSegments(value:string,maxLength?:number):string[];
export type VoiceRoute='browser-speech'|'gemini-static'|'piper-local'|'text';
export type VoiceRouteOptions={channel?:'web'|'telegram'|'local';
  playbackConsent?:boolean;staticPhrase?:boolean;freeTierConfirmed?:boolean;
  cloudConsent?:boolean;piperLocalReady?:boolean};
export function chooseVoiceRoute(options?:VoiceRouteOptions):VoiceRoute;
export function createRecognitionGate(isCurrent:()=>boolean):Readonly<{isActive:()=>boolean;accept:(value:unknown)=>string|null}>;
