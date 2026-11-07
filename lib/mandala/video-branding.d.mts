export type VideoExportVariant = 'none' | 'branded' | 'clean'
export interface VideoExportCapability {
  policyVersion: string
  canExportClean: boolean
  grantType: 'pilot' | 'none'
  validUntil: string | null
}
export declare const VIDEO_EXPORT_POLICY_VERSION: string
export declare const VIDEO_BRAND_STAMP_VERSION: string
export declare function resolveVideoExportVariant(input?: {
  professionalMode?: boolean
  capability?: VideoExportCapability | null
}): VideoExportVariant
export declare function canOfferOriginalVideoSource(professionalMode?:boolean): boolean
export declare function videoBrandStampLayout(width:number,height:number): {
  x:number; y:number; width:number; height:number
  iconSize:number; fontSize:number; interiorPad:number
}
export declare function paintVideoBrandStamp(ctx:CanvasRenderingContext2D,variant:VideoExportVariant):void
