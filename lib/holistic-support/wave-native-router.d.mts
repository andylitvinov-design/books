export declare const WAVE_NATIVE_ROUTER_VERSION: 'wave-native-first-v1';
export type WaveNativeLocale = 'ru'|'en'|'es';
export type WaveNativeHistory = ReadonlyArray<{role:'user'|'assistant';text:string}>;
export type WaveNativeReply = Readonly<{
  reply:string;
  intent:string;
  confidence:'high'|'moderate'|'low';
  source:typeof WAVE_NATIVE_ROUTER_VERSION;
  modelUsed:false;
  externalCalled:false;
  phase?:'clarify'|'propose'|'try'|'checkin'|'alternate'|'pause'|'reflect'|'complete'|'reframe';
  situationCode?:string|null;
}>;
export declare function waveNativeTurn(input?:{
  message?:string;
  locale?:WaveNativeLocale;
  history?:WaveNativeHistory;
}):WaveNativeReply|null;
