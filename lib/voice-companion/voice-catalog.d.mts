export type VoiceLocale='ru'|'en'|'es';
export const STUDIO_VOICE_PRESETS:ReadonlyArray<{id:string;providerVoice:string;label:Record<VoiceLocale,string>}>;
export function publicPreviewText(locale:VoiceLocale):string;
export function normalizeSpeechRate(value:unknown):number;
export function normalizeDeviceVoiceId(id:unknown,voices:ReadonlyArray<{voiceURI:string;lang:string}>|unknown,locale:VoiceLocale):string;
