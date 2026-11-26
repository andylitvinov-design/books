export const INSTAGRAM_REELS_PROFILE: Readonly<{
 aspect:"portrait";durationSeconds:30;frameRate:24;recommendedWidth:1080;recommendedHeight:1920;
 container:"mp4";videoCodec:"avc";audioCodec:"aac";downloadName:"holistic-house-instagram-reel.mp4";
}>;
export function isInstagramReelSelection(path:{scope?:string;workFormat?:string}|null|undefined):boolean;
export function isInstagramReelActive(selected:boolean,aspect:string,seconds:number,exportMode:string):boolean;
export function reelCaptionCenterY(position:string,height:number):number;
export function reelCaptionBeatAt(startSeconds:number,seconds:number,beats:readonly string[]):string;
