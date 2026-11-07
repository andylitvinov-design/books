export function prefersSafariWebm(userAgent?:string,maxTouchPoints?:number):boolean;
export function orderRecordingMimes(args:{
  mp4:readonly string[]; webm:readonly string[];
  preferWebm?:boolean; forceMp4?:boolean;
  userAgent?:string; maxTouchPoints?:number;
}):string[];
export function proceduralMp4Route(args?:{nativeAvc?:boolean;webCodecs?:boolean;nativeWebm?:boolean;preferNativeWebm?:boolean}):'native'|'native-webm'|'webcodecs'|'unsupported';
export function selectWebCodecsForRecording(args?:{
  hasWebCodecs?:boolean;
  safariWebKit?:boolean;
  procedural?:boolean;
  proceduralRoute?:'native'|'native-webm'|'webcodecs'|'unsupported';
  preferWebm?:boolean;
}):boolean;
export function shouldAutoRecoverSafariPlayback(args?:{
  safariWebKit?:boolean;format?:string;errorCode?:number;nativeWebm?:boolean;
  alreadyAttempted?:boolean;catalog?:boolean;
}):boolean;
