export type WaveLocale = "ru" | "en" | "es";
export type WaveStatus = "safety_handoff" | "category_only" | "personalized";
export type WaveInput = {
  locale:WaveLocale;theme:string;problemIndex:number;goalId:string;
  tone:string;kind:string;focus:string;length:string;
  currentText?:string;goalText?:string;round?:number;
  fallbackStrategy:string;fallbackPhrases:string[];
};
export type WaveDraft = Readonly<{
 status:WaveStatus;strategy:string;phrases:string[];
 goalConcepts:string[];currentConcepts:string[];engineVersion:string;
}>;
export const WAVE_ENGINE_VERSION:string;
export function interpretWaveNotes(input?:{locale?:WaveLocale;currentText?:string;goalText?:string}):{
 status:WaveStatus;currentKeys:string[];goalKeys:string[];language:WaveLocale;
};
export function buildWaveNarrativeDraft(input:WaveInput):WaveDraft;
