import type {TimedSpeechTranscript} from "./audio-visual-storyboard.mjs";
export declare function stageVoiceStudioHandoff(file:File,transcript:TimedSpeechTranscript):Promise<boolean>;
export declare function consumeVoiceStudioHandoff():Promise<{file:File;transcript:TimedSpeechTranscript}|null>;
