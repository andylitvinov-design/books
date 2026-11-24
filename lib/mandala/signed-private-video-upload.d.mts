export declare const PRIVATE_VIDEO_CHUNK_BYTES: number;
export declare const PRIVATE_VIDEO_RESUMABLE_THRESHOLD: number;
export declare function needsPrivateVideoChunks(size: number): boolean;
export declare function privateVideoUploadUrl(value: string, supabaseUrl: string): string;
export interface PrivateVideoProgress {uploadedBytes: number; uploadUrl: string;}
export declare function uploadSignedPrivateVideoChunks(options: {
  supabaseUrl:string;bucket:string;objectKey:string;token:string;file:Blob;
  previousUploadUrl?:string|null;
  onUploadUrl?:(url:string,previousUploadUrl:string|null)=>void|string|Promise<void|string>;
  onProgress?:(done:number,total:number)=>void;
  fetchImpl?:typeof fetch;
  signal?:AbortSignal;
}):Promise<PrivateVideoProgress>;
export declare function savePrivateMp4(options: {
  file:Blob;
  accountId?:string;
  details:{theme:string;sceneId:string;aspect:string;duration:number};
  request:(path:string,body?:unknown,method?:string)=>Promise<unknown>;
  sessionRef:{current:unknown};
  onProgress?:(done:number,total:number)=>void;
  fetchImpl?:typeof fetch;
}):Promise<string>;
