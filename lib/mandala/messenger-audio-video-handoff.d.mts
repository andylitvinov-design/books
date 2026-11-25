export const MESSENGER_AUDIO_VIDEO_KEY: string;
export const MESSENGER_AUDIO_VIDEO_MAX_BYTES: number;
export const MESSENGER_AUDIO_VIDEO_TTL_MS: number;
export type AudioVideoDuration = 10|15|20|30|60;
export type AudioVideoPrepared = {file:File;seconds:number;duration:AudioVideoDuration};
export type AudioVideoTransfer = AudioVideoPrepared & {
 locale:"ru"|"en"|"es";goal:string;rights:true;created:number;token:string;
};
export function audioVideoDuration(seconds:number):AudioVideoDuration|null;
export function audioVideoFileAllowed(
 file:Pick<File,"name"|"type"|"size">|null|undefined,
 allowTelegram?:boolean
):boolean;
export function prepareMessengerAudio(file:File):Promise<AudioVideoPrepared>;
export function stageMessengerAudio(input:AudioVideoPrepared & {
 locale:"ru"|"en"|"es";goal:string;rights:boolean;
}):Promise<void>;
export function consumeMessengerAudio(
 locale:"ru"|"en"|"es"
):Promise<AudioVideoTransfer|null>;
