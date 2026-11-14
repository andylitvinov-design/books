/** Restrict signed personal MP4 upload/download endpoints to the existing two screens. */
export declare function personalVideoStorageCsp(
  pathname:string,
  env?:Record<string,string|undefined>
):{connect:string;media:string};
