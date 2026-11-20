/** OpenMotion reference metadata and original local fallback only. */
export type OpenMotionReference = Readonly<{
  id:string;title:string;description:string;collection:string;tags:string[];
  mechanics:string[];seconds:number;ratio:string;preview:string|null;source:string;
}>;
export type OpenMotionLocalSelection=Readonly<{
  id:string;title:string;templateId:string;
  aspect:"portrait"|"square"|"landscape";
  durationSeconds:20|30|60;motion:"slow"|"dynamic";
  mode:"original_local_adaptation";fidelityClaim:false;providerRequired:false;
}>;
export const OPENMOTION_REFERENCE_COUNT:number;
export const OPENMOTION_GUIDE_COUNT:number;
export const OPENMOTION_REFERENCE_COLLECTIONS:readonly string[];
export function listOpenMotionReferences(args?:{
  query?:string;collection?:string;offset?:number;limit?:number;
}):{total:number;items:OpenMotionReference[]};
export function getOpenMotionGuideIds():string[];
export function getOpenMotionReference(id:string):OpenMotionReference|null;
export function planOpenMotionReferenceSelection(id:string,locale?:"en"|"ru"|"es"):OpenMotionLocalSelection|null;
