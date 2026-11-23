import type {TimedSpeechTranscript} from "./audio-visual-storyboard.mjs";
export type DeviceVoiceCapture={stop:(seconds:number)=>Promise<TimedSpeechTranscript|null>;abort:()=>void};
export declare const deviceSpeechLanguage:(locale:string)=>string;
export declare function createSpeechClock(now?:()=>number):{
  observe:(event:unknown)=>void;newRecognitionSession:()=>void;
  finish:(durationSeconds:number)=>TimedSpeechTranscript|null;
};
export declare function startDeviceVoiceCapture(locale:string):DeviceVoiceCapture|null;
export declare function transcribeDeviceAudioFile(
  file:File,locale:string,signal?:AbortSignal):Promise<TimedSpeechTranscript>;
