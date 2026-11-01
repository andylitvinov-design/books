export function prefersSafariWebm(userAgent?:string,maxTouchPoints?:number):boolean;
export function orderRecordingMimes(args:{
  mp4:readonly string[]; webm:readonly string[];
  preferWebm?:boolean; forceMp4?:boolean;
  userAgent?:string; maxTouchPoints?:number;
}):string[];
